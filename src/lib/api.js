import { getAccessToken, supabase } from './supabase'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

export async function fetchJson(url, options = {}) {
  const token = await getAccessToken()
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: 'Request failed.' }))
    const error = new Error(payload.error || 'Request failed')
    error.payload = payload
    throw error
  }

  if (response.status === 204) return null
  return response.json()
}

export async function fetchBrands() {
  return fetchJson('/brands')
}

export async function fetchConversations(brandId) {
  const query = brandId ? `?brandId=${encodeURIComponent(brandId)}` : ''
  return fetchJson(`/conversations${query}`)
}

export async function fetchKnowledge(brandId) {
  const query = brandId ? `?brandId=${encodeURIComponent(brandId)}` : ''
  return fetchJson(`/knowledge${query}`)
}

export async function generateReply({ conversationId, brandId, customerMessage }) {
  if (supabase && import.meta.env.VITE_USE_SUPABASE_FUNCTIONS === 'true') {
    const token = await getAccessToken()
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-reply`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ conversationId, brandId, customerMessage }),
    })
    const payload = await response.json().catch(() => ({ error: 'AI service returned an invalid response.' }))
    if (!response.ok) {
      const error = new Error(payload.error || 'Reply generation failed.')
      error.payload = payload
      throw error
    }
    return payload
  }

  return fetchJson('/generate-reply', {
    method: 'POST',
    body: JSON.stringify({ conversationId, brandId, customerMessage }),
  })
}

export async function createKnowledge(entry) {
  return fetchJson('/knowledge', { method: 'POST', body: JSON.stringify(entry) })
}

export async function updateKnowledge(id, entry) {
  return fetchJson(`/knowledge/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(entry),
  })
}

export async function deleteKnowledge(id, brandId) {
  return fetchJson(`/knowledge/${encodeURIComponent(id)}?brandId=${encodeURIComponent(brandId)}`, {
    method: 'DELETE',
  })
}

export async function approveReply(conversationId, { content, aiLogId, originalAiResponse }) {
  return fetchJson(`/conversations/${encodeURIComponent(conversationId)}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content, aiLogId, originalAiResponse }),
  })
}
