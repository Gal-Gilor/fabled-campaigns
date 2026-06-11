'use client';

import { useEffect, useState } from 'react';
import { CAMPAIGN_LORE_MAX_CHARS } from '../lib/config';
import type { Campaign } from './session-context';

function useEscape(onClose: () => void) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);
}

export function CampaignEditModal({
  campaign,
  onSave,
  onClose,
}: {
  campaign?: Campaign; // present = edit mode, absent = create mode
  onSave: (data: { name: string; lore: string | null }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(campaign?.name ?? '');
  const [lore, setLore] = useState(campaign?.lore ?? '');
  useEscape(onClose);

  const overLimit = lore.length > CAMPAIGN_LORE_MAX_CHARS;
  const canSave = name.trim().length > 0 && !overLimit;

  function handleSave() {
    if (!canSave) return;
    onSave({ name: name.trim(), lore: lore.trim() ? lore : null });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-4 pb-3" style={{ borderBottom: '1px solid var(--neutral-200)' }}>
          <p
            className="text-base font-semibold"
            style={{ color: 'var(--neutral-900)', fontFamily: 'var(--font-cinzel), serif' }}
          >
            {campaign ? 'Edit campaign' : 'New campaign'}
          </p>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4 overflow-y-auto">
          <div>
            <label className="block text-sm uppercase tracking-wider mb-1" style={{ color: 'var(--neutral-600)' }}>
              Name
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
              placeholder="e.g. Curse of the Amber Throne"
              className="w-full text-base rounded px-3 py-2 outline-none"
              style={{ border: '1px solid var(--neutral-200)', background: 'var(--neutral-100)', color: 'var(--neutral-900)' }}
            />
          </div>

          <div>
            <label className="block text-sm uppercase tracking-wider mb-1" style={{ color: 'var(--neutral-600)' }}>
              Lore <span style={{ opacity: 0.6 }}>(optional)</span>
            </label>
            <textarea
              value={lore}
              onChange={(e) => setLore(e.target.value)}
              placeholder="World details, factions, history, house rules… anything the AI should treat as canon."
              className="w-full text-base rounded px-3 py-2 outline-none resize-y"
              style={{
                border: `1px solid ${overLimit ? '#dc2626' : 'var(--neutral-200)'}`,
                background: 'var(--neutral-100)',
                color: 'var(--neutral-900)',
                minHeight: 160,
              }}
            />
            <div className="flex justify-between mt-1">
              <p className="text-xs" style={{ color: 'var(--neutral-600)' }}>
                Lore is given to the AI for every session in this campaign.
              </p>
              <p className="text-xs flex-shrink-0" style={{ color: overLimit ? '#dc2626' : 'var(--neutral-400)' }}>
                {lore.length.toLocaleString()} / {CAMPAIGN_LORE_MAX_CHARS.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="px-5 pb-4 flex gap-2">
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="flex-1 text-sm rounded py-2 font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'var(--primary-blue)', color: '#fff' }}
          >
            {campaign ? 'Save' : 'Create campaign'}
          </button>
          <button
            onClick={onClose}
            className="text-sm rounded py-2 px-4"
            style={{ background: 'transparent', color: 'var(--neutral-600)', border: '1px solid var(--neutral-200)' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function CampaignPromptModal({
  campaigns,
  onChoose,
  onClose,
}: {
  campaigns: Campaign[];
  onChoose: (campaignId: string | null) => void;
  onClose: () => void; // skip — same as choosing no campaign
}) {
  useEscape(onClose);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-sm mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-4 pb-3">
          <p
            className="text-base font-semibold"
            style={{ color: 'var(--neutral-900)', fontFamily: 'var(--font-cinzel), serif' }}
          >
            Add this session to a campaign?
          </p>
        </div>

        <div className="px-3 pb-2 flex flex-col gap-1 max-h-72 overflow-y-auto">
          {campaigns.map((c) => (
            <button
              key={c.id}
              onClick={() => onChoose(c.id)}
              className="text-left text-sm rounded-lg px-3 py-2 transition-all truncate"
              style={{ color: 'var(--neutral-800)', border: '1px solid var(--neutral-200)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--pale-blue)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="px-3 pb-4 pt-1">
          <button
            onClick={() => onChoose(null)}
            className="w-full text-sm rounded-lg py-2 font-semibold"
            style={{ background: 'var(--neutral-100)', color: 'var(--neutral-700)', border: '1px solid var(--neutral-200)' }}
          >
            No campaign
          </button>
        </div>
      </div>
    </div>
  );
}
