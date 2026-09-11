declare const brand: unique symbol;

/**
 * Branded primitives: a PromptId cannot be passed where a CategoryId is
 * expected, even though both are strings at runtime. Zero runtime cost.
 */
type Brand<T, B extends string> = T & { readonly [brand]: B };

export type PromptId = Brand<string, 'PromptId'>;
export type CategoryId = Brand<string, 'CategoryId'>;
export type AuthorId = Brand<string, 'AuthorId'>;

/** The single sanctioned crossing point from raw string to branded id. */
export const promptId = (value: string): PromptId => value as PromptId;
export const categoryId = (value: string): CategoryId => value as CategoryId;
export const authorId = (value: string): AuthorId => value as AuthorId;
