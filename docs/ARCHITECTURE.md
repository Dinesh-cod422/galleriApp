# AI Prompt Gallery — Architecture Blueprint

React Native CLI · TypeScript (strict) · Frontend-only phase (local dummy data)

> Status: **awaiting approval**. No application code exists yet.
> The single non-negotiable rule of this document: **the presentation layer talks to use cases,
> use cases talk to repository interfaces, and only the data layer knows where bytes come from.**
> That is what makes the Firebase swap a data-layer-only change later.

---

## 1. Architecture Diagram

### 1.1 Layer dependency direction

```
┌──────────────────────────────────────────────────────────────┐
│  PRESENTATION            screens · components · hooks · VMs   │
│  React Native, Reanimated, navigation, design-system          │
└───────────────────────────┬──────────────────────────────────┘
                            │  calls use cases, receives entities
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  DOMAIN                  entities · repository interfaces     │
│  use cases · domain errors ·  ZERO react / react-native       │
└───────────────────────────┬──────────────────────────────────┘
                            │  depends on the INTERFACE only
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  DATA                    repositoryImpl · dataSources · DTOs  │
│  mappers (DTO → entity) · error translation                   │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  INFRASTRUCTURE          storage · clipboard · share · haptics │
│  (later: firebase client, http client)                        │
└──────────────────────────────────────────────────────────────┘
```

The arrow is compile-time dependency. Domain is the innermost circle and imports nothing
outward. Data implements domain interfaces (Dependency Inversion) — this is the seam.

### 1.2 Runtime data flow (read path)

```
HomeScreen (thin)
   └─ useHomeViewModel()                      composes the screen's data needs
        ├─ useFeaturedPrompts()  ─┐
        ├─ useTrendingPrompts()   ├─ TanStack Query hooks (cache, retry, states)
        └─ useCategories()       ─┘
                 │
                 ▼  queryFn
        getFeaturedPrompts(repo)               use case — pure function
                 │
                 ▼
        PromptRepository (interface, domain)
                 │
                 ▼
        PromptRepositoryImpl (data)            maps DTO → entity, errors → AppError
                 │
                 ▼
        PromptLocalDataSource (data)           latency simulation, filtering, paging
                 │
                 ▼
        prompts.mock.ts                        30+ realistic prompts
```

### 1.3 Favorites flow (client state, not server state)

```
PromptCard  ──onToggleFavorite──▶ useFavorites()  ─▶ favorites.store.ts (Zustand)
                                                        │
                                                        ▼
                                             storageService (infrastructure, MMKV)
```
Favorites are **local client state** in this phase, so they live in Zustand with a
persistence middleware, not in TanStack Query. When favorites become server-owned, the
store is replaced by a mutation + query and `useFavorites()` keeps the same signature.

### 1.4 Composition root

`src/app/providers/` wires: `QueryClientProvider` → `SafeAreaProvider` →
`GestureHandlerRootView` → `ThemeProvider` → `NavigationContainer`.
`src/app/di/container.ts` constructs concrete data sources + repositories **once** and
exposes them through a tiny typed object. Use cases receive their repository as an argument,
so tests pass fakes without any mocking framework or DI library.

---

## 2. Complete Folder Structure

