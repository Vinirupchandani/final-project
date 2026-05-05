import { ImportedContentInput, QuizInput } from "@/lib/types";

export const defaultQuiz: QuizInput = {
  destinationCity: "Lisbon",
  tripLengthDays: 3,
  budget: "moderate",
  travelStyle: "friends",
  pace: "balanced",
  interests: ["food", "hidden gems"],
  constraints: "",
  aiSignals: {
    planningStyle: "mix",
    socialEnergy: "mixed",
    foodComfort: "mixed",
    discoveryStyle: "mixed",
    perfectDayVibes: ["cozy", "local"],
  },
};

export const blankItem: ImportedContentInput = {
  url: "",
  title: "",
  places: [],
  city: "",
  category: "food",
  vibeTags: [],
  priceLevel: "moderate",
  sourceType: "tiktok",
  rawText: "",
};
