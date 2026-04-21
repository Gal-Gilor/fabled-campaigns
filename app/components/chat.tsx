'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, isToolUIPart, getToolName, UIMessage } from 'ai';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { CHAT_API_PATH } from '../lib/config';
import { Session } from '../lib/db';
import { useSessionContext } from './session-context';

const STARTER_PROMPTS = [
  {
    label: 'Map',
    prompt: 'A flooded underground temple — mossy stone, ankle-deep black water, torchlight reflecting off carved serpent murals',
  },
  {
    label: 'Encounter',
    prompt: 'A goblin ambush in a narrow mountain pass at dusk — thick mist, jagged rocks, no clear escape route',
  },
  {
    label: 'Character',
    prompt: 'I want to create a half-elf ranger who grew up in the sewers of a corrupt city',
  },
  {
    label: 'Rules',
    prompt: 'What are the rules for grappling in D&D 5e?',
  },
];

function extractSubAgentImage(output: unknown): { type: string; src: string; label: string } | null {
  if (typeof output !== 'object' || output === null || !('parts' in output)) return null;
  const msg = output as UIMessage;
  for (const p of (msg.parts ?? [])) {
    if (!isToolUIPart(p) || p.state !== 'output-available') continue;
    try {
      const o = JSON.parse(String(p.output));
      if (o?.type === 'image') return o as { type: string; src: string; label: string };
    } catch { /* not JSON */ }
  }
  return null;
}

// Prepare messages loaded from DB: strip empty assistant messages (aborted streams)
// and detect if the last user message needs a response.
function prepareSessionMessages(msgs: UIMessage[]): { messages: UIMessage[]; regenerateText: string | null } {
  if (msgs.length === 0) return { messages: msgs, regenerateText: null };

  let cleaned = [...msgs];
  const last = cleaned[cleaned.length - 1];

  // Drop trailing empty assistant message (stream was aborted before any text arrived)
  if (last.role === 'assistant') {
    const hasText = last.parts.some(
      (p) => p.type === 'text' && (p as { type: 'text'; text: string }).text.length > 0
    );
    if (!hasText) cleaned = cleaned.slice(0, -1);
  }

  if (cleaned.length === 0) return { messages: cleaned, regenerateText: null };

  const newLast = cleaned[cleaned.length - 1];
  if (newLast.role === 'user') {
    const textPart = newLast.parts.find((p) => p.type === 'text') as { type: 'text'; text: string } | undefined;
    const text = textPart?.text ?? null;
    if (text) {
      // Remove the user message from display; sendMessage will re-add it when regenerating
      return { messages: cleaned.slice(0, -1), regenerateText: text };
    }
  }

  return { messages: cleaned, regenerateText: null };
}

interface ChatInputFormProps {
  input: string;
  status: string;
  formClassName: string;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (value: string) => void;
}

function ChatInputForm({ input, status, formClassName, onSubmit, onChange }: ChatInputFormProps) {
  return (
    <form onSubmit={onSubmit} className={formClassName}>
      <input
        value={input}
        onChange={(e) => onChange(e.target.value)}
        disabled={status !== 'ready'}
        placeholder="Roll to Quest..."
        className="flex-1 rounded-lg px-4 py-3 text-base transition-all outline-none disabled:opacity-50"
        style={{
          background: 'var(--neutral-100)',
          border: '2px solid var(--neutral-200)',
          color: 'var(--neutral-700)',
          fontFamily: 'inherit',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--primary-blue)';
          e.currentTarget.style.background = '#ffffff';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--neutral-200)';
          e.currentTarget.style.background = 'var(--neutral-100)';
        }}
      />
      <button
        type="submit"
        disabled={status !== 'ready' || !input.trim()}
        className="rounded-lg px-5 py-3 text-base font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: 'var(--gradient-primary)' }}
      >
        Send
      </button>
    </form>
  );
}

interface ChatProps {
  initialSessionId?: string;
}

