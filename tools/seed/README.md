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
