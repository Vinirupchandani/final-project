import { Place } from "@/lib/types";

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  priceLevel?: "PRICE_LEVEL_FREE" | "PRICE_LEVEL_INEXPENSIVE" | "PRICE_LEVEL_MODERATE" | "PRICE_LEVEL_EXPENSIVE" | "PRICE_LEVEL_VERY_EXPENSIVE";
  rating?: number;
  userRatingCount?: number;
  types?: string[];
  primaryTypeDisplayName?: { text?: string };
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  googleMapsUri?: string;
  websiteUri?: string;
  photos?: Array<{ name?: string }>;
};

const CATEGORY_MAP: Array<{ keyword: string; category: Place["category"] }> = [
  { keyword: "cafe", category: "cafes" },
  { keyword: "coffee", category: "cafes" },
  { keyword: "restaurant", category: "food" },
  { keyword: "meal", category: "food" },
  { keyword: "bar", category: "nightlife" },
  { keyword: "night_club", category: "nightlife" },
  { keyword: "museum", category: "museums" },
  { keyword: "art_gallery", category: "museums" },
  { keyword: "park", category: "nature" },
  { keyword: "garden", category: "nature" },
  { keyword: "store", category: "shopping" },
  { keyword: "shopping_mall", category: "shopping" },
  { keyword: "spa", category: "wellness" },
  { keyword: "tourist_attraction", category: "hidden gems" },
  { keyword: "point_of_interest", category: "local culture" },
];

function inferCategory(types: string[]): Place["category"] {
  const joined = types.join(" ").toLowerCase();
  const hit = CATEGORY_MAP.find((entry) => joined.includes(entry.keyword));
  return hit?.category || "hidden gems";
}

function inferVibes(types: string[], name: string): string[] {
  const text = `${name} ${types.join(" ")}`.toLowerCase();
  const vibes = new Set<string>();
  if (text.includes("museum") || text.includes("historic")) vibes.add("historic");
  if (text.includes("cafe") || text.includes("bakery")) vibes.add("cozy");
  if (text.includes("bar") || text.includes("club")) vibes.add("high-energy");
  if (text.includes("gallery") || text.includes("view") || text.includes("landmark")) vibes.add("aesthetic");
  if (text.includes("local") || text.includes("market")) vibes.add("local");
  if (!vibes.size) vibes.add("walkable");
  return [...vibes];
}

export function inferGoogleDerivedTags(types: string[], name: string): string[] {
  const category = inferCategory(types);
  const vibes = inferVibes(types, name);
  const primaryHints = types
    .map((t) => t.replaceAll("_", " "))
    .filter((t) => !t.startsWith("establishment") && !t.startsWith("point of"))
    .slice(0, 6);
  return uniqueTags([category, ...vibes, ...primaryHints]);
}

function uniqueTags(tags: string[]): string[] {
  return [...new Set(tags.map((t) => t.toLowerCase()))];
}

function mapPrice(level: GooglePlace["priceLevel"]): Place["priceLevel"] {
  if (level === "PRICE_LEVEL_FREE" || level === "PRICE_LEVEL_INEXPENSIVE") return "budget";
  if (level === "PRICE_LEVEL_MODERATE") return "moderate";
  if (level === "PRICE_LEVEL_EXPENSIVE") return "premium";
  if (level === "PRICE_LEVEL_VERY_EXPENSIVE") return "luxury";
  return "moderate";
}

