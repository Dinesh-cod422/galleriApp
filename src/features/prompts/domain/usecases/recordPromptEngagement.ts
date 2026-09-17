import { validationError } from '@core/errors/AppError';
import { type PromptId } from '@core/types/branded';

import {
  type PromptCounter,
  type PromptRepository,
} from '../repositories/PromptRepository';

/**
 * Records that someone viewed, copied or shared a prompt.
 *
 * Engagement is a side effect of using the app, never something the user asked
 * for, so this must not be able to interrupt them: the caller fires it and
 * forgets it, and the number on screen has already moved (see
 * `engagementStore`). What this returns is only whether the server agreed.
 */
/**
 * The most a single request may add.
 *
 * A batched write is only as trustworthy as the number in it, and the number
 * comes from a device. Capping it means a tampered or runaway client cannot
 * turn one request into a million views — it would have to send a million
 * requests, which App Check and the rate limit above it are there to stop.
 */
export const MAX_INCREMENT = 250;

export const recordPromptEngagement =
  (repo: PromptRepository) =>
  (id: PromptId, counter: PromptCounter, amount = 1): Promise<void> => {
    if (id.trim().length === 0) {
      return Promise.reject(validationError('A prompt id is required.', 'id'));
    }
    if (!Number.isInteger(amount) || amount < 1) {
      return Promise.reject(
        validationError('An engagement amount must be a positive whole number.', 'amount'),
      );
    }
    return repo.incrementStat(id, counter, Math.min(amount, MAX_INCREMENT));
  };
