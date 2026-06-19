export type AITool =
  | 'copilot'
  | 'cursor-compose'
  | 'cursor-tab'
  | 'chatgpt'
  | 'claude'
  | 'gemini'
  | 'perplexity'
  | 'other'

export interface EditorEnv {
  appName?: string
  appHost?: string
}

export function detectToolFromEnv(env: EditorEnv): AITool {
  const name = env.appName ?? ''
  const host = env.appHost ?? ''

  if (/cursor/i.test(name) || /cursor/i.test(host)) {
    return 'cursor-tab'
  }
  if (/chatgpt|openai/i.test(name) || /chatgpt|openai/i.test(host)) {
    return 'chatgpt'
  }
  if (/claude|anthropic/i.test(name) || /claude|anthropic/i.test(host)) {
    return 'claude'
  }
  if (/gemini|google/i.test(name) || /gemini|google/i.test(host)) {
    return 'gemini'
  }
  if (/perplexity/i.test(name) || /perplexity/i.test(host)) {
    return 'perplexity'
  }
  if (/copilot/i.test(name) || /copilot/i.test(host) || /github/i.test(name)) {
    return 'copilot'
  }
  return 'copilot'
}
