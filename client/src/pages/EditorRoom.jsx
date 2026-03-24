import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../context/AuthContext';
import ChatPanel from '../components/ChatPanel';
import SnapshotPanel from '../components/SnapshotPanel';
import OutputPanel from '../components/OutputPanel';
import { api } from '../utils/api';

const LANGUAGES = [
  'javascript', 'typescript', 'python', 'java', 'cpp', 'html', 'css', 'json', 'markdown',
];

export default function EditorRoom() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, connected, reconnecting, emit, on } = useSocket(slug);

  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [roomName, setRoomName] = useState('');
  const [users, setUsers] = useState([]);
  const [role, setRole] = useState('editor');
  const [theme, setTheme] = useState('vs-dark');
  const [sidebarTab, setSidebarTab] = useState(null); // null, 'chat', 'snapshots'
  const [fontSize, setFontSize] = useState(14);
  const [wordWrap, setWordWrap] = useState('off');
  const [minimap, setMinimap] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [output, setOutput] = useState([]);
  const [running, setRunning] = useState(false);

  const editorRef = useRef(null);
  const iframeRef = useRef(null);
  const isRemoteChange = useRef(false);
  const debounceTimer = useRef(null);
  const decorationsRef = useRef([]);

  // Socket event handlers
  useEffect(() => {
    const cleanups = [
      on('room-state', (state) => {
        isRemoteChange.current = true;
        setCode(state.code);
        setLanguage(state.language);
        setRoomName(state.roomName);
        setUsers(state.users);
        setRole(state.role);
        // Set value in editor if mounted
        if (editorRef.current) {
          const editor = editorRef.current;
          const pos = editor.getPosition();
          editor.setValue(state.code);
          if (pos) editor.setPosition(pos);
        }
        isRemoteChange.current = false;
      }),
      on('code-change', ({ code: newCode }) => {
        isRemoteChange.current = true;
        setCode(newCode);
        if (editorRef.current) {
          const editor = editorRef.current;
          const pos = editor.getPosition();
          const scrollTop = editor.getScrollTop();
          editor.setValue(newCode);
          if (pos) editor.setPosition(pos);
          editor.setScrollTop(scrollTop);
        }
        isRemoteChange.current = false;
      }),
      on('user-joined', ({ users: newUsers }) => {
        setUsers(newUsers);
      }),
      on('user-left', ({ users: newUsers }) => {
        setUsers(newUsers);
      }),
      on('language-change', ({ language: lang }) => {
        setLanguage(lang);
      }),
      on('cursor-update', ({ userId, displayName, position, color }) => {
        updateRemoteCursor(userId, displayName, position, color);
      }),
    ];

    return () => cleanups.forEach((fn) => fn?.());
  }, [on]);

  const updateRemoteCursor = useCallback((userId, displayName, position, color) => {
    const editor = editorRef.current;
    if (!editor) return;

    const monaco = window.monaco;
    if (!monaco) return;

    // Remove old decorations for this user and recreate all
    const newDecorations = [{
      range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
      options: {
        className: 'remote-cursor',
        stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        beforeContentClassName: `remote-cursor-widget`,
        hoverMessage: { value: displayName },
        overviewRuler: {
          color,
          position: monaco.editor.OverviewRulerLane.Center,
        },
      },
    }];

    // We store cursors by userId
    if (!editor._remoteCursors) editor._remoteCursors = {};

    if (editor._remoteCursors[userId]) {
      editor._remoteCursors[userId] = editor.deltaDecorations(
        editor._remoteCursors[userId],
        newDecorations
      );
    } else {
      editor._remoteCursors[userId] = editor.deltaDecorations([], newDecorations);
    }
  }, []);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    window.monaco = monaco;

    // Add custom CSS for cursor colors dynamically
    const style = document.createElement('style');
    style.textContent = `
      .remote-cursor { border-left: 2px solid orange; }
      .remote-cursor-widget::before { content: ''; }
    `;
    document.head.appendChild(style);
  };

  const handleEditorChange = (value) => {
    if (isRemoteChange.current) return;
    setCode(value || '');

    // Debounce emit
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      emit('code-change', { slug, code: value || '' });
    }, 50);
  };

  const handleCursorChange = (e) => {
    if (!e) return;
    const position = editorRef.current?.getPosition();
    if (position) {
      emit('cursor-update', {
        slug,
        position: { lineNumber: position.lineNumber, column: position.column },
      });
    }
  };

  const DEFAULT_CODE = {
    javascript: '// JavaScript\nconsole.log("Hello, world!");\n',
    typescript: '// TypeScript\nconst greeting: string = "Hello, world!";\nconsole.log(greeting);\n',
    python: '# Python\nprint("Hello, world!")\n',
    java: '// Java\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, world!");\n    }\n}\n',
    cpp: '// C++\n#include <iostream>\n\nint main() {\n    std::cout << "Hello, world!" << std::endl;\n    return 0;\n}\n',
    html: '<!DOCTYPE html>\n<html>\n<head>\n  <title>Page</title>\n</head>\n<body>\n  <h1>Hello, world!</h1>\n</body>\n</html>\n',
    css: '/* CSS */\nbody {\n  font-family: sans-serif;\n  background: #1e1e1e;\n  color: #fff;\n}\n',
    json: '{\n  "message": "Hello, world!"\n}\n',
    markdown: '# Hello, world!\n\nStart writing markdown here.\n',
  };

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    emit('language-change', { slug, language: newLang });

    const newCode = DEFAULT_CODE[newLang] || `// ${newLang}\n`;
    setCode(newCode);
    if (editorRef.current) {
      editorRef.current.setValue(newCode);
    }
    emit('code-change', { slug, code: newCode });
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const restoreSnapshot = (snapshotCode) => {
    if (!confirm('Restore this snapshot? This will replace the current code.')) return;
    isRemoteChange.current = true;
    setCode(snapshotCode);
    if (editorRef.current) {
      editorRef.current.setValue(snapshotCode);
    }
    isRemoteChange.current = false;
    emit('code-change', { slug, code: snapshotCode });
  };

  const RUNNABLE = ['javascript', 'typescript', 'python', 'java', 'cpp'];

  const runCode = async () => {
    if (running) return;
    setShowOutput(true);
    setOutput([{ type: 'info', text: `Running ${language}...` }]);
    setRunning(true);

    if (language === 'javascript') {
      // Run JS client-side in sandboxed iframe
      runJsInSandbox(code);
    } else {
      // Run server-side
      try {
        const result = await api.executeCode(code, language);
        const entries = [];
        if (result.stdout) entries.push({ type: 'stdout', text: result.stdout });
        if (result.stderr) entries.push({ type: 'stderr', text: result.stderr });
        entries.push({ type: 'exit', code: result.exitCode });
        setOutput((prev) => [...prev, ...entries]);
      } catch (err) {
        setOutput((prev) => [...prev, { type: 'stderr', text: err.message }]);
      }
      setRunning(false);
    }
  };

  const runJsInSandbox = (jsCode) => {
    // Remove old iframe
    if (iframeRef.current) {
      iframeRef.current.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.sandbox = 'allow-scripts';
    document.body.appendChild(iframe);
    iframeRef.current = iframe;

    // Listen for messages from sandbox
    const handler = (e) => {
      if (e.source !== iframe.contentWindow) return;
      const msg = e.data;
      if (msg?.type === 'console') {
        setOutput((prev) => [...prev, { type: 'stdout', text: msg.args.join(' ') }]);
      } else if (msg?.type === 'error') {
        setOutput((prev) => [...prev, { type: 'stderr', text: msg.message }]);
      } else if (msg?.type === 'done') {
        setOutput((prev) => [...prev, { type: 'exit', code: 0 }]);
        setRunning(false);
        window.removeEventListener('message', handler);
      }
    };
    window.addEventListener('message', handler);

    // Timeout safety
    setTimeout(() => {
      if (running) {
        setOutput((prev) => [...prev, { type: 'stderr', text: '[Execution timed out]' }, { type: 'exit', code: 1 }]);
        setRunning(false);
        window.removeEventListener('message', handler);
        iframe.remove();
      }
    }, 10000);

    const sandboxCode = `
      <script>
        const _log = [];
        const _parent = parent;
        console.log = (...args) => _parent.postMessage({ type: 'console', args: args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)) }, '*');
        console.error = console.log;
        console.warn = console.log;
        console.info = console.log;
        try {
          ${jsCode}
          _parent.postMessage({ type: 'done' }, '*');
        } catch(e) {
          _parent.postMessage({ type: 'error', message: e.toString() }, '*');
          _parent.postMessage({ type: 'done' }, '*');
        }
      <\/script>
    `;
    iframe.srcdoc = sandboxCode;
  };

  // Connection status
  const statusColor = connected ? 'bg-green-500' : reconnecting ? 'bg-yellow-500' : 'bg-red-500';
  const statusText = connected ? 'Connected' : reconnecting ? 'Reconnecting...' : 'Disconnected';

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Reconnecting banner */}
      {reconnecting && (
        <div className="bg-yellow-600 text-white text-center text-sm py-1">
          Connection lost. Attempting to reconnect...
        </div>
      )}

      {/* Top Bar */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center gap-4 shrink-0">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-gray-400 hover:text-white text-sm transition-colors"
        >
          &larr; Back
        </button>

        <h1 className="text-white font-medium truncate">{roomName || slug}</h1>

        <select
          value={language}
          onChange={(e) => handleLanguageChange(e.target.value)}
          disabled={role === 'viewer'}
          className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none"
        >
          {LANGUAGES.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>

        {/* Connected Users */}
        <div className="flex items-center gap-1 ml-auto">
          {users.map((u, i) => (
            <div
              key={u.userId || i}
              title={u.displayName}
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-gray-800"
              style={{ backgroundColor: u.color || u.avatar }}
            >
              {u.displayName?.[0]?.toUpperCase()}
            </div>
          ))}
        </div>

        <button
          onClick={copyLink}
          className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-3 py-1 rounded transition-colors"
        >
          {copied ? 'Copied!' : 'Share'}
        </button>

        {RUNNABLE.includes(language) && (
          <button
            onClick={runCode}
            disabled={running}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm px-3 py-1 rounded transition-colors flex items-center gap-1"
          >
            {running ? 'Running...' : '\u25B6 Run'}
          </button>
        )}

        {/* Settings */}
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none"
        >
          <option value="vs-dark">Dark</option>
          <option value="light">Light</option>
        </select>

        <select
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
          className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none"
        >
          {[12, 13, 14, 16, 18, 20].map((s) => (
            <option key={s} value={s}>{s}px</option>
          ))}
        </select>

        <button
          onClick={() => setSidebarTab(sidebarTab === 'chat' ? null : 'chat')}
          className={`text-sm px-2 py-1 rounded transition-colors ${
            sidebarTab === 'chat' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Chat
        </button>

        <button
          onClick={() => setSidebarTab(sidebarTab === 'snapshots' ? null : 'snapshots')}
          className={`text-sm px-2 py-1 rounded transition-colors ${
            sidebarTab === 'snapshots' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          History
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor + Output */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <div className={showOutput ? 'flex-1 min-h-0' : 'flex-1'}>
            <Editor
              height="100%"
              language={language}
              value={code}
              theme={theme}
              onChange={handleEditorChange}
              onMount={handleEditorDidMount}
              options={{
                fontSize,
                minimap: { enabled: minimap },
                wordWrap,
                readOnly: role === 'viewer',
                automaticLayout: true,
                scrollBeyondLastLine: false,
                padding: { top: 8 },
                cursorBlinking: 'smooth',
                smoothScrolling: true,
              }}
            />
          </div>

          {/* Output Panel */}
          {showOutput && (
            <div className="h-48 shrink-0">
              <OutputPanel
                output={output}
                running={running}
                onClear={() => { setOutput([]); setShowOutput(false); }}
              />
            </div>
          )}
        </div>

        {/* Sidebar */}
        {sidebarTab && (
          <div className="w-72 bg-gray-800 border-l border-gray-700 flex flex-col shrink-0">
            {sidebarTab === 'chat' && (
              <ChatPanel socket={socket} on={on} slug={slug} />
            )}
            {sidebarTab === 'snapshots' && (
              <SnapshotPanel slug={slug} onRestore={restoreSnapshot} />
            )}
          </div>
        )}
      </div>

      {/* Status Bar */}
      <footer className="bg-gray-800 border-t border-gray-700 px-4 py-1 flex items-center gap-4 text-xs text-gray-400 shrink-0">
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${statusColor}`} />
          {statusText}
        </div>
        <span>{users.length} user(s) online</span>
        <span className="ml-auto">
          {role === 'viewer' ? 'Read-only' : 'Editor'}
        </span>
        <button
          onClick={() => setMinimap(!minimap)}
          className="hover:text-white transition-colors"
        >
          Minimap: {minimap ? 'On' : 'Off'}
        </button>
        <button
          onClick={() => setWordWrap(wordWrap === 'off' ? 'on' : 'off')}
          className="hover:text-white transition-colors"
        >
          Wrap: {wordWrap === 'on' ? 'On' : 'Off'}
        </button>
      </footer>
    </div>
  );
}
