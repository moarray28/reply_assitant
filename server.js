import cors from 'cors'
import express from 'express'
import { createClient } from '@supabase/supabase-js'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { brands as demoBrands, conversations as demoConversations, knowledgeByBrand } from './src/data/mockData.js'
import { formatContext, outOfPolicyResponse, retrieveKnowledge, unsupportedResponse } from './supabase/functions/_shared/retrieval.js'

const app = express()
const port = Number(process.env.PORT || 3001)
const root = path.dirname(fileURLToPath(import.meta.url))
const localStorePath = process.env.LOCAL_STORE_PATH
  ? path.resolve(process.env.LOCAL_STORE_PATH)
  : path.join(root, '.local', 'store.json')
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const isConfigured = (value) => Boolean(value && !value.includes('your-'))
const supabaseConfiguration = [supabaseUrl, supabaseAnonKey, supabaseServiceKey]
const hasPartialSupabaseConfig = supabaseConfiguration.some(isConfigured) && !supabaseConfiguration.every(isConfigured)
if (hasPartialSupabaseConfig) {
  throw new Error('Configure SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY together, or remove the partial Supabase configuration to use local demo mode.')
}
const supabaseEnabled = isConfigured(supabaseUrl) && isConfigured(supabaseAnonKey) && isConfigured(supabaseServiceKey)
const authClient = supabaseEnabled ? createClient(supabaseUrl, supabaseAnonKey) : null
const database = supabaseEnabled
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
  : null

app.use(cors())
app.use(express.json({ limit: '32kb' }))

function createDemoStore() {
  const brands = structuredClone(demoBrands)
  const customersByName = new Map()
  const customers = []
  const conversations = demoConversations.map((conversation) => {
    let customer = customersByName.get(conversation.customerName)
    if (!customer) {
      customer = {
        id: `customer-${customers.length + 1}`,
        name: conversation.customerName,
        email: '',
      }
      customersByName.set(conversation.customerName, customer)
      customers.push(customer)
    }
    return { ...structuredClone(conversation), customerId: customer.id }
  })

  return {
    brands,
    customers,
    conversations,
    knowledge: Object.entries(knowledgeByBrand).flatMap(([brandId, entries]) =>
      entries.map((entry) => ({ ...structuredClone(entry), brandId })),
    ),
    aiLogs: [],
  }
}

let localStorePromise
let writeQueue = Promise.resolve()

async function getLocalStore() {
  if (!localStorePromise) {
    localStorePromise = (async () => {
      await mkdir(path.dirname(localStorePath), { recursive: true })
      try {
        return JSON.parse(await readFile(localStorePath, 'utf8'))
      } catch (error) {
        if (error.code !== 'ENOENT') throw error
        const initialStore = createDemoStore()
        await writeFile(localStorePath, JSON.stringify(initialStore, null, 2), 'utf8')
        return initialStore
      }
    })()
  }
  return localStorePromise
}

async function saveLocalStore(store) {
  writeQueue = writeQueue.then(async () => {
    await mkdir(path.dirname(localStorePath), { recursive: true })
    const temporaryPath = `${localStorePath}.tmp`
    await writeFile(temporaryPath, JSON.stringify(store, null, 2), 'utf8')
    await rename(temporaryPath, localStorePath)
  })
  await writeQueue
}

function supabaseError(error) {
  const result = new Error(error.message || 'Database request failed.')
  result.status = 500
  return result
}

async function requireAuthenticatedUser(req, res, next) {
  if (!supabaseEnabled) return next()
  const authorization = req.get('authorization') || ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  if (!token) return res.status(401).json({ error: 'Sign in to use the application.' })

  const { data, error } = await authClient.auth.getUser(token)
  if (error || !data.user) return res.status(401).json({ error: 'Your session is invalid or expired. Please sign in again.' })
  req.user = data.user
  return next()
}

async function getBrands() {
  if (!database) return (await getLocalStore()).brands
  const { data, error } = await database.from('brands').select('id,name').order('name')
  if (error) throw supabaseError(error)
  return data
}

async function getKnowledge(brandId) {
  if (!database) {
    const store = await getLocalStore()
    return store.knowledge.filter((entry) => entry.brandId === brandId)
  }
  const { data, error } = await database
    .from('knowledge_entries')
    .select('id,brand_id,category,title,content,created_at,updated_at')
    .eq('brand_id', brandId)
    .order('category')
  if (error) throw supabaseError(error)
  return data.map((entry) => ({ ...entry, brandId: entry.brand_id }))
}

