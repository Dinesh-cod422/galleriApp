# Firestore & Storage Architecture — AI Prompt Gallery

Design document. **No implementation yet — awaiting approval.**

Companion to [ARCHITECTURE.md](ARCHITECTURE.md). The layering there is unchanged:
everything in this document lands in `features/prompts/data/**` and
`infrastructure/firebase/**`. No screen, hook, or use case changes shape.

---

## 0. Three decisions that shape everything else

Before the schema, the three calls that a reviewer should push back on if they
disagree — everything downstream follows from them.

### 0.1 One collection means list queries read the whole document

Requirement: one `prompts/{promptId}` collection, no `promptListings` split.
That is the right call at this scale, but it has a consequence worth stating
plainly rather than discovering in month four:

> **Firestore client SDKs cannot project fields.** `select()` exists only in the
> server/Admin SDKs. A gallery query for 12 cards reads 12 *complete*
> documents — including the ~4 KB `prompt` text and all of `metadata`.

What this does and does not cost:

| | Impact |
|---|---|
| **Billing** | None. Firestore bills per document read, not per byte. |
| **Bandwidth** | Real. ~5 KB/doc × 12 = ~60 KB per page instead of ~8 KB. |
| **On-device cache** | Real. The offline cache stores full documents. |
| **Render cost** | None — the mapper drops the unused fields. |

At 60 KB/page this is fine. `PromptListItem` therefore exists as a **mapping
and contract boundary**, not a bandwidth optimisation: it is what stops a card
component from quietly depending on `metadata.generationParameters` and making
the future split impossible. Section 8 covers the escape hatch if document size
ever becomes the problem.

### 0.2 Counters are written by Cloud Functions, never by clients

Full reasoning in section 5.4. Short version: clients write only their own
`likes/{uid}` document; a Function translates that into
`FieldValue.increment(±1)` on the parent. Clients never hold write access to
`stats.*`.

### 0.3 Pagination cursors are values, not snapshots

`startAfter()` accepts a `DocumentSnapshot` — a Firestore type that must never
reach the domain layer, and that does not survive a cache rehydration or an app
restart. We use **value cursors** instead: the sort key plus the document id,
encoded as an opaque string. Details in section 4.3.

---

## A. Final Firestore schema

### A.1 `prompts/{promptId}`

```ts
{
  title: string;                    // ≤ 120 chars
  titleLower: string;               // denormalized, lowercased — prefix search
  searchTokens: string[];           // ≤ 20 normalized tokens from title + tags
  prompt: string;                   // ≤ 4000 chars

  imageUrl: string;                 // full-res WebP, Storage CDN URL
  thumbnailUrl: string;             // 400w WebP, Storage CDN URL
  blurHash: string | null;          // optional 20-30 byte placeholder

  categoryId: string;
  categoryName: string;             // denormalized for the card
  tags: string[];                   // ≤ 10, lowercase, normalized

  authorId: string;
  authorName: string;               // denormalized for the card
  authorAvatarUrl: string | null;   // denormalized for the card

  stats: {
    likesCount: number;             // Function-maintained
    viewsCount: number;             // Function-maintained
    copiesCount: number;            // Function-maintained
    favoritesCount: number;         // Function-maintained
  };

  flags: {
    isFeatured: boolean;            // admin-only
    isTrending: boolean;            // scheduled Function only
  };
  trendingScore: number;            // scheduled Function only — see A.4

  status: 'draft' | 'pending' | 'published' | 'rejected' | 'removed';

  metadata: {
    model: string;                  // 'Midjourney', 'SDXL', 'DALL·E 3', …
    modelVersion: string;
    negativePrompt: string | null;
    aspectRatio: string;            // '1:1', '3:2', '9:16'
    resolution: { width: number; height: number };
    style: string | null;
    generationParameters: Record<string, string | number | boolean>;
  };

  createdAt: Timestamp;             // serverTimestamp()
  updatedAt: Timestamp;             // serverTimestamp()
  publishedAt: Timestamp | null;    // set once on transition to 'published'
}
```

**Field-by-field justification for the four fields not in the brief** — each
exists to remove a query that Firestore otherwise cannot serve:

| Field | Why it is not over-engineering |
|---|---|
| `titleLower` | Firestore range queries are case-sensitive. Without it, "portrait" does not match "Portrait". One denormalized string is cheaper than every alternative. |
| `searchTokens` | Enables whole-word match across title **and** tags in a single `array-contains-any`, instead of two queries merged client-side. |
| `trendingScore` | `flags.isTrending` is a filter; it cannot **order**. Ordering trending results by `likesCount` makes the list static. A decayed score gives a list that actually moves. |
| `publishedAt` | `createdAt` is when a draft was written. A prompt drafted in January and published in March must not sort into January. |

`blurHash` is genuinely optional — include only if the Phase 6 image work wants it.

### A.2 Aspect ratio is stored twice, on purpose

`metadata.aspectRatio` ('3:2') is the *creative* intent shown in the UI;
`metadata.resolution` is the *actual* pixel size the card needs to reserve
layout space before the image loads. They disagree after cropping. Keep both.

### A.3 Denormalization contract

`categoryName`, `authorName`, `authorAvatarUrl` are copies. This is **necessary**
duplication: without it, one gallery page costs 12 extra reads to resolve names,
turning a 12-read page into a 24-read page.

