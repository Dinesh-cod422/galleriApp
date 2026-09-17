# Deep Linking & Hosting — AI Prompt Gallery

Reference for everything that lives **outside the app binary**: the identifiers
the app is published under, the images it loads, and the files a domain has to
serve before a link will open the app instead of a browser.

Companion to [ARCHITECTURE.md](ARCHITECTURE.md) and
[FIREBASE-ARCHITECTURE.md](FIREBASE-ARCHITECTURE.md). Nothing here changes the
layering; it is all config, hosting and native identity.

> Most of the failures documented here are **silent**. A wrong fingerprint, a
> redirect, an HTML content-type or a missing file does not raise an error
> anywhere — the link just opens the browser, and it looks like a bug in the
> app. That is why this document leans so heavily on *verification commands*
> rather than instructions.

---

## 0. Canonical identifiers

Change any of these and something in this document goes stale. They are
repeated in `README.md`; these are the authoritative values.

| | Value |
|---|---|
| Firebase project | `notesapp-ed63a` |
| Android package | `com.promptkalai` |
| iOS bundle id | `com.promptkalai` |
| Android Firebase app id | `1:412706684654:android:1b276652e4055587933dff` |
| iOS Firebase app id | `1:412706684654:ios:46a72f8933f51848933dff` |
| App name — launcher, masthead, splash | `Prompt Kalai` (from `core/config/brand.ts`) |
| Tagline | `Turn Moments Into Memories` |
| Custom URL scheme | `promptkalai://` |
| RN component / Xcode target | `AIPromptGallery` — internal, never shown |
| Link domains | `notesapp-ed63a.web.app`, `notesapp-ed63a.firebaseapp.com` |
| Debug signing SHA-256 | `FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C` |

### 0.1 One name, in one file

Everything a user reads or types comes from `src/core/config/brand.ts`:
`APP_NAME`, `APP_TAGLINE` and `APP_SCHEME`. That file exists because the name
had split into three different spellings — one in the masthead, one on the
launcher, one in the URL scheme. A rename is now one edit, and
`GalleryHeader.test.tsx` fails if any second name reappears.

The internal build identifiers are a separate matter — see below.

### 0.2 The target name is deliberately NOT the bundle id

`AIPromptGallery` is the Xcode target, the RN registered component
(`app.json` → `MainActivity.getMainComponentName()`) and the Gradle
`rootProject.name`. It was left alone when the bundle id became
`com.promptkalai`.

Renaming an Xcode target means surgery on `project.pbxproj`, the scheme, the
workspace and the source group — all for a string no user ever sees. The
identifiers that *are* user-visible (display name) and *are* load-bearing
(package / bundle id) were changed. This split is intentional, not an
oversight.

### 0.3 Three apps are registered in the Firebase project

`androidApps`: `com.promptkalai`, `com.aipromptgallery`, `com.example.notes_app`
`iosApps`: `com.promptkalai`, `com.aipromptgallery`, `com.example.notesApp`

`com.example.notes_app` predates this project — `notesapp-ed63a` was originally
a different app's project. `com.aipromptgallery` is the pre-rename registration,
kept because `fb-register.mjs` is additive and deleting registrations breaks any
build still signed for them. Section 4.4 explains why the stray app matters.

`android/app/google-services.json` therefore contains **three clients**. That is
correct and harmless: the Gradle plugin selects the one matching `applicationId`.

---

## 1. Hosting: what is served and why it is Firebase

`notesapp-ed63a.web.app` does two unrelated jobs:

1. **Image CDN** for every prompt picture the app displays.
2. **Association files** that let `https://` links open the app.

### 1.1 Why Hosting and not Cloud Storage

Cloud Storage was the obvious home for the images. It is unavailable:

```
POST storage/v1/b?project=notesapp-ed63a
403  "The billing account for the owning project is disabled in state absent"
```

Creating a bucket requires billing. Hosting is on the free Spark plan, serves
from the same CDN, and gives permanent public URLs — so it carries the images.
The rendition paths deliberately mirror a Storage layout, so migrating later is
a prefix swap rather than a re-import.

### 1.2 What is deployed

| Path | What |
|---|---|
| `prompts/original/<id>.webp` | Long edge ≤ 2048, q82 |
| `prompts/thumbnails/<id>.webp` | Width 400, q75 |
| `prompts/thumbnails@2x/<id>.webp` | Width 800, q75 |
| `.well-known/assetlinks.json` | Android App Links |
| `.well-known/apple-app-site-association` | iOS Universal Links |
| `gallery.html` | Human-browsable contact sheet of every image |

