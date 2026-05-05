"use client";

import { ItineraryItem } from "@/lib/types";
import { PlaceCard } from "@/components/Card";

export function Itinerary({ days }: { days: Array<{ day: number; places: ItineraryItem[] }> }) {
  return (
    <div className="space-y-4">
      {days.map((day) => (
        <section key={day.day} className="space-y-2">
          <h2 className="text-xl font-bold text-[#21180f]">Day {day.day}</h2>
          {day.places.map((place) => (
            <PlaceCard key={`${day.day}-${place.landmark}`}>
              <h3 className="font-semibold text-[#1d160f]">{place.landmark}</h3>
              <p className="text-sm text-[#5c4b37]">Tags: {place.tags.join(", ")}</p>
              <p className="text-sm text-[#5c4b37]">
                {place.ratingSource === "friends" && <>Friend ratings avg: {place.averageRating.toFixed(1)} / 5</>}
                {place.ratingSource === "google" && (
                  <>
                    Google: {place.averageRating.toFixed(1)} / 5
                    {typeof place.googleReviewCount === "number"
                      ? ` (${place.googleReviewCount.toLocaleString()} reviews)`
                      : ""}
                  </>
                )}
                {place.ratingSource === "google_estimate" && (
                  <>Estimate (no Google average on listing): ~{place.averageRating.toFixed(1)} / 5</>
                )}
                {!place.ratingSource && <>Rating: {place.averageRating.toFixed(1)} / 5</>}
              </p>
              <p className="mt-1 text-sm text-[#433324]">{place.why}</p>
            </PlaceCard>
          ))}
        </section>
      ))}
    </div>
  );
}
