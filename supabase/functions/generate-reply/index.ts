import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  formatContext,
  outOfPolicyResponse,
  retrieveKnowledge,
  unsupportedResponse,
} from '../_shared/retrieval.js'

const allowedOrigin = Deno.env.get('FRONTEND_ORIGIN') || '*'
const siteUrl = Deno.env.get('OPENROUTER_SITE_URL') || Deno.env.get('FRONTEND_ORIGIN') || 'http://localhost:5173'
const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function respond(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders })
}

async function recordLog(
  database: ReturnType<typeof createClient>,
  conversationId: string,
  customerMessage: string,
  retrievedContext: string,
  aiResponse: string | null,
) {
  const { data, error } = await database.from('ai_logs').insert({
    conversation_id: conversationId,
    customer_message: customerMessage,
    retrieved_context: retrievedContext,
    ai_response: aiResponse,
  }).select('id').single()
  if (error) throw new HttpError(500, 'Unable to save the AI interaction log.')
  return data.id as string
}

async function generateWithOpenRouter(brandName: string, customerMessage: string, context: string) {
  const apiKey = Deno.env.get('OPENROUTER_API_KEY')
  if (!apiKey) throw new HttpError(503, 'AI service is not configured. Please draft the response manually.')

  let response: Response
  try {
    response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: AbortSignal.timeout(25000),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': siteUrl,
        'X-Title': 'CX Reply Assistant',
      },
      body: JSON.stringify({
        model: Deno.env.get('OPENROUTER_MODEL') || 'openai/gpt-4o-mini',
        temperature: 0.2,
        max_tokens: 350,
        messages: [
          {
            role: 'system',
            content: `You draft concise, polite support responses for ${brandName}. Use only the supplied brand knowledge. Do not invent policies or promise actions not supported by the knowledge. If no relevant knowledge is supplied, say the policy is unavailable and recommend human verification. Do not claim an action has been completed.`,
          },
          {
            role: 'user',
            content: `CUSTOMER MESSAGE:\n${customerMessage}\n\nRETRIEVED BRAND KNOWLEDGE:\n${context}`,
          },
        ],
      }),
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new HttpError(504, 'AI service timed out. Please draft the response manually.')
    }
    throw new HttpError(503, 'AI service is unavailable. Please draft the response manually.')
  }

  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new HttpError(502, `AI provider returned HTTP ${response.status}.`)
  const result = payload?.choices?.[0]?.message?.content
  if (typeof result !== 'string' || !result.trim()) throw new HttpError(502, 'AI provider returned an empty or invalid reply.')
  return result.trim()
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return respond(405, { error: 'Method not allowed.' })

  try {
    const authorization = request.headers.get('Authorization') || ''
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
    if (!token) throw new HttpError(401, 'Sign in to generate a reply.')

    const body = await request.json().catch(() => null)
    const { conversationId, brandId, customerMessage } = body || {}
    if (![conversationId, brandId, customerMessage].every(
      (value) => typeof value === 'string' && value.trim() && value.length <= 8000,
    )) {
      throw new HttpError(400, 'conversationId, brandId, and a customerMessage under 8,000 characters are required.')
    }

    const url = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!url || !anonKey || !serviceKey) throw new HttpError(500, 'Supabase function environment is incomplete.')

    const authClient = createClient(url, anonKey, { auth: { persistSession: false } })
    const { data: authData, error: authError } = await authClient.auth.getUser(token)
    if (authError || !authData.user) throw new HttpError(401, 'Your session is invalid or expired. Please sign in again.')

    const database = createClient(url, serviceKey, { auth: { persistSession: false } })
    const { data: conversation, error: conversationError } = await database
      .from('conversations')
      .select('id,brand_id')
      .eq('id', conversationId.trim())
      .maybeSingle()
    if (conversationError) throw new HttpError(500, 'Unable to load the conversation.')
    if (!conversation) throw new HttpError(404, 'Conversation not found.')
    if (conversation.brand_id !== brandId.trim()) throw new HttpError(400, 'Brand does not match the selected conversation.')

    const [{ data: brand, error: brandError }, { data: entries, error: knowledgeError }] = await Promise.all([
      database.from('brands').select('id,name').eq('id', brandId.trim()).maybeSingle(),
      database.from('knowledge_entries')
        .select('id,brand_id,category,title,content,created_at,updated_at')
        .eq('brand_id', brandId.trim()),
    ])
    if (brandError || knowledgeError) throw new HttpError(500, 'Unable to load brand knowledge.')
    if (!brand) throw new HttpError(404, 'Brand not found.')

    const retrievedContext = retrieveKnowledge(entries || [], customerMessage.trim())
    const contextText = formatContext(retrievedContext)
    let suggestedResponse: string
    if (retrievedContext.length === 0) {
      suggestedResponse = unsupportedResponse()
    } else {
      suggestedResponse = outOfPolicyResponse(retrievedContext, customerMessage) || ''
      if (!suggestedResponse) {
        try {
          suggestedResponse = await generateWithOpenRouter(brand.name, customerMessage.trim(), contextText)
        } catch (error) {
          const logId = await recordLog(database, conversation.id, customerMessage.trim(), contextText, null)
          const status = error instanceof HttpError ? error.status : 503
          const message = error instanceof Error ? error.message : 'AI service is unavailable. Please draft the response manually.'
          return respond(status, {
            error: message,
            retrievedContext,
            logId,
            metadata: { brand: brand.name, conversationId: conversation.id, matchedCategories: retrievedContext.map((entry) => entry.category) },
          })
        }
      }
    }

    const logId = await recordLog(database, conversation.id, customerMessage.trim(), contextText, suggestedResponse)
    return respond(200, {
      suggestedResponse,
      retrievedContext,
      logId,
      metadata: { brand: brand.name, conversationId: conversation.id, matchedCategories: retrievedContext.map((entry) => entry.category) },
    })
  } catch (error) {
    if (error instanceof HttpError) return respond(error.status, { error: error.message })
    console.error(error)
    return respond(500, { error: 'The request could not be completed. Please try again.' })
  }
})
