import { useEffect, useState } from 'react'

const emptyEntry = { category: '', title: '', content: '' }

export default function KnowledgeForm({ brandName, entry, isSaving, onSave, onCancel }) {
  const [form, setForm] = useState(emptyEntry)

  useEffect(() => {
    setForm(entry ? { category: entry.category, title: entry.title, content: entry.content } : emptyEntry)
  }, [entry])

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }))

  const handleSubmit = (event) => {
    event.preventDefault()
    onSave(form)
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-lg font-semibold text-slate-800">{entry ? 'Edit Policy' : 'Add Policy'}</h3>
      <div className="space-y-3">
        <div>
          <label htmlFor="knowledge-brand" className="mb-1 block text-sm font-medium text-slate-700">Brand</label>
          <input id="knowledge-brand" value={brandName} readOnly className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600" />
        </div>
        <div>
          <label htmlFor="knowledge-category" className="mb-1 block text-sm font-medium text-slate-700">Category</label>
          <input id="knowledge-category" value={form.category} onChange={update('category')} required maxLength={100} placeholder="Damaged Products" className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label htmlFor="knowledge-title" className="mb-1 block text-sm font-medium text-slate-700">Title</label>
          <input id="knowledge-title" value={form.title} onChange={update('title')} required maxLength={160} placeholder="Damaged product reporting window" className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label htmlFor="knowledge-content" className="mb-1 block text-sm font-medium text-slate-700">Content</label>
          <textarea id="knowledge-content" value={form.content} onChange={update('content')} required maxLength={5000} placeholder="Policy details" className="min-h-[140px] w-full rounded-md border border-slate-200 px-3 py-2 text-sm" />
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={isSaving} className="rounded-md bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-500 disabled:opacity-60">
            {isSaving ? 'Saving...' : entry ? 'Save Changes' : 'Save Policy'}
          </button>
          {entry && <button type="button" onClick={onCancel} className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700">Cancel</button>}
        </div>
      </div>
    </form>
  )
}
