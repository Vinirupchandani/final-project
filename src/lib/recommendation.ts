import {
  ExternalRecEmbeddingContext,
  ItineraryItem,
  LandmarkRecommendation,
  OnboardingQuizInput,
  Place,
  PreferenceTag,
  RecommendationInsight,
  SimilarFriend,
  TasteVector,
} from "@/lib/types";
import { cosineDense } from "@/lib/embeddings";
import { loadDatasetRows, normalizeRating01 } from "@/lib/parser";
import {
  ADVENTURE_TAGS,
  getPreferenceMatchScore,
  getPrimaryPreferenceForRecommendation,
} from "@/lib/recommendation-categories";

// TODO: Replace static CSV ingestion with live Foursquare/Places API signals.
// TODO: Add graph-based friend relationships once real friend data exists.
// TODO: Swap hand-built vectors for learned embeddings when enough interactions are collected.

type LandmarkStats = {
  ratings: number[];
  tags: string[];
  notes: Array<{ friend: string; rating: number; notes: string }>;
  recencyOrders: number[];
};

const MEAL_TAGS = new Set(["food", "restaurant", "cafe"]);
const CHILL_TAGS = new Set(["view", "pool", "luxury", "museum", "cultural", "chill"]);

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function uniqueTags(tags: string[]): string[] {
  return [...new Set(tags.map((tag) => tag.toLowerCase()))];
}

function calculateTagMatch(tags: string[], userPreferences: string[]): number {
  if (!userPreferences.length) return 0.4;
  const tagSet = new Set(tags);
  const overlap = userPreferences.filter((pref) => tagSet.has(pref)).length;
  return overlap / userPreferences.length;
}

function learnedOverlap(tags: string[], learned: TasteVector | undefined): number {
  if (!learned) return 0;
  let sum = 0;
  for (const tag of tags.map((t) => t.toLowerCase())) {
    sum += learned[tag] || 0;
  }
  // Notes-derived tokens can also overlap category-ish tags occasionally; keep it light.
  return Math.max(0, Math.min(1, sum));
}

export type RecommendExternalOptions = {
  learned?: TasteVector;
  embeddings?: ExternalRecEmbeddingContext | null;
  userVisitCount?: number;
};

function applyEmbeddingMmr(
  ranked: LandmarkRecommendation[],
  placeEmbeddings: Record<string, number[]> | undefined,
  limit: number,
  lambda: number
): LandmarkRecommendation[] {
  if (!placeEmbeddings || ranked.length <= limit) return ranked.slice(0, limit);

  const vec = (rec: LandmarkRecommendation) => placeEmbeddings[rec.landmark.toLowerCase()];
  const pool = [...ranked];
  const selected: LandmarkRecommendation[] = [];

  while (selected.length < limit && pool.length) {
    let bestIdx = 0;
    let bestMmr = -Infinity;
    for (let i = 0; i < pool.length; i += 1) {
      const candidate = pool[i];
      const v = vec(candidate);
      let maxSim = 0;
      if (v) {
        for (const s of selected) {
          const vs = vec(s);
          if (vs) maxSim = Math.max(maxSim, cosineDense(v, vs));
        }
      }
      const mmr = v ? candidate.score - lambda * maxSim : candidate.score;
      if (mmr > bestMmr) {
        bestMmr = mmr;
        bestIdx = i;
      }
    }
    selected.push(pool[bestIdx]);
    pool.splice(bestIdx, 1);
  }

  return selected;
}

