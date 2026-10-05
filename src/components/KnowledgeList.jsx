export default function KnowledgeList({ items, brandName, onAdd, onEdit, onDelete, deletingId }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.12em] text-slate-500">Knowledge Base</p>
          <h2 className="text-2xl font-bold text-slate-800">{brandName}</h2>
        </div>
        <button type="button" onClick={onAdd} className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-500">
          + Add Policy
        </button>
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">No knowledge entries for this brand yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{item.category}</p>
                  <p className="mt-1 font-semibold text-slate-800">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.content}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => onEdit(item)} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100">Edit</button>
                  <button
                    type="button"
                    onClick={() => onDelete(item)}
                    disabled={deletingId === item.id}
                    className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 disabled:opacity-60"
                  >
                    {deletingId === item.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