609 image files = 203 images across 193 prompts × 3 renditions. Source PNGs were
474 MB; the deployed WebP set is 64 MB, measured at 37.4 dB PSNR.

`/` is intentionally a 404 — the library is not listed at the bare domain.

### 1.3 The renditions are NOT in the repo

`hosting/prompts/` is gitignored and normally absent from the working tree. The
masters and the built renditions live on the Desktop:

```
~/Desktop/prompt-images/source-png/             474 MB — the original PNGs
~/Desktop/prompt-images/hosting-build/prompts/   64 MB — the deployed WebP
```

**Do not delete `source-png/`.** The WebP files are lossy and downscaled to
2048px. Any future re-encode — different size, different format, a CDN
migration — has to start from those PNGs, and nothing else on disk or in the
cloud can reproduce them.

What *does* stay in the repo is `hosting/manifest.json` — text, and the record
of what is live. `tools/seed/seed.mjs` reads it so each prompt gets a real URL
**and its true pixel dimensions**, and the deploy guard checks against it.

### 1.4 The single most dangerous fact in this document

> **Firebase Hosting replaces the entire site on every deploy.** It has no
> concept of a partial upload. Deploying while `hosting/prompts/` is absent
> removes all 609 images from the CDN and breaks every image in the app and
> every `imageUrl` in Firestore.

Because the renditions are deliberately kept out of the tree (1.3), the
dangerous state is the *normal* state. `tools/seed/assert-hosting-ready.mjs`
runs as the `predeploy` hook in `firebase.json` and refuses any deploy that is
missing the images or either association file, so the mistake is not reachable
by typing the deploy command from memory.

It blocks like this:

```
DEPLOY BLOCKED — 609 of 609 images are not in hosting/.
To deploy, put them back first:
  cp -R ~/Desktop/prompt-images/hosting-build/prompts hosting/prompts
```

### 1.5 Deploying

```bash
npm run hosting:restore   # copy the archive back into hosting/prompts
npm run hosting:check     # optional — the predeploy hook runs it anyway
npm run hosting:deploy    # firebase-tools@14, --only hosting
rm -rf hosting/prompts    # back to the cloud-only local state
```

Firebase hashes files, so a redeploy uploads only what actually changed — a
content edit to one association file uploads 1 file, not 612.

**Pinned to `firebase-tools@14`**: v15 requires Java 21 and this machine has 17.
Deploy itself needs no JVM; the emulators do.

### 1.6 Two `ignore` entries that matter

```jsonc
"ignore": ["firebase.json", "**/.git/**", "**/.DS_Store", "**/node_modules/**", "manifest.json"]
```

Firebase's default ignore list contains `**/.*`, which excludes **`.well-known/`**
and is a well-known way to deploy association files that never arrive. It was
removed. `**/.DS_Store` is listed explicitly because dropping `**/.*` also
un-ignored Finder junk.

`manifest.json` is ignored because it is a build input, not something to serve.

---

## 2. Deep linking: three kinds of link

| | Works without a server | Works without the app installed | Needs verification |
|---|---|---|---|
| `promptkalai://…` | yes | **no — does nothing** | no |
| `https://…` on Android | no | yes (opens site) | assetlinks.json |
| `https://…` on iOS | no | yes (opens site) | AASA + Team ID |

The custom scheme is the reliable target for QR codes, other apps and local
testing. It is **not** a substitute for `https://`: a `promptkalai://` URL sent to
someone without the app does nothing at all. That is why `promptWebUrl()` in
`src/app/navigation/linking.ts` returns an `https://` URL for sharing — the same
string opens the app when installed and the website when not.

### 2.1 Routes

Defined once in `src/app/navigation/linking.ts`. Paths are URLs a human would
write, not screen names, so the same string works as a website URL.

| URL | Screen |
|---|---|
| `/` | Home tab |
| `/explore` `/favorites` `/profile` | those tabs |
| `/prompt/:promptId` | `PromptDetail` |
| `/category/:categoryId` | `Category` |
| `/section/:sort` | `PromptSection` |

Every linkable screen takes **ids only**. A title or an object in a URL breaks
when content is renamed and has to survive serialisation through a cold start;
screens look up whatever else they need.