export function balanceRecommendationsByPreferences(
  recommendations: LandmarkRecommendation[],
  preferences: PreferenceTag[],
  limit: number
): LandmarkRecommendation[] {
  if (preferences.length <= 1) return recommendations.slice(0, limit);

  const picked: LandmarkRecommendation[] = [];
  const seen = new Set<string>();
  const keyOf = (rec: LandmarkRecommendation) => rec.landmark.toLowerCase();

  const groups = new Map<PreferenceTag, LandmarkRecommendation[]>();
  for (const preference of preferences) {
    const bucket = recommendations
      .map((rec) => ({
        rec,
        score: getPreferenceMatchScore(rec.tags, preference, rec.landmark),
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || b.rec.score - a.rec.score)
      .map((x) => x.rec);
    groups.set(preference, bucket);
  }

  // Strictly guarantee one rec per selected preference when any candidate exists for that preference.
  for (const preference of preferences) {
    const bucket = groups.get(preference) || [];
    const candidate = bucket.find((item) => !seen.has(keyOf(item)));
    if (!candidate) continue;
    picked.push(candidate);
    seen.add(keyOf(candidate));
    if (picked.length >= limit) return picked.slice(0, limit);
  }

  let guard = 0;
  while (picked.length < limit && guard < 200) {
    guard += 1;
    let added = false;
    for (const preference of preferences) {
      const bucket = groups.get(preference) || [];
      const candidate = bucket.shift();
      if (!candidate) continue;
      if (seen.has(keyOf(candidate))) continue;
      picked.push(candidate);
      seen.add(keyOf(candidate));
      added = true;
      if (picked.length >= limit) break;
    }
    if (!added) break;
  }

  if (picked.length < limit) {
    for (const rec of recommendations) {
      if (seen.has(keyOf(rec))) continue;
      picked.push(rec);
      seen.add(keyOf(rec));
      if (picked.length >= limit) break;
    }
  }

  return picked;
}

function buildLandmarkIndex() {
  const rows = loadDatasetRows();
  const byLandmark: Record<string, LandmarkStats> = {};
  for (const row of rows) {
    if (!byLandmark[row.landmark]) {
      byLandmark[row.landmark] = { ratings: [], tags: [], notes: [], recencyOrders: [] };
    }
    byLandmark[row.landmark].ratings.push(row.rating);
    byLandmark[row.landmark].tags.push(...row.tags);
    byLandmark[row.landmark].recencyOrders.push(row.recencyOrder || 0);
    byLandmark[row.landmark].notes.push({
      friend: row.friend_name,
      rating: row.rating,
      notes: row.notes,
    });
  }
  return byLandmark;
}

function pickInsight(notes: Array<{ friend: string; rating: number; notes: string }>, similarFriends: SimilarFriend[]): RecommendationInsight[] {
  const allowed = new Set(similarFriends.map((friend) => friend.friendName));
  return notes
    .filter((entry) => allowed.has(entry.friend) && entry.rating >= 4)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 3)
    .map((entry) => ({
      friendName: entry.friend,
      rating: entry.rating,
      notes: entry.notes,
    }));
}

export function recommendLandmarks(
  input: OnboardingQuizInput,
  similarFriends: SimilarFriend[],
  limit = 8
): LandmarkRecommendation[] {
  const rows = loadDatasetRows();
  const byLandmark = buildLandmarkIndex();
  const globalAverage = average(rows.map((row) => normalizeRating01(row.rating)));
  const maxRecency = Math.max(...rows.map((row) => row.recencyOrder || 0), 1);
  const similarityMap = new Map(similarFriends.map((friend) => [friend.friendName, friend.similarity]));

  const recommendations = Object.entries(byLandmark).map(([landmark, stats]) => {
    const similarRatings = rows
      .filter((row) => row.landmark === landmark && similarityMap.has(row.friend_name))
      .map((row) => ({ score: normalizeRating01(row.rating), sim: similarityMap.get(row.friend_name) || 0 }));

    const weightedSimilarAverage = similarRatings.length
      ? similarRatings.reduce((sum, item) => sum + item.score * item.sim, 0) /
        (similarRatings.reduce((sum, item) => sum + item.sim, 0) || 1)
      : 0;

    const tagList = uniqueTags(stats.tags);
    const tagMatch = calculateTagMatch(tagList, input.preferences);
    const normalizedGlobal = average(stats.ratings.map((r) => normalizeRating01(r)));
    const recencyScore = average(stats.recencyOrders) / maxRecency;

    const score = 0.45 * weightedSimilarAverage + 0.28 * normalizedGlobal + 0.2 * tagMatch + 0.07 * recencyScore;
    const lovedBy = pickInsight(stats.notes, similarFriends);

    return {
      landmark,
      score,
      averageSimilarRating: weightedSimilarAverage,
      globalAverageRating: normalizedGlobal || globalAverage,
      tagMatch,
      tags: tagList,
      averageRating: average(stats.ratings),
      ratingSource: "friends",
      whyRecommended: `${lovedBy.length || 1} people like you rated this highly and it matches your ${input.preferences.slice(0, 2).join(", ")} interests.`,
      lovedByCount: lovedBy.length,
      lovedBy,
    } satisfies LandmarkRecommendation;
  });

  return recommendations.sort((a, b) => b.score - a.score).slice(0, limit);
}

export function getExpertTravelerPicks(
  input: OnboardingQuizInput,
  existing: LandmarkRecommendation[],
  limit = 4,
  opts?: { learned?: TasteVector; userVisits?: Array<{ place: string; city?: string; rating: number; tags: string[]; notes: string }> }
): LandmarkRecommendation[] {
  const destinationCity = (input.destinationCity || "Dubai").trim();
  const lowerDest = destinationCity.toLowerCase();

  const rows = loadDatasetRows();
  const existingSet = new Set(existing.map((item) => item.landmark.toLowerCase()));

  const friendStats = new Map<string, { count: number; avg: number; ratings: number[] }>();
  for (const row of rows) {
    if (!friendStats.has(row.friend_name)) {
      friendStats.set(row.friend_name, { count: 0, avg: 0, ratings: [] });
    }
    const stats = friendStats.get(row.friend_name)!;
    stats.count += 1;
    stats.ratings.push(row.rating);
  }
  for (const [, stats] of friendStats) {
    stats.avg = average(stats.ratings);
  }

  const experts = [...friendStats.entries()]
    .sort((a, b) => b[1].avg * b[1].count - a[1].avg * a[1].count)
    .slice(0, 8)
    .map(([name]) => name);

  // For non-Dubai destinations, the static dataset is Dubai-centric; avoid surfacing misleading "expert" picks.
  // Prefer picks grounded in the user's own visit history for that city (or globally if none exist yet).
  if (lowerDest !== "dubai") {
    const visits = opts?.userVisits || [];
    const inCity = visits.filter((v) => (v.city || "").toLowerCase() === lowerDest);
    const pool = inCity.length ? inCity : visits;

    const learned = opts?.learned;
    const ranked = pool
      .map((v) => {
        const tags = uniqueTags(v.tags);
        const prefMatch = calculateTagMatch(tags, input.preferences);
        const learn = learnedOverlap(tags, learned);
        const score = 0.55 * normalizeRating01(v.rating) + 0.25 * prefMatch + 0.2 * learn;
        return { v, score, tags };
      })
      .filter((x) => !existingSet.has(x.v.place.toLowerCase()))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    if (!ranked.length) return [];

    return ranked.map(({ v, score, tags }) => ({
      landmark: v.place,
      score,
      averageSimilarRating: normalizeRating01(v.rating),
      globalAverageRating: normalizeRating01(v.rating),
      tagMatch: calculateTagMatch(tags, input.preferences),
      tags,
      averageRating: v.rating,
      ratingSource: "friends",
      whyRecommended: inCity.length
        ? `Grounded in your own ratings from ${destinationCity} (tag overlap + stars).`
        : `Grounded in your own ratings from past trips (we do not have many ratings for ${destinationCity} in your history yet).`,
      lovedByCount: 1,
      lovedBy: [{ friendName: "You", rating: v.rating, notes: v.notes }],
    }));
  }

  const picks = rows
    .filter((row) => experts.includes(row.friend_name))
    .filter((row) => !existingSet.has(row.landmark.toLowerCase()))
    .filter((row) => row.tags.some((tag) => input.preferences.includes(tag as never)))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, limit)
    .map((row) => ({
      landmark: row.landmark,
      score: normalizeRating01(row.rating),
      averageSimilarRating: normalizeRating01(row.rating),
      globalAverageRating: normalizeRating01(row.rating),
      tagMatch: 1,
      tags: row.tags,
      averageRating: row.rating,
      ratingSource: "friends",
      whyRecommended: `Expert traveler ${row.friend_name} highlighted this spot.`,
      lovedByCount: 1,
      lovedBy: [{ friendName: row.friend_name, rating: row.rating, notes: row.notes }],
    } satisfies LandmarkRecommendation));

  return picks;
}