```
ai-prompt-gallery/
├── android/                     (RN CLI native project)
├── ios/
├── docs/
│   └── ARCHITECTURE.md
├── src/
│   ├── app/                              ── composition root, nothing reusable lives here
│   │   ├── App.tsx
│   │   ├── providers/
│   │   │   ├── AppProviders.tsx
│   │   │   ├── QueryProvider.tsx          queryClient config: staleTime, retry, gcTime
│   │   │   └── ThemeProvider.tsx
│   │   ├── navigation/
│   │   │   ├── RootNavigator.tsx          Stack: Splash · Main · PromptDetail · Category
│   │   │   ├── MainTabNavigator.tsx       Tabs: Home · Explore · Favorites · Profile
│   │   │   ├── linking.ts                 deep links (promptgallery://prompt/:id)
│   │   │   ├── navigation.types.ts        ParamList types — single source of truth
│   │   │   └── routes.ts                  route name constants (no magic strings)
│   │   └── di/
│   │       └── container.ts               builds repositories once, typed accessor
│   │
│   ├── core/                             ── cross-feature, framework-light
│   │   ├── errors/
│   │   │   ├── AppError.ts                tagged union error model
│   │   │   └── toAppError.ts              unknown → AppError normalizer
│   │   ├── result/
│   │   │   └── Result.ts                  used ONLY where throwing is wrong (see §4)
│   │   ├── types/
│   │   │   ├── Paginated.ts
│   │   │   ├── AsyncState.ts              Loading|Success|Empty|Error discriminated union
│   │   │   └── branded.ts                 PromptId, CategoryId branded string types
│   │   ├── hooks/
│   │   │   ├── useDebouncedValue.ts
│   │   │   ├── useResponsive.ts
│   │   │   └── useStableCallback.ts
│   │   ├── utils/
│   │   │   ├── formatCount.ts             1200 → "1.2K"
│   │   │   ├── formatRelativeDate.ts
│   │   │   └── array.ts
│   │   └── config/
│   │       └── env.ts                     feature flags: USE_REMOTE_DATA = false
│   │
│   ├── design-system/                    ── knows nothing about prompts/features
│   │   ├── theme/
│   │   │   ├── colors.ts                  light + dark palettes (semantic tokens)
│   │   │   ├── typography.ts              scale + weights + lineHeights
│   │   │   ├── spacing.ts                 4-point scale
│   │   │   ├── radius.ts
│   │   │   ├── shadows.ts                 iOS shadow + Android elevation pairs
│   │   │   ├── theme.ts                   Theme type + lightTheme/darkTheme objects
│   │   │   └── useTheme.ts                context consumer hook
│   │   ├── components/
│   │   │   ├── Text/          Text.tsx · Text.types.ts
│   │   │   ├── Button/        Button.tsx (variants: primary|secondary|ghost|danger)
│   │   │   ├── IconButton/
│   │   │   ├── Card/
│   │   │   ├── Avatar/
│   │   │   ├── Badge/
│   │   │   ├── Skeleton/      Skeleton.tsx + SkeletonGroup (Reanimated shimmer)
│   │   │   ├── EmptyState/
│   │   │   ├── ErrorState/
│   │   │   ├── BottomSheet/
│   │   │   ├── Divider/
│   │   │   └── Screen/        safe-area + background wrapper
│   │   ├── icons/                          react-native-svg icon set
│   │   ├── responsive/
│   │   │   ├── breakpoints.ts              phone | large-phone | tablet
│   │   │   └── grid.ts                     columns-per-breakpoint helper
│   │   └── index.ts                        the ONLY public entry (controlled barrel)
│   │
│   ├── features/
│   │   ├── prompts/
│   │   │   ├── domain/
│   │   │   │   ├── entities/Prompt.ts
│   │   │   │   ├── repositories/PromptRepository.ts
│   │   │   │   └── usecases/
│   │   │   │       ├── getPrompts.ts
│   │   │   │       ├── getPromptById.ts
│   │   │   │       ├── searchPrompts.ts
│   │   │   │       ├── getPromptsByCategory.ts
│   │   │   │       ├── getFeaturedPrompts.ts
│   │   │   │       └── getTrendingPrompts.ts
│   │   │   ├── data/
│   │   │   │   ├── datasources/PromptLocalDataSource.ts
│   │   │   │   ├── dto/PromptDto.ts
│   │   │   │   ├── mappers/promptMapper.ts
│   │   │   │   ├── mock/prompts.mock.ts          30+ prompts
│   │   │   │   └── repositories/PromptRepositoryImpl.ts
│   │   │   └── presentation/
│   │   │       ├── screens/
│   │   │       │   ├── HomeScreen.tsx
│   │   │       │   ├── ExploreScreen.tsx
│   │   │       │   └── PromptDetailScreen.tsx
│   │   │       ├── components/
│   │   │       │   ├── PromptCard.tsx             memoized, presentational
│   │   │       │   ├── PromptGrid.tsx             FlashList wrapper
│   │   │       │   ├── PromptCarousel.tsx         horizontal featured rail
│   │   │       │   ├── PromptCardSkeleton.tsx
│   │   │       │   ├── HomeHeader.tsx
│   │   │       │   └── detail/ (DetailHero, PromptBody, TagList, ActionBar, StatRow)
│   │   │       ├── hooks/
│   │   │       │   ├── queryKeys.ts               centralized key factory
│   │   │       │   ├── usePrompts.ts
│   │   │       │   ├── usePromptById.ts
│   │   │       │   ├── useFeaturedPrompts.ts
│   │   │       │   └── useTrendingPrompts.ts
│   │   │       ├── viewmodels/
│   │   │       │   ├── useHomeViewModel.ts
│   │   │       │   └── usePromptDetailViewModel.ts
│   │   │       └── mappers/toPromptCardVm.ts      entity → UI view model
│   │   │
│   │   ├── categories/    (domain · data · presentation — same shape)
│   │   ├── search/        (domain · data · presentation)
│   │   ├── favorites/     (domain · data[storage-backed] · presentation)
│   │   └── profile/       (domain · data · presentation)
│   │
│   ├── infrastructure/                   ── the only place native modules are imported
│   │   ├── storage/
│   │   │   ├── StorageService.ts          interface
│   │   │   └── mmkvStorage.ts             implementation + zustand persist adapter
│   │   ├── clipboard/clipboardService.ts
│   │   ├── share/sharingService.ts
│   │   ├── haptics/hapticService.ts
│   │   └── logger/logger.ts
│   │
│   └── assets/
│       ├── fonts/
│       ├── images/
│       └── lottie/
│
├── __tests__/  (or *.test.ts co-located — see §11)
├── .eslintrc.js       import/no-restricted-paths enforces layering
├── tsconfig.json      strict + path aliases (@core, @ds, @features, @infra, @app)
├── babel.config.js    module-resolver + reanimated plugin (must be LAST)
└── jest.config.js
```

---

## 3. Dependency Rules (enforced, not just documented)

| Layer | May import | Must never import |
|---|---|---|
| `app/` | everything | — |
| `design-system/` | `core/` (utils, types only) | any `features/**`, `infrastructure/**` |
| `core/` | nothing internal | `features/**`, `design-system/**`, `infrastructure/**` |
| `features/*/domain` | `core/` | react, react-native, data, presentation, infrastructure |
| `features/*/data` | own domain, `core/`, `infrastructure/` | presentation, other features' internals |
| `features/*/presentation` | own domain (+ types), `core/`, `design-system/` | **own data layer**, other features' data/domain |
| `infrastructure/` | `core/` | features, design-system |

Additional rules:

1. **Presentation never imports `data/`.** It receives repositories through `app/di`.
   ESLint `import/no-restricted-paths` will fail the build on `features/*/presentation/**`
   importing `features/*/data/**`.
