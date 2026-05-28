// Anthropic Claude per-token pricing, dollars per 1M tokens.
// Update here when Anthropic changes rates.
// Source: https://www.anthropic.com/pricing

export interface ModelPricing {
  input_per_mtok: number
  output_per_mtok: number
}

export const CLAUDE_PRICING: Record<string, ModelPricing> = {
  'claude-sonnet-4-6': { input_per_mtok: 3.0, output_per_mtok: 15.0 },
  'claude-opus-4-7': { input_per_mtok: 15.0, output_per_mtok: 75.0 },
  'claude-haiku-4-5-20251001': { input_per_mtok: 1.0, output_per_mtok: 5.0 },
}

// Fallback if we get back a model id we haven't priced yet — assume
// sonnet rates so cost isn't silently zero.
const DEFAULT_PRICING: ModelPricing = {
  input_per_mtok: 3.0,
  output_per_mtok: 15.0,
}

export function pricingFor(model: string): ModelPricing {
  return CLAUDE_PRICING[model] ?? DEFAULT_PRICING
}

export function computeCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const p = pricingFor(model)
  const input = (inputTokens / 1_000_000) * p.input_per_mtok
  const output = (outputTokens / 1_000_000) * p.output_per_mtok
  return input + output
}

// Conservative spot rate. Update when EUR/USD moves more than ~3%.
// Storage stays in USD (the currency Anthropic bills in); display
// converts via this constant.
export const USD_TO_EUR = 0.92

export function usdToEur(usd: number): number {
  return usd * USD_TO_EUR
}
