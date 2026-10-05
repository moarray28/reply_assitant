const keywordMap = {
  'Damaged Products': ['damaged', 'damage', 'broken', 'broke', 'cracked', 'crack', 'leak', 'leaking', 'shattered'],
  Returns: ['return', 'returns', 'send back', 'exchange'],
  Refunds: ['refund', 'refunded', 'money back', 'reimbursement'],
  Shipping: ['delivery', 'shipping', 'shipped', 'tracking', 'package', 'order status'],
  Cancellation: ['cancel', 'cancelled', 'canceled', 'cancellation', 'stop order'],
}

const ignoredCategoryWords = new Set(['and', 'for', 'the', 'with', 'policy', 'policies', 'products', 'product', 'information'])

export function normalizeText(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

export function retrieveKnowledge(entries, customerMessage) {
  const message = normalizeText(customerMessage)
  const categories = Object.entries(keywordMap)
    .filter(([category, keywords]) =>
      keywords.some((keyword) => message.includes(normalizeText(keyword))) ||
      (category === 'Returns' && message.includes('send') && message.includes('back')),
    )
    .map(([category]) => category)

  return entries.filter((entry) => {
    if (categories.includes(entry.category)) return true
    const categoryTerms = normalizeText(`${entry.category} ${entry.title}`)
      .split(' ')
      .filter((term) => term.length > 2 && !ignoredCategoryWords.has(term))
    return categoryTerms.some((term) => message.includes(term))
  })
}

export function formatContext(entries) {
  return entries.map((entry) => `${entry.category}: ${entry.content}`).join('\n')
}

export function unsupportedResponse() {
  return "I couldn't find a relevant policy for this request. Please verify this with a support agent before responding."
}

export function outOfPolicyResponse(entries, customerMessage) {
  const damagedPolicy = entries.find((entry) => normalizeText(entry.category).includes('damaged'))
  if (!damagedPolicy) return null

  const limit = damagedPolicy.content.match(/within\s+(\d+)\s+(hours?|days?)/i)
  const elapsed = normalizeText(customerMessage).match(/(?:after|reported|reporting|within)\s+(\d+)\s+(hours?|days?)/)
  if (!limit || !elapsed) return null

  const toHours = (amount, unit) => Number(amount) * (unit.startsWith('day') ? 24 : 1)
  if (toHours(elapsed[1], elapsed[2]) <= toHours(limit[1], limit[2])) return null

  return `The policy requires damage to be reported within ${limit[1]} ${limit[2]}. This request appears to be outside that window, so I can't promise a replacement or refund. Please have a support agent review it.`
}
