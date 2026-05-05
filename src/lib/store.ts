import { TripResult } from "@/lib/types";

const runtimeStore = new Map<string, TripResult>();

export function saveTrip(result: TripResult) {
  runtimeStore.set(result.tripId, result);
}

export function getTrip(tripId: string) {
  return runtimeStore.get(tripId);
}

export function getAllTrips() {
  return Array.from(runtimeStore.values());
}
