"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppTabs } from "@/components/AppTabs";
import { BackButton } from "@/components/BackButton";
import { PlaceCard } from "@/components/Card";
import { getPrimaryPreferenceForRecommendation } from "@/lib/recommendation-categories";
import { buildLearnedPreferenceVector, getActiveUserName, loadUserVisits, topLearnedSeeds } from "@/lib/user-profile";
import { LandmarkRecommendation, OnboardingQuizInput, PreferenceTag, SimilarFriend } from "@/lib/types";

export default function ResultsPage() {
  const params = useParams<{ tripId: string }>();
  const [recommendations, setRecommendations] = useState<LandmarkRecommendation[]>([]);
  const [expertPicks, setExpertPicks] = useState<LandmarkRecommendation[]>([]);
  const [sponsoredPlacement, setSponsoredPlacement] = useState<{ label: string; title: string; url: string; note: string } | null>(null);
  const [friends, setFriends] = useState<SimilarFriend[]>([]);
  const [selectedLandmarks, setSelectedLandmarks] = useState<string[]>([]);

  const quiz = useMemo(() => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(`wandr-quiz-${params.tripId}`);
    return raw ? (JSON.parse(raw) as OnboardingQuizInput) : null;
  }, [params.tripId]);

  useEffect(() => {
    if (!quiz) return;

    const userName = getActiveUserName();
    const userVisits = userName ? loadUserVisits(userName) : [];
    const learnedVector = userVisits.length ? buildLearnedPreferenceVector(userVisits) : {};
    const learnedSeeds = topLearnedSeeds(learnedVector, 8);

    fetch("/api/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...quiz, userVisits, learnedSeeds }),
    })
      .then((res) => res.json())
      .then((data: {
        recommendations: LandmarkRecommendation[];
        topFriends: SimilarFriend[];
        expertPicks: LandmarkRecommendation[];
        sponsoredPlacement: { label: string; title: string; url: string; note: string };
      }) => {
        setRecommendations(data.recommendations || []);
        setFriends(data.topFriends || []);
        setExpertPicks(data.expertPicks || []);
        setSponsoredPlacement(data.sponsoredPlacement || null);
      });
  }, [quiz]);

  useEffect(() => {
    const raw = localStorage.getItem(`wandr-liked-${params.tripId}`);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as string[];
      setSelectedLandmarks(parsed);
    } catch {
      setSelectedLandmarks([]);
    }
  }, [params.tripId]);

  const toggleLandmark = (landmark: string) => {
    setSelectedLandmarks((current) => {
      const next = current.includes(landmark)
        ? current.filter((item) => item !== landmark)
        : [...current, landmark];
      localStorage.setItem(`wandr-liked-${params.tripId}`, JSON.stringify(next));
      return next;
    });
  };

  const friendSummary = useMemo(
    () => friends.slice(0, 3).map((friend) => friend.friendName).join(", "),
    [friends]
  );

  const groupedRecommendations = useMemo(() => {
    const groups = new Map<PreferenceTag, LandmarkRecommendation[]>();
    for (const preference of quiz?.preferences || []) groups.set(preference, []);
    for (const rec of recommendations) {
      const category = getPrimaryPreferenceForRecommendation(rec.tags, quiz?.preferences || [], rec.landmark);
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category)?.push(rec);
    }
    return [...groups.entries()];
  }, [recommendations, quiz]);

  if (!quiz) return <main className="p-6">Loading your recommendations...</main>;

  return (
    <main className="mx-auto min-h-screen max-w-5xl space-y-4 bg-[#f6f3ee] p-4 md:p-8">
      <AppTabs active="results" tripId={params.tripId} />
      <BackButton fallbackHref="/quiz" />
      <section className="rounded-2xl border border-[#e8dfd1] bg-white p-5">
        <h1 className="text-3xl font-black text-[#1f1a15]">Top {quiz.destinationCity || "Dubai"} recommendations</h1>
        <p className="mt-2 text-[#5f4c39]">
          Top picks for {quiz.destinationCity || "Dubai"}, based on your {quiz.travelType} style, {quiz.budget} budget, and top friend matches.
        </p>
        <p className="mt-1 text-sm text-[#6d5844]">Most similar friends: {friendSummary || "Calculating..."}</p>
        <p className="mt-1 text-sm text-[#6d5844]">
          Selected for itinerary: <strong>{selectedLandmarks.length}</strong>
        </p>
        <Link
          href={`/plan?tripId=${params.tripId}`}
          className="mt-3 inline-flex rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"
        >
          Build itinerary
        </Link>
      </section>
      {sponsoredPlacement && (
        <section className="rounded-2xl border border-[#c9d8de] bg-[#f5fbfd] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0f5a6c]">{sponsoredPlacement.label}</p>
          <p className="mt-1 text-lg font-semibold text-[#17353f]">{sponsoredPlacement.title}</p>
          <p className="text-sm text-[#375662]">{sponsoredPlacement.note}</p>
          <a href={sponsoredPlacement.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex rounded-xl bg-[#0f5a6c] px-3 py-2 text-sm font-semibold text-white">
            Explore offer
          </a>
        </section>
      )}

      {!!expertPicks.length && (
        <section className="space-y-3 rounded-2xl border border-[#e8dfd1] bg-white p-4">
          <h2 className="text-xl font-bold text-[#1f1a15]">Expert traveler picks</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {expertPicks.map((rec) => (
              <article key={`expert-${rec.landmark}`} className="rounded-xl border border-[#eadfce] bg-[#fffdf9] p-3">
                <p className="font-semibold text-[#1f1a15]">{rec.landmark}</p>
                <p className="text-sm text-[#6a5846]">{rec.whyRecommended}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="space-y-5">
        {groupedRecommendations.map(([category, list]) => (
          <section key={category} className="space-y-3">
            <h2 className="text-xl font-bold capitalize text-[#1f1a15]">{category}</h2>
            {list.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[#d9cfbd] bg-white p-3 text-sm text-[#6d5844]">
                No strong {category} matches in this batch yet.
              </p>
            ) : (
              <div className="grid gap-3">
                {list.map((rec) => (
          <PlaceCard key={rec.landmark}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#1f1a15]">{rec.landmark}</h2>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#f2ece1] px-2 py-1 text-xs font-semibold text-[#584734]">
                  Score {(rec.score * 100).toFixed(0)}
                </span>
                <button
                  type="button"
                  onClick={() => toggleLandmark(rec.landmark)}
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${
                    selectedLandmarks.includes(rec.landmark)
                      ? "bg-[#0f5a6c] text-white"
                      : "border border-[#d9cfbd] bg-white text-[#4e3f2f]"
                  }`}
                >
                  {selectedLandmarks.includes(rec.landmark) ? "♥ Saved" : "♡ Save"}
                </button>
              </div>
            </div>
            <p className="mt-1 text-sm text-[#6a5846]">Tags: {rec.tags.join(", ")}</p>
            <p className="text-sm text-[#6a5846]">
              {rec.ratingSource === "friends" && <>Friend dataset avg: {rec.averageRating.toFixed(1)} / 5</>}
              {rec.ratingSource === "google" && (
                <>
                  Google reviews: {rec.averageRating.toFixed(1)} / 5
                  {typeof rec.googleReviewCount === "number"
                    ? ` (${rec.googleReviewCount.toLocaleString()} reviews)`
                    : ""}
                </>
              )}
              {rec.ratingSource === "google_estimate" && (
                <>
                  No Google star average on this result — internal quality estimate ~{rec.averageRating.toFixed(1)} / 5
                  (not crowd reviews).
                </>
              )}
              {!rec.ratingSource && <>Avg rating: {rec.averageRating.toFixed(1)} / 5</>}
            </p>
            <p className="mt-1 text-sm text-[#3f3023]">Why recommended: {rec.whyRecommended}</p>
            <p className="mt-1 text-sm font-medium text-[#453524]">
              {rec.lovedByCount} people like you loved this
            </p>
            <div className="mt-2 space-y-1 text-sm text-[#5b4a37]">
              {rec.lovedBy.map((entry) => (
                <p key={`${rec.landmark}-${entry.friendName}`}>
                  {entry.friendName}: &quot;{entry.notes}&quot;
                </p>
              ))}
            </div>
            <Link
              href={`/destination/${encodeURIComponent(rec.landmark)}?tripId=${params.tripId}&city=${encodeURIComponent(
                quiz.destinationCity || "Dubai"
              )}`}
              className="mt-3 inline-flex rounded-xl border border-[#d9cfbd] bg-[#faf7f1] px-3 py-1.5 text-sm font-semibold text-[#4e3f2f]"
            >
              See individual destination ratings
            </Link>
          </PlaceCard>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </main>
  );
}