export function recommendExternalPlaces(
  input: OnboardingQuizInput,
  similarFriends: SimilarFriend[],
  places: Place[],
  limit = 10,
  options?: RecommendExternalOptions
): LandmarkRecommendation[] {
  const learned = options?.learned;
  const emb = options?.embeddings || undefined;
  const visitN = options?.userVisitCount ?? 0;

  const rows = loadDatasetRows();
  const similarityStrength =
    similarFriends.slice(0, 10).reduce((sum, friend) => sum + friend.similarity, 0) / Math.max(1, similarFriends.length);
  const priorFromFriends = Math.max(0.45, Math.min(0.85, 0.55 + similarityStrength * 0.35));
  const globalAverage = average(rows.map((row) => normalizeRating01(row.rating)));
  const visitStrength = Math.min(1, visitN / 12);
  const topFriendSim = similarFriends[0]?.similarity ?? 0;

  const scored = places.map((place) => {
    const tags = uniqueTags([place.category, ...place.vibeTags]);
    const tagMatch = calculateTagMatch(tags, input.preferences);
    const learn = learnedOverlap(tags, learned);
    const normalizedGlobal = Math.max(globalAverage, place.sourceCredibilityScore * 0.85 + place.popularityScore * 0.15);
    const averageSimilarRating = priorFromFriends * tagMatch;

    const googlePop =
      typeof place.googleRating === "number"
        ? Math.min(1, place.googleRating / 5) * 0.62 + place.popularityScore * 0.38
        : place.sourceCredibilityScore * 0.65 + place.popularityScore * 0.35;

    const placeKey = place.name.toLowerCase();
    const placeVec = emb?.placeByKey[placeKey];

    let contentSim = 0;
    let socialNorm = 0;
    if (emb && placeVec && emb.user.length) {
      contentSim = Math.max(0, cosineDense(emb.user, placeVec));
      let numer = 0;
      let denom = 0;
      for (const f of similarFriends.slice(0, 8)) {
        const fv = emb.friendByName[f.friendName];
        if (!fv) continue;
        const c = Math.max(0, cosineDense(fv, placeVec));
        numer += f.similarity * c;
        denom += f.similarity;
      }
      socialNorm = denom > 0 ? numer / denom : 0;
    }

    const hasEmb = Boolean(emb && placeVec && emb.user.length);

    let score: number;
    if (hasEmb) {
      const wContent = 0.3 + 0.14 * visitStrength;
      const wSocial = 0.12 + 0.14 * (1 - visitStrength * 0.55) * topFriendSim;
      const wTag = 0.1;
      const wLearn = 0.1 + 0.12 * visitStrength;
      const wGoogle = 0.26;
      const wSpec = 0.06;
      score =
        wContent * contentSim +
        wSocial * socialNorm +
        wTag * tagMatch +
        wLearn * learn +
        wGoogle * googlePop +
        wSpec * place.specificityScore;
    } else {
      score = 0.46 * averageSimilarRating + 0.26 * normalizedGlobal + 0.18 * tagMatch + 0.1 * learn;
    }

    const hasGoogle = typeof place.googleRating === "number" && !Number.isNaN(place.googleRating);
    const displayStars = hasGoogle
      ? place.googleRating!
      : Number((googlePop * 4 + 1).toFixed(1));

    const whyRecommended = hasEmb
      ? `Hybrid rank for ${input.destinationCity || "this city"}: content match vs your profile (${Math.round(
          contentSim * 100
        )}%), similar-friend taste alignment (${Math.round(socialNorm * 100)}%), quiz tag fit (${Math.round(
          tagMatch * 100
        )}%), your history signals (${Math.round(learn * 100)}%), and place quality (${Math.round(googlePop * 100)}%).`
      : `No direct friend ratings in ${input.destinationCity || "this city"} yet, so we used friend taste similarity, your preference match (${Math.round(
          tagMatch * 100
        )}%), and your learned tag signals (${Math.round(learn * 100)}%).`;

    return {
      landmark: place.name,
      score,
      averageSimilarRating,
      globalAverageRating: normalizedGlobal,
      tagMatch,
      tags,
      averageRating: displayStars,
      ratingSource: hasGoogle ? ("google" as const) : ("google_estimate" as const),
      googleRating: hasGoogle ? place.googleRating : undefined,
      googleReviewCount: place.googleUserRatingCount,
      whyRecommended,
      lovedByCount: 0,
      lovedBy: [],
    } satisfies LandmarkRecommendation;
  });

  const sorted = scored.sort((a, b) => b.score - a.score);
  const pool = Math.max(limit * 3, 24);
  return applyEmbeddingMmr(sorted.slice(0, pool), emb?.placeByKey, limit, 0.38);
}

