import { CAMPAIGN_LORE_MAX_CHARS } from './config';

export interface CampaignPatch {
  name?: string;
  lore?: string | null;
}

// Shared body validation for POST /api/campaigns and PUT /api/campaigns/[id],
// so the name/lore rules and error copy can't drift between the two routes.
export function parseCampaignBody(
  body: unknown,
  opts: { requireName: boolean }
): { patch: CampaignPatch } | { error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const patch: CampaignPatch = {};

  if (b.name !== undefined || opts.requireName) {
    const name = typeof b.name === 'string' ? b.name.trim() : '';
    if (!name) return { error: 'Name is required' };
    patch.name = name;
  }

  if (b.lore !== undefined) {
    const lore = typeof b.lore === 'string' ? b.lore : null;
    if (lore && lore.length > CAMPAIGN_LORE_MAX_CHARS) {
      return { error: `Lore must be at most ${CAMPAIGN_LORE_MAX_CHARS} characters` };
    }
    patch.lore = lore;
  }

  return { patch };
}
