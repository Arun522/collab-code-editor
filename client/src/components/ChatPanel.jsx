import { useState, useEffect, useRef } from 'react';

export default function ChatPanel({ socket, on, slug }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    const cleanup = on('chat-message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });
    return cleanup;
  }, [on]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    socket?.emit('chat-message', {
      slug,
      message: input.trim(),
    });
    setInput('');
  };

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-sm font-semibold text-gray-400 px-3 py-2 border-b border-gray-700">
        Chat
      </h3>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && (
          <p className="text-xs text-gray-600 text-center mt-4">No messages yet</p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className="text-sm">
            <span className="font-medium text-blue-400">{msg.displayName}: </span>
            <span className="text-gray-300">{msg.message}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="p-2 border-t border-gray-700 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}
