import { OnboardingQuizInput, SimilarFriend, TasteVector } from "@/lib/types";
import { loadDatasetRows, normalizeRating01 } from "@/lib/parser";

const QUIZ_TO_TAGS: Record<OnboardingQuizInput["travelType"], string[]> = {
  solo: ["culture", "walk"],
  friends: ["nightlife", "adventure"],
  date: ["luxury", "view"],
};

const BUDGET_TO_TAGS: Record<OnboardingQuizInput["budget"], string[]> = {
  low: ["walk", "beach", "museum"],
  medium: ["restaurant", "cultural"],
  high: ["luxury", "view", "pool"],
};

function addWeight(vector: TasteVector, key: string, value: number) {
  vector[key] = (vector[key] || 0) + value;
}

function unitize(vector: TasteVector): TasteVector {
  const magnitude = Math.sqrt(Object.values(vector).reduce((sum, value) => sum + value * value, 0)) || 1;
  const normalized: TasteVector = {};
  for (const [key, value] of Object.entries(vector)) {
    normalized[key] = value / magnitude;
  }
  return normalized;
}

export function buildUserTasteVector(input: OnboardingQuizInput): TasteVector {
  const vector: TasteVector = {};
  for (const preference of input.preferences) addWeight(vector, preference, 1.8);
  for (const hint of QUIZ_TO_TAGS[input.travelType]) addWeight(vector, hint, 1.1);
  for (const hint of BUDGET_TO_TAGS[input.budget]) addWeight(vector, hint, 0.8);
  return unitize(vector);
}

export function buildFriendTasteVectors(): Record<string, TasteVector> {
  const vectors: Record<string, TasteVector> = {};
  const rows = loadDatasetRows();

  for (const row of rows) {
    const friend = row.friend_name;
    if (!vectors[friend]) vectors[friend] = {};
    const weight = normalizeRating01(row.rating);

    for (const tag of row.tags) {
      addWeight(vectors[friend], tag, weight);
    }
  }

  for (const [friend, vector] of Object.entries(vectors)) {
    vectors[friend] = unitize(vector);
  }

  return vectors;
}

export function cosineSimilarity(a: TasteVector, b: TasteVector): number {
  let dot = 0;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    dot += (a[key] || 0) * (b[key] || 0);
  }
  return Math.max(0, Math.min(1, dot));
}

export function getTopSimilarFriends(input: OnboardingQuizInput, limit = 10): SimilarFriend[] {
  const userVector = buildUserTasteVector(input);
  const friendVectors = buildFriendTasteVectors();

  return Object.entries(friendVectors)
    .map(([friendName, vector]) => ({
      friendName,
      similarity: cosineSimilarity(userVector, vector),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}