async function getConversations(brandId) {
  if (!database) {
    const store = await getLocalStore()
    return store.conversations
      .filter((conversation) => conversation.brandId === brandId)
      .map((conversation) => ({
        ...conversation,
        customerName: store.customers.find((customer) => customer.id === conversation.customerId)?.name || 'Customer',
        messages: [...conversation.messages].sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)),
      }))
  }

  const { data, error } = await database
    .from('conversations')
    .select('id,brand_id,customer_id,order_id,order_status,created_at,customers(name,email),messages(id,sender,content,created_at)')
    .eq('brand_id', brandId)
    .order('created_at', { ascending: false })
  if (error) throw supabaseError(error)
  return data.map((conversation) => ({
    id: conversation.id,
    brandId: conversation.brand_id,
    customerId: conversation.customer_id,
    customerName: Array.isArray(conversation.customers) ? conversation.customers[0]?.name : conversation.customers?.name,
    orderId: conversation.order_id,
    status: conversation.order_status,
    created_at: conversation.created_at,
    messages: (conversation.messages || []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
  }))
}

function validateKnowledgeInput(body) {
  const { brandId, category, title, content } = body || {}
  if (![brandId, category, title, content].every((value) => typeof value === 'string' && value.trim())) {
    const error = new Error('brandId, category, title, and content are required.')
    error.status = 400
    throw error
  }
  return {
    brandId: brandId.trim(),
    category: category.trim(),
    title: title.trim(),
    content: content.trim(),
  }
}

async function generateWithOpenRouter({ brandName, customerMessage, context }) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!isConfigured(apiKey)) {
    const error = new Error('AI service is not configured. Please draft the response manually.')
    error.status = 503
    throw error
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 25000)
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:5173',
        'X-Title': 'CX Reply Assistant',
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
        temperature: 0.2,
        max_tokens: 350,
        messages: [
          {
            role: 'system',
            content: `You draft concise, polite support responses for ${brandName}. Use only the supplied brand knowledge. Do not invent policies or promise actions not supported by the knowledge. If no relevant knowledge is supplied, say the policy is unavailable and recommend human verification. Do not claim an action has been completed.`,
          },
          {
            role: 'user',
            content: `CUSTOMER MESSAGE:\n${customerMessage}\n\nRETRIEVED BRAND KNOWLEDGE:\n${context || '(No relevant knowledge found)'}`,
          },
        ],
      }),
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      const error = new Error(payload?.error?.message || `AI provider returned HTTP ${response.status}.`)
      error.status = 502
      throw error
    }

    const result = payload?.choices?.[0]?.message?.content
    if (typeof result !== 'string' || !result.trim()) {
      const error = new Error('AI provider returned an empty or invalid reply.')
      error.status = 502
      throw error
    }
    return result.trim()
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error('AI service timed out. Please draft the response manually.')
      timeoutError.status = 504
      throw timeoutError
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

async function insertAiLog(log) {
  if (!database) {
    const store = await getLocalStore()
    const entry = { id: `log-${crypto.randomUUID()}`, created_at: new Date().toISOString(), ...log }
    store.aiLogs.push(entry)
    await saveLocalStore(store)
    return entry
  }
  const { data, error } = await database.from('ai_logs').insert({
    conversation_id: log.conversationId,
    customer_message: log.customerMessage,
    retrieved_context: log.retrievedContext,
    ai_response: log.aiResponse,
  }).select('id').single()
  if (error) throw supabaseError(error)
  return { id: data.id }
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', mode: database ? 'supabase' : 'local-demo', aiConfigured: isConfigured(process.env.OPENROUTER_API_KEY) })
})

app.use('/api', requireAuthenticatedUser)

app.get('/api/brands', async (_req, res, next) => {
  try {
    res.json({ brands: await getBrands() })
  } catch (error) {
    next(error)
  }
})

app.get('/api/conversations', async (req, res, next) => {
  try {
    if (typeof req.query.brandId !== 'string' || !req.query.brandId) {
      return res.status(400).json({ error: 'brandId is required.' })
    }
    res.json({ conversations: await getConversations(req.query.brandId) })
  } catch (error) {
    next(error)
  }
})

app.get('/api/knowledge', async (req, res, next) => {
  try {
    if (typeof req.query.brandId !== 'string' || !req.query.brandId) {
      return res.status(400).json({ error: 'brandId is required.' })
    }
    res.json({ knowledge: await getKnowledge(req.query.brandId) })
  } catch (error) {
    next(error)
  }
})

