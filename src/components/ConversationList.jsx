export default function ConversationList({ conversations, selectedId, onSelect }) {
  return (
    <aside className="w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:w-80">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Conversations</h2>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
          {conversations.length}
        </span>
      </div>

      <div className="space-y-3">
        {conversations.map((conversation) => (
          <button
            key={conversation.id}
            type="button"
            onClick={() => onSelect(conversation.id)}
            className={`w-full rounded-lg border p-3 text-left transition ${
              selectedId === conversation.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="font-medium text-slate-800">{conversation.customerName}</p>
              <span className="text-xs text-slate-500">{conversation.orderId}</span>
            </div>
            <p className="mt-1 text-sm text-slate-600">{conversation.status}</p>
            <p className="mt-2 line-clamp-2 text-xs text-slate-500">
              {conversation.messages[conversation.messages.length - 1]?.content}
            </p>
          </button>
        ))}
      </div>
    </aside>
  )
}
