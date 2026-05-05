import { ImportedContentInput, Place, QuizInput, Recommendation, UserTasteProfile } from "@/lib/types";

const budgetWeights: Record<string, number> = { budget: 1, moderate: 2, premium: 3, luxury: 4 };

const normalizeWeights = (weights: Record<string, number>) => {
  const total = Object.values(weights).reduce((sum, n) => sum + n, 0) || 1;
  return Object.fromEntries(Object.entries(weights).map(([k, v]) => [k, v / total]));
};

export function buildTasteProfile(quiz: QuizInput, imported: ImportedContentInput[]): UserTasteProfile {
  const categoryCounts: Record<string, number> = {};
  const vibeCounts: Record<string, number> = {};

  for (const interest of quiz.interests) categoryCounts[interest] = (categoryCounts[interest] || 0) + 2;
  for (const vibe of quiz.aiSignals.perfectDayVibes) vibeCounts[vibe] = (vibeCounts[vibe] || 0) + 2;
  if (quiz.aiSignals.discoveryStyle === "hidden gems") categoryCounts["hidden gems"] = (categoryCounts["hidden gems"] || 0) + 2;
  if (quiz.aiSignals.discoveryStyle === "iconic") categoryCounts["local culture"] = (categoryCounts["local culture"] || 0) + 1;
  if (quiz.aiSignals.foodComfort === "adventurous") categoryCounts["food"] = (categoryCounts["food"] || 0) + 2;
  if (quiz.aiSignals.socialEnergy === "social") categoryCounts["nightlife"] = (categoryCounts["nightlife"] || 0) + 1;
  for (const item of imported) {
    categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
    for (const vibe of item.vibeTags) vibeCounts[vibe] = (vibeCounts[vibe] || 0) + 1;
  }

  const categoryWeights = normalizeWeights(categoryCounts);
  const vibeWeights = normalizeWeights(vibeCounts);

  const topCategories = Object.entries(categoryWeights)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key, pct]) => ({ key, pct: Math.round(pct * 100) }));

  const topVibes = Object.entries(vibeWeights)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key, pct]) => ({ key, pct: Math.round(pct * 100) }));

  return { categoryWeights, vibeWeights, topCategories, topVibes };
}

function jaccard(a: string[], b: string[]) {
  const A = new Set(a.map((x) => x.toLowerCase()));
  const B = new Set(b.map((x) => x.toLowerCase()));
  const intersection = [...A].filter((x) => B.has(x)).length;
  const union = new Set([...A, ...B]).size || 1;
  return intersection / union;
}

export function scorePlaces(quiz: QuizInput, imported: ImportedContentInput[], profile: UserTasteProfile, places: Place[]): Recommendation[] {
  const targetCity = quiz.destinationCity.toLowerCase();
  const importedPlaceSignals = imported.flatMap((x) => [...x.places, x.title]).join(" ").toLowerCase();
  const scored = places
    .filter((p) => p.city.toLowerCase() === targetCity)
    .map((place) => {
      const preferenceMatch = profile.categoryWeights[place.category] || 0;
      const vibeMatch = jaccard(Object.keys(profile.vibeWeights), place.vibeTags);
      const budgetDelta = Math.abs((budgetWeights[quiz.budget] || 2) - (budgetWeights[place.priceLevel] || 2));
      const budgetMatch = Math.max(0, 1 - budgetDelta / 3);
      const sourceQuality = (place.sourceCredibilityScore + place.specificityScore + place.popularityScore) / 3;
      const importedContentSimilarity = importedPlaceSignals.includes(place.name.toLowerCase()) ? 1 : 0.4 * jaccard(imported.map((i) => i.category), [place.category]);
      const diversityAdjustment = 1;

      const score =
        0.35 * preferenceMatch +
        0.25 * vibeMatch +
        0.15 * budgetMatch +
        0.15 * sourceQuality +
        0.1 * importedContentSimilarity;

      return {
        place,
        score: Math.max(0, Math.min(1, score * diversityAdjustment)),
        breakdown: { preferenceMatch, vibeMatch, budgetMatch, sourceQuality, importedContentSimilarity, diversityAdjustment },
        why: `Matches your ${place.category} interest and ${place.vibeTags.slice(0, 2).join(", ")} vibe.`
      } satisfies Recommendation;
    })
    .sort((a, b) => b.score - a.score);

  return scored;
}
