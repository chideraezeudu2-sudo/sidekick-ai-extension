import type { RiskTier } from '@/lib/types/avatar'

/**
 * Phrases that mark an action as consequential — irreversible, financial, or account-changing.
 * Matched against the target element's visible text/label/aria-label, case-insensitively.
 * Bias toward over-flagging: a false positive costs the user one tap, a false negative
 * could cost them a real charge or a deleted account.
 */
const HIGH_RISK_PHRASES = [
  // Payment / purchase
  'buy now', 'purchase', 'place order', 'checkout', 'check out', 'pay now', 'pay $', 'add to cart',
  'complete order', 'confirm order', 'confirm purchase', 'confirm payment', 'submit payment',
  'add card', 'save card', 'card number', 'cvv', 'cvc', 'expiration date', 'billing address',
  'routing number', 'account number', 'bank account', 'wire transfer', 'transfer funds', 'withdraw',
  'deposit', 'send money', 'venmo', 'paypal', 'apple pay', 'google pay',
  // Subscriptions / billing changes
  'subscribe', 'upgrade plan', 'downgrade plan', 'start trial', 'start subscription', 'renew',
  'cancel subscription', 'cancel plan', 'cancel membership', 'unsubscribe',
  // Destructive / irreversible
  'delete account', 'delete my account', 'close account', 'deactivate account', 'remove account',
  'delete permanently', 'permanently delete', 'delete forever', 'empty trash',
  // Confirmations / agreements / sends
  'i agree', 'accept terms', 'accept and continue', 'confirm', 'are you sure', 'yes, delete',
  'send message', 'send email', 'send invite', 'submit application', 'sign', 'e-sign', 'authorize',
  'grant access', 'connect account', 'link account', 'revoke access',
]

/** Check a chunk of text against the high-risk phrase list */
function containsHighRiskPhrase(text: string): boolean {
  const lower = text.toLowerCase()
  return HIGH_RISK_PHRASES.some((phrase) => lower.includes(phrase))
}

/**
 * Classify the risk of an action about to be taken, based on the tool being called
 * and the text/label of its target element (from a peek, not the actual execution).
 */
export function classifyActionRisk(toolName: string, targetText: string | undefined): RiskTier {
  if (!targetText) return 'safe'
  if (toolName === 'click_selector' || toolName === 'click_text' || toolName === 'fill_input') {
    if (containsHighRiskPhrase(targetText)) return 'high'
  }
  return 'safe'
}
