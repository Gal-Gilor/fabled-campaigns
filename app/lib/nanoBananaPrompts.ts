// Prompt builders tailored for gemini-2.5-flash-image (Nano Banana).
// Differs from app/lib/mapPrompts.ts (Imagen) in two ways:
//  1. No separate negativePrompt field — negation must be inline and concrete.
//  2. Conversational/imperative phrasing rather than tag-soup.

export const NANO_BANANA_NEGATION =
  'No people, no figures, no creatures, no characters, no miniatures. ' +
  'No text, labels, legends, or watermarks. No frames or borders. ' +
  'Top-down tactical view; no side, frontal, or perspective shots.';

export const NB_PROMPTING_BEST_PRACTICES = [
  '- Nano Banana (gemini-2.5-flash-image) has no negativePrompt parameter — express any "not X" constraint inline as a positive scene property.',
  '- Use conversational, imperative phrasing — "render the rocks as moss-covered granite" works better than tag-soup like "rocks, moss, granite, weathered".',
  '- When the prompt requires literal text in the image, wrap it in quotes and specify font, weight, and case.',
  '- Output a single coherent prompt — no preamble, no quotes around the whole prompt, no commentary.',
].join('\n');

export interface SourceContext {
  /** The source artifact's stored prompt — useful style cues, may be null. */
  prompt: string | null;
  /** Active collection terrain, if any. */
  terrain: string | null;
  /** Active collection setting, if any. */
  setting: string | null;
  /** Active collection ambiance, if any. */
  ambiance: string | null;
  /** Active collection visual details, if any. */
  visualDetails: string | null;
}

function renderSourceContext(ctx: SourceContext): string {
  const parts: string[] = [];
  if (ctx.terrain) parts.push(`Terrain: ${ctx.terrain}`);
  if (ctx.setting) parts.push(`Setting: ${ctx.setting}`);
  if (ctx.ambiance) parts.push(`Mood: ${ctx.ambiance}`);
  if (ctx.visualDetails) parts.push(`Visual style: ${ctx.visualDetails}`);
  if (ctx.prompt) parts.push(`Original prompt (for style reference only): ${ctx.prompt}`);
  return parts.length ? `\nSource context:\n${parts.map((p) => `- ${p}`).join('\n')}` : '';
}

export function buildEditPrompt(params: {
  instruction: string;
  sourceContext: SourceContext;
}): string {
  const { instruction, sourceContext } = params;
  return [
    'You are editing the provided D&D encounter battle map.',
    'Apply the requested change as a focused edit, blending it into the surrounding pixels so the change reads as native.',
    'Preserve everything else, including composition, lighting, palette, brush style, terrain, and structures as in the source image.',
    'Maintaining the gridlines layer that covers terrain is most important. Reproduce every grid line at the exact same spacing, color, line weight, and opacity as the source. Any region you repaint must show the same grid lines as the surrounding pixels — gridlines must be continuous and seamless across the entire image, including replaced terrain.',
    `\nEdit instruction: ${instruction.trim()}`,
    renderSourceContext(sourceContext),
    `\nConstraints to maintain:\n- ${NANO_BANANA_NEGATION}`,
    '- Top-down orthographic perspective.',
    '- Sharp focus, painterly fantasy-cartography style.',
  ]
    .filter(Boolean)
    .join('\n')
    .trim();
}

