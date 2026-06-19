import { AITool } from './tool-detector'

export type WaitReason =
  | 'none'
  | 'typing-burst'
  | 'large-insertion'
  | 'terminal-command'
  | 'ai-command-invoked'
  | 'ai-panel-visible'

export interface WaitStateInput {
  now: number
  lastAICommandUntil: number
  terminalCommandsRunning: number
  lastLargeInsertionTime: number
  recentChanges: Array<{ time: number; chars: number }>
  aiPanelVisible: boolean
  tool: AITool
  language?: string
}

export interface WaitState {
  waiting: boolean
  tool: AITool
  language?: string
  reason: WaitReason
}

export function evaluateWaitState(input: WaitStateInput): WaitState {
  const { now, lastAICommandUntil, terminalCommandsRunning, lastLargeInsertionTime, recentChanges, aiPanelVisible, tool, language } = input

  // 1. AI command invoked recently.
  if (now < lastAICommandUntil) {
    return { waiting: true, tool, language, reason: 'ai-command-invoked' }
  }

  // 2. Terminal command running (likely AI CLI agent).
  if (terminalCommandsRunning > 0) {
    return { waiting: true, tool, language, reason: 'terminal-command' }
  }

  // 3. Large insertion detected (AI completion accepted).
  if (now - lastLargeInsertionTime < 5000) {
    return { waiting: true, tool, language, reason: 'large-insertion' }
  }

  // 4. Recent editor activity: typing or AI streaming.
  // Keep the ad active while the editor is changing, so Cursor/Copilot
  // streaming generations keep the ad visible.
  const lastChange = recentChanges[recentChanges.length - 1]
  if (lastChange && now - lastChange.time < 2000) {
    return { waiting: true, tool, language, reason: 'typing-burst' }
  }

  // 5. AI panel visible.
  if (aiPanelVisible) {
    return { waiting: true, tool, language, reason: 'ai-panel-visible' }
  }

  return { waiting: false, tool, language, reason: 'none' }
}
