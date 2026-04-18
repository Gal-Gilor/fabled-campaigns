import { VALID_TERRAINS, VALID_SETTINGS, VALID_DETAIL_LEVELS } from './mapPrompts';

export interface MapGenerationParams {
  terrain?: string;
  setting?: string;
  detailLevel?: 'detail-high' | 'detail-low';
  description?: string;
  name?: string;
}

export interface NameGenerationParams {
  terrain?: string;
  setting?: string;
  description?: string;
}

interface ValidationResult<T> {
  valid: boolean;
  errors: string[];
  sanitized: T;
}

function sanitizeString(value: unknown, maxLength: number): string | undefined {
  if (value === undefined || value === null) return undefined;
  const str = String(value).trim();
  return str.length > 0 ? str.slice(0, maxLength) : undefined;
}

export function validateMapParams(params: unknown): ValidationResult<MapGenerationParams> {
  const errors: string[] = [];
  const p = (params ?? {}) as Record<string, unknown>;

  const terrain = sanitizeString(p.terrain, 50);
  const setting = sanitizeString(p.setting, 50);
  const description = sanitizeString(p.description, 1000);
  const name = sanitizeString(p.name, 100);
  const rawDetailLevel = sanitizeString(p.detailLevel, 20);

  if (!terrain && !setting && !description) {
    errors.push('At least one of terrain, setting, or description must be provided');
  }

  if (terrain && !(VALID_TERRAINS as readonly string[]).includes(terrain)) {
    errors.push(`Invalid terrain. Valid options: ${VALID_TERRAINS.join(', ')}`);
  }

  if (setting && !(VALID_SETTINGS as readonly string[]).includes(setting)) {
    errors.push(`Invalid setting. Valid options: ${VALID_SETTINGS.join(', ')}`);
  }

  const detailLevel =
    rawDetailLevel && (VALID_DETAIL_LEVELS as readonly string[]).includes(rawDetailLevel)
      ? (rawDetailLevel as 'detail-high' | 'detail-low')
      : undefined;

  if (rawDetailLevel && !detailLevel) {
    errors.push(`Invalid detailLevel. Valid options: ${VALID_DETAIL_LEVELS.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: { terrain, setting, detailLevel, description, name },
  };
}

export function validateNameParams(params: unknown): ValidationResult<NameGenerationParams> {
  const errors: string[] = [];
  const p = (params ?? {}) as Record<string, unknown>;

  const terrain = sanitizeString(p.terrain, 50);
  const setting = sanitizeString(p.setting, 50);
  const description = sanitizeString(p.description, 2000);

  if (!terrain && !setting) {
    errors.push('At least one of terrain or setting must be provided');
  }

  if (terrain && !(VALID_TERRAINS as readonly string[]).includes(terrain)) {
    errors.push(`Invalid terrain. Valid options: ${VALID_TERRAINS.join(', ')}`);
  }

  if (setting && !(VALID_SETTINGS as readonly string[]).includes(setting)) {
    errors.push(`Invalid setting. Valid options: ${VALID_SETTINGS.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: { terrain, setting, description },
  };
}
