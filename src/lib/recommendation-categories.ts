import { PreferenceTag } from "@/lib/types";

export const ADVENTURE_TAGS = new Set(["adventure", "hike", "walk", "beach", "activity"]);
const FOOD_TAGS = new Set(["food", "restaurant", "cafe"]);
const CULTURE_TAGS = new Set([
  "museum",
  "cultural",
  "culture",
  "historic",
  "historical",
  "history",
  "heritage",
  "old town",
  "district",
  "fort",
  "mosque",
  "temple",
  "shrine",
  "souk",
  "souq",
  "market",
  "art",
  "gallery",
  "local culture",
]);
const NIGHTLIFE_TAGS = new Set(["nightlife", "bar", "club"]);
const LUXURY_TAGS = new Set(["luxury", "view", "pool", "fine dining"]);

function keywordHitScore(text: string, keyword: string): number {
  if (!text) return 0;
  if (text === keyword) return 1.4;
  if (text.includes(keyword) || keyword.includes(text)) return 1;
  return 0;
}

export function getPreferenceMatchScore(
  tags: string[],
  preference: PreferenceTag,
  landmarkName?: string
): number {
  const lower = tags.map((tag) => tag.toLowerCase());
  const searchable = [...lower, (landmarkName || "").toLowerCase()];
  const tagSet =
    preference === "food"
      ? FOOD_TAGS
      : preference === "adventure"
        ? ADVENTURE_TAGS
        : preference === "culture"
          ? CULTURE_TAGS
          : preference === "nightlife"
            ? NIGHTLIFE_TAGS
            : LUXURY_TAGS;
  let score = 0;
  for (const chunk of searchable) {
    for (const keyword of tagSet) {
      score += keywordHitScore(chunk, keyword);
    }
  }
  return score;
}

export function getRecommendationPreferenceCategory(tags: string[], landmarkName?: string): PreferenceTag {
  const searchable = [...tags.map((tag) => tag.toLowerCase()), (landmarkName || "").toLowerCase()];

  // Culture takes precedence when heritage/history signals are present.
  if (searchable.some((tag) => [...CULTURE_TAGS].some((kw) => keywordHitScore(tag, kw) > 0))) return "culture";
  if (searchable.some((tag) => [...FOOD_TAGS].some((kw) => keywordHitScore(tag, kw) > 0))) return "food";
  if (searchable.some((tag) => [...NIGHTLIFE_TAGS].some((kw) => keywordHitScore(tag, kw) > 0))) return "nightlife";
  if (searchable.some((tag) => [...ADVENTURE_TAGS].some((kw) => keywordHitScore(tag, kw) > 0))) return "adventure";
  return "luxury";
}

export function getPrimaryPreferenceForRecommendation(
  tags: string[],
  preferences: PreferenceTag[],
  landmarkName?: string
): PreferenceTag {
  if (!preferences.length) return getRecommendationPreferenceCategory(tags, landmarkName);
  let bestPreference = preferences[0];
  let bestScore = -1;
  for (const pref of preferences) {
    const score = getPreferenceMatchScore(tags, pref, landmarkName);
    if (score > bestScore) {
      bestScore = score;
      bestPreference = pref;
    }
  }
  if (bestScore <= 0) return getRecommendationPreferenceCategory(tags, landmarkName);
  return bestPreference;
}