The cost is a fan-out on rename, handled by Cloud Functions:

| Source change | Function | Realistic volume |
|---|---|---|
| `users/{uid}.displayName` or `.avatarUrl` | `onUserProfileUpdate` → paged batch update of that author's prompts | Rare; a prolific author might have 500 prompts = 500 writes |
| `categories/{id}.name` | `onCategoryRenamed` → paged batch update | Very rare |

Both are fire-and-forget batches of 500, resumable via a cursor. Neither is on a
user-facing path.

### A.4 `trendingScore`

Recomputed hourly by a scheduled Function over prompts published in the last 14
days. A time-decayed engagement score:

```
score = (likes + 2·favorites + 3·copies + 0.1·views) / pow(ageHours + 2, 1.5)
```

The Function writes `trendingScore` and sets `flags.isTrending` on the top N
(e.g. 200). Two fields because they do different jobs: the flag keeps the
*index* small and the query cheap; the score provides a stable *order*.

### A.5 Realistic sample document

```jsonc
// prompts/pr_8kQ2vX7mNdLpR3aF
{
  "title": "Cinematic desert portrait at golden hour",
  "titleLower": "cinematic desert portrait at golden hour",
  "searchTokens": ["cinematic","desert","portrait","golden","hour","photography","85mm","film"],
  "prompt": "A cinematic portrait of a woman standing in an open desert at golden hour, wind moving her hair, shot on 85mm at f/1.4, warm rim light, fine film grain, muted earth tones, shallow depth of field, editorial fashion photography",

  "imageUrl":     "https://firebasestorage.googleapis.com/v0/b/ai-prompt-gallery.firebasestorage.app/o/prompts%2Foriginal%2Fpr_8kQ2vX7mNdLpR3aF.webp?alt=media",
  "thumbnailUrl": "https://firebasestorage.googleapis.com/v0/b/ai-prompt-gallery.firebasestorage.app/o/prompts%2Fthumbnails%2Fpr_8kQ2vX7mNdLpR3aF.webp?alt=media",
  "blurHash": "LEHV6nWB2yk8pyo0adR*.7kCMdnj",

  "categoryId": "cat_portrait",
  "categoryName": "Portrait",
  "tags": ["portrait","cinematic","golden-hour","85mm","film"],

  "authorId": "usr_M4rAv9",
  "authorName": "Mara Vance",
  "authorAvatarUrl": "https://firebasestorage.googleapis.com/v0/b/ai-prompt-gallery.firebasestorage.app/o/avatars%2Fusr_M4rAv9.webp?alt=media",

  "stats": { "likesCount": 1284, "viewsCount": 20431, "copiesCount": 372, "favoritesCount": 615 },
  "flags": { "isFeatured": true, "isTrending": true },
  "trendingScore": 84.21,
  "status": "published",

  "metadata": {
    "model": "Midjourney",
    "modelVersion": "v6.1",
    "negativePrompt": "blurry, extra fingers, watermark, text",
    "aspectRatio": "3:2",
    "resolution": { "width": 2048, "height": 1365 },
    "style": "Editorial photography",
    "generationParameters": { "stylize": 250, "chaos": 12, "quality": 2, "seed": 1847392019 }
  },

  "createdAt":   { "_seconds": 1757462400, "_nanoseconds": 0 },
  "updatedAt":   { "_seconds": 1757548800, "_nanoseconds": 0 },
  "publishedAt": { "_seconds": 1757462700, "_nanoseconds": 0 }
}
```

```jsonc
// prompts/pr_8kQ2vX7mNdLpR3aF/likes/usr_7bQz1K
{ "userId": "usr_7bQz1K", "promptId": "pr_8kQ2vX7mNdLpR3aF", "createdAt": { "_seconds": 1757549200, "_nanoseconds": 0 } }

// prompts/pr_8kQ2vX7mNdLpR3aF/favorites/usr_7bQz1K
{ "userId": "usr_7bQz1K", "promptId": "pr_8kQ2vX7mNdLpR3aF",
  "promptTitle": "Cinematic desert portrait at golden hour",
  "promptThumbnailUrl": "https://…/thumbnails%2Fpr_8kQ2vX7mNdLpR3aF.webp?alt=media",
  "createdAt": { "_seconds": 1757549260, "_nanoseconds": 0 } }

// prompts/pr_8kQ2vX7mNdLpR3aF/comments/cm_3xR9
{ "authorId": "usr_7bQz1K", "authorName": "Dev Patel",
  "authorAvatarUrl": "https://…/avatars%2Fusr_7bQz1K.webp?alt=media",
  "body": "The rim light on this is unreal. Tried it at stylize 400 and it held up.",
  "status": "visible",
  "createdAt": { "_seconds": 1757549900, "_nanoseconds": 0 },
  "updatedAt": { "_seconds": 1757549900, "_nanoseconds": 0 } }
```

Note the two denormalized fields on the **favorite** document. They exist for one
reason, explained in B.2 — and they are the only place in this design where
duplication is a judgement call rather than an obvious win.

---

## B. Collection & subcollection structure

