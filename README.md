# Wandr — travel itinerary from social-style signals

**Course:** [Your course name and term]  
**Team / author:** [Names]  
**Repository:** https://github.com/Vinirupchandani/final-project  

**Executive summary (for graders):** Wandr is a small web app that turns a traveler’s quiz answers plus “imported” posts (captions, places, vibes) into a transparent, scored day-by-day itinerary. It is aimed at people who discover trips through short-form video and blogs but want a structured plan without losing why each stop was picked. **To run the app as designed you need both OpenAI and Google Places API keys** (see Setup): OpenAI powers pasted-caption extraction, embeddings, and recommendation reranking; Google Places powers live place search and fetching real venues for non–hard-coded cities. Scoring and itinerary assembly stay explicit in code. This repo contains **application code only**—submit the written report and slide deck through the course LMS as instructed.

## Stack
- Next.js (App Router) + React + Tailwind
- Next.js API routes backend
- Supabase Postgres
- **OpenAI API** (required): caption parsing, embeddings, AI reranking
- **Google Places API (Places API New)** (required): text search, place details, candidate venues for recommendations outside the bundled Dubai demo set

## Features
- Landing page with clear product proposition
- Onboarding quiz (city, budget, style, pace, interests, constraints)
- Content import cards with manual fields + AI-assisted extraction from pasted caption/description
- Taste profile generation from quiz + imported content
- Transparent recommendation scoring + explanation
- Day-by-day itinerary builder based on pace and neighborhood grouping
- Analytics dashboard with confidence and source breakdown
- Feedback capture (save / not interested / visited)
- Admin/testing dashboard metrics

## Prerequisites
- Node.js 20+ recommended  
- **OpenAI** account and API key — [platform.openai.com](https://platform.openai.com/)  
- **Google Cloud** project with **Places API (New)** enabled and an API key — [Google Places API](https://developers.google.com/maps/documentation/places/web-service/op-overview)  
- A **Supabase** project (Postgres) if you use persistence features  

## Setup
1. Install dependencies:
```bash
npm install
```
2. Copy env file:
```bash
cp .env.example .env.local
```
3. Fill `.env.local` (never commit this file or put keys in your report PDF).

**Required for the full demo**

| Variable | Purpose |
| -------- | ------- |
| `OPENAI_API_KEY` | Paste-caption extraction (`/api/parse-content`), embedding-based matching, AI reranking of recommendations |
| `GOOGLE_PLACES_API_KEY` | Place search autocomplete, place details, and **live** recommendation candidates for cities other than the built-in Dubai landmark set |

**Also set (database)**

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

**Optional**

- `FOURSQUARE_API_KEY` — reserved for future enrichment; not required to run the current app

## Database setup (Supabase hosted)
1. Create a Supabase project.
2. Open SQL Editor and run `supabase/schema.sql`.
3. Seed places:
```bash
npx tsx supabase/seed.ts
```

## Local run
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

## Full flow test
1. Start planning on landing page.
2. Fill quiz + add 5-10 content cards (manual or AI extract).
3. Generate itinerary.
4. Review taste profile and itinerary rationale.
5. Submit feedback on stops.
6. Open `/admin` and verify aggregate metrics.

## Deployment (Vercel)
1. Push to GitHub.
2. Import repo into Vercel.
3. Add all `.env.local` variables in Vercel project settings (including **OpenAI** and **Google Places**).
4. Deploy.

## Recommendation formula
`final_score = 0.35 * preference_match + 0.25 * vibe_match + 0.15 * budget_match + 0.15 * source_quality + 0.10 * imported_content_similarity`

Logic is intentionally transparent in `src/lib/scoring.ts` and `src/lib/itinerary.ts` for easy iteration.
