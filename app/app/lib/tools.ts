import { z } from 'zod';
import { createVertex } from '@ai-sdk/google-vertex';
import { generateText } from 'ai';
import { GEMINI_IMAGE_MODEL } from './config';

const vertex = createVertex({
  project: process.env.GOOGLE_CLOUD_PROJECT,
  location: process.env.GOOGLE_CLOUD_LOCATION ?? 'us-central1',
});

export const gmTools = {
  generateCharacter: {
    description: 'Generate a D&D 5e character with stats, backstory, and equipment',
    inputSchema: z.object({
      race: z.string().describe('Character race (e.g. Human, Elf, Dwarf)'),
      class: z.string().describe('Character class (e.g. Fighter, Wizard, Rogue)'),
      level: z.number().min(1).max(20).describe('Character level'),
    }),
    execute: async ({ race, class: charClass, level }: { race: string; class: string; level: number }) => {
      return `[Character generation stub] A level ${level} ${race} ${charClass} has been created. Full character generation via Cloud Run coming soon.`;
    },
  },
  createCampaign: {
    description: 'Create a new D&D campaign with setting, plot hooks, and factions',
    inputSchema: z.object({
      setting: z.string().describe('Campaign setting (e.g. Forgotten Realms, homebrew)'),
      tone: z.string().describe('Tone (e.g. grimdark, heroic, mystery, comedy)'),
      length: z.string().describe('Expected length (e.g. one-shot, short, medium, long)'),
    }),
    execute: async ({ setting, tone, length }: { setting: string; tone: string; length: string }) => {
      return `[Campaign creation stub] A ${tone} ${length} campaign set in ${setting} has been outlined. Full campaign generation via Cloud Run coming soon.`;
    },
  },
  lookupSRD: {
    description: 'Look up rules, spells, monsters, or items from the D&D 5e System Reference Document',
    inputSchema: z.object({
      query: z.string().describe('What to look up (e.g. "Fireball spell", "Goblin stats", "grappling rules")'),
    }),
    execute: async ({ query }: { query: string }) => {
      return `[SRD lookup stub] Results for "${query}" will be fetched from the SRD knowledge graph via Cloud Run soon.`;
    },
  },
  generateEncounterMap: {
    description: 'Generate a tactical encounter map for combat',
    inputSchema: z.object({
      biome: z.string().describe('Environment type (e.g. dungeon, forest, tavern, cave)'),
      difficulty: z.string().describe('Encounter difficulty (easy, medium, hard, deadly)'),
      partySize: z.number().min(1).max(8).describe('Number of players in the party'),
    }),
    toModelOutput: async ({ output }: { output: unknown }) => {
      try {
        const o = JSON.parse(String(output));
        if (o?.type === 'image') {
          return { type: 'text' as const, value: `Encounter map generated: ${o.label}` };
        }
      } catch { /* not JSON */ }
      return { type: 'text' as const, value: String(output) };
    },
    execute: async ({ biome, difficulty, partySize }: { biome: string; difficulty: string; partySize: number }) => {
      const prompt = `Top-down tactical D&D 5e encounter map, ${biome} environment, ${difficulty} difficulty, grid-based layout for ${partySize} players. Detailed terrain features, obstacles, and points of interest. Fantasy art style, vibrant colors, clear scale grid. No text labels or UI elements.`;

      try {
        const result = await generateText({
          model: vertex(GEMINI_IMAGE_MODEL),
          prompt,
          providerOptions: {
            vertex: { responseModalities: ['TEXT', 'IMAGE'] },
          },
        });

        const imgFile = result.files?.find((f) => f.mediaType.startsWith('image/'));
        if (!imgFile) {
          return `[Encounter map] Image generation returned no image for a ${difficulty} ${biome} encounter.`;
        }

        const src = imgFile.base64.startsWith('data:')
          ? imgFile.base64
          : `data:${imgFile.mediaType};base64,${imgFile.base64}`;

        return JSON.stringify({
          type: 'image',
          src,
          label: `${difficulty} ${biome} map — ${partySize} players`,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return `[Encounter map error] ${msg}`;
      }
    },
  },
};
