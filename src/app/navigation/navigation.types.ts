import { type NavigatorScreenParams } from '@react-navigation/native';

import { type PromptSort } from '@features/prompts/domain/repositories/PromptRepository';

export type MainTabParamList = {
  Home: undefined;
  Explore: undefined;
  Favorites: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  /**
   * ONLY the id. A prompt object in a route breaks deep links and state
   * restoration — the params have to survive being serialised and restored
   * after the process is killed. The detail screen seeds its first paint from
   * the query cache instead (see `usePromptById`), which needs nothing here.
   */
  PromptDetail: { promptId: string };
  /**
   * `title` rides along so the header paints before the query resolves, but it
   * is OPTIONAL because a deep link cannot supply it — an incoming URL carries
   * an id and nothing else. The screen falls back to the category's real name
   * once the list loads.
   */
  Category: { categoryId: string; title?: string };
  /**
   * The full list behind a detail-page section. `sort` is the identity; `title`
   * is again only a head start, and is derived from `sectionForSort` when a
   * link arrives without one.
   */
  PromptSection: { sort: PromptSort; title?: string };
  /**
   * No params: the query lives in the screen's own state, deliberately. Putting
   * it in the route would push a new entry per keystroke and make the back
   * button walk the user backwards through their own typing.
   */
  Search: undefined;
};

declare global {
  namespace ReactNavigation {
    // Makes useNavigation() typed everywhere with no casts.
    interface RootParamList extends RootStackParamList {}
  }
}
