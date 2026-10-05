import { useEffect, useMemo, useState } from 'react'
import ConversationList from '../components/ConversationList'
import MessageList from '../components/MessageList'
import ReplyPanel from '../components/ReplyPanel'
import RetrievedKnowledge from '../components/RetrievedKnowledge'
import { approveReply, fetchBrands, fetchConversations, generateReply } from '../lib/api'

const manualFallback = 'AI service is currently unavailable. Please draft the response manually.'

export default function ConversationPage() {
  const [brands, setBrands] = useState([])
  const [conversations, setConversations] = useState([])
  const [selectedConversationId, setSelectedConversationId] = useState('')
  const [selectedBrandId, setSelectedBrandId] = useState('')
  const [suggestion, setSuggestion] = useState('')
  const [retrievedKnowledge, setRetrievedKnowledge] = useState([])
  const [aiLogId, setAiLogId] = useState(null)
  const [originalAiResponse, setOriginalAiResponse] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    fetchBrands()
      .then(({ brands: results }) => {
        if (!active) return
        setBrands(results)
        setSelectedBrandId((current) => current || results[0]?.id || '')
      })
      .catch((requestError) => {
        if (active) setError(`Unable to load brands: ${requestError.message}`)
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!selectedBrandId) return undefined
    let active = true
    setError('')
    setNotice('')
    setSuggestion('')
    setRetrievedKnowledge([])
    setAiLogId(null)
    setOriginalAiResponse('')

    fetchConversations(selectedBrandId)
      .then(({ conversations: results }) => {
        if (!active) return
        setConversations(results)
        setSelectedConversationId(results[0]?.id || '')
      })
      .catch((requestError) => {
        if (active) {
          setConversations([])
          setSelectedConversationId('')
          setError(`Unable to load conversations: ${requestError.message}`)
        }
      })

    return () => { active = false }
  }, [selectedBrandId])

  const visibleConversations = useMemo(
    () => conversations.filter((conversation) => conversation.brandId === selectedBrandId),
    [conversations, selectedBrandId],
  )
  const selectedConversation = visibleConversations.find((conversation) => conversation.id === selectedConversationId) ?? null
  const selectedBrand = brands.find((brand) => brand.id === selectedBrandId) ?? null

  const handleGenerateReply = async () => {
    if (!selectedConversation || !selectedBrand || isLoading) return
    const latestCustomerMessage = [...selectedConversation.messages].reverse().find((message) => message.sender === 'customer')
    if (!latestCustomerMessage) {
      setError('This conversation does not have a customer message to answer.')
      return
    }

    setIsLoading(true)
    setError('')
    setNotice('')
    try {
      const result = await generateReply({
        conversationId: selectedConversation.id,
        brandId: selectedBrand.id,
        customerMessage: latestCustomerMessage.content,
      })
      setSuggestion(result.suggestedResponse)
      setOriginalAiResponse(result.suggestedResponse)
      setRetrievedKnowledge(result.retrievedContext || [])
      setAiLogId(result.logId || null)
    } catch (requestError) {
      setSuggestion((current) => current || manualFallback)
      setRetrievedKnowledge(requestError.payload?.retrievedContext || [])
      setAiLogId(requestError.payload?.logId || null)
      setOriginalAiResponse('')
      setError(requestError.message || manualFallback)
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!selectedConversation || !suggestion.trim() || isSaving) return
    setIsSaving(true)
    setError('')
    setNotice('')
    try {
      const { message } = await approveReply(selectedConversation.id, {
        content: suggestion.trim(),
        aiLogId,
        originalAiResponse,
      })
      setConversations((current) => current.map((conversation) =>
        conversation.id === selectedConversation.id
          ? { ...conversation, messages: [...conversation.messages, message] }
          : conversation,
      ))
      setNotice('Final response saved to the conversation.')
      setSuggestion('')
      setRetrievedKnowledge([])
      setAiLogId(null)
      setOriginalAiResponse('')
    } catch (requestError) {
      setError(`Unable to save the response: ${requestError.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  if (!selectedBrand) {
    return <div className="px-4 py-8 text-center text-slate-600">{error || 'Loading brands...'}</div>
  }

  return (
    <div className="px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-slate-500">Workspace</p>
              <h1 className="text-3xl font-bold text-slate-900">CX Reply Assistant</h1>
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor="conversation-brand" className="text-sm font-medium text-slate-700">Brand</label>
              <select
                id="conversation-brand"
                value={selectedBrandId}
                onChange={(event) => setSelectedBrandId(event.target.value)}
                className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
              >
                {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {notice && <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

        {!selectedConversation ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">
            No conversations available for {selectedBrand.name}.
          </div>
        ) : (
          <>
            <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="grid gap-3 md:grid-cols-4">
                <div><p className="text-xs uppercase tracking-wide text-slate-500">Brand</p><p className="font-semibold text-slate-800">{selectedBrand.name}</p></div>
                <div><p className="text-xs uppercase tracking-wide text-slate-500">Customer</p><p className="font-semibold text-slate-800">{selectedConversation.customerName}</p></div>
                <div><p className="text-xs uppercase tracking-wide text-slate-500">Order</p><p className="font-semibold text-slate-800">{selectedConversation.orderId}</p></div>
                <div><p className="text-xs uppercase tracking-wide text-slate-500">Status</p><p className="font-semibold text-slate-800">{selectedConversation.status}</p></div>
              </div>
            </div>

            <div className="flex flex-col gap-6 lg:flex-row">
              <ConversationList
                conversations={visibleConversations}
                selectedId={selectedConversation.id}
                onSelect={(id) => {
                  setSelectedConversationId(id)
                  setSuggestion('')
                  setRetrievedKnowledge([])
                  setAiLogId(null)
                  setOriginalAiResponse('')
                  setError('')
                  setNotice('')
                }}
              />
              <div className="flex-1 space-y-6">
                <MessageList messages={selectedConversation.messages} />
                <ReplyPanel
                  suggestion={suggestion}
                  retrievedKnowledge={retrievedKnowledge}
                  isLoading={isLoading}
                  isSaving={isSaving}
                  onGenerate={handleGenerateReply}
                  onRegenerate={handleGenerateReply}
                  onApprove={handleApprove}
                  onEdit={setSuggestion}
                />
                <RetrievedKnowledge items={retrievedKnowledge} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
