"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AppTabs } from "@/components/AppTabs";
import { BackButton } from "@/components/BackButton";
import { Itinerary } from "@/components/Itinerary";
import { buildLearnedPreferenceVector, getActiveUserName, loadUserVisits, topLearnedSeeds } from "@/lib/user-profile";
import { ItineraryItem, OnboardingQuizInput } from "@/lib/types";

function PlanContent() {
  const params = useSearchParams();
  const tripId = params.get("tripId") || undefined;
  const [days, setDays] = useState<Array<{ day: number; places: ItineraryItem[] }>>([]);
  const [city, setCity] = useState("your destination");

  useEffect(() => {
    if (!tripId) return;

    const raw = localStorage.getItem(`wandr-quiz-${tripId}`);
    if (!raw) return;
    const quiz = JSON.parse(raw) as OnboardingQuizInput;
    setCity(quiz.destinationCity || "your destination");
    const selectedRaw = localStorage.getItem(`wandr-liked-${tripId}`);
    const selectedLandmarks = selectedRaw ? (JSON.parse(selectedRaw) as string[]) : [];

    const userName = getActiveUserName();
    const userVisits = userName ? loadUserVisits(userName) : [];
    const learnedVector = userVisits.length ? buildLearnedPreferenceVector(userVisits) : {};
    const learnedSeeds = topLearnedSeeds(learnedVector, 8);

    fetch("/api/itinerary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...quiz, selectedLandmarks, userVisits, learnedSeeds }),
    })
      .then((res) => res.json())
      .then((data: { itinerary: Array<{ day: number; places: ItineraryItem[] }> }) => {
        setDays(data.itinerary || []);
      });
  }, [params, tripId]);

  return (
    <main className="mx-auto min-h-screen max-w-4xl bg-[#f6f3ee] p-6">
      <AppTabs active="itinerary" tripId={tripId} />
      <BackButton fallbackHref="/" className="mb-4" />
      <h1 className="mb-4 text-3xl font-black text-[#1f1a15]">Your day-by-day itinerary for {city}</h1>
      <Itinerary days={days} />
    </main>
  );
}

export default function PlanPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto min-h-screen max-w-4xl bg-[#f6f3ee] p-6">
          <p className="text-[#5c5348]">Loading itinerary…</p>
        </main>
      }
    >
      <PlanContent />
    </Suspense>
  );
}
