export default function ReplyPanel({
  suggestion = 'AI service is currently unavailable. Please draft the response manually.',
  retrievedKnowledge = [],
  isLoading = false,
  isSaving = false,
  onGenerate,
  onRegenerate,
  onApprove,
  onEdit,
}) {
  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">AI Suggested Reply</h3>
        <button
          type="button"
          onClick={onGenerate}
          disabled={isLoading}
          className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? 'Generating...' : 'Generate Reply'}
        </button>
      </div>

      <textarea
        value={suggestion}
        onChange={(event) => onEdit?.(event.target.value)}
        placeholder="Generate a suggestion or write a manual response..."
        className="min-h-[120px] w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onEdit?.(suggestion)}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onRegenerate}
          disabled={isLoading}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-60"
        >
          Regenerate
        </button>
        <button
          type="button"
          onClick={onApprove}
          disabled={!suggestion.trim() || isLoading || isSaving}
          className="rounded-md bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? 'Saving...' : 'Approve & Send'}
        </button>
      </div>

      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600">
        Retrieval used: {retrievedKnowledge.length ? retrievedKnowledge.map((item) => item.category).join(', ') : 'No relevant policy'}
      </div>
    </div>
  )
}