function mapGooglePlace(city: string, p: GooglePlace): Place | null {
  const name = p.displayName?.text;
  const lat = p.location?.latitude;
  const lng = p.location?.longitude;
  if (!name || typeof lat !== "number" || typeof lng !== "number") return null;

  const types = p.types || [];
  const category = inferCategory(types);
  const ratingScore = typeof p.rating === "number" ? Math.min(1, p.rating / 5) : 0.7;
  const popularityScore = typeof p.userRatingCount === "number" ? Math.min(1, p.userRatingCount / 2000) : 0.65;

  return {
    id: `gplace-${p.id || name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name,
    city,
    category,
    vibeTags: inferVibes(types, name),
    priceLevel: mapPrice(p.priceLevel),
    estimatedVisitDurationMins: category === "nightlife" ? 120 : category === "museums" ? 90 : 75,
    neighborhood: "City Area",
    latitude: lat,
    longitude: lng,
    openingHours: p.regularOpeningHours?.weekdayDescriptions?.[0] || "Hours vary",
    sourceCredibilityScore: ratingScore,
    specificityScore: Math.min(1, 0.55 + types.length * 0.05),
    popularityScore,
    description: p.formattedAddress || p.primaryTypeDisplayName?.text || "Popular spot from Google Places.",
    googleRating: typeof p.rating === "number" ? p.rating : undefined,
    googleUserRatingCount: typeof p.userRatingCount === "number" ? p.userRatingCount : undefined,
  };
}

export async function fetchCandidatePlacesFromGoogle(
  city: string,
  interests: string[],
  learnedSeeds: string[] = []
): Promise<Place[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return [];

  const base = interests.map((s) => s.trim()).filter(Boolean).slice(0, 4);
  const seeds = learnedSeeds.map((s) => s.trim()).filter(Boolean).slice(0, 6);

  const queries = new Set<string>();
  const joined = `${base.join(" ")} in ${city}`.trim();
  if (joined) queries.add(joined);

  // Consciously bias Google text search toward learned tags/words (e.g. museum-heavy history).
  for (const seed of seeds) {
    queries.add(`${seed} in ${city}`.trim());
  }

  // If we still have nothing, fall back to a generic city anchor query.
  if (!queries.size) queries.add(`top things to do in ${city}`);

  const deduped = new Map<string, Place>();

  try {
    for (const textQuery of [...queries]) {
      const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": [
            "places.id",
            "places.displayName",
            "places.formattedAddress",
            "places.location",
            "places.priceLevel",
            "places.rating",
            "places.userRatingCount",
            "places.types",
            "places.primaryTypeDisplayName",
            "places.regularOpeningHours.weekdayDescriptions",
            "places.googleMapsUri",
            "places.websiteUri",
            "places.photos.name",
          ].join(","),
        },
        body: JSON.stringify({ textQuery, maxResultCount: 14, languageCode: "en" }),
        cache: "no-store",
      });

      if (!response.ok) continue;
      const data = (await response.json()) as { places?: GooglePlace[] };
      const mapped = (data.places || []).map((p) => mapGooglePlace(city, p)).filter(Boolean) as Place[];
      for (const place of mapped) deduped.set(place.name.toLowerCase(), place);
    }

    return [...deduped.values()];
  } catch {
    return [];
  }
}

export type GooglePlaceDetails = {
  address?: string;
  latitude?: number;
  longitude?: number;
  mapLink?: string;
  websiteLink?: string;
  rating?: number;
  derivedTags: string[];
  photoUrls: string[];
};

export async function fetchGooglePlaceDetails(query: string): Promise<GooglePlaceDetails | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": [
          "places.displayName",
          "places.formattedAddress",
          "places.location",
          "places.rating",
          "places.types",
          "places.googleMapsUri",
          "places.websiteUri",
          "places.photos.name",
        ].join(","),
      },
      body: JSON.stringify({ textQuery: query, maxResultCount: 1, languageCode: "en" }),
      cache: "no-store",
    });

    if (!response.ok) return null;
    const data = (await response.json()) as { places?: GooglePlace[] };
    const place = data.places?.[0];
    if (!place) return null;

    const photoUrls = (place.photos || [])
      .slice(0, 6)
      .map((photo) => photo.name)
      .filter(Boolean)
      .map((photoName) => {
        return `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=900&maxWidthPx=1200&key=${apiKey}`;
      });

    const name = place.displayName?.text || "";
    const derivedTags = inferGoogleDerivedTags(place.types || [], name);

    return {
      address: place.formattedAddress,
      latitude: place.location?.latitude,
      longitude: place.location?.longitude,
      mapLink: place.googleMapsUri,
      websiteLink: place.websiteUri,
      rating: place.rating,
      derivedTags,
      photoUrls,
    };
  } catch {
    return null;
  }
}

export type GooglePlaceSearchResult = {
  name: string;
  address: string;
  city: string;
};

export async function searchGooglePlacesByText(query: string, maxResultCount = 10): Promise<GooglePlaceSearchResult[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey || !query.trim()) return [];

  try {
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": [
          "places.displayName",
          "places.formattedAddress",
        ].join(","),
      },
      body: JSON.stringify({ textQuery: query.trim(), maxResultCount, languageCode: "en" }),
      cache: "no-store",
    });
    if (!response.ok) return [];
    const data = (await response.json()) as { places?: GooglePlace[] };
    return (data.places || [])
      .map((place) => {
        const name = place.displayName?.text?.trim();
        const address = place.formattedAddress?.trim() || "";
        if (!name) return null;
        const city = address.split(",").map((part) => part.trim()).find(Boolean) || "";
        return { name, address, city } satisfies GooglePlaceSearchResult;
      })
      .filter(Boolean) as GooglePlaceSearchResult[];
  } catch {
    return [];
  }
}