app.post('/api/knowledge', async (req, res, next) => {
  try {
    const input = validateKnowledgeInput(req.body)
    const brand = (await getBrands()).find((item) => item.id === input.brandId)
    if (!brand) return res.status(400).json({ error: 'The selected brand does not exist.' })

    if (!database) {
      const store = await getLocalStore()
      const entry = { id: `knowledge-${crypto.randomUUID()}`, ...input, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
      store.knowledge.push(entry)
      await saveLocalStore(store)
      return res.status(201).json({ knowledge: entry })
    }

    const { data, error } = await database.from('knowledge_entries').insert({
      brand_id: input.brandId,
      category: input.category,
      title: input.title,
      content: input.content,
    }).select('id,brand_id,category,title,content,created_at,updated_at').single()
    if (error) throw supabaseError(error)
    return res.status(201).json({ knowledge: { ...data, brandId: data.brand_id } })
  } catch (error) {
    next(error)
  }
})

app.put('/api/knowledge/:id', async (req, res, next) => {
  try {
    const input = validateKnowledgeInput(req.body)
    const brand = (await getBrands()).find((item) => item.id === input.brandId)
    if (!brand) return res.status(400).json({ error: 'The selected brand does not exist.' })

    if (!database) {
      const store = await getLocalStore()
      const index = store.knowledge.findIndex((entry) => entry.id === req.params.id && entry.brandId === input.brandId)
      if (index < 0) return res.status(404).json({ error: 'Knowledge entry not found for this brand.' })
      store.knowledge[index] = { ...store.knowledge[index], ...input, updated_at: new Date().toISOString() }
      await saveLocalStore(store)
      return res.json({ knowledge: store.knowledge[index] })
    }

    const { data, error } = await database.from('knowledge_entries').update({
      category: input.category,
      title: input.title,
      content: input.content,
      updated_at: new Date().toISOString(),
    }).eq('id', req.params.id).eq('brand_id', input.brandId)
      .select('id,brand_id,category,title,content,created_at,updated_at').maybeSingle()
    if (error) throw supabaseError(error)
    if (!data) return res.status(404).json({ error: 'Knowledge entry not found for this brand.' })
    return res.json({ knowledge: { ...data, brandId: data.brand_id } })
  } catch (error) {
    next(error)
  }
})

app.delete('/api/knowledge/:id', async (req, res, next) => {
  try {
    const brandId = req.query.brandId
    if (typeof brandId !== 'string' || !brandId) return res.status(400).json({ error: 'brandId is required.' })
    if (!database) {
      const store = await getLocalStore()
      const index = store.knowledge.findIndex((entry) => entry.id === req.params.id && entry.brandId === brandId)
      if (index < 0) return res.status(404).json({ error: 'Knowledge entry not found for this brand.' })
      store.knowledge.splice(index, 1)
      await saveLocalStore(store)
      return res.status(204).end()
    }

    const { data, error } = await database.from('knowledge_entries').delete()
      .eq('id', req.params.id).eq('brand_id', brandId).select('id').maybeSingle()
    if (error) throw supabaseError(error)
    if (!data) return res.status(404).json({ error: 'Knowledge entry not found for this brand.' })
    return res.status(204).end()
  } catch (error) {
    next(error)
  }
})

app.post('/api/generate-reply', async (req, res, next) => {
  try {
    const { conversationId, brandId, customerMessage } = req.body || {}
    if (![conversationId, brandId, customerMessage].every((value) => typeof value === 'string' && value.trim())) {
      return res.status(400).json({ error: 'conversationId, brandId, and customerMessage are required.' })
    }

    const brands = await getBrands()
    const brand = brands.find((item) => item.id === brandId)
    if (!brand) return res.status(404).json({ error: 'Brand not found.' })

    let conversation
    if (!database) {
      const store = await getLocalStore()
      conversation = store.conversations.find((item) => item.id === conversationId)
    } else {
      const { data, error } = await database.from('conversations')
        .select('id,brand_id').eq('id', conversationId).maybeSingle()
      if (error) throw supabaseError(error)
      conversation = data ? { id: data.id, brandId: data.brand_id } : null
    }
    if (!conversation) return res.status(404).json({ error: 'Conversation not found.' })
    if (conversation.brandId !== brandId) return res.status(400).json({ error: 'Brand does not match the selected conversation.' })

    const allBrandKnowledge = await getKnowledge(brandId)
    const retrievedContext = retrieveKnowledge(allBrandKnowledge, customerMessage)
    const contextText = formatContext(retrievedContext)
    let suggestedResponse
    if (!retrievedContext.length) {
      suggestedResponse = unsupportedResponse()
    } else {
      suggestedResponse = outOfPolicyResponse(retrievedContext, customerMessage)
      if (!suggestedResponse) {
        try {
          suggestedResponse = await generateWithOpenRouter({
            brandName: brand.name,
            customerMessage: customerMessage.trim(),
            context: contextText,
          })
        } catch (error) {
          const failedLog = await insertAiLog({
            conversationId,
            customerMessage: customerMessage.trim(),
            retrievedContext: contextText,
            aiResponse: null,
          })
          return res.status(error.status || 503).json({
            error: error.message,
            retrievedContext,
            logId: failedLog.id,
            metadata: { brand: brand.name, conversationId, matchedCategories: retrievedContext.map((entry) => entry.category) },
          })
        }
      }
    }
    const log = await insertAiLog({
      conversationId,
      customerMessage: customerMessage.trim(),
      retrievedContext: contextText,
      aiResponse: suggestedResponse,
    })

    return res.json({
      suggestedResponse,
      retrievedContext,
      logId: log.id,
      metadata: { brand: brand.name, conversationId, matchedCategories: retrievedContext.map((entry) => entry.category) },
    })
  } catch (error) {
    next(error)
  }
})

app.post('/api/conversations/:id/messages', async (req, res, next) => {
  try {
    const { content, aiLogId, originalAiResponse } = req.body || {}
    if (typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'A non-empty final response is required.' })
    }

    if (!database) {
      const store = await getLocalStore()
      const conversation = store.conversations.find((item) => item.id === req.params.id)
      if (!conversation) return res.status(404).json({ error: 'Conversation not found.' })
      const message = { id: `message-${crypto.randomUUID()}`, sender: 'agent', content: content.trim(), created_at: new Date().toISOString() }
      conversation.messages.push(message)
      if (aiLogId) {
        const log = store.aiLogs.find((item) => item.id === aiLogId && item.conversationId === conversation.id)
        if (log) {
          log.agent_edited_response = content.trim() === log.aiResponse ? null : content.trim()
          log.final_response = content.trim()
        }
      } else if (originalAiResponse) {
        store.aiLogs.push({
          id: `log-${crypto.randomUUID()}`,
          conversationId: conversation.id,
          customerMessage: '',
          retrievedContext: '',
          aiResponse: originalAiResponse,
          agent_edited_response: content.trim() === originalAiResponse ? null : content.trim(),
          final_response: content.trim(),
          created_at: new Date().toISOString(),
        })
      }
      await saveLocalStore(store)
      return res.status(201).json({ message })
    }

    const { data: conversation, error: conversationError } = await database.from('conversations')
      .select('id').eq('id', req.params.id).maybeSingle()
    if (conversationError) throw supabaseError(conversationError)
    if (!conversation) return res.status(404).json({ error: 'Conversation not found.' })

    const { data: message, error: messageError } = await database.from('messages').insert({
      conversation_id: conversation.id,
      sender: 'agent',
      content: content.trim(),
    }).select('id,sender,content,created_at').single()
    if (messageError) throw supabaseError(messageError)

    if (aiLogId) {
      const { error } = await database.from('ai_logs').update({
        agent_edited_response: content.trim() === originalAiResponse ? null : content.trim(),
        final_response: content.trim(),
      }).eq('id', aiLogId).eq('conversation_id', conversation.id)
      if (error) throw supabaseError(error)
    }
    return res.status(201).json({ message })
  } catch (error) {
    next(error)
  }
})

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API route not found.' })
})

app.use(express.static(path.join(root, 'dist')))

app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api') || !req.accepts('html')) return next()
  return res.sendFile(path.join(root, 'dist', 'index.html'), (error) => {
    if (error) next(error)
  })
})

app.use((req, res) => {
  res.status(404).send(req.path.startsWith('/api') ? 'API route not found.' : 'Not found.')
})

app.use((error, _req, res, _next) => {
  console.error(error)
  res.status(error.status || 500).json({
    error: error.status ? error.message : 'The request could not be completed. Please try again.',
  })
})

app.listen(port, () => {
  console.log(`CX Reply Assistant API listening on http://localhost:${port} (${database ? 'Supabase' : 'persistent local demo'} mode)`)
})
