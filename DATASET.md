# Simulated preference dataset (“Beli-style”)

## What this is

This project does **not** scrape real social media. For the final demo we use a **small, synthetic CSV** that *simulates* what you might get from a “saved places / friends’ ratings” export: fictional traveler names, Dubai landmarks, 1–5 star ratings, tag buckets, and short free-text notes.

**File:** `data/dubai_travel_beli_dataset.csv`

Anyone cloning the repo gets the same data so recommendations, the social feed, and “similar friends” behave reproducibly without your personal machine paths.

## Schema

| Column        | Description |
| ------------- | ----------- |
| `friend_name` | Synthetic peer label (e.g. “Maya Chen”). Used to build per-friend taste vectors and “who is similar to you.” |
| `landmark`    | Place or experience name, Dubai-centric to match the default product story. |
| `rating`      | Integer 1–5 (stored preferences normalized inside the app). |
| `tags`        | Comma-separated tokens (e.g. `food,local,walkable`) aligned with quiz interests and scoring. |
| `notes`       | One short subjective note per row (simulates caption / review text). |

Header row is required. Fields with commas are quoted in standard CSV fashion.

## How the app uses it

- **`src/lib/parser.ts`** — loads rows (cached in memory after first read).
- **`src/lib/similarity.ts`** — maps each `friend_name` to a weighted tag vector; compares to the quiz-derived user vector for “top similar friends.”
- **`src/lib/recommendation.ts`** — aggregates ratings and tags per landmark for Dubai-style collaborative scoring and explanations (“friends like you rated this highly”).
- **`src/app/api/feed/route.ts`** — builds the feed cards from the same rows (plus optional Google Places photos/details when `GOOGLE_PLACES_API_KEY` is set).
- **`src/lib/embeddings.ts`** — turns each friend’s rows into text snippets for optional OpenAI embeddings on non-Dubai city flows.

## Overrides

- Default path: **`data/dubai_travel_beli_dataset.csv`** (repo root relative to `process.cwd()`).
- Optional env: **`BELI_DATASET_PATH`** — absolute path to a different CSV with the **same columns** (for your own experiments). Do not commit real user data without consent and ethics review.

## Ethics note (for your report)

State clearly that rows are **fabricated** for demonstration: no real users, no scraped DMs, no platform ToS issues. If you later swap in real or scraped data, that belongs in your report’s ethics / governance section and is outside this synthetic file.