`:sort` is validated against a whitelist (`newest`, `trending`, `featured`,
`mostCopied`, `mostShared`) and falls back to `newest`. A URL is user input, and
an unrecognised sort would otherwise reach Firestore as a bogus `orderBy`.

### 2.2 Android

`android/app/src/main/AndroidManifest.xml` carries two intent filters: the
`promptkalai` scheme, and an `autoVerify` App Links filter for both hosts.

The App Links filter **restricts paths** to the six the app can render. Claiming
the whole host would take over the website — the homepage and `gallery.html`
included — and the app would land on Home with the link silently dropped.
Android treats the `<data>` attributes as a cross product, so the path list
applies to both hosts.

### 2.3 iOS

Three pieces, all present:

- `ios/AIPromptGallery/AIPromptGallery.entitlements` — `applinks:` for both
  hosts, wired into **both** build configs via `CODE_SIGN_ENTITLEMENTS`.
- `Info.plist` — `CFBundleURLSchemes` = `promptkalai`.
- `AppDelegate.swift` — `application(_:open:options:)` **and**
  `application(_:continue:restorationHandler:)`, both forwarding to
  `RCTLinkingManager`.

Without those two AppDelegate methods iOS never hands the URL to React Native,
and no amount of correct server config helps.

---

## 3. The association files

Served from `hosting/.well-known/`, deployed to **both** hosts. Android verifies
each host independently, so one is not enough.

```
https://notesapp-ed63a.web.app/.well-known/assetlinks.json
https://notesapp-ed63a.web.app/.well-known/apple-app-site-association
https://notesapp-ed63a.firebaseapp.com/.well-known/assetlinks.json
https://notesapp-ed63a.firebaseapp.com/.well-known/apple-app-site-association
```

`firebase.json` pins `Content-Type: application/json` on both and
`Cache-Control: public, max-age=300` (see 4.3).

### 3.1 Fingerprints — the part that usually goes wrong

`assetlinks.json` currently carries **only the debug keystore's** SHA-256. That
is correct *today* and wrong the moment you ship, for a reason worth spelling
out:

`android/app/build.gradle` has `release { signingConfig signingConfigs.debug }`
— the React Native template default. Both build types sign with
`debug.keystore`, so the debug fingerprint verifies release builds too.

**But Google Play rejects anything signed with the debug certificate.** Before
shipping you must:

1. Generate a real release keystore and point `signingConfigs.release` at it.
2. Add **the Play App Signing SHA-256** — Play Console → Test and release →
   Setup → App signing — because Google re-signs your upload, so the app users
   install is signed with Google's key, not your upload key.
3. Keep both entries in the array so debug builds keep verifying.

`sha256_cert_fingerprints` is an array. Use it.

### 3.2 iOS is blocked on one string

`apple-app-site-association` reads:

```json
"appIDs": ["REPLACE_WITH_TEAM_ID.com.promptkalai"]
```

iOS fetches it, matches no app, and hands the URL to Safari. Fill in the 10-char
Apple Developer Team ID and set `DEVELOPMENT_TEAM` in Xcode (currently unset),
then redeploy. Everything else on the iOS side is already correct.

---

## 4. Four things that fail silently

### 4.1 Redirects

Android's verifier **does not follow redirects**. A `www` → apex redirect fails
verification for `www` even though a browser shows the file. Both hosts here
return `200` directly with `num_redirects=0`.

### 4.2 Content-type

Must be `application/json`. An SSR or SPA catch-all that serves the HTML shell
for unknown paths will return `text/html` and fail — while looking fine in a
browser.

### 4.3 Caching

Google caches the parsed statement for exactly the file's `max-age`. At the
original 3600s, a wrong fingerprint cost **an hour** before a retry could even
show the fix. It is now **300s** for the `.well-known` files. Images keep
604800s.

After deploying an association change, expect up to 5 minutes before
`digitalassetlinks.googleapis.com` reflects it — and note that a device
verifying during that window will report failure for a file that is already
correct.

### 4.4 Firebase generates its own assetlinks.json

If no `assetlinks.json` is deployed, **Firebase Hosting auto-serves one** built
from the apps registered in the project. Before this was set up, the live file
read:

```json
"package_name": "com.example.notes_app"
```