2. **Cross-feature contact is allowed only through a feature's public `index.ts`**, and only
   for the two legitimate cases in this app: any feature may use `favorites`' presentation
   hook (`useIsFavorite`, `useToggleFavorite`), and `search`/`categories` may re-use the
   `prompts` domain entity + `PromptCard`. Everything else moves to `core`/`design-system`.
3. **Barrel files exist only at controlled boundaries**: `design-system/index.ts`,
   `features/<name>/index.ts`, `core/<area>/index.ts`. No deep barrel chains, no barrel
   re-exporting another barrel of the same feature — that is how cycles start in RN.
4. **No business logic in components.** A component may branch on props; it may not decide
   what "trending" means. `madge --circular src` runs in CI.

---

## 4. Layer Responsibilities

### Domain — the rules, in plain TypeScript

```ts
// entities/Prompt.ts — shape ONLY, no methods needed here
export type Prompt = {
  id: PromptId; title: string; prompt: string;
  imageUrl: string; thumbnailUrl: string;
  category: CategoryId; tags: string[];
  author: PromptAuthor;                      // { id, name, avatarUrl }
  likes: number; views: number;
  createdAt: string;                         // ISO-8601, parsed at the edge
};
```

* `PromptRepository` is an **interface** declaring `getPrompts`, `getPromptById`,
  `searchPrompts`, `getPromptsByCategory`, `getFeaturedPrompts`, `getTrendingPrompts`.
* Use cases are **plain async functions**, not classes:
  `export const getTrendingPrompts = (repo: PromptRepository) => (params) => repo.getTrending(params)`.
  A class with one method and no state is ceremony; a function is testable with zero setup.
* A use case earns its existence when it holds a rule. `getTrendingPrompts` applies the
  trending window + sort policy; `searchPrompts` normalizes/validates the query and
  short-circuits on <2 characters. Pass-through use cases still exist for the six required
  operations because they are the presentation layer's stable vocabulary.
* **No React, no React Native, no async-storage, no fetch.** Verified by lint rule.

### Data — where the outside world is translated

* `PromptLocalDataSource` owns the mock array, simulated latency (120–400ms), deterministic
  paging, and a seeded failure mode (`?fail=true` dev toggle) so error states are real.
* `PromptRepositoryImpl` maps `PromptDto → Prompt`, converts thrown/unknown failures into
  `AppError`, and is the **only** class-ish object in the data layer (it holds a data-source
  reference — genuine state, so a factory function returning an object is fine).
* DTOs mirror the future backend payload shape, not the UI shape. That is what keeps the
  Firestore swap mechanical.

### Presentation

* **Screens are thin**: layout + one view model call + state switch. Target < 120 lines.
* **Hooks** own async state via TanStack Query.
* **View models** compose multiple hooks and expose one object:
  `{ status, sections, actions }` — so the screen renders a `switch (status)`.
* **UI view models** (`toPromptCardVm`) pre-format counts/dates so cards do no work at render.

### Error model

```ts
type AppError =
  | { kind: 'network';   message: string; retryable: true }
  | { kind: 'notFound';  message: string; retryable: false }
  | { kind: 'validation'; message: string; field?: string; retryable: false }
  | { kind: 'unknown';   message: string; cause?: unknown; retryable: true };
```
Repositories **throw** `AppError` (TanStack Query is built around thrown errors — wrapping
everything in `Result` would fight the library). `Result<T,E>` is reserved for the few
non-query paths where failure is an expected branch (clipboard denied, share cancelled).
Every screen renders Loading / Success / Empty / Error+Retry; nothing is swallowed, and
`logger.error` receives every non-`notFound` AppError.

---

## 5. State-Management Strategy

| State | Tool | Why |
|---|---|---|
| Prompts, categories, search results, detail | **TanStack Query** | async, cacheable, refetchable, shared across screens; gives loading/error/stale for free — and it becomes the Firebase cache layer unchanged |
| Favorites (ids + order) | **Zustand + persist(MMKV)** | client-owned, synchronous reads, must survive restart, read by many cards |
| Theme mode (system/light/dark) | **Zustand + persist** | tiny global, rarely changes |
| Recent searches | **Zustand + persist** | client-owned list |
| Search input text, sheet open, tab index, scroll pos | **useState / local** | ephemeral UI; global storage here would cause app-wide re-renders |

Rules that matter:

* **Selector-level subscriptions only.** `useFavoriteStore(s => s.ids.has(id))` inside a card,
  never `useFavoriteStore()`. Favorites are stored as a `Set<PromptId>`-backed record so a
  card's subscription returns a boolean — a new favorite re-renders exactly one card.
* Query keys come from one factory (`queryKeys.prompts.list(filters)`) so invalidation is safe.
* Defaults: `staleTime: 5min`, `gcTime: 30min`, `retry: 2 (never for notFound/validation)`,
  `refetchOnWindowFocus: false` (mobile), `placeholderData: keepPreviousData` for search.
* Detail screen seeds from the list cache via `initialData` → image + title paint instantly.

---

## 6. Navigation Architecture

```
NavigationContainer (+ linking, theme-aware)
└── RootStack (native-stack)
    ├── Splash            (no header; hydrates store, warms caches, then replace)
    ├── Main              → BottomTabs
    │   ├── Home          HomeScreen
    │   ├── Explore       ExploreScreen
    │   ├── Favorites     FavoritesScreen
    │   └── Profile       ProfileScreen
    ├── PromptDetail      { promptId, preview?: PromptCardVm }   transparent-ish, gesture back
    ├── Category          { categoryId, title }
    └── Search            modal presentation (full-screen, from Home search bar)
```

