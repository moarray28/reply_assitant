import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

async function findPort() {
  const server = net.createServer()
  await new Promise((resolve, reject) => server.listen(0, '127.0.0.1', resolve).once('error', reject))
  const { port } = server.address()
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  return port
}

test('local API supports brand isolation, policy guardrails, knowledge CRUD, and approved replies', async (t) => {
  const port = await findPort()
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'cx-reply-api-'))
  const storePath = path.join(temporaryDirectory, 'store.json')
  const child = spawn(process.execPath, ['server.js'], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(port),
      LOCAL_STORE_PATH: storePath,
      SUPABASE_URL: '',
      VITE_SUPABASE_URL: '',
      SUPABASE_ANON_KEY: '',
      VITE_SUPABASE_ANON_KEY: '',
      SUPABASE_SERVICE_ROLE_KEY: '',
      OPENROUTER_API_KEY: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let childOutput = ''
  child.stdout.on('data', (chunk) => { childOutput += chunk })
  child.stderr.on('data', (chunk) => { childOutput += chunk })
  const base = `http://127.0.0.1:${port}/api`

  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      await new Promise((resolve) => {
        child.once('exit', resolve)
        child.kill()
      })
    }
    await rm(temporaryDirectory, { recursive: true, force: true })
  })

  let health
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      health = await fetch(`${base}/health`).then((response) => response.json())
      break
    } catch {
      if (child.exitCode !== null) throw new Error(`API server exited before starting:\n${childOutput}`)
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }
  assert.equal(health?.mode, 'local-demo')

  const brandsResponse = await fetch(`${base}/brands`).then((response) => response.json())
  assert.equal(brandsResponse.brands.length, 2)
  const glowCareConversations = await fetch(`${base}/conversations?brandId=brand-glowcare`).then((response) => response.json())
  const pureBottleConversations = await fetch(`${base}/conversations?brandId=brand-purebottle`).then((response) => response.json())
  assert.equal(glowCareConversations.conversations.length, 3)
  assert.equal(pureBottleConversations.conversations.length, 4)

  const makeGeneration = (conversationId, brandId, customerMessage) => fetch(`${base}/generate-reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId, brandId, customerMessage }),
  })

  const glowCareFailure = await makeGeneration('conv-1001', 'brand-glowcare', 'My bottle arrived broken.')
  assert.equal(glowCareFailure.status, 503)
  const glowCareDamage = await glowCareFailure.json()
  assert.match(glowCareDamage.error, /draft the response manually/i)
  assert.ok(glowCareDamage.logId)
  assert.equal(glowCareDamage.retrievedContext.length, 1)
  assert.match(glowCareDamage.retrievedContext[0].content, /14 days/)
  assert.doesNotMatch(JSON.stringify(glowCareDamage.retrievedContext), /48 hours/)

  const pureBottleFailure = await makeGeneration('conv-1002', 'brand-purebottle', 'My bottle arrived broken.')
  assert.equal(pureBottleFailure.status, 503)
  const pureBottleDamage = await pureBottleFailure.json()
  assert.equal(pureBottleDamage.retrievedContext.length, 1)
  assert.match(pureBottleDamage.retrievedContext[0].content, /48 hours/)
  assert.doesNotMatch(JSON.stringify(pureBottleDamage.retrievedContext), /14 days/)

  const returnCases = [
    ['conv-1001', 'brand-glowcare', 'What is the return deadline?', /30 days/],
    ['conv-1002', 'brand-purebottle', 'Can I send this product back?', /14 days/],
    ['conv-1001', 'brand-glowcare', 'When will my refund be processed?', /7 business days/],
    ['conv-1002', 'brand-purebottle', 'How soon can I expect my refund?', /3 business days/],
  ]
  for (const [conversationId, brandId, customerMessage, expectedPolicy] of returnCases) {
    const response = await makeGeneration(conversationId, brandId, customerMessage)
    assert.equal(response.status, 503)
    const body = await response.json()
    assert.equal(body.retrievedContext.length, 1)
    assert.match(body.retrievedContext[0].content, expectedPolicy)
  }

  const isolationCheck = await makeGeneration(
    'conv-1001',
    'brand-glowcare',
    'My bottle arrived broken. Is there a 48-hour rule?',
  )
  const isolationBody = await isolationCheck.json()
  assert.equal(isolationCheck.status, 503)
  assert.equal(isolationBody.retrievedContext.length, 1)
  assert.match(isolationBody.retrievedContext[0].content, /14 days/)
  assert.doesNotMatch(JSON.stringify(isolationBody.retrievedContext), /48 hours/)

  const mismatch = await makeGeneration('conv-1001', 'brand-purebottle', 'My bottle is broken.')
  assert.equal(mismatch.status, 400)

  const unsupported = await makeGeneration('conv-1001', 'brand-glowcare', 'Can I get a free replacement for my subscription?')
  const unsupportedBody = await unsupported.json()
  assert.equal(unsupported.status, 200)
  assert.deepEqual(unsupportedBody.retrievedContext, [])
  assert.match(unsupportedBody.suggestedResponse, /verify this with a support agent/)

  const outOfPolicy = await makeGeneration('conv-1002', 'brand-purebottle', 'I reported damage after 10 days and need a replacement.')
  const outOfPolicyBody = await outOfPolicy.json()
  assert.equal(outOfPolicy.status, 200)
  assert.match(outOfPolicyBody.suggestedResponse, /outside that window/)
  assert.match(outOfPolicyBody.suggestedResponse, /can't promise a replacement/)

  const created = await fetch(`${base}/knowledge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      brandId: 'brand-glowcare',
      category: 'Gift Cards',
      title: 'Gift card validity',
      content: 'Gift cards do not expire.',
    }),
  }).then((response) => response.json())
  assert.match(created.knowledge.id, /^knowledge-/)

  const updated = await fetch(`${base}/knowledge/${created.knowledge.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      brandId: 'brand-glowcare',
      category: 'Gift Cards',
      title: 'Gift card validity',
      content: 'Gift cards remain valid for five years.',
    }),
  }).then((response) => response.json())
  assert.match(updated.knowledge.content, /five years/)

  const updatedRetrieval = await makeGeneration('conv-1001', 'brand-glowcare', 'What is the gift card validity?')
  assert.equal(updatedRetrieval.status, 503)
  const updatedRetrievalBody = await updatedRetrieval.json()
  assert.match(updatedRetrievalBody.retrievedContext[0].content, /five years/)

  const deletion = await fetch(`${base}/knowledge/${created.knowledge.id}?brandId=brand-glowcare`, { method: 'DELETE' })
  assert.equal(deletion.status, 204)

  const finalMessage = await fetch(`${base}/conversations/conv-1001/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: 'Agent-approved final response.',
      aiLogId: unsupportedBody.logId,
      originalAiResponse: unsupportedBody.suggestedResponse,
    }),
  }).then((response) => response.json())
  assert.equal(finalMessage.message.content, 'Agent-approved final response.')

  const stored = JSON.parse(await readFile(storePath, 'utf8'))
  const approvedLog = stored.aiLogs.find((log) => log.id === unsupportedBody.logId)
  assert.equal(approvedLog.final_response, 'Agent-approved final response.')
  assert.equal(approvedLog.agent_edited_response, 'Agent-approved final response.')
  assert.ok(stored.conversations.find((conversation) => conversation.id === 'conv-1001').messages.some(
    (message) => message.content === 'Agent-approved final response.',
  ))
})