```
prompts/{promptId}                        ← the one main collection
  ├── likes/{userId}                      ← doc id IS the user id
  ├── favorites/{userId}                  ← doc id IS the user id
  └── comments/{commentId}

categories/{categoryId}
  { name, slug, iconName, coverUrl, promptCount, sortOrder }

users/{userId}
  { displayName, avatarUrl, bio, promptCount, createdAt }
  └── private/{'settings'}                ← never world-readable

reports/{reportId}                        ← moderation queue, admin-read only
counterShards/{promptId}/shards/{0..9}    ← ONLY if a doc goes hot (section 8)
```

### B.1 Membership documents are keyed by user id — deliberately

`likes/{userId}` rather than `likes/{autoId}` gives three things for free:

1. **"Has this user liked it?" is a direct document read**, not a query.
2. **Double-liking is structurally impossible** — same path, idempotent write.
3. **The security rule is one line**: `userId == request.auth.uid`.

### B.2 Reading "my favorites" — the one genuinely hard query

Subcollections keyed by user id make *writes* trivial and the Favorites *screen*
awkward: favorites live under 100k different prompt documents.

**Chosen: collection-group query.**

```
collectionGroup('favorites')
  .where('userId', '==', uid)
  .orderBy('createdAt', 'desc')
  .limit(20)
```

Requires a collection-group index on `favorites` (section D) and the redundant
`userId` **field** inside the document — the document *id* is not queryable in a
collection-group query.

That returns favorite records, not prompts. Two options for the cards:

| | Reads per 20-item page | Staleness |
|---|---|---|
| **A. Hydrate** — collection group, then `where(documentId(), 'in', [...])` in chunks of 30 | 20 + 20 = **40** | None |
| **B. Denormalize** — store `promptTitle` + `promptThumbnailUrl` on the favorite doc | **20** | Title/thumb can go stale |

**Recommendation: B for the first paint, A for correctness.** The favorite
document carries just enough to render the card immediately; the screen then
hydrates via TanStack Query in the background and replaces it. The user sees
their favorites instantly offline; stale titles self-correct within a second.

This is the only denormalization in the design I would call a judgement call
rather than an obvious win. If you prefer strict single-source-of-truth, drop
the two fields from the favorite document and take option A — the repository
interface does not change.

### B.3 What is deliberately NOT here

- **No `promptListings` / `promptDetails` split** — per requirement, and correct at this scale.
- **No `likedBy: string[]` on the prompt document.** A 1 MB document limit is ~25k user ids, every like rewrites the whole document, and it leaks who liked what to every reader.
- **No `views` subcollection.** One document per view is a write-amplification disaster (section 5.4).

---

## C. TypeScript models

Three layers of type, and the mapper between them is where Firebase stops.

### C.1 Data layer — the wire shape (`data/dto/PromptDto.ts`)

```ts
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

type Timestamp = FirebaseFirestoreTypes.Timestamp;

/** Mirrors the Firestore document EXACTLY. Never leaves the data layer. */
export type PromptDto = {
  title: string;
  titleLower: string;
  searchTokens: string[];
  prompt: string;
  imageUrl: string;
  thumbnailUrl: string;
  blurHash: string | null;
  categoryId: string;
  categoryName: string;
  tags: string[];
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  stats: PromptStatsDto;
  flags: { isFeatured: boolean; isTrending: boolean };
  trendingScore: number;
  status: PromptStatusDto;
  metadata: PromptMetadataDto;

  /**
   * NULLABLE ON PURPOSE. serverTimestamp() resolves to null in the local
   * snapshot until the server acknowledges the write. Typing this as
   * `Timestamp` is the single most common Firestore bug in RN apps.
   */
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  publishedAt: Timestamp | null;
};

export type PromptStatsDto = {
  likesCount: number;
  viewsCount: number;
  copiesCount: number;
  favoritesCount: number;
};

export type PromptStatusDto = 'draft' | 'pending' | 'published' | 'rejected' | 'removed';

export type PromptMetadataDto = {
  model: string;
  modelVersion: string;
  negativePrompt: string | null;
  aspectRatio: string;
  resolution: { width: number; height: number };
  style: string | null;
  generationParameters: Record<string, string | number | boolean>;
};
```

### C.2 Domain layer — zero Firebase types (`domain/entities/`)

```ts
import type { PromptId, CategoryId, AuthorId } from '@core/types/branded';

/** Everything a gallery card renders — and nothing more. */
export type PromptListItem = {
  readonly id: PromptId;
  readonly title: string;
  readonly thumbnailUrl: string;     // NEVER imageUrl — see requirement 6
  readonly blurHash: string | null;
  readonly aspectRatio: number;      // parsed to a number for layout
  readonly categoryId: CategoryId;
  readonly categoryName: string;
  readonly author: PromptAuthorRef;
  readonly stats: PromptStats;
  readonly isFeatured: boolean;
  readonly isTrending: boolean;
  readonly createdAt: string;        // ISO-8601
};

/** Everything the detail screen renders. Structurally a superset. */
export type PromptDetail = PromptListItem & {
  readonly prompt: string;
  readonly imageUrl: string;         // full resolution — detail only
  readonly tags: readonly string[];
  readonly metadata: PromptMetadata;
  readonly updatedAt: string;
};

export type PromptAuthorRef = {
  readonly id: AuthorId;
  readonly name: string;
  readonly avatarUrl: string | null;
};

export type PromptStats = {
  readonly likesCount: number;
  readonly viewsCount: number;
  readonly copiesCount: number;
  readonly favoritesCount: number;
};

export type PromptMetadata = {
  readonly model: string;
  readonly modelVersion: string;
  readonly negativePrompt: string | null;
  readonly aspectRatio: string;
  readonly resolution: { readonly width: number; readonly height: number };
  readonly style: string | null;
  readonly generationParameters: Readonly<Record<string, string | number | boolean>>;
};

export type PromptStatus = 'draft' | 'pending' | 'published' | 'rejected' | 'removed';
```