* One `RootStackParamList` + `MainTabParamList` in `navigation.types.ts`, augmented into
  `ReactNavigation.RootParamList` so `useNavigation()` is typed everywhere with no casts.
* Screens receive **ids, never entities** (ids are deep-link safe). An optional `preview`
  param carries the already-loaded card VM for an instant hero paint — the real fetch still runs.
* Tab bar is custom-rendered with Reanimated (icon scale + label fade + indicator spring),
  `lazy: true`, `detachInactiveScreens` on, `freezeOnBlur` via react-native-screens.
* Route constants in `routes.ts`; `linking.ts` maps `promptgallery://prompt/:id` now so
  push-notification deep links need no rework later.

---

## 7. Design-System Architecture

* **Tokens → semantic tokens → components.** Raw palette (`blue500`) is private to
  `colors.ts`; components consume semantic names (`bg.surface`, `text.primary`,
  `border.subtle`, `accent.default`). Dark mode is a second token map, not conditionals.
* `ThemeProvider` holds `{ theme, mode, setMode }`; `useTheme()` returns the `Theme`.
  Styles are built with `useThemedStyles(styleFactory)` which memoizes per theme object —
  no `StyleSheet.create` inside render, no inline style objects in list rows.
* `Text` is the only text primitive: `variant` (display/h1/h2/title/body/caption/label),
  `color` (semantic key), `weight`. Screens never touch `fontSize`.
* `Button` composes `Pressable` + Reanimated scale; `IconButton` shares the same press hook.
* `Skeleton` uses one shared shimmer driver (a single `useSharedValue` loop passed via
  context) so 12 skeletons on screen animate from **one** animation, not twelve.
* `BottomSheet` wraps `@gorhom/bottom-sheet` behind our own props — if we swap the library,
  screens don't change.
* Responsive: `useResponsive()` returns `{ width, breakpoint, isTablet, columns }`.
  Grid columns = 2 (phone) / 3 (large phone landscape) / 4 (tablet). Spacing/typography scale
  by breakpoint at the token level, so no screen does `width * 0.42` math.
* Enforcement: ESLint `no-restricted-syntax` blocks raw hex colors and numeric `fontSize`
  outside `design-system/theme`.

---

## 8. Dummy-Data Architecture

* `prompts.mock.ts` — **32 realistic prompts** across 8 categories (Photography, 3D Render,
  Illustration, Portrait, Architecture, Product, Fantasy, Abstract), each with real-sounding
  prompt text (60–220 chars), 3–6 tags, one of 10 authors, plausible likes/views, and
  `createdAt` spread across the last 90 days.
* Images: `https://picsum.photos/seed/<id>/1200/1600` for full, `.../seed/<id>/400/533`
  for thumbnails — deterministic per prompt, two genuinely different resolutions so the
  thumbnail/full-res split is real, not cosmetic.
* The mock is typed as `PromptDto[]` (backend shape), **never** as `Prompt[]`. Mapping runs
  for real on every read, so the mapper is exercised from day one.
* `PromptLocalDataSource` simulates: latency, cursor pagination (page size 12), case/accent-
  insensitive search across title+tags+prompt, category filter, and sorting policies.
* `core/config/env.ts` exposes `DATA_SOURCE: 'local' | 'firebase'`; the DI container reads it.
  Today only `'local'` is constructible — the branch exists so adding the other is a one-line change.

---

## 9. Performance Architecture (every decision has a reason)

1. **FlashList for the grid, FlatList for short horizontal rails.** FlashList recycles views
   instead of mounting/unmounting; with 100+ image cells that is the difference between
   smooth and janky. Rails of ≤10 items don't recycle enough to justify the extra estimate
   tuning, so plain FlatList with `initialNumToRender={3}`.
2. **`estimatedItemSize` computed from the responsive card height**, not hardcoded — a wrong
   estimate is the #1 cause of FlashList blank cells.
3. **`React.memo` on `PromptCard` with a custom comparator** on `(id, isFavorite, width)`.
   Cards receive a pre-formatted VM + stable callbacks, so the comparator is cheap and true.
4. **Stable callbacks**: the list passes one `onPressPrompt(id)` created with `useCallback`;
   the card calls `onPress(item.id)` — no per-row arrow closures, which would break memo.
5. **Boolean-only favorite subscription** per card (see §5) — toggling a favorite re-renders
   1 card, not the list.
6. **Thumbnail in lists, full-res only on detail.** Detail seeds with the thumbnail as the
   placeholder and cross-fades to full-res (Reanimated opacity) — perceived instant load.
7. **`react-native-fast-image`**: native disk+memory caching, `priority` (high for visible
   rails, normal elsewhere), `resizeMode=cover`, and it avoids RN `Image`'s re-decode on
   re-render. Fixed aspect-ratio containers prevent layout shift.
8. **No image work on the JS thread.** Formatting (counts, dates) happens once in the mapper,
   not in render.
9. **All animations on the UI thread** — Reanimated worklets + `useAnimatedStyle`; zero
   `Animated` + `useNativeDriver:false`, zero `setState` in gesture handlers.
10. **Skeletons instead of spinners** for first load (perceived performance + no layout shift),
    driven by one shared shimmer clock.