function classifyCategory(tags: string[]): "food" | "activity" | "chill" {
  if (tags.some((tag) => MEAL_TAGS.has(tag))) return "food";
  if (tags.some((tag) => ADVENTURE_TAGS.has(tag))) return "activity";
  if (tags.some((tag) => CHILL_TAGS.has(tag))) return "chill";
  return "activity";
}

export function buildDiverseItinerary(days: 1 | 2 | 3, recommendations: LandmarkRecommendation[]) {
  const total = Math.min(recommendations.length, days * 3);
  const selected: LandmarkRecommendation[] = [];

  for (const candidate of recommendations) {
    if (selected.length >= total) break;
    const previous = selected[selected.length - 1];
    if (previous && classifyCategory(previous.tags) === classifyCategory(candidate.tags)) {
      const alternative = recommendations.find((option) => {
        if (selected.includes(option)) return false;
        return classifyCategory(option.tags) !== classifyCategory(previous.tags);
      });
      if (alternative && !selected.includes(alternative)) {
        selected.push(alternative);
      } else {
        selected.push(candidate);
      }
      continue;
    }
    selected.push(candidate);
  }

  while (selected.length < total) {
    const fallback = recommendations.find((option) => !selected.includes(option));
    if (!fallback) break;
    selected.push(fallback);
  }

  const result: Array<{ day: number; places: ItineraryItem[] }> = [];
  for (let day = 1; day <= days; day += 1) {
    const dayItems = selected.slice((day - 1) * 3, day * 3).map((rec) => ({
      landmark: rec.landmark,
      tags: rec.tags,
      averageRating: rec.averageRating,
      why: rec.whyRecommended,
      lovedBy: rec.lovedBy,
      ratingSource: rec.ratingSource,
      googleReviewCount: rec.googleReviewCount,
    }));
    result.push({ day, places: dayItems });
  }
  return result;
}
