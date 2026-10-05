import { useEffect, useState } from 'react'
import KnowledgeForm from '../components/KnowledgeForm'
import KnowledgeList from '../components/KnowledgeList'
import { createKnowledge, deleteKnowledge, fetchBrands, fetchKnowledge, updateKnowledge } from '../lib/api'

export default function KnowledgePage() {
  const [brands, setBrands] = useState([])
  const [selectedBrandId, setSelectedBrandId] = useState('')
  const [items, setItems] = useState([])
  const [editingEntry, setEditingEntry] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
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
    setEditingEntry(null)
    setError('')
    fetchKnowledge(selectedBrandId)
      .then(({ knowledge }) => {
        if (active) setItems(knowledge)
      })
      .catch((requestError) => {
        if (active) {
          setItems([])
          setError(`Unable to load knowledge entries: ${requestError.message}`)
        }
      })
    return () => { active = false }
  }, [selectedBrandId])

  const brand = brands.find((item) => item.id === selectedBrandId)

  const handleSave = async (fields) => {
    if (!selectedBrandId) return
    setIsSaving(true)
    setError('')
    setNotice('')
    const payload = { ...fields, brandId: selectedBrandId }
    try {
      const result = editingEntry
        ? await updateKnowledge(editingEntry.id, payload)
        : await createKnowledge(payload)
      setItems((current) => editingEntry
        ? current.map((item) => item.id === editingEntry.id ? result.knowledge : item)
        : [...current, result.knowledge])
      setEditingEntry(null)
      setNotice(editingEntry ? 'Policy updated.' : 'Policy added.')
    } catch (requestError) {
      setError(`Unable to save policy: ${requestError.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (entry) => {
    if (!window.confirm(`Delete "${entry.title}" from ${brand?.name}?`)) return
    setDeletingId(entry.id)
    setError('')
    setNotice('')
    try {
      await deleteKnowledge(entry.id, selectedBrandId)
      setItems((current) => current.filter((item) => item.id !== entry.id))
      if (editingEntry?.id === entry.id) setEditingEntry(null)
      setNotice('Policy deleted.')
    } catch (requestError) {
      setError(`Unable to delete policy: ${requestError.message}`)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-slate-500">Content Management</p>
              <h1 className="text-3xl font-bold text-slate-900">Knowledge Base</h1>
            </div>
            {brands.length > 0 && (
              <div className="flex items-center gap-3">
                <label htmlFor="knowledge-brand-select" className="text-sm font-medium text-slate-700">Brand</label>
                <select
                  id="knowledge-brand-select"
                  value={selectedBrandId}
                  onChange={(event) => {
                    setSelectedBrandId(event.target.value)
                    setNotice('')
                  }}
                  className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                >
                  {brands.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>

        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

        {brand ? (
          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <KnowledgeList
              items={items}
              brandName={brand.name}
              onAdd={() => setEditingEntry(null)}
              onEdit={setEditingEntry}
              onDelete={handleDelete}
              deletingId={deletingId}
            />
            <KnowledgeForm
              key={`${selectedBrandId}-${editingEntry?.id || 'new'}`}
              brandName={brand.name}
              entry={editingEntry}
              isSaving={isSaving}
              onSave={handleSave}
              onCancel={() => setEditingEntry(null)}
            />
          </div>
        ) : (
          <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">Loading brands...</p>
        )}
      </div>
    </div>
  )
}
