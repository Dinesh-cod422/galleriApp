import { validationError } from '@core/errors/AppError';
import { type PromptId } from '@core/types/branded';

import { type PromptDetail } from '../entities/Prompt';
import { type PromptRepository } from '../repositories/PromptRepository';

export const getPromptById =
  (repo: PromptRepository) =>
  (id: PromptId): Promise<PromptDetail> => {
    if (id.trim().length === 0) {
      return Promise.reject(validationError('A prompt id is required.', 'id'));
    }
    return repo.getPromptById(id);
  };
