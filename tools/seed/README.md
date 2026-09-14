# Firestore seeder

Node-only tool. Not part of the app bundle — it has its own `package.json`
and `firebase-admin` never reaches React Native.

Seeds **32 prompts, 8 categories, 10 users** shaped exactly to
[`docs/FIREBASE-ARCHITECTURE.md`](../../docs/FIREBASE-ARCHITECTURE.md) §A.

## Usage

```bash
cd tools/seed
npm install

# 1. Validate the data — no credentials, writes nothing
npm run seed:dry

# 2. Local emulator — no credentials, no cloud project
#    (needs Java; firebase-tools@13 for JDK 17, @latest needs JDK 21)
npx firebase-tools@13 emulators:exec --only firestore \
  --project demo-ai-prompt-gallery "node seed.mjs && node verify.mjs"

# 3. Real project
node seed.mjs --key /path/to/service-account.json --yes
```

## The dataset

`data.mjs` is GENERATED. Do not hand-edit it:

```bash
node convert-moments.mjs --in ~/Downloads/dataofMomentsGalleryApp.txt
```

The export is a flat list of 195 records; the converter makes the mapping
decisions that turn it into this project's schema:

- **Category = the most SPECIFIC tag.** The export's `filter` array is a tag
  cloud where "Aesthetic" and "Cinematic" sit on ~97% of records, so they
  describe nothing. Priority runs Kids > Couple > Love > 3D > Anime > … >
  Aesthetic, and every filter is still kept as a tag. Ten categories result.
- **`Tstatus` drives the flags.** Popular -> `isFeatured`, Trending ->
  `isTrending`, New -> a recent `publishedAt`.
- **Engagement numbers are derived, not real.** The export has none. They are
  hashed from the record id (so re-running is stable) and scaled by `Tstatus`,
  which is what makes "Most copied" and "Trending" rank meaningfully.
- **Aspect ratio is parsed from the prompt text** where it states one (77 of 195
  do: 4:5, 9:16, 2:3). The rest default to 4:5.
- **74 titles were auto-generated.** The export stored truncated prompt text as
  the title ("Create an EXTREMELY ULTRA..."). Those are replaced with a title
  built from the record's own tags — never invented content. Search for
  `Portrait #` / `Prompt #` in `data.mjs` to find and rewrite them.
- **`embedUrl` becomes `sourceUrl`** — attribution only. See below for why it
  cannot be an image source.

## Images

Images do NOT go in Firestore — a document is capped at 1 MiB, and inlining
image bytes means re-downloading every picture on every list query. They go in
Cloud Storage; Firestore holds only the URLs.

```bash
# 0. Enable Storage once: Firebase console -> Build -> Storage -> Get started.
#    Then deploy storage.rules, or prompts/** stays unreadable.

# 1. Preview the mapping — no credentials, writes nothing
node upload-images.mjs --dir ./my-images --dry-run

# 2. Transcode, upload and link
node upload-images.mjs --dir ./my-images --key /path/to/sa.json --yes
```

Each file's NAME (without extension) is the prompt id it belongs to:
`pr_tokyo_rain_night.jpg` updates `prompts/pr_tokyo_rain_night`. Files with no
matching document are listed and skipped — never guessed at.

Per image it writes three renditions and then the document:

| Object | Size | Used by |
|---|---|---|
| `prompts/original/{id}.webp` | long edge ≤ 2048 | detail screen |
| `prompts/thumbnails/{id}.webp` | 400px wide | every grid + rail tile |
| `prompts/thumbnails@2x/{id}.webp` | 800px wide | tablets |

- **EXIF is stripped** after `rotate()` applies the orientation. That order
  matters: dropping metadata first bakes in a sideways image. It also removes
  GPS coordinates, which is a privacy requirement rather than an optimisation.
- **URLs are deterministic and token-free**
  (`…/o/{encodedPath}?alt=media`), which is why `storage.rules` makes
  `prompts/**` publicly readable. `getDownloadURL()` would cost a round-trip per
  image and embed a revocable token — revoke it once and every URL already
  stored in Firestore breaks.
- **`Cache-Control: immutable`, one year.** The path is derived from the prompt
  id and only changes when this script re-runs, so repeat views cost nothing.
- Re-running is **idempotent**: same paths, same URLs, overwritten in place.

`node storage-check.mjs --key <sa.json>` reports whether Storage is provisioned
at all.

## Indexes

The seven gallery queries need composite indexes. The emulator answers without
them; a real project does not.

```bash
# Create all 9 (never `firebase deploy --only firestore:indexes` — that treats
# the local file as complete desired state and DELETES indexes it doesn't know).
node create-indexes.mjs --key /path/to/service-account.json

# If that returns PERMISSION_DENIED: ask Firestore itself for the exact
# one-click console links for whatever is still missing.
node harvest-index-urls.mjs --key /path/to/service-account.json
```

`create-indexes.mjs` needs `roles/datastore.indexAdmin` on the key. The default
`firebase-adminsdk-*` service account does **not** have it — it can list indexes
but not create them — so either grant that role or use the harvested links.
`harvest-index-urls.mjs` needs no extra permission: it runs the real query
shapes and reports the URL from each `FAILED_PRECONDITION`, so it doubles as a
"are the indexes live yet?" check.

## Flags

| Flag | Effect |
|---|---|
| `--dry-run` | Print a sample document + summary, write nothing |
| `--key <path>` | Service account JSON (or `GOOGLE_APPLICATION_CREDENTIALS`) |
| `--project <id>` | Override the project id from the key |
| `--yes` | Required to write to a live (non-emulator) project |
| `--with-engagement` | Also seed `likes/` and `favorites/` subcollections |
| `--image-base <url>` | Swap picsum placeholders for real Storage URLs |

## Notes

- **Idempotent.** Deterministic document ids + `set()`, so re-running converges instead of duplicating.
- **Backdated timestamps.** `serverTimestamp()` would collapse all 32 documents onto one instant and make pagination untestable, so `publishedAt` is spread over ~52 days.
- **Placeholder images.** picsum URLs at genuinely different resolutions, so the thumbnail/full-res split is exercised. Real images come from the Storage pipeline; then use `--image-base`.
- **`verify.mjs`** runs the seven gallery queries from §D, including cursor pagination. The emulator answers queries without composite indexes, so it validates query *shapes* — the real indexes still come from §D.
- **Never commit a service account key.** Root `.gitignore` blocks the usual filenames; keep keys outside the repo anyway.
