import { type AppError, isAppError, unknownError } from './AppError';

/**
 * Normalizes anything thrown into an AppError. Every repository funnels its
 * failures through here so the presentation layer only ever sees one shape —
 * and nothing is silently swallowed.
 */
export const toAppError = (value: unknown): AppError => {
  if (isAppError(value)) {
    return value;
  }
  if (value instanceof Error) {
    return unknownError(value.message, value);
  }
  if (typeof value === 'string' && value.length > 0) {
    return unknownError(value, value);
  }
  return unknownError(undefined, value);
};
