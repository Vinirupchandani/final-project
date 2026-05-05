import OpenAI from "openai";
import { loadDatasetRows } from "@/lib/parser";
import type {
  ExternalRecEmbeddingContext,
  OnboardingQuizInput,
  Place,
  SimilarFriend,
  UserVisitDTO,
} from "@/lib/types";

const MODEL = "text-embedding-3-small";

function clip(text: string, maxChars: number) {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars);
}

export function cosineDense(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom > 0 ? dot / denom : 0;
}

async function embedAll(client: OpenAI, inputs: string[]): Promise<number[][]> {
  const out: number[][] = [];
  const batchSize = 24;
  for (let i = 0; i < inputs.length; i += batchSize) {
    const slice = inputs.slice(i, i + batchSize).map((t) => clip(t, 7500));
    const res = await client.embeddings.create({ model: MODEL, input: slice });
    const rows = [...res.data].sort((x, y) => x.index - y.index);
    for (const row of rows) out.push(row.embedding);
  }
  return out;
}

export function buildPlaceEmbeddingText(place: Place): string {
  const ratingLine =
    typeof place.googleRating === "number"
      ? `Public rating about ${place.googleRating.toFixed(1)} / 5 from many reviewers.`
      : "";
  const countLine =
    typeof place.googleUserRatingCount === "number" ? `Review count ~${place.googleUserRatingCount}.` : "";
  return clip(
    [
      `Place: ${place.name}`,
      `City: ${place.city}`,
      `Category: ${place.category}`,
      `Vibe tags: ${place.vibeTags.join(", ")}`,
      `Price level: ${place.priceLevel}`,
      ratingLine,
      countLine,
      `Description: ${place.description}`,
    ]
      .filter(Boolean)
      .join("\n"),
    7500
  );
}

export function buildUserPreferenceEmbeddingText(
  quiz: OnboardingQuizInput,
  destinationCity: string,
  visits: UserVisitDTO[]
): string {
  const quizBlock = [
    `Trip to ${destinationCity}.`,
    `Travel type: ${quiz.travelType}.`,
    `Budget: ${quiz.budget}.`,
    `Trip length (days in app): ${quiz.tripDays}.`,
    `Stated preference tags: ${quiz.preferences.join(", ")}.`,
  ].join(" ");

  const visitBlock = visits
    .slice(0, 45)
    .map(
      (v) =>
        `${v.place} in ${v.city || "unknown city"}: ${v.rating}/5. Tags: ${v.tags.join(", ")}. Notes: ${v.notes}`
    )
    .join("\n");

  return clip(
    `User taste profile for personalized travel recommendations.\n${quizBlock}\n\nPast places and experiences:\n${visitBlock}`,
    7500
  );
}

export function buildFriendTasteEmbeddingText(friendName: string): string {
  const rows = loadDatasetRows()
    .filter((row) => row.friend_name === friendName)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 35);

  if (!rows.length) {
    return clip(`Traveler named ${friendName} enjoys city experiences and food.`, 7500);
  }

  const lines = rows.map(
    (r) => `${r.landmark} (${r.rating}/5). Tags: ${r.tags.join(", ")}. Notes: ${r.notes}`
  );
  return clip(`Taste profile for traveler ${friendName}:\n${lines.join("\n")}`, 7500);
}

/**
 * One shared embedding space (OpenAI text-embedding-3-small) for user, similar friends, and candidate places.
 * Used for hybrid content + collaborative-style scoring on non-dataset cities.
 */
export async function buildExternalRecommendationEmbeddings(
  quiz: OnboardingQuizInput,
  destinationCity: string,
  userVisits: UserVisitDTO[],
  places: Place[],
  topFriends: SimilarFriend[]
): Promise<ExternalRecEmbeddingContext | null> {
  if (!process.env.OPENAI_API_KEY || !places.length) return null;

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const userText = buildUserPreferenceEmbeddingText(quiz, destinationCity, userVisits);
  const friendNames = [...new Set(topFriends.slice(0, 6).map((f) => f.friendName))];
  const friendTexts = friendNames.map((name) => buildFriendTasteEmbeddingText(name));
  const placeTexts = places.map((p) => buildPlaceEmbeddingText(p));

  const inputs = [userText, ...friendTexts, ...placeTexts];
  if (!inputs[0]?.trim()) return null;

  try {
    const vectors = await embedAll(client, inputs);
    const user = vectors[0];
    const friendByName: Record<string, number[]> = {};
    friendNames.forEach((name, idx) => {
      friendByName[name] = vectors[1 + idx];
    });
    const startPlaces = 1 + friendNames.length;
    const placeByKey: Record<string, number[]> = {};
    places.forEach((p, idx) => {
      placeByKey[p.name.toLowerCase()] = vectors[startPlaces + idx];
    });
    return { user, friendByName, placeByKey };
  } catch {
    return null;
  }
}