11. **Lazy tabs + `freezeOnBlur`** so Explore's list doesn't render or animate while on Home.
12. **Pagination (12/page) with `useInfiniteQuery`** and `onEndReachedThreshold={0.6}`;
    `keepPreviousData` prevents the list from flashing empty between pages.
13. **Debounced search (300ms) + min 2 chars** in the use case, so keystrokes don't spawn
    32-item scans or, later, Firestore reads.
14. **Keys are entity ids** (`keyExtractor = item => item.id`) — never array index, which
    destroys recycling correctness on filter changes.
15. **`removeClippedSubviews` on Android grids**, `getItemLayout` where cell height is fixed.
16. **Hermes + `interactionManager`-deferred non-critical work** on Splash.

---

## 10. Required npm Packages

**Runtime**
```
@react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
react-native-screens react-native-safe-area-context
@tanstack/react-query
zustand
react-native-reanimated react-native-gesture-handler
@shopify/flash-list
react-native-fast-image
@gorhom/bottom-sheet
react-native-svg
react-native-mmkv                      // storage impl behind StorageService
@react-native-clipboard/clipboard
react-native-haptic-feedback
react-native-linear-gradient
```
`Share` comes from React Native core — no package needed; it still hides behind
`sharingService` so a richer library can replace it without touching screens.

**Dev**
```
typescript @types/react @types/jest
eslint @react-native/eslint-config eslint-plugin-import eslint-import-resolver-typescript
prettier
jest @testing-library/react-native @testing-library/jest-native react-test-renderer
babel-plugin-module-resolver
madge                                  // circular-dependency check
@tanstack/eslint-plugin-query
```

Deliberately **not** included: Redux (Zustand + Query covers it), styled-components
(runtime cost in lists), i18n/analytics/Sentry (out of scope this phase), any DI container
(a plain object is enough).

---

## 11. Testing Strategy

| Level | Target | Tooling |
|---|---|---|
| Unit (fast, most of the suite) | use cases, mappers, `PromptLocalDataSource` filters/sort/paging, formatters, Zustand store logic | Jest only — no RN renderer needed because domain has no RN |
| Contract | `PromptRepositoryImpl` against a **fake** `PromptDataSource`; a shared `repositoryContract.spec` the future Firebase impl must also pass | Jest |
| Hook | query hooks with a `QueryClientProvider` wrapper + injected fake repo | `@testing-library/react-native` `renderHook` |
| Component | `PromptCard`, `Button`, `EmptyState`, `ErrorState` — render, press, a11y labels | RNTL |
| Screen (a few, high value) | Home & Detail: loading → success → empty → error → retry | RNTL + fake repo via DI override |

Because use cases take their repository as an argument and the DI container is a plain
object, tests need **no `jest.mock` of modules** — they pass a fake. That is the practical
payoff of the layering, and the reason the abstraction exists at all.

Co-located `*.test.ts` next to the unit under test; coverage gate on `domain/` + `data/` only
(90%), not on presentation — chasing UI coverage produces brittle tests.

---

## 12. Future Firebase Migration Strategy

Nothing above the data layer changes. The migration is four files:

1. **Add** `features/prompts/data/datasources/FirebasePromptDataSource.ts` implementing the
   same internal `PromptDataSource` interface `PromptLocalDataSource` already satisfies.
2. **Add** `infrastructure/firebase/firebaseClient.ts` (the only module importing
   `@react-native-firebase/*`).
3. **Map** Firestore docs in `promptMapper.ts` — the DTO already mirrors the document shape,
   and `Timestamp → ISO string` is the one new line.
4. **Flip** `env.DATA_SOURCE = 'firebase'` so `app/di/container.ts` constructs the other
   data source.

`PromptRepositoryImpl`, all six use cases, every hook, view model, component and screen are
untouched. Follow-ups that are then also localized:
* **Pagination**: local cursor → Firestore `startAfter` — inside the data source.
* **Search**: local scan → Algolia/Typesense adapter — a second data source, repository unchanged.
* **Favorites**: Zustand-persisted → Firestore-backed. `useFavorites()` keeps its signature;
  internals become a query + optimistic mutation. Cards don't change.
* **Auth/likes**: new `auth` feature; `likePrompt` becomes a mutation use case. The existing
  optimistic-like UI already updates the Query cache, so only the mutation function changes.
* **Offline**: TanStack Query persister on MMKV — a provider-level addition.

Guardrail: `PromptRepositoryImpl` keeps its contract test suite; the Firebase data source must
pass the identical contract before the flag flips.

---

## 13. Development Phases