**Why `PromptDetail extends PromptListItem`:** the detail screen is seeded from
the list cache (section G.3). A structural superset makes that seeding a
compile-time guarantee instead of a hopeful spread.

### C.3 Query and paging types

```ts
/**
 * Opaque to everything above the data layer. Encodes (sortKeyValue, docId)
 * so it is serializable — it survives a cache rehydration and an app restart,
 * which a DocumentSnapshot cursor does not.
 */
export type PromptCursor = string;

export type PromptPage<T> = {
  readonly items: readonly T[];
  readonly nextCursor: PromptCursor | null;
  /** True when Firestore answered from the on-device cache (offline UI). */
  readonly fromCache: boolean;
};

export type PromptSort = 'newest' | 'trending' | 'featured';

export type GetPromptsParams = {
  readonly sort?: PromptSort;
  readonly categoryId?: CategoryId;
  readonly authorId?: AuthorId;
  readonly cursor?: PromptCursor | null;
  readonly limit?: number;           // default 12
};

export type SearchPromptsParams = {
  readonly query: string;
  readonly cursor?: PromptCursor | null;
  readonly limit?: number;
};
```

### C.4 The repository interface (`domain/repositories/PromptRepository.ts`)

```ts
export interface PromptRepository {
  getPrompts(params: GetPromptsParams): Promise<PromptPage<PromptListItem>>;
  getPromptById(id: PromptId): Promise<PromptDetail>;
  getPromptsByCategory(
    categoryId: CategoryId,
    params?: Omit<GetPromptsParams, 'categoryId'>,
  ): Promise<PromptPage<PromptListItem>>;
  searchPrompts(params: SearchPromptsParams): Promise<PromptPage<PromptListItem>>;
}
```

Not a single Firebase type in the signature — which is the whole point, and is
what the existing ESLint rule already enforces for `domain/**`.

---

## D. Required indexes

### D.1 Composite indexes (`firestore.indexes.json`)

Every gallery query filters `status == 'published'`, so it leads every index.

| # | Query | Fields |
|---|---|---|
| 1 | Newest | `status ASC, publishedAt DESC, __name__ DESC` |
| 2 | Featured | `status ASC, flags.isFeatured ASC, publishedAt DESC, __name__ DESC` |
| 3 | Trending | `status ASC, flags.isTrending ASC, trendingScore DESC, __name__ DESC` |
| 4 | Category | `status ASC, categoryId ASC, publishedAt DESC, __name__ DESC` |
| 5 | Author profile | `status ASC, authorId ASC, publishedAt DESC, __name__ DESC` |
| 6 | Tag / token search | `status ASC, searchTokens ARRAY_CONTAINS, publishedAt DESC, __name__ DESC` |
| 7 | Title prefix search | `status ASC, titleLower ASC, __name__ ASC` |
| 8 | My favorites (**collection group** on `favorites`) | `userId ASC, createdAt DESC, __name__ DESC` |
| 9 | My likes (**collection group** on `likes`) | `userId ASC, createdAt DESC, __name__ DESC` |
| 10 | Moderation queue (admin) | `status ASC, createdAt ASC, __name__ ASC` |

`__name__` is appended so **value cursors** work — `startAfter()` must receive a
value for every ordered field, and the document id is the tiebreaker that makes
the ordering total (and therefore the pagination gap-free).

### D.2 Single-field index exemptions — the optimization everyone forgets

Firestore automatically indexes **every field of every document**, ascending and
descending. That is pure waste for fields nobody ever orders or filters by, and
it is charged in write latency and index storage on every single write.

Exempt these:

| Field | Why |
|---|---|
| `prompt` | Up to 4,000 chars. Never queried. Indexed strings are truncated at 1,500 bytes anyway — you pay for an index that cannot even hold the value. |
| `searchTokens` | Keep the **array-contains** index; exempt ascending/descending. |
| `tags` | Same. |
| `metadata.*` | Whole map. Never filtered. |
| `imageUrl`, `thumbnailUrl`, `blurHash`, `authorAvatarUrl` | Opaque URLs; never ordered. |
| `stats.*` | Displayed, never ordered — `trendingScore` is what orders. Also the hottest-written fields, so the saving compounds. |

At 1M documents this is the difference between a write touching ~30 index
entries and ~10. Configure in `firestore.indexes.json` under `fieldOverrides`.

### D.3 Index cost as a scaling constraint

Every composite index is written on every document write. Ten indexes means a
single prompt update writes eleven times. This is fine at 100k documents and is
the main reason to **prune indexes you are no longer querying** — an unused
index is a permanent tax, not a harmless leftover.

---

## E. Security architecture

### E.1 Trust model

| Actor | Established by |
|---|---|
| Anonymous | no `request.auth` |
| Authenticated user | `request.auth.uid` |
| Owner | `resource.data.authorId == request.auth.uid` |
| Moderator / Admin | **custom claim** `request.auth.token.admin == true` |

