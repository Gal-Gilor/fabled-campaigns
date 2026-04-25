'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, isToolUIPart, getToolName, UIMessage } from 'ai';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { CHAT_API_PATH } from '../lib/config';
import { ChatSession as Session } from '@/db';
import { safeJsonParse, isImageOutput, ImageOutput } from '../lib/messageUtils';
import type { Collection } from '../lib/collections';
import { useSessionContext } from './session-context';
import { useSession } from 'next-auth/react';
import { VALID_TERRAINS, VALID_SETTINGS } from '../lib/mapPrompts';

function extractSubAgentImage(output: unknown): ImageOutput | null {
  if (typeof output !== 'object' || output === null || !('parts' in output)) return null;
  const msg = output as UIMessage;
  for (const p of (msg.parts ?? [])) {
    if (!isToolUIPart(p) || p.state !== 'output-available') continue;
    const o = safeJsonParse(p.output);
    if (isImageOutput(o)) return o;
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

function GuestBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div
      style={{
        position: 'relative',
        background: '#fef3c7',
        borderBottom: '1px solid #f59e0b',
        padding: '6px 16px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: '0.875rem', color: '#0f172a', textAlign: 'center' }}>
        You&apos;re chatting as a guest.{' '}
        <a href="/auth/sign-in" style={{ fontWeight: 600, color: '#2563eb', textDecoration: 'underline' }}>
          Sign in
        </a>{' '}
        to save your conversations, access past campaigns, and download homebrew content.
      </span>
      <button
        onClick={() => setDismissed(true)}
        style={{
          position: 'absolute',
          right: '16px',
          color: '#334155',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '1.1rem',
          lineHeight: 1,
        }}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
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

function downloadImage(img: ImageOutput) {
  const a = document.createElement('a');
  a.href = img.src;
  a.download = `${img.label.replace(/[^a-z0-9]/gi, '-')}.png`;
  a.click();
}

function ImageThumbnail({
  img,
  onSelect,
  onDelete,
  onDownload,
}: {
  img: ImageOutput;
  onSelect: () => void;
  onDelete: () => void;
  onDownload: () => void;
}) {
  return (
    <div
      className="relative group rounded-lg overflow-hidden cursor-pointer"
      style={{ border: '1px solid var(--neutral-200)' }}
      onClick={onSelect}
    >
      <img src={img.src} alt={img.label} className="w-full aspect-square object-cover" />
      <p className="text-xs px-1.5 py-1 truncate" style={{ color: 'var(--neutral-600)' }}>
        {img.label}
      </p>
      <div className="absolute top-1 right-1 hidden group-hover:flex gap-1">
        <button
          onClick={(e) => { e.stopPropagation(); onDownload(); }}
          className="w-5 h-5 rounded text-xs flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.9)', color: 'var(--neutral-600)' }}
          title="Download"
        >↓</button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="w-5 h-5 rounded text-xs flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.9)', color: '#dc2626' }}
          title="Delete"
        >✕</button>
      </div>
    </div>
  );
}

function ImageModal({
  img,
  onClose,
  onDelete,
  onDownload,
}: {
  img: ImageOutput;
  onClose: () => void;
  onDelete: () => void;
  onDownload: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-xl overflow-hidden max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <img src={img.src} alt={img.label} className="w-full object-contain max-h-[60vh]" />
        <div className="px-4 py-3 flex flex-col gap-2">
          <p className="text-sm font-semibold" style={{ color: 'var(--neutral-900)', fontFamily: 'var(--font-cinzel), serif' }}>
            {img.label}
          </p>
          {img.prompt && (
            <details className="text-sm" style={{ color: 'var(--neutral-700)' }}>
              <summary
                className="cursor-pointer text-xs uppercase tracking-wider mb-1"
                style={{ color: 'var(--neutral-600)' }}
              >
                Generation prompt
              </summary>
              <p className="whitespace-pre-wrap leading-relaxed mt-1">{img.prompt}</p>
            </details>
          )}
          <div className="flex gap-2 pt-1">
            <button
              onClick={onDownload}
              className="flex-1 text-sm rounded py-1.5 font-semibold"
              style={{ background: 'var(--primary-blue)', color: '#fff' }}
            >
              Download
            </button>
            <button
              onClick={() => { onDelete(); onClose(); }}
              className="text-sm rounded py-1.5 px-3"
              style={{ background: 'transparent', color: '#dc2626', border: '1px solid #dc2626' }}
            >
              Delete
            </button>
            <button
              onClick={onClose}
              className="text-sm rounded py-1.5 px-3"
              style={{ background: 'transparent', color: 'var(--neutral-600)', border: '1px solid var(--neutral-200)' }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CollectionFolder({
  collection,
  isActive,
  images,
  pills,
  onActivate,
  onDelete,
  onUpdate,
  onSelectImage,
  onDeleteImage,
}: {
  collection: Collection;
  isActive: boolean;
  images: import('../lib/messageUtils').ImageOutput[];
  pills: string[];
  onActivate: () => void;
  onDelete: () => void;
  onUpdate: (updated: Collection) => void;
  onSelectImage: (img: ImageOutput) => void;
  onDeleteImage: (src: string) => void;
}) {
  const [open, setOpen] = useState(images.length > 0);
  const [editing, setEditing] = useState(collection.name === 'New Collection');

  useEffect(() => {
    if (images.length > 0) setOpen(true);
  }, [images.length]);
  const [draft, setDraft] = useState<Collection>({ ...collection });
  const AMBIANCE_LABELS = ['Golden twilight', 'Cold moonlight', 'Torchlit', 'Harsh midday', 'Misty dawn', 'Eerie glow', 'Deep night', 'Stormy overcast'];

  function handleSave() {
    let saved = { ...draft };
    if (!saved.name.trim() || saved.name === 'New Collection') {
      const base = draft.setting ?? draft.terrain ?? 'Location';
      saved.name = `The ${base.charAt(0).toUpperCase()}${base.slice(1)}`;
    }
    onUpdate(saved);
    setEditing(false);
  }

  return (
    <div
      className="rounded-lg overflow-hidden transition-all"
      style={{
        border: isActive ? '1.5px solid var(--primary-blue)' : '1px solid var(--neutral-200)',
        background: isActive ? 'var(--pale-blue)' : '#fff',
      }}
    >
      {/* Row header */}
      <div className="flex items-center gap-2 px-2.5 py-2 cursor-pointer" onClick={onActivate}>
        <span
          className="flex-shrink-0 rounded-full"
          style={{
            width: 8, height: 8,
            background: isActive ? 'var(--primary-blue)' : 'var(--neutral-200)',
            boxShadow: isActive ? '0 0 0 2px rgba(37,99,235,0.2)' : 'none',
          }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: isActive ? 'var(--primary-blue)' : 'var(--neutral-900)', fontFamily: 'var(--font-cinzel), serif' }}>
            {collection.name}
          </p>
          {pills.length > 0 ? (
            <div className="flex flex-wrap gap-1 mt-0.5">
              {pills.map((pill) => (
                <span key={pill} className="text-xs rounded px-1.5 py-px" style={{ background: 'var(--neutral-100)', color: 'var(--neutral-600)', border: '1px solid var(--neutral-200)' }}>
                  {pill}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs mt-0.5" style={{ color: 'var(--neutral-600)' }}>No location context</p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <span className="text-xs" style={{ color: 'var(--neutral-600)' }}>{images.length}</span>
          <button className="text-xs rounded px-1" style={{ color: 'var(--neutral-600)' }}
            onClick={(e) => { e.stopPropagation(); setEditing((v) => !v); }} title="Edit">✎</button>
          <button className="text-xs rounded px-1" style={{ color: 'var(--neutral-600)' }}
            onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }} title="Toggle">{open ? '▼' : '▶'}</button>
          <button className="text-xs rounded px-1" style={{ color: '#dc2626' }}
            onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Delete">✕</button>
        </div>
      </div>

      {/* Inline edit form */}
      {editing && (
        <div className="px-3 pb-3 pt-2" style={{ borderTop: '1px solid var(--neutral-200)' }} onClick={(e) => e.stopPropagation()}>
          {/* Name */}
          <div className="mb-3">
            <label className="block text-sm uppercase tracking-wider mb-1" style={{ color: 'var(--neutral-600)' }}>
              Name <span style={{ color: 'var(--neutral-600)', opacity: 0.6 }}>(optional — auto-generated)</span>
            </label>
            <input
              className="w-full text-base rounded px-3 py-2 outline-none"
              style={{ border: '1px solid var(--neutral-200)', background: 'var(--neutral-100)', color: 'var(--neutral-900)' }}
              value={draft.name === 'New Collection' ? '' : draft.name}
              placeholder="e.g. Gilded Hollow"
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value || 'New Collection' }))}
            />
          </div>

          {/* Terrain + Setting */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <label className="block text-sm uppercase tracking-wider mb-1" style={{ color: 'var(--neutral-600)' }}>Terrain</label>
              <select
                className="w-full text-base rounded px-2 py-2 outline-none"
                style={{ border: '1px solid var(--neutral-200)', background: 'var(--neutral-100)', color: 'var(--neutral-900)' }}
                value={draft.terrain ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, terrain: (e.target.value as typeof d.terrain) || undefined }))}
              >
                <option value="">Any</option>
                {VALID_TERRAINS.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm uppercase tracking-wider mb-1" style={{ color: 'var(--neutral-600)' }}>Setting</label>
              <select
                className="w-full text-base rounded px-2 py-2 outline-none"
                style={{ border: '1px solid var(--neutral-200)', background: 'var(--neutral-100)', color: 'var(--neutral-900)' }}
                value={draft.setting ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, setting: (e.target.value as typeof d.setting) || undefined }))}
              >
                <option value="">None</option>
                {VALID_SETTINGS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
          </div>

          {/* Ambiance pills */}
          <div className="mb-3">
            <label className="block text-sm uppercase tracking-wider mb-1.5" style={{ color: 'var(--neutral-600)' }}>Ambiance</label>
            <div className="flex flex-wrap gap-1.5">
              {AMBIANCE_LABELS.map((label) => (
                <button
                  key={label}
                  className="text-sm rounded-full px-3 py-1 transition-all"
                  style={{
                    border: `1px solid ${draft.ambiance === label ? 'var(--primary-blue)' : 'var(--neutral-200)'}`,
                    background: draft.ambiance === label ? 'var(--pale-blue)' : 'var(--neutral-100)',
                    color: draft.ambiance === label ? 'var(--primary-blue)' : 'var(--neutral-600)',
                  }}
                  onClick={() => setDraft((d) => ({ ...d, ambiance: d.ambiance === label ? undefined : label }))}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Visual details */}
          <div className="mb-3">
            <label className="block text-sm uppercase tracking-wider mb-1" style={{ color: 'var(--neutral-600)' }}>
              Visual details <span style={{ opacity: 0.6 }}>(optional)</span>
            </label>
            <textarea
              className="w-full text-base rounded px-3 py-2 outline-none resize-none"
              style={{ border: '1px solid var(--neutral-200)', background: 'var(--neutral-100)', color: 'var(--neutral-900)', height: 64 }}
              placeholder="e.g. pearl-dust walls, glowing fungi, raised cypress walkways..."
              value={draft.visualDetails ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, visualDetails: e.target.value || undefined }))}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              className="flex-1 text-base rounded py-2 font-semibold transition-all"
              style={{ background: 'var(--primary-blue)', color: '#fff', border: 'none' }}
              onClick={handleSave}
            >
              Save
            </button>
            <button
              className="flex-1 text-base rounded py-2 transition-all"
              style={{ background: 'transparent', color: 'var(--neutral-600)', border: '1px solid var(--neutral-200)' }}
              onClick={() => { setDraft({ ...collection }); setEditing(false); }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Images */}
      {open && images.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5 p-2" style={{ borderTop: '1px solid var(--neutral-200)' }}>
          {images.map((img, i) => (
            <ImageThumbnail
              key={i}
              img={img}
              onSelect={() => onSelectImage(img)}
              onDelete={() => onDeleteImage(img.src)}
              onDownload={() => downloadImage(img)}
            />
          ))}
        </div>
      )}
      {open && images.length === 0 && (
        <p className="text-xs px-3 pb-2" style={{ color: 'var(--neutral-600)' }}>No maps yet</p>
      )}
    </div>
  );
}

export default function Chat({ initialSessionId }: ChatProps) {
  const [input, setInput] = useState('');
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<ImageOutput | null>(null);
  const [deletedSrcs, setDeletedSrcs] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeSessionIdRef = useRef<string | null>(null);
  const messagesRef = useRef<UIMessage[]>([]);
  const pendingMessageRef = useRef<string | null>(null);
  const activeCollectionRef = useRef<Collection | undefined>(undefined);

  const { sessions, setSessions, activeSessionId, setActiveSessionId, setHandlers, openSidebar } = useSessionContext();
  const { status: authStatus } = useSession();

  const activeCollection = collections.find((c) => c.id === activeCollectionId) ?? undefined;

  const transport = useMemo(
    () => new DefaultChatTransport({
      api: CHAT_API_PATH,
      body: () => ({
        sessionId: activeSessionIdRef.current,
        activeCollection: activeCollectionRef.current,
      }),
    }),
    []
  );

  const { messages, sendMessage, status, setMessages, stop } = useChat({ transport });

  // Keep refs in sync so async callbacks always have current values
  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  useEffect(() => {
    activeCollectionRef.current = activeCollection;
  }, [activeCollection]);

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
      if (authStatus !== 'authenticated') return;

      const list: Session[] = await fetch('/api/sessions')
        .then((r) => r.json())
        .then((d) => d.sessions ?? []);

      if (list.length === 0) {
        const created = await fetch('/api/sessions', { method: 'POST' })
          .then((r) => r.json())
          .then((d) => d.session as Session);
        if (created) {
          setSessions([created]);
          setActiveSessionId(created.id);
        }
        return;
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
    if (authStatus !== 'loading') init();
  }, [authStatus, initialSessionId, setMessages, setSessions, setActiveSessionId]);

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

    if (authStatus !== 'authenticated') {
      setMessages([]);
      return;
    }

    await saveCurrentSession();
    const session = await fetch('/api/sessions', { method: 'POST' })
      .then((r) => r.json())
      .then((d) => d.session as Session);
    if (!session) return;
    setSessions((prev) => [session, ...prev]);
    setActiveSessionId(session.id);
    setMessages([]);
  }, [authStatus, saveCurrentSession, setMessages, stop]);

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
          // Create a fresh session when all are deleted (authenticated users only)
          if (authStatus !== 'authenticated') {
            setMessages([]);
            return;
          }
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
    [authStatus, sessions, setMessages]
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
        const parsed = safeJsonParse(p.output);
        if (isImageOutput(parsed)) return [parsed];
        const img = extractSubAgentImage(p.output);
        return img ? [img] : [];
      })
  ).filter((img) => !deletedSrcs.has(img.src));

  function handleDeleteImage(src: string) {
    setDeletedSrcs((prev) => new Set(prev).add(src));
    setSelectedImage((cur) => (cur?.src === src ? null : cur));
  }

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

        {authStatus === 'unauthenticated' && <GuestBanner />}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
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
                    const imgData = rawOutput !== null ? safeJsonParse(rawOutput) : null;
                    if (isImageOutput(imgData) && !deletedSrcs.has(imgData.src)) {
                      return (
                        <div key={i} className="mt-2 rounded-lg overflow-hidden cursor-pointer"
                          style={{ border: '1px solid var(--neutral-200)' }}
                          onClick={() => setSelectedImage(imgData)}>
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
                    if (subAgentImg && !deletedSrcs.has(subAgentImg.src)) {
                      return (
                        <div key={i} className="mt-2 rounded-lg overflow-hidden cursor-pointer"
                          style={{ border: '1px solid var(--neutral-200)' }}
                          onClick={() => setSelectedImage(subAgentImg)}>
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
              style={{ color: 'var(--neutral-600)' }}
              title="Close"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {/* Collections header */}
            <div
              className="flex items-center justify-between px-3 py-2 border-b"
              style={{ borderColor: 'var(--neutral-200)' }}
            >
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--neutral-600)' }}>
                Collections
              </span>
              <button
                onClick={() => {
                  const id = crypto.randomUUID();
                  setCollections((prev) => [...prev, { id, name: 'New Collection' }]);
                  setActiveCollectionId(id);
                }}
                className="flex items-center justify-center w-5 h-5 rounded transition-all"
                style={{ background: 'var(--neutral-200)', color: 'var(--neutral-600)' }}
                title="Add collection"
              >
                +
              </button>
            </div>

            {/* Collection folders */}
            {collections.length === 0 ? (
              <p className="text-xs text-center mt-6 px-4" style={{ color: 'var(--neutral-600)' }}>
                No collections yet — add one to keep your maps visually consistent
              </p>
            ) : (
              <div className="flex flex-col gap-1 p-2">
                {collections.map((col) => {
                  const isActive = col.id === activeCollectionId;
                  const folderImages = collectionImages.filter((img) => img.collectionId === col.id);
                  const pills = [col.terrain, col.setting, col.ambiance].filter(Boolean) as string[];
                  return (
                    <CollectionFolder
                      key={col.id}
                      collection={col}
                      isActive={isActive}
                      images={folderImages}
                      pills={pills}
                      onActivate={() => setActiveCollectionId(isActive ? null : col.id)}
                      onDelete={() => {
                        setCollections((prev) => prev.filter((c) => c.id !== col.id));
                        if (activeCollectionId === col.id) setActiveCollectionId(null);
                      }}
                      onUpdate={(updated) =>
                        setCollections((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
                      }
                      onSelectImage={setSelectedImage}
                      onDeleteImage={handleDeleteImage}
                    />
                  );
                })}
              </div>
            )}

            {/* Uncategorized */}
            {(() => {
              const uncategorized = collectionImages.filter((img) => !img.collectionId);
              if (uncategorized.length === 0) return null;
              return (
                <div className="p-2">
                  <p className="text-xs uppercase tracking-wider px-1 mb-2" style={{ color: 'var(--neutral-600)' }}>
                    Uncategorized
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {uncategorized.map((img, i) => (
                      <ImageThumbnail
                        key={i}
                        img={img}
                        onSelect={() => setSelectedImage(img)}
                        onDelete={() => handleDeleteImage(img.src)}
                        onDownload={() => downloadImage(img)}
                      />
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {selectedImage && createPortal(
        <ImageModal
          img={selectedImage}
          onClose={() => setSelectedImage(null)}
          onDelete={() => handleDeleteImage(selectedImage.src)}
          onDownload={() => downloadImage(selectedImage)}
        />,
        document.body
      )}
    </div>
  );
}
