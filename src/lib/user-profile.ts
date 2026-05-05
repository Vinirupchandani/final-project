import { TasteVector } from "@/lib/types";

export type UserVisit = {
  userName: string;
  place: string;
  city?: string;
  rating: number;
  tags: string[];
  notes: string;
  createdAt: string;
  rankScore: number;
};

export type UserAccount = {
  userName: string;
  createdAt: string;
};

const ACCOUNT_KEY = "wandr-user-account";
const VISITS_KEY_PREFIX = "wandr-user-visits-";

export function getActiveUserName(): string | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(ACCOUNT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as UserAccount;
    return parsed.userName || null;
  } catch {
    return null;
  }
}

export function setActiveUser(account: UserAccount) {
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
}

export function logoutUser() {
  localStorage.removeItem(ACCOUNT_KEY);
}

export function loadUserVisits(userName: string): UserVisit[] {
  const raw = localStorage.getItem(`${VISITS_KEY_PREFIX}${userName}`);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as UserVisit[];
  } catch {
    return [];
  }
}

export function saveUserVisits(userName: string, visits: UserVisit[]) {
  localStorage.setItem(`${VISITS_KEY_PREFIX}${userName}`, JSON.stringify(visits));
}

export function upsertUserVisit(userName: string, visit: UserVisit) {
  const visits = loadUserVisits(userName);
  const idx = visits.findIndex((v) => v.place.toLowerCase() === visit.place.toLowerCase());
  if (idx >= 0) visits[idx] = visit;
  else visits.push(visit);
  saveUserVisits(userName, visits);
}

export const STARTER_VISITS: UserVisit[] = [
  {
    userName: "Vini Rupchandani",
    place: "Shibuya Crossing",
    city: "Tokyo",
    rating: 5,
    tags: ["urban", "nightlife", "cultural"],
    notes: "loved the energy and chaos",
    createdAt: "",
    rankScore: 1000,
  },
  {
    userName: "Vini Rupchandani",
    place: "Tsukiji Outer Market",
    city: "Tokyo",
    rating: 5,
    tags: ["food", "cultural"],
    notes: "amazing street food and sushi",
    createdAt: "",
    rankScore: 1000,
  },
  {
    userName: "Vini Rupchandani",
    place: "teamLab Planets",
    city: "Tokyo",
    rating: 5,
    tags: ["museum", "immersive", "art"],
    notes: "super unique and interactive",
    createdAt: "",
    rankScore: 1000,
  },
  {
    userName: "Vini Rupchandani",
    place: "Shinjuku Golden Gai",
    city: "Tokyo",
    rating: 4,
    tags: ["bar", "nightlife"],
    notes: "cool vibe, tiny bars",
    createdAt: "",
    rankScore: 1000,
  },
  {
    userName: "Vini Rupchandani",
    place: "Meiji Shrine",
    city: "Tokyo",
    rating: 4,
    tags: ["cultural", "relaxing"],
    notes: "peaceful escape in the city",
    createdAt: "",
    rankScore: 1000,
  },
  {
    userName: "Vini Rupchandani",
    place: "Harajuku Takeshita Street",
    city: "Tokyo",
    rating: 4,
    tags: ["shopping", "cultural"],
    notes: "fun but crowded",
    createdAt: "",
    rankScore: 1000,
  },
  {
    userName: "Vini Rupchandani",
    place: "Roppongi Hills Sky Deck",
    city: "Tokyo",
    rating: 5,
    tags: ["view", "luxury"],
    notes: "best city view at night",
    createdAt: "",
    rankScore: 1000,
  },
  {
    userName: "Vini Rupchandani",
    place: "Ueno Park",
    city: "Tokyo",
    rating: 3,
    tags: ["park", "casual"],
    notes: "nice but not a highlight",
    createdAt: "",
    rankScore: 1000,
  },
  {
    userName: "Vini Rupchandani",
    place: "Akihabara",
    city: "Tokyo",
    rating: 4,
    tags: ["shopping", "tech"],
    notes: "cool for anime and gadgets",
    createdAt: "",
    rankScore: 1000,
  },
  {
    userName: "Vini Rupchandani",
    place: "Omakase Sushi Restaurant",
    city: "Tokyo",
    rating: 5,
    tags: ["restaurant", "luxury", "food"],
    notes: "best meal of the trip",
    createdAt: "",
    rankScore: 1000,
  },
];

export function seedStarterVisitsIfEmpty(userName: string) {
  const existing = loadUserVisits(userName);
  if (existing.length) return;
  const starter = STARTER_VISITS.filter((v) => v.userName === userName).map((v) => ({
    ...v,
    createdAt: new Date().toISOString(),
  }));
  if (starter.length) saveUserVisits(userName, starter);
}

function tokenizeNotes(notes: string): string[] {
  return notes
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w));
}

const STOPWORDS = new Set([
  "this",
  "that",
  "with",
  "from",
  "your",
  "have",
  "been",
  "were",
  "they",
  "them",
  "very",
  "much",
  "best",
  "trip",
]);

export function buildLearnedPreferenceVector(visits: UserVisit[]): TasteVector {
  const vector: TasteVector = {};
  for (const visit of visits) {
    const weight = Math.max(0, Math.min(1, (visit.rating - 1) / 4));
    for (const tag of visit.tags) {
      const key = tag.toLowerCase();
      vector[key] = (vector[key] || 0) + weight * 2;
    }
    for (const token of tokenizeNotes(visit.notes)) {
      vector[token] = (vector[token] || 0) + weight;
    }
  }
  const magnitude = Math.sqrt(Object.values(vector).reduce((sum, v) => sum + v * v, 0)) || 1;
  const normalized: TasteVector = {};
  for (const [k, v] of Object.entries(vector)) normalized[k] = v / magnitude;
  return normalized;
}

export function topLearnedSeeds(vector: TasteVector, limit = 6): string[] {
  return Object.entries(vector)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k]) => k);
}

export function visitsInCity(visits: UserVisit[], city: string): UserVisit[] {
  const c = city.toLowerCase();
  return visits.filter((v) => (v.city || "").toLowerCase() === c);
}

export function tagOverlapScore(tagsA: string[], tagsB: string[]): number {
  const A = new Set(tagsA.map((t) => t.toLowerCase()));
  let score = 0;
  for (const t of tagsB.map((x) => x.toLowerCase())) {
    if (A.has(t)) score += 1;
  }
  return score;
}

export function pickComparisonCandidates(currentTags: string[], visits: UserVisit[], limit = 3): UserVisit[] {
  const scored = visits
    .map((v) => ({ v, s: tagOverlapScore(currentTags, v.tags) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || b.v.rankScore - a.v.rankScore);
  const uniq: UserVisit[] = [];
  for (const item of scored.map((x) => x.v)) {
    if (uniq.some((u) => u.place.toLowerCase() === item.place.toLowerCase())) continue;
    uniq.push(item);
    if (uniq.length >= limit) break;
  }
  return uniq;
}

export function applyPairwisePreference(userName: string, winnerPlace: string, loserPlace: string) {
  const visits = loadUserVisits(userName);
  const winner = visits.find((v) => v.place.toLowerCase() === winnerPlace.toLowerCase());
  const loser = visits.find((v) => v.place.toLowerCase() === loserPlace.toLowerCase());
  if (!winner || !loser) return;
  winner.rankScore += 12;
  loser.rankScore -= 6;
  saveUserVisits(userName, visits);
}
