import OpenAI from "openai";
import { LandmarkRecommendation, OnboardingQuizInput, SimilarFriend } from "@/lib/types";

type AIRankResult = {
  landmark: string;
  boost: number;
  why: string;
};

const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

function safeParseJson(text: string): AIRankResult[] {
  try {
    const parsed = JSON.parse(text) as AIRankResult[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function aiRerankRecommendations(
  quiz: OnboardingQuizInput,
  similarFriends: SimilarFriend[],
  recommendations: LandmarkRecommendation[],
  learnedSeeds: string[] = []
): Promise<LandmarkRecommendation[]> {
  if (!client || !recommendations.length) return recommendations;

  const compact = recommendations.slice(0, 12).map((item) => ({
    landmark: item.landmark,
    baseScore: Number(item.score.toFixed(4)),
    tags: item.tags.slice(0, 6),
    averageRating: Number(item.averageRating.toFixed(2)),
  }));

  try {
    const response = await client.responses.create({
      model: "gpt-5.5-medium",
      input: [
        {
          role: "system",
          content:
            "You are a travel recommendation ranker. Return strict JSON only: an array of objects {landmark, boost, why}. boost must be between -0.12 and 0.12.",
        },
        {
          role: "user",
          content: JSON.stringify({
            destinationCity: quiz.destinationCity || "dubai",
            travelType: quiz.travelType,
            preferences: quiz.preferences,
            budget: quiz.budget,
            learnedSeeds: learnedSeeds.slice(0, 8),
            similarFriends: similarFriends.slice(0, 5),
            candidates: compact,
          }),
        },
      ],
    });

    const rawText = response.output_text || "";
    const boosts = safeParseJson(rawText);
    if (!boosts.length) return recommendations;

    const boostMap = new Map(boosts.map((item) => [item.landmark.toLowerCase(), item]));

    return [...recommendations]
      .map((item) => {
        const hit = boostMap.get(item.landmark.toLowerCase());
        if (!hit) return item;
        const boundedBoost = Math.max(-0.12, Math.min(0.12, hit.boost || 0));
        const nextScore = Math.max(0, Math.min(1, item.score + boundedBoost));
        return {
          ...item,
          score: nextScore,
          aiBoost: boundedBoost,
          aiWhy: hit.why || "",
        };
      })
      .sort((a, b) => b.score - a.score);
  } catch {
    return recommendations;
  }
}
