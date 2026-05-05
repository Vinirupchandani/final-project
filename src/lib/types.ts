export type BudgetLevel = "budget" | "moderate" | "premium" | "luxury";
export type TripPace = "packed" | "balanced" | "slow";

export type AIQuizSignals = {
  planningStyle: "planner" | "spontaneous" | "mix";
  socialEnergy: "quiet" | "social" | "mixed";
  foodComfort: "familiar" | "adventurous" | "mixed";
  discoveryStyle: "iconic" | "hidden gems" | "mixed";
  perfectDayVibes: string[];
};

export type QuizInput = {
  destinationCity: string;
  tripLengthDays: number;
  budget: BudgetLevel;
  travelStyle: "solo" | "couple" | "friends" | "family";
  pace: TripPace;
  interests: string[];
  constraints: string;
  aiSignals: AIQuizSignals;
};

export type ImportedContentInput = {
  url: string;
  title: string;
  places: string[];
  city: string;
  category: string;
  vibeTags: string[];
  priceLevel: BudgetLevel;
  sourceType: "tiktok" | "instagram" | "blog" | "friend_list" | "other";
  rawText?: string;
};

export type UserTasteProfile = {
  categoryWeights: Record<string, number>;
  vibeWeights: Record<string, number>;
  topCategories: Array<{ key: string; pct: number }>;
  topVibes: Array<{ key: string; pct: number }>;
};

export type Place = {
  id: string;
  name: string;
  city: string;
  category: string;
  vibeTags: string[];
  priceLevel: BudgetLevel;
  estimatedVisitDurationMins: number;
  neighborhood: string;
  latitude: number;
  longitude: number;
  openingHours: string;
  sourceCredibilityScore: number;
  specificityScore: number;
  popularityScore: number;
  description: string;
  /** Google Places aggregate star rating when returned by the API (1–5). */
  googleRating?: number;
  googleUserRatingCount?: number;
};

export type Recommendation = {
  place: Place;
  score: number;
  breakdown: {
    preferenceMatch: number;
    vibeMatch: number;
    budgetMatch: number;
    sourceQuality: number;
    importedContentSimilarity: number;
    diversityAdjustment: number;
  };
  why: string;
};

export type ItineraryStop = {
  day: number;
  order: number;
  timeWindow: "morning" | "afternoon" | "evening";
  recommendation: Recommendation;
};

export type TripResult = {
  tripId: string;
  quiz: QuizInput;
  importedContent: ImportedContentInput[];
  tasteProfile: UserTasteProfile;
  recommendations: Recommendation[];
  itinerary: ItineraryStop[];
  confidenceScore: number;
  dataSource: "google_places_live" | "seed_city" | "imported_content_fallback";
  notices?: string[];
  sourceBreakdown: {
    importedContent: number;
    quizAnswers: number;
    curatedDatabase: number;
  };
};

export type TravelType = "solo" | "friends" | "date";
export type BudgetBucket = "low" | "medium" | "high";
export type PreferenceTag = "luxury" | "food" | "adventure" | "culture" | "nightlife";

export type OnboardingQuizInput = {
  destinationCity?: string;
  travelType: TravelType;
  preferences: PreferenceTag[];
  budget: BudgetBucket;
  tripDays: 1 | 2 | 3;
};

export type UserVisitDTO = {
  userName: string;
  place: string;
  city?: string;
  rating: number;
  tags: string[];
  notes: string;
  createdAt: string;
  rankScore: number;
};

export type RecommendRequestBody = OnboardingQuizInput & {
  userVisits?: UserVisitDTO[];
  learnedSeeds?: string[];
};

export type TasteVector = Record<string, number>;

export type DatasetRow = {
  friend_name: string;
  landmark: string;
  rating: number;
  tags: string[];
  notes: string;
  recencyOrder?: number;
};

export type SimilarFriend = {
  friendName: string;
  similarity: number;
};

export type RecommendationInsight = {
  friendName: string;
  rating: number;
  notes: string;
};

export type LandmarkRecommendation = {
  landmark: string;
  score: number;
  aiBoost?: number;
  aiWhy?: string;
  averageSimilarRating: number;
  globalAverageRating: number;
  tagMatch: number;
  tags: string[];
  averageRating: number;
  /** What `averageRating` represents in the UI (dataset friends vs Google vs model estimate). */
  ratingSource?: "friends" | "google" | "google_estimate";
  googleRating?: number;
  googleReviewCount?: number;
  whyRecommended: string;
  lovedByCount: number;
  lovedBy: RecommendationInsight[];
};

/** Dense vectors for hybrid embedding rank (same model for user, friends, places). */
export type ExternalRecEmbeddingContext = {
  user: number[];
  friendByName: Record<string, number[]>;
  placeByKey: Record<string, number[]>;
};

export type ItineraryItem = {
  landmark: string;
  tags: string[];
  averageRating: number;
  why: string;
  lovedBy: RecommendationInsight[];
  ratingSource?: LandmarkRecommendation["ratingSource"];
  googleReviewCount?: number;
};

export type DestinationFriendRating = {
  friendName: string;
  rating: number;
  tags: string[];
  notes: string;
};

export type DestinationDetails = {
  landmark: string;
  averageRating: number;
  totalRatings: number;
  topTags: string[];
  address?: string;
  bookingLink?: string;
  latitude?: number;
  longitude?: number;
  mapLink?: string;
  photoUrls: string[];
  friendRatings: DestinationFriendRating[];
};

export type FeedItem = {
  friendName: string;
  landmark: string;
  rating: number;
  tags: string[];
  notes: string;
  cityLabel: string;
  photoUrl?: string;
};
