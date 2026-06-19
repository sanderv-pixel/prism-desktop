import * as vscode from 'vscode'
import { detectToolFromEnv, AITool } from './tool-detector'
import { WaitReason, WaitState, evaluateWaitState } from './wait-state'
import { getConfig } from './config'

export { WaitReason, WaitState }

interface ChangeEvent {
  time: number
  chars: number
}

const AI_COMMANDS = [
  // GitHub Copilot
  'github.copilot.generate',
  'github.copilot.generateTests',
  'github.copilot.explainCode',
  'github.copilot.fixCode',
  'github.copilot.generateDocs',
  'github.copilot.chat.open',
  'github.copilot.chat.generateTests',
  'github.copilot.chat.explain',
  'github.copilot.chat.fix',
  'github.copilot.chat.generateDocs',
  'github.copilot.chat.newEditor',
  'github.copilot.chat.newWindow',
  'github.copilot.completions.enable',
  'github.copilot.completions.disable',
  // Cursor
  'cursor.generate',
  'cursor.generateCode',
  'cursor.edit',
  'cursor.fix',
  'cursor.explain',
  'cursor.docstring',
  'cursor.compose',
  'cursor.chat',
  'cursor.inlineEdit',
  'cursor.acceptAll',
  'cursor.rejectAll',
  'cursor.applyCode',
  'cursor.generateCommitMessage',
  // Continue / other assistants
  'continue.focusContinueInput',
  'continue.acceptDiff',
  'continue.rejectDiff',
  'continue.generateCode',
  // Codeium
  'codeium.acceptCompletion',
  'codeium.explainCode',
  'codeium.generateFunctionComment',
  'codeium.generateDocstring',
  // Tabnine
  'tabnine.open-hub',
]

export class AIDetector implements vscode.Disposable {
  private readonly _onWaitStateChanged = new vscode.EventEmitter<WaitState>()
  public readonly onWaitStateChanged = this._onWaitStateChanged.event

  private currentWaitState: WaitState = {
    waiting: false,
    tool: 'other',
    reason: 'none',
  }
  private changes: ChangeEvent[] = []
  private lastInsertionTime = 0
  private terminalCommandsRunning = 0
  private aiCommandInvokedUntil = 0
  private disposables: vscode.Disposable[] = []
  private interval?: NodeJS.Timeout
  private log: (message: string) => void

  constructor(log?: (message: string) => void) {
    this.log = log ?? (() => {})
    this.disposables.push(
      this._onWaitStateChanged,
      vscode.window.onDidChangeTextEditorSelection(() => this.evaluate()),
      vscode.workspace.onDidChangeTextDocument((e) => this.onDocumentChange(e)),
      vscode.window.onDidChangeActiveTextEditor(() => this.evaluate()),
      vscode.window.onDidChangeVisibleTextEditors(() => this.evaluate()),
      vscode.window.onDidChangeActiveTerminal?.(() => this.evaluate()),
      vscode.workspace.onDidCloseTextDocument(() => this.evaluate())
    )

    // Terminal shell execution detection (VS Code 1.70+)
    if (vscode.window.onDidStartTerminalShellExecution) {
      this.disposables.push(
        vscode.window.onDidStartTerminalShellExecution(() => {
          this.terminalCommandsRunning++
          this.evaluate()
        }),
        vscode.window.onDidEndTerminalShellExecution(() => {
          this.terminalCommandsRunning = Math.max(
            0,
            this.terminalCommandsRunning - 1
          )
          this.evaluate()
        })
      )
    }

    // AI command invocation detection.
    AI_COMMANDS.forEach((cmd) => {
      try {
        const disp = vscode.commands.registerCommand(cmd, () => {
          this.onAICommandInvoked()
        })
        this.disposables.push(disp)
      } catch {
        // Command may already exist; ignore.
      }
    })

    // Poll for AI panel visibility and active terminal state.
    this.interval = setInterval(() => this.evaluate(), 500)

    this.evaluate()
  }

  private onDocumentChange(e: vscode.TextDocumentChangeEvent): void {
    const now = Date.now()
    let charsInserted = 0
    for (const change of e.contentChanges) {
      if (change.text.length > 0) {
        charsInserted += change.text.length
      }
    }

    this.changes.push({ time: now, chars: charsInserted })
    // Keep only changes from the last 5 seconds.
    this.changes = this.changes.filter((c) => now - c.time < 5000)

    if (charsInserted >= 10) {
      this.lastInsertionTime = now
    }

    this.evaluate()
  }

  private onAICommandInvoked(): void {
    const config = getConfig()
    this.aiCommandInvokedUntil =
      Date.now() + Math.max(config.minimumWaitMs * 3, 5000)
    this.evaluate()
  }

  evaluate(): void {
    const editor = vscode.window.activeTextEditor
    const language = editor?.document.languageId
    const env = vscode.env as unknown as { appName?: string; appHost?: string }
    const tool = detectToolFromEnv(env)

    this.log(`Evaluating: tool=${tool}, language=${language}, panelVisible=${this.isAIPanelVisible()}`)

    const state = evaluateWaitState({
      now: Date.now(),
      lastAICommandUntil: this.aiCommandInvokedUntil,
      terminalCommandsRunning: this.terminalCommandsRunning,
      lastLargeInsertionTime: this.lastInsertionTime,
      recentChanges: this.changes,
      aiPanelVisible: this.isAIPanelVisible(),
      tool,
      language,
    })

    if (
      state.waiting !== this.currentWaitState.waiting ||
      state.tool !== this.currentWaitState.tool ||
      state.language !== this.currentWaitState.language ||
      state.reason !== this.currentWaitState.reason
    ) {
      this.log(`State changed: ${JSON.stringify(state)}`)
      this.currentWaitState = state
      this._onWaitStateChanged.fire(state)
    }
  }

  get state(): WaitState {
    return { ...this.currentWaitState }
  }

  private isAIPanelVisible(): boolean {
    // Best-effort: check if any visible tab label matches known AI panels.
    try {
      const labels = vscode.window.tabGroups.all
        .flatMap((g) => g.tabs)
        .map((t) => t.label)
      const aiLabels = /copilot|cursor|chat|composer|continue|claude/i
      return labels.some((label) => aiLabels.test(label))
    } catch {
      return false
    }
  }

  dispose(): void {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = undefined
    }
    this.disposables.forEach((d) => d.dispose())
    this.disposables = []
  }
}
