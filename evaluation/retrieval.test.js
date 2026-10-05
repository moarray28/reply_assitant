import test from 'node:test'
import assert from 'node:assert/strict'
import { outOfPolicyResponse, retrieveKnowledge, unsupportedResponse } from '../src/lib/retrieval.js'
import { knowledgeByBrand } from '../src/data/mockData.js'

test('retrieves only the selected brand damaged-product policy', () => {
  const glowCare = retrieveKnowledge(knowledgeByBrand['brand-glowcare'], 'My bottle arrived broken.')
  const pureBottle = retrieveKnowledge(knowledgeByBrand['brand-purebottle'], 'My bottle arrived broken.')

  assert.equal(glowCare.length, 1)
  assert.match(glowCare[0].content, /14 days/)
  assert.equal(pureBottle.length, 1)
  assert.match(pureBottle[0].content, /48 hours/)
  assert.doesNotMatch(glowCare.map((entry) => entry.content).join(' '), /48 hours/)
  assert.doesNotMatch(pureBottle.map((entry) => entry.content).join(' '), /14 days/)
})

test('retrieves only policies relevant to a refund question', () => {
  const retrieved = retrieveKnowledge(knowledgeByBrand['brand-glowcare'], 'When will my refund be processed?')
  assert.deepEqual(retrieved.map((entry) => entry.category), ['Refunds'])
  assert.match(retrieved[0].content, /7 business days/)
})

test('does not retrieve policy entries for an unsupported question', () => {
  const retrieved = retrieveKnowledge(knowledgeByBrand['brand-glowcare'], 'Can I get a free lifetime subscription?')
  assert.deepEqual(retrieved, [])
  assert.match(unsupportedResponse(), /couldn't find a relevant policy/i)
})

test('supports category/title matching for knowledge added by an agent', () => {
  const entries = [{ category: 'Gift Cards', title: 'Gift card expiry', content: 'Gift cards do not expire.' }]
  const retrieved = retrieveKnowledge(entries, 'Do your gift cards expire?')
  assert.deepEqual(retrieved, entries)
})

test('does not promise a remedy when the damaged report is outside the policy window', () => {
  const policy = retrieveKnowledge(knowledgeByBrand['brand-purebottle'], 'I reported damage after 10 days and need a replacement.')
  const response = outOfPolicyResponse(policy, 'I reported damage after 10 days and need a replacement.')
  assert.match(response, /outside that window/)
  assert.match(response, /can't promise a replacement/i)
})