Admin is a custom claim, never a Firestore field — a field means a document read
on every rule evaluation (billed, and slow), and a role stored where the user
might be able to write it.

### E.2 Field-level write control

The mechanism that does the real work:

```
function changedKeys() {
  return request.resource.data.diff(resource.data).affectedKeys();
}
```

An owner may change **only** an explicit whitelist:

```
allow update: if isOwner()
  && changedKeys().hasOnly([
       'title','titleLower','searchTokens','prompt','tags',
       'categoryId','categoryName','metadata','updatedAt','status'
     ])
  && request.resource.data.status in ['draft','pending']
  && request.resource.data.stats == resource.data.stats      // untouched
  && request.resource.data.flags == resource.data.flags      // untouched
  && request.resource.data.authorId == resource.data.authorId;
```

So: **`stats` and `flags` are unwritable by every client, always.** The only
principal that can move them is the Admin SDK inside a Cloud Function, which
bypasses rules entirely. That is what makes the counters trustworthy rather than
merely inconvenient to forge.

### E.3 Rule surface, collection by collection

| Path | Read | Create | Update | Delete |
|---|---|---|---|---|
| `prompts/{id}` | `status == 'published'` ∥ owner ∥ admin | authed, `authorId == uid`, all `stats` zero, all `flags` false, `status in ['draft','pending']` | owner (whitelist above) ∥ admin (`flags`, `status`) | owner ∥ admin |
| `prompts/{id}/likes/{uid}` | authed | `uid == request.auth.uid` | ✗ never | `uid == request.auth.uid` |
| `prompts/{id}/favorites/{uid}` | `uid == request.auth.uid` only | `uid == request.auth.uid` | ✗ never | `uid == request.auth.uid` |
| `prompts/{id}/comments/{cid}` | parent published | authed, `authorId == uid`, `body` 1–1000 chars, `status == 'visible'` | owner, body only | owner ∥ admin |
| `categories/{id}` | public | admin | admin | admin |
| `users/{uid}` | public profile | `uid == request.auth.uid` | self, whitelist excluding `promptCount` | admin |
| `users/{uid}/private/{doc}` | self only | self | self | self |
| `reports/{id}` | admin | authed | admin | admin |

Two details that matter:

- **Likes are world-readable, favorites are not.** A like is a public signal ("1,284 people liked this"); a favorite is a private bookmark. Same structure, different read rule.
- **No `update` on likes/favorites at all.** They are create-or-delete only. Allowing update would let a client change `createdAt` and corrupt the collection-group ordering.

### E.4 Rules are not enough on their own

Rules cannot enforce rate limits. A script can create prompts, comments, or
like/unlike in a loop. Mitigations, in the order I would add them:

1. **App Check** (Play Integrity / DeviceCheck) — blocks non-app clients outright. Highest value per hour of work; enable before launch.
2. Comment length + a Function-side profanity/spam pass.
3. A per-user daily create quota in `users/{uid}/private/quota`, checked by the Function that publishes.

---

## F. Firebase Storage structure

```
prompts/
  original/{promptId}.webp        ← ≤ 2048px long edge, WebP q82, public read
  thumbnails/{promptId}.webp      ← 400px wide,  WebP q75, public read
  thumbnails@2x/{promptId}.webp   ← 800px wide (tablet / xl breakpoint)
avatars/{userId}.webp             ← 128px, public read
uploads/{userId}/{uploadId}.{ext} ← STAGING. Client writes here and nowhere else.
```

### F.1 The staging path is the whole security design

Clients never write to `prompts/**`. They upload to `uploads/{uid}/…`; a Function
triggered on finalize validates, transcodes, writes the canonical objects with
the Admin SDK, and deletes the staged original.

```
match /prompts/{allPaths=**} {
  allow read: if true;          // public gallery
  allow write: if false;        // Admin SDK only
}
match /uploads/{userId}/{fileName} {
  allow read:  if request.auth.uid == userId;
  allow write: if request.auth.uid == userId
               && request.resource.size < 12 * 1024 * 1024
               && request.resource.contentType.matches('image/(jpeg|png|webp|heic)');
}
```

`request.resource.contentType` is client-asserted, so the Function re-checks the
real format from the file header before transcoding. Rules are the cheap first
gate, not the last one.

### F.2 URLs: skip `getDownloadURL()`

Because `prompts/**` is publicly readable, the canonical URL is deterministic:

```
https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{urlEncodedPath}?alt=media
```

No token, no round-trip. `getDownloadURL()` costs an extra network call per
image and embeds a revocable token — revoke it once and every stored URL in
Firestore breaks. The Function composes the deterministic URL and writes it to
the prompt document.

### F.3 Thumbnail generation and image optimization

**Pipeline** — Function on `uploads/**` finalize, using `sharp`:

1. Read header; reject anything not actually an image.
2. **Strip EXIF** (`.rotate()` first to apply orientation, then drop metadata) — removes GPS coordinates from user photos. A privacy requirement, not an optimization.
3. Resize: long edge → 2048 (original), width → 400 and 800 (thumbnails). Never upscale (`withoutEnlargement: true`).
4. Encode WebP: q82 original, q75 thumbnails.
5. Write with `Cache-Control: public, max-age=31536000, immutable`.
6. Update the prompt document with the URLs and `metadata.resolution`.
7. Delete the staged upload.

