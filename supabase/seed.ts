import { createClient } from "@supabase/supabase-js";
import { MOCK_PLACES } from "../src/lib/mock-places";

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");

  const supabase = createClient(url, key);
  const { error } = await supabase.from("places").upsert(
    MOCK_PLACES.map((p) => ({
      id: p.id,
      name: p.name,
      city: p.city,
      category: p.category,
      vibe_tags: p.vibeTags,
      price_level: p.priceLevel,
      estimated_visit_duration_mins: p.estimatedVisitDurationMins,
      neighborhood: p.neighborhood,
      latitude: p.latitude,
      longitude: p.longitude,
      opening_hours: p.openingHours,
      source_credibility_score: p.sourceCredibilityScore,
      specificity_score: p.specificityScore,
      popularity_score: p.popularityScore,
      description: p.description,
    }))
  );

  if (error) throw error;
  console.log("Seeded places:", MOCK_PLACES.length);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
