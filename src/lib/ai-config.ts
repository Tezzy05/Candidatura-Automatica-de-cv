// Separado de ai.ts para que o SDK da Anthropic só seja baixado quando a IA for usada.
export const MODELS = [
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5 (melhor qualidade)' },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5 (mais barato)' },
] as const

export interface AiSettings {
  apiKey: string
  model: string
}
