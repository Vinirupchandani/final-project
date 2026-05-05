import { Recommendation, ItineraryStop, QuizInput } from "@/lib/types";

const paceStops = {
  packed: 5,
  balanced: 4,
  slow: 3,
};

const windows: Array<"morning" | "afternoon" | "evening"> = ["morning", "afternoon", "evening"];

export function buildItinerary(quiz: QuizInput, recommendations: Recommendation[]): ItineraryStop[] {
  const stopsPerDay = paceStops[quiz.pace];
  const totalStops = Math.min(recommendations.length, quiz.tripLengthDays * stopsPerDay);
  const chosen = recommendations.slice(0, totalStops);

  const byNeighborhood = [...chosen].sort((a, b) => a.place.neighborhood.localeCompare(b.place.neighborhood));
  const itinerary: ItineraryStop[] = [];

  let idx = 0;
  for (let day = 1; day <= quiz.tripLengthDays; day++) {
    for (let order = 1; order <= stopsPerDay && idx < byNeighborhood.length; order++) {
      itinerary.push({
        day,
        order,
        timeWindow: windows[(order - 1) % windows.length],
        recommendation: byNeighborhood[idx],
      });
      idx += 1;
    }
  }

  return itinerary;
}