**Why WebP:** ~25–35% smaller than JPEG at matched quality, with alpha support.
Supported natively on iOS 14+ and Android 4.3+, so both floors (iOS 15 / API 24)
are clear. **AVIF is not worth it yet** — better compression, but encode time is
several times higher and decode is slow on low-end Android. Revisit later.

**Why 400w thumbnails:** a 2-column phone grid at 3x gives ~195dp × 3 ≈ 585px,
and a 400px WebP upscaled slightly in a card is visually indistinguishable at
~25 KB. The 800w variant serves the `xl` (tablet) breakpoint where cells are
physically larger.

**Immutability:** filenames are `{promptId}.webp` with a one-year immutable
cache. Re-uploading a replacement image therefore requires a version suffix
(`{promptId}_v2.webp`) — otherwise CDN and device caches serve the old bytes for
a year. Worth deciding now rather than debugging later.

---

## G. Data flow

### G.1 Read — gallery

```
HomeScreen                       thin; renders a switch on status
  └─ useHomeViewModel()
      └─ usePrompts({ sort: 'newest' })         TanStack useInfiniteQuery
          └─ queryFn → getPrompts(repo)(params)  use case (pure)
              └─ PromptRepository                 interface, domain
                  └─ PromptRepositoryImpl         DTO→entity, error→AppError
                      └─ PromptFirestoreDataSource  the ONLY file importing firestore
                          └─ Firestore (+ on-device cache)
```

Renders `PromptListItem.thumbnailUrl`. `imageUrl` is not in the type, so a card
cannot accidentally pull a 2048px image into a grid — the compiler prevents it.

### G.2 Read — detail

```
User taps a card
  └─ navigation.navigate('PromptDetail', { promptId })     ← ONLY the id
      └─ PromptDetailScreen
          └─ usePrompt(promptId)                            useQuery
              └─ getPromptById(repo)(id)
                  └─ … → PromptFirestoreDataSource.getById(id)
                      └─ Firestore: prompts/{id}            ONE document read
```

### G.3 Why passing only the id costs nothing

The obvious objection to id-only navigation is a blank screen while the document
loads. It is answered without passing the object:

```ts
useQuery({
  queryKey: queryKeys.prompts.detail(promptId),
  queryFn: () => getPromptById(repo)(promptId),
  initialData: () => findInAnyCachedList(queryClient, promptId), // PromptListItem
  initialDataUpdatedAt: 0,   // treat as stale → refetch immediately
});
```

The card the user just tapped is already in the TanStack cache. `PromptDetail`
being a structural superset of `PromptListItem` means the title, author, stats
and thumbnail paint on the **first frame**, the full-resolution image cross-fades
in over the thumbnail, and the prompt text fills in when the document lands.
Deep links have no cached list and fall back to a skeleton.

This is the reason for requirement 8 rather than a cost of it: the navigation
param stays serializable (deep links, state restoration) and the cache does the
work an oversized route param would have done badly.

### G.4 Write — like / favorite

```
User taps the heart
  └─ useToggleLike(promptId)                     useMutation
      ├─ onMutate:  optimistic +1 in the Query cache, haptic fires      ← instant
      ├─ mutationFn: set/delete prompts/{id}/likes/{uid}                ← one write
      ├─ Cloud Function onWrite → increment(stats.likesCount, ±1)       ← ~1s later
      └─ onError: roll back the cache, surface an AppError
```

The user sees the change immediately; the trustworthy count arrives a moment
later. The client never writes `stats`.

### G.5 Offline

Firestore's on-device cache is enabled by default in React Native Firebase, and
this is where it must be reflected in the app's own configuration:

```ts
// TanStack Query defaults
networkMode: 'offlineFirst',
```

Without this, TanStack Query sees `navigator.onLine === false` and pauses the
query — even though Firestore could have answered instantly from disk. With it,
the query runs, Firestore serves the cache, and `snapshot.metadata.fromCache`
tells the UI to show a subtle "offline — showing saved prompts" banner. That
`fromCache` flag is why `PromptPage` carries it.

---

## H. Recommended package dependencies

**Add**

```
@react-native-firebase/app          ^23
@react-native-firebase/firestore    ^23
@react-native-firebase/auth         ^23
@react-native-firebase/storage      ^23
@react-native-firebase/app-check    ^23     // before public launch
```

**Already installed and unchanged:** `@tanstack/react-query`, `zustand`,
`@shopify/flash-list`, `@d11/react-native-fast-image`, `react-native-mmkv`,
Reanimated, navigation.

**Functions workspace** (separate `package.json`, not bundled into the app):
`firebase-admin`, `firebase-functions`, `sharp`.

**Deliberately NOT added**

| | Why not |
|---|---|
| Algolia / Typesense / Elastic | Section 8.4 — not yet justified. |
| `@react-native-firebase/analytics`, `crashlytics` | Valuable, but out of scope for this change. |
| Any Firestore ORM wrapper | `PromptRepositoryImpl` already is the abstraction. A second one is abstraction for its own sake. |
| `firebase` (Web SDK) | Wrong SDK for RN CLI — no native persistence, worse performance. |

### H.1 Impact on the existing state-management split

