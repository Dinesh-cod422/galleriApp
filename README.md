# AI Prompt Gallery

An image-heavy AI prompt gallery built with React Native CLI and TypeScript,
on a feature-based Clean Architecture.

> **Phase status:** Phases 0 (Bootstrap) and 1 (Foundation) are complete.
> The app currently renders the design-system Kitchen Sink. Phase 2 adds the
> prompt domain and data layers.

Full architecture, layering rules and the phase plan: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Requirements

- **Node 22** — React Native 0.87 requires `>= 22.11.0`. Run `nvm use` (`.nvmrc` pins 22).
- Xcode 16+ with CocoaPods, and/or Android Studio with API 24+.
- CocoaPods needs a UTF-8 locale: `export LANG=en_US.UTF-8` before `pod install`.

## Getting started

```bash
nvm use
npm install
(cd ios && pod install)      # already run once; re-run after adding native deps

npm start                    # Metro
npm run ios                  # or: npm run android
```

## Verification

```bash
npm run verify               # typecheck + lint + circular + tests
```

| Script | What it guards |
|---|---|
| `npm run typecheck` | Strict TypeScript, no `any`, no `@ts-ignore` |
| `npm run lint` | **Layering rules** — see below |
| `npm run circular` | No circular imports (madge) |
| `npm test` | Jest unit + component tests |

### The layering rules are enforced, not documented

ESLint fails the build on:

- `react` / `react-native` / any library imported from `features/*/domain/**`
- `features/*/data/**` imported from `features/*/presentation/**`
- `@ds`, `@features`, `@infra`, `@app` imported from `core/**`
- `@features`, `@infra`, `@app` imported from `design-system/**`
- a raw hex color or a hardcoded `fontSize` anywhere outside `design-system/theme/`

## Documents

| | |
|---|---|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Layering, boundaries and why they are enforced |
| [FIREBASE-ARCHITECTURE.md](docs/FIREBASE-ARCHITECTURE.md) | Firestore schema, queries, security rules |
| [DEEP-LINKING-AND-HOSTING.md](docs/DEEP-LINKING-AND-HOSTING.md) | Identifiers, image CDN, App Links / Universal Links, deploy safety |

## Layout

```
src/
├── app/              composition root — providers, navigation, DI container
├── core/             errors, shared types, utils, config (depends on nothing)
├── design-system/    theme tokens, components, icons, responsive utils
├── features/         prompts · categories · search · favorites · profile
│                       each split into domain / data / presentation
├── infrastructure/   clipboard, share, haptics, storage, logger
└── assets/
```

Import through the aliases (`@core/*`, `@ds`, `@features/*`, `@infra/*`,
`@app/*`), which are declared in three places that must stay in sync:
`tsconfig.json`, `babel.config.js`, and `jest.config.js`.

## What exists today

**`core/`** — `AppError` tagged union + `toAppError`, `Result`, branded ids,
`Page`/`AsyncState` types, `formatCount`, `formatRelativeDate`,
`normalizeForSearch`, array helpers, `useDebouncedValue`, `useStableCallback`,
and `env` (the `DATA_SOURCE` flag that Phase 2's DI container reads).

**`design-system/`** — light + dark semantic token sets, breakpoint-scaled
spacing and typography, and 13 components: `Text`, `Button`, `IconButton`,
`Card`, `Avatar`, `Badge`, `Skeleton`, `EmptyState`, `ErrorState`,
`BottomSheet`, `Divider`, `Screen`, `AppImage`, plus an 18-icon SVG set.

Everything outside the design system imports from `@ds` and nothing deeper.

**Kitchen Sink** (`src/dev/KitchenSinkScreen.tsx`) renders every component in
both themes with a live breakpoint readout. It is Phase 1's definition of done
and a standing regression surface; Phase 3 moves it behind a dev-only route.

## Firebase

Connected to Firebase project **`notesapp-ed63a`**.

| | Value |
|---|---|
| Android package | `com.promptkalai` |
| iOS bundle id | `com.promptkalai` |
| RN component / Xcode target | `AIPromptGallery` — the *project* name, deliberately NOT renamed with the bundle id |
| Firestore | 32 prompts, 8 categories, 10 users (seeded — see [tools/seed](tools/seed)) |

Native config files (`android/app/google-services.json`,
`ios/AIPromptGallery/GoogleService-Info.plist`) are committed. They are **client**
config, not secrets — access is controlled by Firestore security rules, not by
hiding these files. Service account keys are a different matter and are
gitignored.

### Wiring

| Platform | What was added |
|---|---|
| Android | `com.google.gms:google-services` classpath + plugin |
| iOS | `FirebaseApp.configure()` in `AppDelegate.swift`, plist added to Copy Bundle Resources, `:modular_headers => true` for five Firebase pods |
| JS | `@react-native-firebase/app` + `/firestore` |

The iOS `modular_headers` lines matter: Firebase's Swift pods import
Objective-C/C++ pods that do not define modules, which fails as static
libraries. Opting in just those five avoids `use_frameworks!`, which would
change how every other native module links.

### Layering

`src/infrastructure/firebase/firebaseClient.ts` is the only module that imports
a Firebase SDK. ESLint already forbids Firebase imports from
`features/*/presentation/**`, and the domain layer cannot import any library at
all — so the SDK cannot leak upward.

Offline persistence is on with a 100 MB cache (the 40 MB default evicts too
aggressively for an image-heavy gallery).

### Security rules

`firestore.rules` is deployed to `notesapp-ed63a`. The project previously had
the default test-mode rules, which **expired on 2025-10-09** — every client
request was denied while the Admin SDK (which bypasses rules) kept working, so
seeding succeeded and the app could not read a thing.

Deploy with `node tools/seed/rules-deploy.mjs --key <sa.json> --rules firestore.rules`.
It prints the previous ruleset id first, so rollback is one call.

What the rules guarantee:

- Published prompts are world-readable; drafts only by their author or an admin.
- `stats.*` and `flags.*` are **never** freely writable. Counters move by exactly
  ±1, and likes/favourites only in the same atomic batch that creates or deletes
  the caller's own membership document (`getAfter()` / `existsAfter()`).
- Likes are public, favourites are private; neither allows `update`, which would
  let a client rewrite `createdAt` and corrupt collection-group ordering.
- Admin is the custom claim `request.auth.token.admin`, never a Firestore field.

**Query constraint this imposes:** Firestore allows a query only when the rules
can guarantee every matched document is readable. An unfiltered
`collection('prompts').count()` is therefore denied — every prompts query must
carry `where('status', '==', 'published')`.

### Running it

```bash
nvm use
npm start                    # Metro
npm run ios                  # or open ios/AIPromptGallery.xcworkspace
```

Known environment gotchas on this machine:

- **Quit Xcode before `npm run ios`** — Xcode holds an exclusive lock on
  `build.db` in DerivedData, and a concurrent `xcodebuild` fails with
  `database is locked`.
- A full cold build of this project (React from source + Firebase + gRPC) needs
  roughly **10 GB** of DerivedData. Builds fail with `No space left on device`
  long before they fail for any interesting reason.
