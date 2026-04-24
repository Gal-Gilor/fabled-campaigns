import type { Terrain, Setting } from './mapPrompts';

export interface Collection {
  id: string;
  name: string;
  terrain?: Terrain;
  setting?: Setting;
  ambiance?: string;
  visualDetails?: string;
}

export interface AmbianceOption {
  label: string;
  promptLanguage: string;
}

export const AMBIANCE_OPTIONS: AmbianceOption[] = [
  { label: 'Golden twilight',   promptLanguage: 'warm golden amber light filtered through canopy, perpetual twilight atmosphere' },
  { label: 'Cold moonlight',    promptLanguage: 'pale silver moonlight, deep blue shadows, crisp cold night' },
  { label: 'Torchlit',          promptLanguage: 'flickering orange torchlight, dancing shadows, warm pockets of light' },
  { label: 'Harsh midday',      promptLanguage: 'harsh overhead sun, strong shadows, bleached colours' },
  { label: 'Misty dawn',        promptLanguage: 'soft diffuse grey-white light, wisps of ground fog, quiet morning' },
  { label: 'Eerie glow',        promptLanguage: 'unnatural pale green or violet ambient light, no visible source' },
  { label: 'Deep night',        promptLanguage: 'near-total darkness, only faint ambient light, heavy shadows' },
  { label: 'Stormy overcast',   promptLanguage: 'muted grey diffuse light, dramatic clouds, rain-slicked surfaces' },
];

export function getAmbiancePromptLanguage(label: string): string {
  return AMBIANCE_OPTIONS.find((o) => o.label === label)?.promptLanguage ?? label;
}
