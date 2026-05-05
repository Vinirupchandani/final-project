import { NextRequest, NextResponse } from "next/server";
import { aiRerankRecommendations } from "@/lib/ai-ranker";
import { buildExternalRecommendationEmbeddings } from "@/lib/embeddings";
import { fetchCandidatePlacesFromGoogle } from "@/lib/google-places";
import {
  balanceRecommendationsByPreferences,
  getExpertTravelerPicks,
  recommendExternalPlaces,
  recommendLandmarks,
} from "@/lib/recommendation";
import { getTopSimilarFriends } from "@/lib/similarity";
import { buildLearnedPreferenceVector, topLearnedSeeds } from "@/lib/user-profile";
import { RecommendRequestBody } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as RecommendRequestBody;
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
      ? recommendLandmarks(body, topFriends, candidateLimit)
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
  const expertPicks = getExpertTravelerPicks({ ...body, destinationCity }, balanced, 4, {
    learned: learnedVector,
    userVisits,
  });
  const sponsoredPlacement = {
    label: "Sponsored",
    title: `Find ${destinationCity} activities on Viator`,
    url: `https://www.viator.com/searchResults/all?text=${encodeURIComponent(destinationCity)}&pid=wandr&utm_source=wandr&utm_medium=sponsored&utm_campaign=destination_discovery`,
    note: "Ads never affect organic ranking.",
  };

  return NextResponse.json({
    destinationCity,
    topFriends,
    recommendations: balanced,
    expertPicks,
    sponsoredPlacement,
  });
}
