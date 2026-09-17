import { getStateFromPath, getPathFromState } from '@react-navigation/native';

import { linking, LINKING_PREFIXES, APP_SCHEME } from './linking';

/** What React Navigation would route this URL path to. */
const routeFor = (path: string) => {
  const state = getStateFromPath(path, linking.config);
  // Walk to the deepest route — nested tabs sit under `Main`.
  let route = state?.routes.at(-1);
  while (route?.state?.routes !== undefined) {
    route = route.state.routes.at(-1) as typeof route;
  }
  return route;
};

describe('deep link routing', () => {
  it('accepts both the custom scheme and the web origins', () => {
    expect(LINKING_PREFIXES).toContain(`${APP_SCHEME}://`);
    expect(LINKING_PREFIXES.some(p => p.startsWith('https://'))).toBe(true);
  });

  it('opens a prompt', () => {
    expect(routeFor('/prompt/abc123')).toMatchObject({
      name: 'PromptDetail',
      params: { promptId: 'abc123' },
    });
  });

  it('opens a category', () => {
    expect(routeFor('/category/cat_couple')).toMatchObject({
      name: 'Category',
      params: { categoryId: 'cat_couple' },
    });
  });

  it('opens a section', () => {
    expect(routeFor('/section/mostCopied')).toMatchObject({
      name: 'PromptSection',
      params: { sort: 'mostCopied' },
    });
  });

  /**
   * A URL is user input: it can be hand-typed, truncated by a chat client, or
   * left over from a build where the sort was named differently. An unknown
   * value would otherwise reach the repository as a bogus order-by and fail the
   * query, so it lands on a working screen instead.
   */
  it('falls back to newest for a sort it does not recognise', () => {
    expect(routeFor('/section/not-a-real-sort')).toMatchObject({
      name: 'PromptSection',
      params: { sort: 'newest' },
    });
  });

  it('routes the tabs', () => {
    expect(routeFor('/explore')?.name).toBe('Explore');
    expect(routeFor('/favorites')?.name).toBe('Favorites');
    expect(routeFor('/profile')?.name).toBe('Profile');
  });

  it('treats the bare origin as Home, so the site root is a valid share URL', () => {
    expect(routeFor('/')?.name).toBe('Home');
  });

  // Ids are opaque and may contain characters a URL escapes. Round-tripping is
  // what guarantees a link the app generates is one the app can also read.
  it('round-trips an id that needs escaping', () => {
    const promptId = 'a/b c&d';
    const path = getPathFromState(
      { routes: [{ name: 'PromptDetail', params: { promptId } }] } as never,
      linking.config,
    );

    expect(routeFor(path)).toMatchObject({ name: 'PromptDetail', params: { promptId } });
  });

  it('ignores a path that matches nothing', () => {
    expect(routeFor('/nope/nope')?.name).not.toBe('PromptDetail');
  });
});