| State | Phase 1 | With Firestore |
|---|---|---|
| Prompts, categories, search | TanStack Query (mock) | TanStack Query (Firestore) — **no change** |
| **Favorites** | Zustand + MMKV persist | **Moves to TanStack Query** + optimistic mutation |
| Theme, UI preferences, recent searches | Zustand + MMKV | **No change** |

Favorites become server-owned, so they stop being client state. `useFavorites()`
keeps its signature; only its internals change. Zustand keeps what requirement 15
assigns it: UI preferences and theme.

---

## 8. Scale

### 8.1 10,000 prompts

Everything above, unchanged. Composite indexes + cursor pagination. No sharding,
no search service, no caching layer. Category counts can be computed on demand.

### 8.2 100,000 prompts

- `trendingScore` precomputation becomes load-bearing (already designed in).
- Cache `categories/{id}.promptCount` via a Function; never `count()` on read paths.
- Author/category rename fan-out needs paging and resumability — a 500-prompt author exceeds one batch.
- Prune composite indexes you stopped querying. Apply the D.2 exemptions if you have not.
- Search is still Firestore. Prefix + token matching genuinely holds here.

### 8.3 1,000,000 prompts

- **Search moves off Firestore** (8.4).
- **Document size starts to matter** for list reads. The escape hatch that does *not* violate "one main collection": move `prompt`, `metadata.negativePrompt` and `metadata.generationParameters` into `prompts/{id}/detail/main` — a **subdocument**, read only by the detail screen. The gallery document drops to ~1 KB; `getPromptById` costs 2 reads instead of 1. Do this only when measurement says list bandwidth hurts, not before.
- **Views need a different mechanism.** At a million prompts, per-view Firestore writes are the dominant cost. Batch views client-side (one write per session per prompt), or ship them through Analytics → BigQuery and backfill `viewsCount` hourly. Views are an approximate metric; treat them like one.
- **Sharded counters only for genuinely hot documents.** A single document sustains ~1 write/second. A front-page prompt during a spike exceeds that; the long tail never will. Shard the few, not the many — a blanket 10-shard scheme multiplies read cost across the whole catalog to fix a problem 0.1% of documents have.
- Consider a read-through cache (Function + Memorystore) for the Home rails, which every user hits identically.

### 8.4 When Firestore search becomes insufficient

Firestore has **no full-text search**. What the design gives you:

- ✅ prefix match on `titleLower` ("port" → "Portrait…")
- ✅ whole-word match via `searchTokens` `array-contains-any` (≤ 30 terms)
- ✅ tag filtering

What it will never give you:

- ❌ substring match ("trait" → "Portrait")
- ❌ typo tolerance ("portrat")
- ❌ relevance ranking — results come back in `publishedAt` order, not by match quality
- ❌ multi-word AND across fields with weighting
- ❌ synonyms, stemming ("portraits" ≠ "portrait" unless you tokenize both)

**Move to a search service when any of these is true:**

1. Search is a primary navigation path (analytics show >20% of sessions start with search) — the moment ranking quality starts mattering more than exact matching.
2. Users search multi-word phrases and get poor results.
3. Catalog > ~50k documents *and* search retention is a tracked metric.

**Recommendation when that day comes:** Typesense or Algolia, fed by a Firestore
trigger, returning **ids only** — then hydrate through the existing repository.
Firestore stays the source of truth; the search index is a disposable
projection. Concretely: `SearchPromptsDataSource` becomes a second data source
behind the *unchanged* `PromptRepository`, and `searchPrompts` — the use case,
the hook, and every screen — does not change. Which is the same seam this whole
architecture is built on.

---

# 9. The no-backend variant (client + Firebase only)

**Constraint:** no custom backend and no hand-written Cloud Functions. The app
talks to Firebase directly.

This is viable. Four things in the design above assumed a Function, and each has
a client-only answer with a real, stated trade-off. Nothing about the layering,
the schema, the repository seam, or the queries changes.

## 9.1 What was Function-dependent

| # | Assumed a Function | Client-only replacement | Cost |
|---|---|---|---|
| 1 | Counter increments (§0.2) | Client batch write + **rules enforcement via `getAfter()`** | Slightly weaker guarantee — see 9.2 |
| 2 | Thumbnail generation (§F.3) | Resize on device before upload, **or** the *Resize Images* Extension | Client-controlled quality, or one extension install |
| 3 | Hourly `trendingScore` (§A.4) | Client-side ranking over a recent window | "Trending" = recent + popular, not decay-scored |
| 4 | Author/category rename fan-out (§A.3) | The user batch-updates their own prompts | Capped at 500/batch; stale until they rename |

## 9.2 Counters without Cloud Functions

The client writes the membership document **and** the counter in one atomic
`WriteBatch`:

```ts
const batch = firestore().batch();
batch.set(likeRef, { userId: uid, promptId, createdAt: serverTimestamp() });
batch.update(promptRef, { 'stats.likesCount': FieldValue.increment(1) });
await batch.commit();
```

The batch is atomic, so the counter and the like document can never disagree.
Security rules then make the counter write *honest* — this is the part that
does the real work:

```
match /prompts/{promptId} {
  allow update: if isCounterWrite('likesCount', 1)
                   && getAfter(/databases/$(database)/documents/prompts/$(promptId)/likes/$(request.auth.uid)).data.userId == request.auth.uid
                || isCounterWrite('likesCount', -1)
                   && !existsAfter(/databases/$(database)/documents/prompts/$(promptId)/likes/$(request.auth.uid))
                || /* …the owner/admin rules from §E… */;
}

function isCounterWrite(field, delta) {
  return request.auth != null
    && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['stats'])
    && request.resource.data.stats[field] == resource.data.stats[field] + delta
    && request.resource.data.stats.diff(resource.data.stats).affectedKeys().hasOnly([field]);
}
```

`getAfter()` / `existsAfter()` evaluate the state **as it will be after the whole
batch commits**. That is what makes this safe: a client cannot increment
`likesCount` without also creating its own like document, and cannot create a
like document for anyone else. Only one counter field may move, by exactly ±1.

**What this still cannot stop:** a client can like → unlike → like in a loop. Net
effect on the counter is zero, but it burns writes. Mitigations in order of
value: **App Check** (blocks non-app clients — do this first), then a client-side
debounce, then accept it. Nothing here lets an attacker inflate a count and
leave it inflated.

**Costs:** every `getAfter()` is billed as a document read. A like is therefore
2 writes + 1 read instead of 1 write. At gallery scale this is noise, and it
buys a counter that updates **instantly** rather than a second later — so the
optimistic-UI rollback path in §G.4 gets simpler, not harder.

**Views and copies:** do **not** put these behind `getAfter()` — there is no
membership document to check, so rules cannot validate them and any client could
write any number. Options: (a) accept unvalidated `increment(1)` for views only,
rate-limited by App Check — views are a vanity metric and a distorted count
harms nothing; or (b) drop `viewsCount` from the UI until Functions exist. I
would take (a) for views and `copiesCount`, and keep the strict rule for likes
and favorites, which are the numbers users actually judge quality by.

## 9.3 Thumbnails without a Function

**Recommended: the `storage-resize-images` Firebase Extension.** It is a
Cloud Function under the hood, but you install it from the console and write
zero backend code — which satisfies "no backend setup" in every sense that
matters. Configure: sizes `400x400,800x800`, output WebP, keep original,
delete-original off.

**If you want literally no Functions at all:** resize on device before upload.

```
pick image → resize to 2048 long edge (WebP q82)  → upload prompts/original/{id}.webp
           → resize to 400 wide      (WebP q75)  → upload prompts/thumbnails/{id}.webp
           → write both URLs into the prompt document
```

`@bam.tech/react-native-image-resizer` or `react-native-compressor` handle this.
Storage rules then must allow the client to write `prompts/**` directly, which
weakens §F.1 — constrain it hard: path must match the caller's own prompt id,
`request.resource.size < 4MB`, `contentType == 'image/webp'`.

Trade-offs to accept: thumbnail quality is client-controlled; **EXIF stripping
must happen on-device** (most resizers drop it, but verify — this is a privacy
issue, not a nicety); and a modified client could upload a thumbnail that does
not match its original.

Given those, the Extension is the better answer unless you are strictly avoiding
anything Function-shaped.

## 9.4 Trending without a scheduler

No scheduled job means no time-decayed score. Two honest options:

**A. Client-side ranking over a recent window** *(recommended)*

```
where('status','==','published')
  .where('publishedAt','>=', 14 days ago)
  .orderBy('publishedAt','desc')
  .limit(100)
```

then rank those 100 in the app with the §A.4 formula. One query, 100 reads,
cached by TanStack Query for the session. Firestore requires the inequality
field to be ordered first, which this satisfies. `trendingScore` stays in the
schema but is computed client-side and simply not persisted.

Index: `status ASC, publishedAt DESC`, which index #1 already provides.

**B. Manual curation.** An admin screen toggles `flags.isTrending`. Zero
compute, full editorial control, and for a launch catalogue that is often the
better product decision anyway.

Featured (`flags.isFeatured`) is admin-curated in both cases — it always was.

## 9.5 Rename fan-out without a Function

When a user changes their display name or avatar, the **client** updates its own
prompts — it owns them, so the §E rules already permit it:

```
users/{uid} update  →  query prompts where authorId == uid (limit 500)
                    →  WriteBatch update authorName / authorAvatarUrl
                    →  repeat with a cursor while more remain
```

Needs index #5 (`status, authorId, publishedAt`), already required. Prompts stay
stale only until the author next renames — and if the batch fails midway, the
next rename repairs it. Category renames are admin-only and rare enough to do
from an admin screen the same way.

## 9.6 What this changes in the app

Nothing above the data layer, which is the point:

- `PromptRepository`, all four use cases, every hook, screen and component: **unchanged**.
- `PromptFirestoreDataSource` gains the batch-write methods for like/favorite.
- `firestore.rules` grows the `getAfter()` counter clauses from 9.2.
- One new client concern: on-device image resizing (9.3), which belongs in `infrastructure/image/`.

## 9.7 When to revisit

Add Functions (or the Extension) when any of these becomes true:

1. `viewsCount` / `copiesCount` inaccuracy starts being visible or embarrassing.
2. You need moderation that runs without the author's device — auto-flagging, takedowns.
3. Trending needs to be consistent across users rather than computed per-client.
4. The catalogue outgrows a 100-document client-side trending window (roughly: more than ~100 prompts published per 14 days).

**Enable App Check before launch either way.** In a client-only architecture it
is doing more of the security work than it would otherwise, because rules are
the only server-side check that exists.