export default function Chat({ initialSessionId }: ChatProps) {
  const [input, setInput] = useState('');
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeSessionIdRef = useRef<string | null>(null);
  const messagesRef = useRef<UIMessage[]>([]);
  const pendingMessageRef = useRef<string | null>(null);

  const { sessions, setSessions, activeSessionId, setActiveSessionId, setHandlers, openSidebar } = useSessionContext();

  const transport = useMemo(
    () => new DefaultChatTransport({
      api: CHAT_API_PATH,
      body: () => ({ sessionId: activeSessionIdRef.current }),
    }),
    []
  );

  const { messages, sendMessage, status, setMessages, stop } = useChat({ transport });

  // Keep refs in sync so async callbacks always have current values
  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const persistMessages = useCallback(async (id: string, msgs: UIMessage[]) => {
    const r = await fetch(`/api/sessions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: msgs }),
    });
    return r.json() as Promise<{ session?: Session }>;
  }, []);

  // On mount: load or create initial session
  useEffect(() => {
    async function init() {
      let list: Session[] = await fetch('/api/sessions')
        .then((r) => r.json())
        .then((d) => d.sessions ?? []);

      if (list.length === 0) {
        const created = await fetch('/api/sessions', { method: 'POST' })
          .then((r) => r.json())
          .then((d) => d.session as Session);
        list = [created];
      }

      setSessions(list);
      const active = initialSessionId
        ? (list.find((s) => s.id === initialSessionId) ?? list[0])
        : list[0];
      setActiveSessionId(active.id);
      try {
        const parsed = JSON.parse(active.messages) as UIMessage[];
        const { messages: preparedMsgs, regenerateText } = prepareSessionMessages(parsed);
        setMessages(preparedMsgs);
        pendingMessageRef.current = regenerateText;
      } catch {
        setMessages([]);
      }
    }
    init();
  }, [setMessages]);

  // Persist messages when a response completes
  useEffect(() => {
    const id = activeSessionIdRef.current;
    if (status === 'ready' && messages.length > 0 && id) {
      persistMessages(id, messages).then((d) => {
        if (d.session) {
          setSessions((prev) => prev.map((s) => (s.id === d.session!.id ? d.session! : s)));
        }
      });
    }
  }, [messages, status, persistMessages]);

  // Auto-regenerate when a session is loaded with an unanswered user message.
  // Uses a ref (not state) so the null-clear on first fire prevents double-sends
  // in React strict mode.
  useEffect(() => {
    const text = pendingMessageRef.current;
    if (!text || status !== 'ready') return;
    pendingMessageRef.current = null;
    sendMessage({ text });
  }, [activeSessionId, status, sendMessage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const saveCurrentSession = useCallback(async () => {
    const id = activeSessionIdRef.current;
    const current = messagesRef.current;
    if (!id || current.length === 0) return;
    await persistMessages(id, current);
  }, [persistMessages]);

  const handleSelectSession = useCallback(
    async (id: string) => {
      if (id === activeSessionIdRef.current) return;
      stop();

      const session = await fetch(`/api/sessions`)
        .then((r) => r.json())
        .then((d) => (d.sessions as Session[]).find((s) => s.id === id));

      if (!session) return;

      // Save after the async fetch so React has flushed stop()'s state update
      // and messagesRef.current includes the final streaming content.
      await saveCurrentSession();

      setActiveSessionId(id);
      try {
        const parsed = JSON.parse(session.messages) as UIMessage[];
        const { messages: preparedMsgs, regenerateText } = prepareSessionMessages(parsed);
        setMessages(preparedMsgs);
        pendingMessageRef.current = regenerateText;
      } catch {
        setMessages([]);
      }
    },
    [saveCurrentSession, setMessages, stop]
  );

  const handleNewSession = useCallback(async () => {
    stop();
    await saveCurrentSession();
    const session = await fetch('/api/sessions', { method: 'POST' })
      .then((r) => r.json())
      .then((d) => d.session as Session);
    setSessions((prev) => [session, ...prev]);
    setActiveSessionId(session.id);
    setMessages([]);
  }, [saveCurrentSession, setMessages, stop]);

  const handleDeleteSession = useCallback(
    async (id: string) => {
      await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
      const next = sessions.filter((s) => s.id !== id);

      if (id === activeSessionIdRef.current) {
        if (next.length > 0) {
          setSessions(next);
          const active = next[0];
          setActiveSessionId(active.id);
          try {
            setMessages(JSON.parse(active.messages) as UIMessage[]);
          } catch {
            setMessages([]);
          }
        } else {
          // Create a fresh session when all are deleted
          const session = await fetch('/api/sessions', { method: 'POST' })
            .then((r) => r.json())
            .then((d) => d.session as Session);
          setSessions([session]);
          setActiveSessionId(session.id);
          setMessages([]);
        }
      } else {
        setSessions(next);
      }
    },
    [sessions, setMessages]
  );

  const handleRenameSession = useCallback(async (id: string, name: string) => {
    const res = await fetch(`/api/sessions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const { session } = await res.json();
    setSessions((prev) => prev.map((s) => (s.id === id ? session : s)));
  }, []);

  const handleStarSession = useCallback(async (id: string, starred: boolean) => {
    const res = await fetch(`/api/sessions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ starred }),
    });
    const { session } = await res.json();
    setSessions((prev) => prev.map((s) => (s.id === id ? session : s)));
  }, []);

  // Register handlers into context so Sidebar (via AppShell) can call them
  useEffect(() => {
    setHandlers({
      onNewSession: handleNewSession,
      onSelectSession: handleSelectSession,
      onDeleteSession: handleDeleteSession,
      onRenameSession: handleRenameSession,
      onStarSession: handleStarSession,
    });
    return () => setHandlers(null);
  }, [handleNewSession, handleSelectSession, handleDeleteSession, handleRenameSession, handleStarSession, setHandlers]);

  const collectionImages = messages.flatMap((msg) =>
    msg.parts
      .filter(isToolUIPart)
      .filter((p) => p.state === 'output-available')
      .flatMap((p) => {
        let parsed: Record<string, unknown> | null = null;
        try { parsed = JSON.parse(String(p.output)); } catch { /* not JSON */ }
        if (parsed?.type === 'image') return [parsed as { type: string; src: string; label: string }];
        const img = extractSubAgentImage(p.output);
        return img ? [img] : [];
      })
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || status !== 'ready') return;
    sendMessage({ text: input });
    setInput('');
  };

  return (
    <div className="flex flex-1 h-full overflow-hidden">
      {/* Chat column */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Header */}
        <header
          className="relative flex items-center gap-4 px-6 py-14 border-b"
          style={{
            borderColor: 'var(--neutral-200)',
            backgroundImage:
              'linear-gradient(135deg, rgba(219,234,254,0.70) 0%, rgba(248,250,252,0.65) 100%), url(/images/hero/hero-bg.webp)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Mobile-only: left hamburger to open sessions sidebar */}
          <button
            className="md:hidden flex flex-col justify-center gap-1 p-1.5 rounded-lg transition-all"
            style={{ color: 'var(--neutral-600)' }}
            onClick={() => openSidebar?.()}
            title="Open sessions"
          >
            <span className="block w-5 h-0.5 rounded" style={{ background: 'currentColor' }} />
            <span className="block w-5 h-0.5 rounded" style={{ background: 'currentColor' }} />
            <span className="block w-5 h-0.5 rounded" style={{ background: 'currentColor' }} />
          </button>

          <div className="ml-auto flex items-center gap-3">
            <span
              className="w-2 h-2 rounded-full"
              style={{
                background:
                  status === 'streaming' ? 'var(--primary-blue)' : 'var(--neutral-200)',
                boxShadow:
                  status === 'streaming' ? '0 0 0 3px rgba(37,99,235,0.2)' : 'none',
                animation: status === 'streaming' ? 'pulse 1.5s infinite' : 'none',
              }}
            />
            <span className="text-sm capitalize" style={{ color: 'var(--neutral-600)' }}>
              {status}
            </span>
            {/* Collections grid icon */}
            <button
              onClick={() => setRightSidebarOpen((o) => !o)}
              className="flex items-center justify-center p-1.5 rounded-lg transition-all"
              style={{ color: 'var(--neutral-600)' }}
              title="Toggle collections"
            >
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-6 mx-auto max-w-2xl py-16 px-8">
              <h2
                className="text-2xl font-semibold"
                style={{ fontFamily: 'var(--font-cinzel), serif', color: 'var(--neutral-900)' }}
              >
                Ready to Roll?
              </h2>
              <p className="text-base" style={{ color: 'var(--neutral-600)' }}>
                The more detail you provide, the better the result. Try one of these to get started:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
                {STARTER_PROMPTS.map(({ label, prompt }) => (
                  <button
                    key={label}
                    onClick={() => setInput(prompt)}
                    className="rounded-xl px-4 py-3 text-sm text-left transition-all hover:scale-[1.01] active:scale-[0.99]"
                    style={{
                      background: '#ffffff',
                      border: '1px solid var(--neutral-200)',
                      color: 'var(--neutral-700)',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--light-gold)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--neutral-200)';
                      e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)';
                    }}
                  >
                    <span
                      className="text-xs font-semibold uppercase tracking-wide block mb-1"
                      style={{ color: 'var(--accent-gold)' }}
                    >
                      {label}
                    </span>
                    {prompt}
                  </button>
                ))}
              </div>
              <ChatInputForm
                input={input}
                status={status}
                formClassName="flex gap-3 w-full"
                onSubmit={handleSubmit}
                onChange={setInput}
              />
            </div>
          )}

          {messages.map((message: ReturnType<typeof useChat>['messages'][number]) => (
            <div
              key={message.id}
              className={`flex w-full max-w-[800px] mx-auto ${message.role === 'user' ? 'justify-end md:pl-[50px]' : 'justify-start md:pr-[50px]'}`}
            >
              <div
                className="max-w-full rounded-xl px-4 py-3 text-base leading-relaxed"
                style={
                  message.role === 'user'
                    ? {
                        background: 'var(--pale-gold)',
                        border: '1px solid var(--light-gold)',
                        color: 'var(--neutral-900)',
                      }
                    : {
                        background: '#ffffff',
                        border: '1px solid var(--neutral-200)',
                        color: 'var(--neutral-700)',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                      }
                }
              >
                {message.parts.map((part, i) => {
                  if (part.type === 'text') {
                    return (
                      <span key={i} className="whitespace-pre-wrap">
                        {part.text}
                      </span>
                    );
                  }
                  if (isToolUIPart(part)) {
                    const name = getToolName(part);
                    const rawOutput = part.state === 'output-available' ? part.output : null;

                    // Direct image output (string JSON with {type:'image'})
                    let imgData: { type: string; src: string; label: string } | null = null;
                    if (rawOutput !== null) {
                      try { imgData = JSON.parse(String(rawOutput)); } catch { /* not JSON string */ }
                    }
                    if (imgData?.type === 'image') {
                      return (
                        <div key={i} className="mt-2 rounded-lg overflow-hidden"
                          style={{ border: '1px solid var(--neutral-200)' }}>
                          <img src={imgData.src} alt={imgData.label} className="w-full rounded-t-lg" />
                          <p className="text-xs px-2 py-1"
                            style={{ color: 'var(--neutral-600)', fontFamily: 'var(--font-cinzel), serif' }}>
                            {imgData.label}
                          </p>
                        </div>
                      );
                    }

                    // Sub-agent UIMessage output (mapAgent wraps a ToolLoopAgent)
                    const subAgentImg = rawOutput !== null ? extractSubAgentImage(rawOutput) : null;
                    if (subAgentImg) {
                      return (
                        <div key={i} className="mt-2 rounded-lg overflow-hidden"
                          style={{ border: '1px solid var(--neutral-200)' }}>
                          <img src={subAgentImg.src} alt={subAgentImg.label} className="w-full rounded-t-lg" />
                          <p className="text-xs px-2 py-1"
                            style={{ color: 'var(--neutral-600)', fontFamily: 'var(--font-cinzel), serif' }}>
                            {subAgentImg.label}
                          </p>
                        </div>
                      );
                    }

                    const outputStr = rawOutput !== null ? String(rawOutput) : null;
                    return (
                      <div
                        key={i}
                        className="mt-2 rounded-lg px-3 py-2 text-xs font-mono"
                        style={{
                          background: 'var(--pale-blue)',
                          border: '1px solid var(--primary-blue)',
                          color: 'var(--neutral-700)',
                        }}
                      >
                        <span className="font-semibold" style={{ color: 'var(--primary-blue)' }}>
                          [{name}]
                        </span>{' '}
                        {outputStr ?? 'Working...'}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {messages.length > 0 && (
        <div
          className="px-4 py-4"
          style={{ background: 'var(--neutral-100)' }}
        >
          <ChatInputForm
            input={input}
            status={status}
            formClassName="flex gap-3 w-full max-w-[800px] mx-auto"
            onSubmit={handleSubmit}
            onChange={setInput}
          />
        </div>
        )}
      </div>

      {/* Right sidebar */}
      {rightSidebarOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col md:relative md:inset-auto md:z-auto md:flex-shrink-0 md:w-[35rem] md:border-l md:transition-all"
          style={{ background: 'var(--neutral-100)', borderColor: 'var(--neutral-200)' }}
        >
          {/* Mobile topbar */}
          <div
            className="flex md:hidden items-center justify-between px-4 py-3 border-b"
            style={{ background: 'var(--primary-blue)', borderColor: 'var(--pale-blue)' }}
          >
            <button
              onClick={() => setRightSidebarOpen(false)}
              className="flex items-center gap-2 text-sm font-medium text-white"
            >
              ← Back to Chat
            </button>
            <span style={{ fontFamily: 'var(--font-cinzel), serif', color: '#fff', fontSize: '0.9rem', fontWeight: 600 }}>
              Collections
            </span>
          </div>

          {/* Desktop header */}
          <div
            className="hidden md:flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: 'var(--neutral-200)' }}
          >
            <span
              className="text-sm font-semibold tracking-wide"
              style={{ fontFamily: 'var(--font-cinzel), serif', color: 'var(--neutral-900)' }}
            >
              Collections
            </span>
            <button
              onClick={() => setRightSidebarOpen(false)}
              className="text-xs rounded px-1.5 py-0.5 transition-all"
              style={{ color: 'var(--neutral-500)' }}
              title="Close"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {collectionImages.length === 0 ? (
              <p className="text-xs text-center mt-8" style={{ color: 'var(--neutral-400)' }}>
                No maps generated yet
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {collectionImages.map((img, i) => (
                  <div key={i} className="rounded-lg overflow-hidden cursor-pointer"
                    style={{ border: '1px solid var(--neutral-200)' }}
                    onClick={() => window.open(img.src, '_blank')}>
                    <img src={img.src} alt={img.label}
                      className="w-full aspect-square object-cover" />
                    <p className="text-[10px] px-1.5 py-1 truncate"
                      style={{ color: 'var(--neutral-600)' }}>
                      {img.label}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
