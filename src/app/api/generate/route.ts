import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { buildTasteProfile, scorePlaces } from "@/lib/scoring";
import { buildItinerary } from "@/lib/itinerary";
import { MOCK_PLACES } from "@/lib/mock-places";
import { fetchCandidatePlacesFromGoogle } from "@/lib/google-places";
import { getSupabaseServerClient } from "@/lib/supabase";
import { saveTrip } from "@/lib/store";
import { ImportedContentInput, Place, QuizInput, TripResult } from "@/lib/types";

function fallbackPlacesFromImports(city: string, imported: ImportedContentInput[]): Place[] {
  return imported.slice(0, 12).map((item, idx) => ({
    id: `imported-${idx}-${item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name: item.places?.[0] || item.title || `Imported stop ${idx + 1}`,
    city: item.city || city,
    category: item.category || "hidden gems",
    vibeTags: item.vibeTags?.length ? item.vibeTags : ["local"],
    priceLevel: item.priceLevel || "moderate",
    estimatedVisitDurationMins: 75,
    neighborhood: "Imported route",
    latitude: 0,
    longitude: 0,
    openingHours: "Hours vary",
    sourceCredibilityScore: 0.65,
    specificityScore: 0.7,
    popularityScore: 0.55,
    description: `Derived from your imported content: ${item.title}`,
  }));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const quiz = body.quiz as QuizInput;
  const importedContent = body.importedContent as ImportedContentInput[];

  if (!quiz?.destinationCity || !quiz?.tripLengthDays) {
    return NextResponse.json({ error: "Missing quiz fields" }, { status: 400 });
  }

  const tasteProfile = buildTasteProfile(quiz, importedContent);
  const seedCityPlaces = MOCK_PLACES.filter((p) => p.city.toLowerCase() === quiz.destinationCity.toLowerCase());
  const liveCandidates = await fetchCandidatePlacesFromGoogle(quiz.destinationCity, quiz.interests);
  const importFallbackPlaces = fallbackPlacesFromImports(quiz.destinationCity, importedContent);
  const candidatePlaces = liveCandidates.length
    ? liveCandidates
    : seedCityPlaces.length
      ? seedCityPlaces
      : importFallbackPlaces;
  const recommendations = scorePlaces(quiz, importedContent, tasteProfile, candidatePlaces);
  const itinerary = buildItinerary(quiz, recommendations);
  const dataSource: TripResult["dataSource"] = liveCandidates.length
    ? "google_places_live"
    : seedCityPlaces.length
      ? "seed_city"
      : "imported_content_fallback";
  const notices =
    dataSource === "google_places_live"
      ? []
      : dataSource === "seed_city"
        ? ["Live Google Places data unavailable for this request; using curated city seed data."]
        : ["No live or seeded city places found; using imported content to create fallback recommendations."];

  const tripId = randomUUID();
  const confidenceScore = Math.round((recommendations.slice(0, 5).reduce((sum, r) => sum + r.score, 0) / Math.max(1, Math.min(5, recommendations.length))) * 100);

  const result: TripResult = {
    tripId,
    quiz,
    importedContent,
    tasteProfile,
    recommendations,
    itinerary,
    confidenceScore,
    dataSource,
    notices,
    sourceBreakdown: {
      importedContent: dataSource === "imported_content_fallback" ? 60 : liveCandidates.length ? 35 : 45,
      quizAnswers: 30,
      curatedDatabase: dataSource === "imported_content_fallback" ? 10 : liveCandidates.length ? 35 : 25,
    },
  };

  saveTrip(result);

  const supabase = getSupabaseServerClient();
  if (supabase) {
    await supabase.from("trips").insert({
      id: tripId,
      destination_city: quiz.destinationCity,
      trip_length_days: quiz.tripLengthDays,
      budget: quiz.budget,
      travel_style: quiz.travelStyle,
      pace: quiz.pace,
      constraints: quiz.constraints,
      confidence_score: confidenceScore,
    });

    if (importedContent.length) {
      await supabase.from("imported_content").insert(
        importedContent.map((item) => ({
          trip_id: tripId,
          url: item.url,
          title: item.title,
          places: item.places,
          city: item.city,
          category: item.category,
          vibe_tags: item.vibeTags,
          price_level: item.priceLevel,
          source_type: item.sourceType,
          raw_text: item.rawText || "",
        }))
      );
    }

    if (recommendations.length) {
      await supabase.from("recommendations").insert(
        recommendations.slice(0, 20).map((r) => ({
          trip_id: tripId,
          place_id: r.place.id,
          score: r.score,
          why: r.why,
          breakdown: r.breakdown,
        }))
      );
    }

    if (itinerary.length) {
      await supabase.from("itinerary_items").insert(
        itinerary.map((item) => ({
          trip_id: tripId,
          day: item.day,
          stop_order: item.order,
          time_window: item.timeWindow,
          place_id: item.recommendation.place.id,
          score: item.recommendation.score,
          why: item.recommendation.why,
        }))
      );
    }
  }

  return NextResponse.json(result);
}
