# Bottom-up: what this repo needs to run

Built from **`process.env` usage** and **runtime data dependencies** in the codebase (not from old README boilerplate).

## Required

| Need | Why |
| ---- | --- |
| **Node.js** (20+ recommended) | Next.js 16 / React 19 toolchain. |
| **`npm install`** | Installs app dependencies. |
| **`OPENAI_API_KEY`** | Caption parsing (`/api/parse-content`), text embeddings (`src/lib/embeddings.ts`), AI reranking (`src/lib/ai-ranker.ts`). Without it, those steps degrade or no-op. |
| **`GOOGLE_PLACES_API_KEY`** | Places API (New): search (`/api/search-places`), place details, live candidates for cities that are not served only by static logic. Without it, text search returns empty and non-Dubai flows fall back to limited behavior. |
| **`data/dubai_travel_beli_dataset.csv`** | Shipped in repo. Powers “similar friends,” Dubai landmark recommendations, feed, and destination API alignment with the simulated social graph. |

## Optional

| Need | Why |
| ---- | --- |
| **`BELI_DATASET_PATH`** | Absolute path to an alternate CSV (same schema as `DATASET.md`). |
| **Supabase env vars** (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) | If set, some routes persist trips/feedback to Postgres. If unset, the app uses in-memory `src/lib/store.ts` and admin aggregates from that. |

## Run

```bash
cp .env.example .env.local
# add OPENAI_API_KEY and GOOGLE_PLACES_API_KEY
npm install
npm run dev
```

See root **`README.md`** for grader-facing setup and **`DATASET.md`** for the synthetic dataset story.
