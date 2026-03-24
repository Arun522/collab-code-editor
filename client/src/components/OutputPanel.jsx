import { useRef, useEffect } from 'react';

export default function OutputPanel({ output, running, onClear }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [output]);

  return (
    <div className="flex flex-col h-full bg-gray-900 border-t border-gray-700">
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800 border-b border-gray-700 shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-400">Output</h3>
          {running && (
            <div className="flex items-center gap-1 text-xs text-yellow-400">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
              Running...
            </div>
          )}
        </div>
        <button
          onClick={onClear}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          Clear
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 font-mono text-sm">
        {output.length === 0 && !running ? (
          <p className="text-gray-600 text-xs">Click Run to execute your code</p>
        ) : (
          output.map((entry, i) => (
            <div key={i} className="mb-1">
              {entry.type === 'stdout' && (
                <pre className="text-green-400 whitespace-pre-wrap break-words">{entry.text}</pre>
              )}
              {entry.type === 'stderr' && (
                <pre className="text-red-400 whitespace-pre-wrap break-words">{entry.text}</pre>
              )}
              {entry.type === 'info' && (
                <pre className="text-blue-400 whitespace-pre-wrap break-words">{entry.text}</pre>
              )}
              {entry.type === 'exit' && (
                <pre className={`text-xs mt-1 ${entry.code === 0 ? 'text-green-600' : 'text-red-600'}`}>
                  Process exited with code {entry.code}
                </pre>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
