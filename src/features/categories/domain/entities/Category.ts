import { type CategoryId } from '@core/types/branded';

export type Category = {
  readonly id: CategoryId;
  readonly name: string;
  readonly slug: string;
  readonly iconName: string;
  readonly coverUrl: string | null;
  readonly promptCount: number;
  readonly sortOrder: number;
};
