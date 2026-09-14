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
  Category: { categoryId: string; title: string };
  /**
   * The full list behind a detail-page section. `sort` is the identity; `title`
   * rides along so the header paints before the query resolves.
   */
  PromptSection: { sort: PromptSort; title: string };
};

declare global {
  namespace ReactNavigation {
    // Makes useNavigation() typed everywhere with no casts.
    interface RootParamList extends RootStackParamList {}
  }
}