| Phase | Deliverable | Definition of done |
|---|---|---|
| **0 — Bootstrap** | RN CLI + TS project in `ai-prompt-gallery/`, strict tsconfig, path aliases, ESLint layering rules, Babel (reanimated last), Jest, folder skeleton, iOS pods + Android build green | `npx react-native run-ios/android` shows a blank themed screen; `tsc --noEmit` and `eslint` clean |
| **1 — Foundation** | `core/` (errors, types, hooks, utils) + full `design-system` (tokens, light/dark theme, all 10 components + Screen/ErrorState, responsive utils) + a dev "Kitchen Sink" screen | Every DS component renders in both themes on phone + tablet sim |
| **2 — Domain & Data** | Prompt + Category entities, repository interfaces, 6 use cases, DTOs, mappers, 32-prompt mock, local data sources, repository impls, DI container — **plus their unit tests** | `jest` green; no RN import in any `domain/` file |
| **3 — Navigation shell** | Root stack, tab navigator (animated tab bar), typed param lists, linking, Splash, placeholder screens | Deep link to `/prompt/:id` lands on a placeholder detail |
| **4 — Home** | QueryProvider, query keys, prompt hooks, `useHomeViewModel`, PromptCard, PromptCarousel, PromptGrid, skeletons, all 5 UI states | Home renders featured/categories/trending/latest from mock with skeleton → content |
| **5 — Explore · Category · Search** | Infinite grid, category chips + Category screen, debounced search + recent searches, empty/no-results states | Paging and search verified on a 100+ item mock expansion |
| **6 — Detail + Infrastructure** | `infrastructure/` services (clipboard, share, haptics, storage), Detail screen (hero cross-fade, prompt body, tags, stats), Copy/Share/Like actions with optimistic cache updates | Copy shows animated confirmation + haptic; share sheet opens on both platforms |
| **7 — Favorites + Profile** | Favorites store (persisted, selector-based), animated favorite button, Favorites screen, Profile (theme toggle, stats, about) | Kill and relaunch the app — favorites and theme survive |
| **8 — Hardening** | Reanimated polish, bottom sheet, perf pass (FlashList estimates, memo audit, re-render profiling), a11y labels, tablet layout pass, screen tests, README + ADRs | No dropped frames scrolling 100 cards on a low-end Android profile |

Each phase ends with: `tsc --noEmit` clean, `eslint` clean, `jest` green, `madge --circular` empty.

---

## Open questions before Phase 1

