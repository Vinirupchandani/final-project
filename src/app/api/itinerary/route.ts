import { NextRequest, NextResponse } from "next/server";
import { aiRerankRecommendations } from "@/lib/ai-ranker";
import { buildExternalRecommendationEmbeddings } from "@/lib/embeddings";
import { fetchCandidatePlacesFromGoogle } from "@/lib/google-places";
import { balanceRecommendationsByPreferences, buildDiverseItinerary, recommendExternalPlaces, recommendLandmarks } from "@/lib/recommendation";
import { getTopSimilarFriends } from "@/lib/similarity";
import { buildLearnedPreferenceVector, topLearnedSeeds } from "@/lib/user-profile";
import { RecommendRequestBody } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as RecommendRequestBody & { selectedLandmarks?: string[] };
  const destinationCity = (body.destinationCity || "Dubai").trim();
  const finalLimit = 10;
  const candidateLimit = Math.max(28, body.preferences.length * 10);
  const topFriends = getTopSimilarFriends(body, 10);
  const lowerCity = destinationCity.toLowerCase();
  const userVisits = body.userVisits || [];
  const learnedVector = userVisits.length ? buildLearnedPreferenceVector(userVisits) : {};
  const learnedSeeds = (body.learnedSeeds && body.learnedSeeds.length ? body.learnedSeeds : topLearnedSeeds(learnedVector, 8)).filter(Boolean);
  let recommendations =
    lowerCity === "dubai"
      ? recommendLandmarks({ ...body, destinationCity }, topFriends, candidateLimit)
      : [];

  if (lowerCity !== "dubai") {
    const googleCandidates = await fetchCandidatePlacesFromGoogle(destinationCity, body.preferences, learnedSeeds);
    if (googleCandidates.length) {
      const embeddingPack = await buildExternalRecommendationEmbeddings(
        body,
        destinationCity,
        userVisits,
        googleCandidates,
        topFriends
      );
      recommendations = recommendExternalPlaces(
        { ...body, destinationCity },
        topFriends,
        googleCandidates,
        candidateLimit,
        { learned: learnedVector, embeddings: embeddingPack, userVisitCount: userVisits.length }
      );
    } else {
      recommendations = recommendLandmarks({ ...body, destinationCity }, topFriends, candidateLimit);
    }
  }

  const reranked = await aiRerankRecommendations({ ...body, destinationCity }, topFriends, recommendations, learnedSeeds);
  const balanced = balanceRecommendationsByPreferences(reranked, body.preferences, finalLimit);
  const selectedSet = new Set((body.selectedLandmarks || []).map((name) => name.toLowerCase()));
  const prioritized = [
    ...balanced.filter((item) => selectedSet.has(item.landmark.toLowerCase())),
    ...balanced.filter((item) => !selectedSet.has(item.landmark.toLowerCase())),
  ];
  const itinerary = buildDiverseItinerary(body.tripDays, prioritized);

  return NextResponse.json({
    itinerary,
    recommendations: prioritized,
    topFriends,
  });
}
