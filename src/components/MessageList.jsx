export default function MessageList({ messages }) {
  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-800">Conversation</h2>
      {messages.map((message) => (
        <div
          key={message.id}
          className={`max-w-3xl rounded-xl px-4 py-3 ${
            message.sender === 'customer'
              ? 'ml-auto bg-slate-100 text-slate-800'
              : 'bg-blue-50 text-slate-800'
          }`}
        >
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {message.sender}
          </div>
          <p className="text-sm leading-6">{message.content}</p>
        </div>
      ))}
    </div>
  )
}