1. **React Native version** — target latest stable 0.8x with New Architecture **on**?
   (FlashList v2 requires it; on old arch I'd pin FlashList v1.)
2. **Dark mode** — ship both themes from Phase 1 (my recommendation, tokens make it cheap)
   or light-only now?
3. **Minimum OS** — iOS 15 / Android 7 (API 24) assumed unless you say otherwise.
4. **Tablet** — first-class responsive layouts, or phone-first with graceful scaling?

Defaults if you don't specify: latest stable RN with New Architecture, both themes,
iOS 15 / API 24, first-class tablet grid.

---

# Implementation notes — Phases 0 & 1

Delivered on 2026-09-11. Everything below records where the **built** system
differs from the blueprint above, and why. The blueprint is not retro-edited —
the deltas are the interesting part.

## Versions pinned

React Native **0.87.1** · React **19.2.3** · TypeScript **6.0.3** · New Architecture **on**.

**Node 22 is required** (`engines: >= 22.11.0`, and `.nvmrc` pins `22`). The
machine's default is Node 20, so `nvm use` before any npm script or Metro will
fail in confusing ways.

## Deltas from the plan

| # | Planned | Built | Why |
|---|---|---|---|
| 1 | `core/hooks/useResponsive.ts` | `design-system/responsive/useResponsive.ts` | It reads breakpoint tokens, and `core` is forbidden from importing the design system. Moving it keeps the dependency rule true instead of carving an exception into it. |
| 2 | `ThemeProvider` in `app/providers/` | `design-system/theme/ThemeProvider.tsx` | Design-system components must consume the theme context, and the design system may not import `app`. `app/providers/AppProviders.tsx` composes it; it no longer owns it. |
| 3 | `react-native-fast-image` | `@d11/react-native-fast-image` | The original is unmaintained and has no New Architecture support. The maintained fork has the same API. Either way it is reached only through `AppImage`. |
| 4 | Reanimated alone | Reanimated 4 **+ `react-native-worklets`** | Reanimated 4 split its worklets runtime into a peer package; the Babel plugin is now `react-native-worklets/plugin` (still last in the list). |
| 5 | `react-native-mmkv` alone | MMKV 4 **+ `react-native-nitro-modules`** | MMKV 4 is built on Nitro; without it `pod install` fails to resolve `NitroModules`. |
| 6 | `import/no-cycle` in ESLint | `npm run circular` (madge) | `import/no-cycle` re-parses React Native's Flow sources with the Babel parser and floods every lint run with parse errors. madge walks the graph once, cleanly, and is wired into `npm run verify`. |
| 7 | 10 design-system components | 13 | Added `ErrorState` (the error half of `EmptyState`), `Divider`, `Screen`, and `AppImage`. Each was being hand-rolled at more than one call site in Phase 1 already. |
| 8 | — | `src/types/react-native-compat.d.ts` | RN 0.87 removed the exported `FlexStyle` / `ShadowStyleIOS` type aliases; FastImage's typings still import them, so under `skipLibCheck` its `ImageStyle` silently lost every layout prop. The shim re-declares both as `ViewStyle`. One file, documented, deleted when the library catches up. |
| 9 | `baseUrl` + `paths` | `paths` only | TypeScript 6 deprecates `baseUrl`. With `moduleResolution: "bundler"`, paths resolve relative to `tsconfig.json`. |
| 10 | `react-native-reanimated/mock` in Jest | hand-written mock, `jest/mocks/reanimated.js` | Reanimated 4's own mock re-enters the real module (needs JSI); its web build wants `react-native-web`. We use a small slice of the API, so mocking that slice directly is simpler and more honest than fighting build resolution. Animations settle instantly — tests assert end state, not interpolation. |

## Decisions worth knowing

* **`exactOptionalPropertyTypes` is deliberately off.** It fights React Native's
  optional style/prop signatures constantly for very little bug yield.
  `noUncheckedIndexedAccess` **is** on — that one catches real bugs in mock-data
  indexing and paging.
* **Skeleton shimmer is an opacity pulse, not a gradient sweep.** A sweep needs
  each skeleton's measured width — per-instance `onLayout` work on the JS thread
  for every cell in a loading grid. One shared clock (`ShimmerProvider`) drives
  every skeleton in the app, so a grid of twelve costs one animation.
* **`useThemedStyles` memoizes on theme identity**, and `createTheme` caches by
  `(mode, breakpoint)`. Both are required for the other to mean anything: a
  fresh theme object per render would rebuild every StyleSheet in the tree.
  Style factories are therefore declared at module scope, never inline.
* **`Card` is not pressable.** Composition instead — wrap it in a Pressable.
* **`ErrorState` takes the `AppError`, not a string**, so the retry button is
  driven by `error.retryable`. A "Try again" on a 404 is a dead end.

## Gallery layout — the Pinterest/masonry grid

`PromptMasonryGrid` (Home "Latest" + Category) renders variable-height tiles in
shortest-column order. Decisions worth keeping:

* **`FlashList masonry`, not two hand-stacked columns.** The usual workaround —
  split the data into per-column arrays inside a `ScrollView` — forfeits
  recycling, so a 500-prompt scroll holds 500 mounted images. Masonry keeps
  windowing: mounted tiles stay proportional to the screen, not to the feed.
  Requires the New Architecture, which this app is on.
* **`optimizeItemArrangement` is off.** It balances column heights by reordering
  items, which reshuffles tiles the user has already seen every time a page is
  appended. Plain shortest-column placement is stable under append and already
  produces the staggered look.
* **Gaps live on the cells, not between them.** A cell cannot know whether it is
  on an edge — masonry assigns it to whichever column is shortest — so each cell
  carries half a gap on each side and the content container carries
  `gutter - gap/2`.
* **Aspect ratios are clamped to [0.5, 2].** A masonry column is only as
  well-behaved as its most extreme cell: a 1:4 upload fills the viewport alone;
  a 6:1 panorama collapses to a sliver. Every seeded ratio is already inside the
  range, so this only guards real uploads.
* **`aspectRatio` is a number on `PromptListItem`,** parsed from `'3:2'` in the
  mapper. Layout must never parse strings during render.
* **Tiles are a separate component from `PromptCard`, not a `variant` prop.**
  A tile has no border, no surface and no fixed width — the image is the
  content. A card is a fixed-width bordered surface for a horizontal rail. One
  component would have branched on the variant in every style.
* **"Related" is deliberately NOT one of `DETAIL_SECTIONS`.** Those four are
  global rankings — the same nine prompts whichever page you are on — which is
  why they can be a static table of sorts. Related is a function of the prompt
  you are looking at, and folding it into that table would mean giving every
  other entry a category parameter it does not use.
* **Related is category-based, and its cache is keyed by CATEGORY, not by
  prompt.** Two prompts in the same category share one answer, so opening five
  photography prompts in a row costs one read rather than five. Tag overlap
  would be a better relevance signal, but Firestore cannot rank by "number of
  shared tags" without reading every candidate — that belongs behind a search
  service, not a client-side scan.
* **Its "Show all" opens the existing Category page**, not a section page: the
  full list of related prompts IS that category, and a second screen running the
  same query under a different title would be a duplicate. It also means Related
  needs no new index.
* **Four suggestion sections under a prompt, declared once in
  `DETAIL_SECTIONS`.** The rail and the full page behind its "Show all" read the
  same table, so a section cannot be titled one thing in the strip and another
  in the header it opens. Adding a fifth section is one entry plus an index.
* **Each rail owns its query.** The screen does not fetch four lists and pass
  arrays down: a rail that fails or is still loading degrades on its own instead
  of holding up the other three, and a failed or empty section renders nothing
  at all — these are suggestions below the content the user actually asked for,
  so an error card would be louder than the thing it sits under.
* **A section fetches ten and shows nine.** The prompt you are looking at is
  filtered out of its own sections; fetching `SECTION_SIZE + 1` means that
  removal still leaves a full row, instead of a strip that silently shrinks to
  eight on some prompts and not others.
* **`stats.sharesCount` is a real counter, added for this.** "Most shared" had
  no field behind it — the alternative was to rank by a proxy like favourites
  and call it sharing, which would be a lie in the UI. It is guarded in the
  rules exactly like the other trusted counters: zero on create, and movable
  only one at a time by `isCounterWrite`.
* **Sort field and cursor type live in ONE table** (`SORT` in the datasource).
  A timestamp cursor decodes as a Date and a counter cursor as a Number; when
  those were two separate `sort === 'trending'` checks, adding a sort meant
  remembering to update both. Now a new sort cannot compile without deciding
  both.
* **The detail screen seeds its first paint from the query cache, not from a
  navigation param.** Navigation carries ONLY `{ promptId }` — route params must
  survive serialisation and process death, which a prompt object does not — but
  the tile the user just tapped is by definition already cached, so
  `findCachedPrompt` reads it back and the image, title, author and counts paint
  on the FIRST frame while the document is still in flight. An earlier version
  took an optional `preview` route param for this; nothing ever passed it, so
  the path was dead and every open cold-loaded.
* **The placeholder leaves `prompt: ''` rather than inventing a body.** That
  empty string is the signal the screen renders a shimmer for; a plausible fake
  would flash wrong text and then correct itself.
* **The hero crossfades.** The placeholder paints the cached thumbnail upscaled,
  and the full-resolution file fades in over it (`AppImage transition="fade"`) —
  a hard cut between the two reads as a glitch.
* **The action bar is pinned, not inline.** The page scrolls well past it, and
  copy/share are what a prompt is FOR; requiring a scroll back up to reach them
  is the kind of friction that makes a detail page feel like a document rather
  than a tool.
* **Clipboard and share return `Result`, not thrown errors.** Both failures are
  expected branches — a denied clipboard permission, a share sheet that cannot
  open — and a Result makes forgetting to handle them a type error rather than a
  silent no-op. Dismissing the share sheet is a SUCCESS (`ShareOutcome`):
  collapsing it into the error case would show a failure message to a user who
  simply changed their mind.
* **Copy confirms on the button, not in a toast.** The user is already looking
  at the control they pressed; a toast animates in elsewhere and covers content.
  The button becomes "Copied" with a tick for two seconds, and the reset timer
  is cleared on unmount so navigating back inside that window cannot set state
  on an unmounted screen.
* **Both actions stay disabled until the full document arrives.** The detail
  screen seeds itself from the cached list item, where `prompt` is an empty
  string — without the guard, Copy would put nothing on the clipboard.
* **ONE tile component (`PromptTile`) for the grid and the rails.** They had
  drifted into two near-identical components differing only in how width and
  aspect ratio were resolved, which is a maintenance trap: fix a bug in one and
  the other keeps it. `width` and `aspectRatio` are now optional overrides —
  omitted in the masonry grid, where FlashList hands each cell its column width;
  supplied in a rail, which needs uniform cells. `PromptCard` and
  `PromptCardSkeleton` were deleted as superseded.
* **The tile is the image, plus only what must sit on top of it.** No title,
  author or counts: a caption block under every tile roughly doubles the grid's
  height, so the screen shows half as many ideas, and the text is redundant the
  moment the tile is tapped. Everything textual lives on the detail screen. The
  tile therefore carries its title in `accessibilityLabel` — with no visible
  text, that is the only thing a screen reader has to read out.
* **Favourites are local-only (Zustand + MMKV), deliberately.** The app reads
  Firestore unauthenticated, so there is no user to attach a server-side
  favourite to yet. MMKV rather than AsyncStorage because its reads are
  SYNCHRONOUS: the set is hydrated during the first render, so a favourited tile
  never paints empty and flips a frame later. When auth lands, the store is
  seeded from `prompts/{id}/favorites` and writes through to it — no screen
  changes, because screens already talk to `useIsFavorite`/`useToggleFavorite`.
* **`FavoriteButton` reads the store itself instead of taking an `isFavorite`
  prop.** The selector returns ONE boolean and Zustand compares with `Object.is`,
  so pressing a heart re-renders that button and nothing else — not the tile,
  not its siblings, not the grid. This is the "avoid unnecessary Zustand
  subscriptions" rule in practice: subscribe to the narrowest derived value, not
  to the collection.
* **Favourite ids live in a `Set`, not an array.** Every visible tile asks "am I
  favourited?" on every render; `Array.includes` makes that O(n) per tile per
  frame while scrolling.
* **The stores are factories (`createFavoritesStore(storage)`).** Injecting the
  `KeyValueStore` interface means tests hand it an in-memory object — no
  `jest.mock`, no native module — which is the same dependency-inversion move
  the repositories make.
* **One status tag per card, strongest editorial signal first** (Featured >
  Trending > New), each with its own colour pair in `colors.tag.*`. The old
  single accent-coloured "Trending" pill appeared on 16 of 32 prompts, which
  told the reader nothing about any particular one. A tag is a
  `{ bg, fg }` PAIR rather than a hue, because one hue cannot stay legible on
  both themes. `New` ranks LAST despite being scarcest: the feed is sorted
  newest-first, so recency is already encoded in a card's position.
* **The tag rule lives in `toPromptBadge`, shared by the grid tile and the
  detail screen**, so a prompt cannot be tagged Featured in the feed and
  untagged on its own page.
* **Home is one endless, filterable stream — no title block, no rails.** Every
  row of chrome above the grid is a row of ideas the user cannot see. The
  category filter is the single exception and is pinned *outside* the scroll
  view (a sibling of the list, not a `ListHeaderComponent`), so it stays
  reachable at any scroll depth without fighting masonry over sticky indices.
  Selecting a category narrows the same feed rather than navigating away, so the
  scroll-browse-refine loop never leaves the screen.
* **One `usePromptFeed(categoryId | null)` hook, not two.** Hooks cannot be
  called conditionally, so a filtered feed built from separate "latest" and
  "by category" hooks would mount both and discard one — two subscriptions and
  two sets of reads. The query key still separates the caches.
* **Rails pass a uniform `aspectRatio`; the grid does not.** A horizontal list
  sizes itself to its TALLEST cell, so natural ratios in a rail leave dead space
  under every shorter card (a 2:3 tile is 390pt where a 3:2 is 173pt). Variable
  heights belong in the grid; rails want uniform cells.
* **Horizontal lists set `flexGrow: 0`.** React Native's ScrollView base style
  is `flexGrow: 1` (`Libraries/Components/ScrollView/ScrollView.js`,
  `baseHorizontal`), so a rail expands to its parent's height rather than
  hugging its content.

## Verification gates

`npm run verify` runs all four:

```
npm run typecheck   # tsc --noEmit
npm run lint        # eslint, incl. the layering rules
npm run circular    # madge --circular src
npm test            # jest
```

The layering rules were confirmed to **fail** on deliberate violations, not just
to exist: a `react-native` import in `domain/`, a `data/` import from
`presentation/`, an `@ds` import from `core/`, and a raw hex / hardcoded
`fontSize` outside `theme/` each produce an error.