— a completely unrelated app. Android fetched it, found no match, and declined
to verify. A deployed file takes precedence, but the generated one returns the
instant ours stops being deployed. This is why `assert-hosting-ready.mjs` treats
the association files as mandatory (1.4) rather than optional.

---

## 5. Verification playbook

Run these rather than trusting that a change worked.

```bash
# Files reachable, correct type, no redirect
curl -s -o /dev/null -w '%{http_code} %{content_type} %{num_redirects}\n' \
  https://notesapp-ed63a.web.app/.well-known/assetlinks.json

# Google's verifier — the same service Android uses
curl -s "https://digitalassetlinks.googleapis.com/v1/statements:list\
?source.web.site=https://notesapp-ed63a.web.app\
&relation=delegate_permission/common.handle_all_urls"
# want: statements[].target.androidApp.packageName == com.promptkalai
# "maxAge" is the cache countdown from 4.3

# Android build config actually agrees with Firebase
cd android && ./gradlew :app:processDebugGoogleServices   # fails loudly on package mismatch
./gradlew :app:processDebugMainManifest
grep -o 'package="[^"]*"' app/build/intermediates/merged_manifest/debug/*/AndroidManifest.xml

# On an Android device/emulator
adb shell pm verify-app-links --re-verify com.promptkalai
adb shell pm get-app-links com.promptkalai        # want: verified
adb shell am start -a android.intent.action.VIEW -d "https://notesapp-ed63a.web.app/prompt/pr_1"

# On the iOS simulator
xcrun simctl openurl booted "promptkalai://prompt/pr_1"
xcrun simctl openurl booted "https://notesapp-ed63a.web.app/prompt/pr_1"
```

Universal Links are unreliable in the Simulator regardless of configuration —
Apple's CDN caching makes it flaky. Confirm on a real device.

---

## 6. Status

**Verified working**

- `promptkalai://` on iOS — cold link opens the app and resolves the prompt from
  Firestore. Confirmed on the simulator end to end.
- Association files: `200`, `application/json`, no redirects, on both hosts.
- `assetlinks.json` accepted by Google's verifier for `com.promptkalai`.
- Android build config: `processDebugGoogleServices` succeeds, merged manifest
  resolves `com.promptkalai.MainActivity` and keeps both link hosts.

**Not yet working**

| Blocked on | What |
|---|---|
| Apple Team ID | iOS Universal Links (3.2). `https://` opens Safari. |
| Android device or emulator | Android App Links have never been run. No APK has been assembled. |
| Release keystore | Cannot ship to Play; see 3.1. |
| A web page | `/prompt/:id` returns **404** — see 6.1. |

### 6.1 The website half of every shared link is missing

`promptWebUrl()` exists so a shared link "opens the app when installed and the
website when not". The second half does not exist: `/prompt/pr_5` is a 404, and
the only human-viewable page on the host is `gallery.html`.

Before share links are given to anyone, that host needs either a real
`/prompt/:id` page or a catch-all rendering title, image and a store button.
Until then, everyone without the app gets nothing.

---

## 7. Renaming the package again

The runbook, in dependency order. Skipping step 1 breaks the Android build with
`No matching client found for package name`.

1. **Register first.** `node tools/seed/fb-register.mjs --key <sa.json> --root .
   --android-package <new> --ios-bundle <new> --display-name "<Name>"`. Additive;
   it also rewrites `google-services.json` and `GoogleService-Info.plist`.
2. **Android**: `namespace` + `applicationId` in `app/build.gradle`; move
   `src/main/java/com/<old>/` → `com/<new>/` and update both `package`
   declarations. The move is mandatory — the manifest resolves `.MainActivity`
   *relative to the namespace*, so leaving sources behind is a launch crash.
3. **iOS**: `PRODUCT_BUNDLE_IDENTIFIER` in **both** build configs, and
   `CFBundleURLName` in `Info.plist`.
4. **Association files**: `package_name` in `assetlinks.json`, `appIDs` in the
   AASA. Deploy (1.5).
5. **Register the signing SHA-256** against the new Firebase Android app.
6. **Verify** with section 5, then uninstall the old package from test devices —
   a renamed app installs *alongside* the old one and both claim the same URLs.

Expect a full Pods rebuild on iOS: changing the bundle id changes the build
configuration, so Xcode starts a fresh DerivedData tree rather than reusing the
old one. ~15–25 minutes, not a hang.
