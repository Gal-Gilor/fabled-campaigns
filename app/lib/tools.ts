import { tool } from 'ai';
import { z } from 'zod';

export const gmStubTools = {
  generateCharacter: tool({
    description: 'Generate a D&D 5e character with stats, backstory, and equipment',
    inputSchema: z.object({
      race: z.string().describe('Character race (e.g. Human, Elf, Dwarf)'),
      class: z.string().describe('Character class (e.g. Fighter, Wizard, Rogue)'),
      level: z.number().min(1).max(20).describe('Character level'),
    }),
    execute: async ({ race, class: charClass, level }) =>
      `[Character generation stub] A level ${level} ${race} ${charClass}. Full generation coming soon.`,
  }),

  createCampaign: tool({
    description: 'Create a new D&D campaign with setting, plot hooks, and factions',
    inputSchema: z.object({
      setting: z.string().describe('Campaign setting (e.g. Forgotten Realms, homebrew)'),
      tone: z.string().describe('Tone (e.g. grimdark, heroic, mystery)'),
      length: z.string().describe('Expected length (e.g. one-shot, short, medium, long)'),
    }),
    execute: async ({ setting, tone, length }) =>
      `[Campaign creation stub] A ${tone} ${length} campaign set in ${setting}. Full generation coming soon.`,
  }),

  lookupSRD: tool({
    description: 'Look up rules, spells, monsters, or items from the D&D 5e System Reference Document',
    inputSchema: z.object({
      query: z.string().describe('What to look up (e.g. "Fireball spell", "Goblin stats", "grappling rules")'),
    }),
    execute: async ({ query }) =>
      `[SRD lookup stub] Results for "${query}" coming soon.`,
  }),
};
