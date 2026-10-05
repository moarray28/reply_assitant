export default function RetrievedKnowledge({ items }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-lg font-semibold text-slate-800">Retrieved Knowledge</h3>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">No relevant policy found for this conversation.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-700">{item.category}</p>
              <p className="mt-1 text-sm text-slate-600">{item.content}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
