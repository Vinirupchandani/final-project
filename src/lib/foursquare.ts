import { Place } from "@/lib/types";

type FoursquarePlace = {
  fsq_id: string;
  name: string;
  location?: {
    locality?: string;
    neighborhood?: string[];
    formatted_address?: string;
  };
  geocodes?: {
    main?: {
      latitude?: number;
      longitude?: number;
    };
  };
  categories?: Array<{ name: string }>;
  rating?: number;
  popularity?: number;
  price?: number;
  description?: string;
  hours?: {
    display?: string;
  };
};

const CATEGORY_MAP: Array<{ keyword: string; category: Place["category"] }> = [
  { keyword: "coffee", category: "cafes" },
  { keyword: "cafe", category: "cafes" },
  { keyword: "restaurant", category: "food" },
  { keyword: "food", category: "food" },
  { keyword: "bar", category: "nightlife" },
  { keyword: "club", category: "nightlife" },
  { keyword: "museum", category: "museums" },
  { keyword: "gallery", category: "museums" },
  { keyword: "park", category: "nature" },
  { keyword: "garden", category: "nature" },
  { keyword: "shop", category: "shopping" },
  { keyword: "mall", category: "shopping" },
  { keyword: "spa", category: "wellness" },
  { keyword: "temple", category: "local culture" },
  { keyword: "historic", category: "local culture" },
];

function inferCategory(name: string, rawCategories: string[]): Place["category"] {
  const haystack = `${name} ${rawCategories.join(" ")}`.toLowerCase();
  const hit = CATEGORY_MAP.find((entry) => haystack.includes(entry.keyword));
  return hit?.category || "hidden gems";
}

function inferVibes(name: string, rawCategories: string[]): string[] {
  const text = `${name} ${rawCategories.join(" ")}`.toLowerCase();
  const vibes = new Set<string>();
  if (text.includes("historic") || text.includes("museum") || text.includes("temple")) vibes.add("historic");
  if (text.includes("cafe") || text.includes("garden") || text.includes("book")) vibes.add("cozy");
  if (text.includes("bar") || text.includes("club") || text.includes("market")) vibes.add("high-energy");
  if (text.includes("gallery") || text.includes("design") || text.includes("view")) vibes.add("aesthetic");
  if (text.includes("local") || text.includes("street")) vibes.add("local");
  if (!vibes.size) vibes.add("walkable");
  return [...vibes];
}

function mapFoursquarePriceToBudget(price?: number): Place["priceLevel"] {
  if (price === 1) return "budget";
  if (price === 2) return "moderate";
  if (price === 3) return "premium";
  if (price === 4) return "luxury";
  return "moderate";
}

function toPlace(city: string, p: FoursquarePlace): Place | null {
  const latitude = p.geocodes?.main?.latitude;
  const longitude = p.geocodes?.main?.longitude;
  if (typeof latitude !== "number" || typeof longitude !== "number") return null;
  const rawCategories = (p.categories || []).map((c) => c.name);
  const category = inferCategory(p.name, rawCategories);

  return {
    id: `fsq-${p.fsq_id}`,
    name: p.name,
    city: p.location?.locality || city,
    category,
    vibeTags: inferVibes(p.name, rawCategories),
    priceLevel: mapFoursquarePriceToBudget(p.price),
    estimatedVisitDurationMins: category === "nightlife" ? 120 : category === "museums" ? 90 : 75,
    neighborhood: p.location?.neighborhood?.[0] || "City Center",
    latitude,
    longitude,
    openingHours: p.hours?.display || "Hours vary",
    sourceCredibilityScore: typeof p.rating === "number" ? Math.min(1, p.rating / 10) : 0.7,
    specificityScore: Math.min(1, 0.55 + (rawCategories.length * 0.08)),
    popularityScore: typeof p.popularity === "number" ? Math.min(1, p.popularity / 100) : 0.65,
    description: p.description || p.location?.formatted_address || "Popular local stop discovered from Foursquare.",
  };
}

export async function fetchCandidatePlacesFromFoursquare(city: string, interests: string[]): Promise<Place[]> {
  const apiKey = process.env.FOURSQUARE_API_KEY;
  if (!apiKey) return [];

  const interestQuery = interests.slice(0, 4).join(" ");
  const query = encodeURIComponent(`${city} ${interestQuery}`.trim());
  try {
    const response = await fetch(
      `https://api.foursquare.com/v3/places/search?query=${query}&near=${encodeURIComponent(city)}&limit=40&sort=POPULARITY`,
      { headers: { Authorization: apiKey, Accept: "application/json" }, cache: "no-store" }
    );
    if (!response.ok) return [];
    const data = (await response.json()) as { results?: FoursquarePlace[] };
    const mapped = (data.results || []).map((p) => toPlace(city, p)).filter(Boolean) as Place[];
    const deduped = new Map<string, Place>();
    for (const place of mapped) deduped.set(place.name.toLowerCase(), place);
    return [...deduped.values()];
  } catch {
    return [];
  }
}

export async function enrichWithFoursquare(places: Place[], city: string): Promise<Place[]> {
  const apiKey = process.env.FOURSQUARE_API_KEY;
  if (!apiKey || !places.length) return places;

  const cityLower = city.toLowerCase();
  const enriched = await Promise.all(
    places.map(async (place) => {
      try {
        const query = encodeURIComponent(`${place.name} ${cityLower}`);
        const response = await fetch(`https://api.foursquare.com/v3/places/search?query=${query}&limit=1`, {
          headers: { Authorization: apiKey, Accept: "application/json" },
          cache: "no-store",
        });
        if (!response.ok) return place;
        const data = (await response.json()) as { results?: Array<{ popularity?: number; rating?: number }> };
        const top = data.results?.[0];
        if (!top) return place;
        const popularityNorm = typeof top.popularity === "number" ? Math.min(1, top.popularity / 100) : place.popularityScore;
        const ratingNorm = typeof top.rating === "number" ? Math.min(1, top.rating / 10) : place.sourceCredibilityScore;
        return {
          ...place,
          popularityScore: (place.popularityScore + popularityNorm) / 2,
          sourceCredibilityScore: (place.sourceCredibilityScore + ratingNorm) / 2,
        };
      } catch {
        return place;
      }
    })
  );

  return enriched;
}
