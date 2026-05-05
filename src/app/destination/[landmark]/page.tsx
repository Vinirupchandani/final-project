"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { AppTabs } from "@/components/AppTabs";
import { BackButton } from "@/components/BackButton";
import { DestinationDetails } from "@/lib/types";
import {
  applyPairwisePreference,
  getActiveUserName,
  loadUserVisits,
  pickComparisonCandidates,
  upsertUserVisit,
  type UserVisit,
} from "@/lib/user-profile";

type ComparisonChoice = "here" | "there";

function DestinationPageContent() {
  const params = useParams<{ landmark: string }>();
  const search = useSearchParams();
  const tripId = search.get("tripId");
  const city = search.get("city") || "Dubai";
  const [details, setDetails] = useState<DestinationDetails | null>(null);
  const [error, setError] = useState("");
  const [userName, setUserName] = useState<string | null>(null);

  const [rating, setRating] = useState(5);
  const [notes, setNotes] = useState("");
  const [visitCity, setVisitCity] = useState(city);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [customTags, setCustomTags] = useState("");
  const [comparisons, setComparisons] = useState<Record<string, ComparisonChoice | undefined>>({});
  const [formMessage, setFormMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [visitVersion, setVisitVersion] = useState(0);

  const decodedLandmark = useMemo(
    () => decodeURIComponent(params.landmark || "").trim(),
    [params.landmark]
  );

  useEffect(() => {
    const sync = () => setUserName(getActiveUserName());
    sync();
    window.addEventListener("wandr-auth-changed", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("wandr-auth-changed", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  useEffect(() => {
    setVisitCity(city);
  }, [city]);

  useEffect(() => {
    if (!decodedLandmark) return;
    fetch(`/api/destination?landmark=${encodeURIComponent(decodedLandmark)}&city=${encodeURIComponent(city)}`)
      .then(async (res) => {
        if (!res.ok) {
          const payload = (await res.json()) as { error?: string };
          throw new Error(payload.error || "Could not load destination details");
        }
        return res.json() as Promise<DestinationDetails>;
      })
      .then((payload) => {
        setDetails(payload);
      })
      .catch((err: Error) => {
        setError(err.message);
      });
  }, [decodedLandmark, city]);

  useEffect(() => {
    if (!details) return;
    if (userName) {
      const existing = loadUserVisits(userName).find(
        (v) => v.place.toLowerCase() === decodedLandmark.toLowerCase()
      );
      if (existing) {
        setRating(existing.rating);
        setNotes(existing.notes);
        setVisitCity(existing.city || city);
        setSelectedTags(new Set(existing.tags.map((t) => t.toLowerCase())));
        setCustomTags("");
        return;
      }
    }
    setRating(5);
    setNotes("");
    setVisitCity(city);
    setSelectedTags(new Set(details.topTags.map((t) => t.toLowerCase()).filter(Boolean)));
    setCustomTags("");
    setComparisons({});
    setFormMessage(null);
  }, [details, decodedLandmark, city, userName, visitVersion]);

  const myVisitsExcludingHere = useMemo(() => {
    if (!userName) return [];
    return loadUserVisits(userName).filter((v) => v.place.toLowerCase() !== decodedLandmark.toLowerCase());
  }, [userName, decodedLandmark, visitVersion]);

  const comparisonCandidates = useMemo(() => {
    if (!userName || !details) return [];
    const tagSeeds = [...details.topTags, ...Array.from(selectedTags)];
    return pickComparisonCandidates(tagSeeds, myVisitsExcludingHere, 4);
  }, [userName, details, selectedTags, myVisitsExcludingHere]);

  const toggleTag = (tag: string) => {
    const t = tag.toLowerCase();
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  const saveRanking = () => {
    setFormMessage(null);
    const name = getActiveUserName();
    if (!name) {
      setFormMessage({ type: "err", text: "Sign in on Profile first." });
      return;
    }
    for (const c of comparisonCandidates) {
      if (!comparisons[c.place]) {
        setFormMessage({
          type: "err",
          text: "For each comparison, pick which place you like more in that category.",
        });
        return;
      }
    }

    const extra = customTags
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    const allTags = [...new Set([...Array.from(selectedTags), ...extra])];
    const visits = loadUserVisits(name);
    const existing = visits.find((v) => v.place.toLowerCase() === decodedLandmark.toLowerCase());

    const visit: UserVisit = {
      userName: name,
      place: decodedLandmark,
      city: visitCity.trim() || undefined,
      rating,
      tags: allTags.length ? allTags : ["general"],
      notes: notes.trim(),
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      rankScore: existing?.rankScore ?? 1000,
    };

    upsertUserVisit(name, visit);

    for (const c of comparisonCandidates) {
      const choice = comparisons[c.place];
      if (choice === "here") applyPairwisePreference(name, decodedLandmark, c.place);
      else if (choice === "there") applyPairwisePreference(name, c.place, decodedLandmark);
    }

    setFormMessage({ type: "ok", text: "Saved to your profile. Rankings update recommendations on your next trip load." });
    setComparisons({});
    setVisitVersion((v) => v + 1);
  };

  if (error) {
    return (
      <main className="mx-auto min-h-screen max-w-4xl bg-[#f6f3ee] p-6">
        <p className="text-red-700">{error}</p>
      </main>
    );
  }

  if (!details) {
    return (
      <main className="mx-auto min-h-screen max-w-4xl bg-[#f6f3ee] p-6">
        <p>Loading destination ratings...</p>
      </main>
    );
  }

  const tagOptions = [...new Set([...details.topTags, ...Array.from(selectedTags)])].filter(Boolean);

  return (
    <main className="mx-auto min-h-screen max-w-4xl space-y-4 bg-[#f6f3ee] p-6">
      <AppTabs active="results" tripId={tripId || undefined} />
      <BackButton fallbackHref={tripId ? `/results/${tripId}` : "/"} />
      <section className="rounded-2xl border border-[#eadfce] bg-white p-5">
        <h1 className="text-3xl font-black text-[#1f1a15]">{details.landmark}</h1>
        <p className="mt-1 text-[#5d4d3c]">
          Avg rating: {details.averageRating} / 5 ({details.totalRatings} friend ratings)
        </p>
        {!!details.address && <p className="mt-1 text-sm text-[#6d5946]">{details.address}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          {details.bookingLink && (
            <a
              href={details.bookingLink}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-[#0f5a6c] px-3 py-2 text-sm font-semibold text-white"
            >
              Book / Website
            </a>
          )}
          {details.mapLink && (
            <a
              href={details.mapLink}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-[#d9cfbd] bg-[#faf7f1] px-3 py-2 text-sm font-semibold text-[#4e3f2f]"
            >
              Open map
            </a>
          )}
        </div>
        <p className="mt-2 text-sm text-[#6f5a43]">Top tags: {details.topTags.length ? details.topTags.join(", ") : "—"}</p>
        {tripId && (
          <Link
            href={`/results/${tripId}`}
            className="mt-3 inline-flex rounded-xl border border-[#d9cfbd] bg-[#faf7f1] px-3 py-2 text-sm font-semibold text-[#4e3f2f]"
          >
            Back to recommendations
          </Link>
        )}
      </section>

      <section className="rounded-2xl border border-[#c9d8de] bg-[#f8fcfd] p-5">
        <h2 className="text-lg font-bold text-[#1f1a15]">Your ranking</h2>
        {!userName ? (
          <p className="mt-2 text-sm text-[#375662]">
            <Link href="/account" className="font-semibold text-[#0f5a6c] underline">
              Open Profile
            </Link>{" "}
            to create an account, then you can rate this place and compare it to your past visits with overlapping tags.
          </p>
        ) : (
          <div className="mt-3 space-y-4">
            <p className="text-sm text-[#375662]">
              Signed in as <strong>{userName}</strong>. Tags here power pairwise matches with places you already ranked.
            </p>
            <div>
              <label className="text-sm font-semibold text-[#1f1a15]">Your stars (1–5)</label>
              <div className="mt-1 flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    className={`rounded-xl px-3 py-1.5 text-sm font-semibold ${
                      rating === n ? "bg-[#0f5a6c] text-white" : "border border-[#d9cfbd] bg-white text-[#4e3f2f]"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-[#1f1a15]">City for this memory</label>
              <input
                value={visitCity}
                onChange={(e) => setVisitCity(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#d9cfbd] bg-white px-3 py-2 text-sm"
                placeholder="e.g. Tokyo"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-[#1f1a15]">Tags</label>
              <p className="text-xs text-[#6d5844]">Toggle tags; add more below (comma-separated).</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {tagOptions.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      selectedTags.has(tag.toLowerCase())
                        ? "bg-[#0f5a6c] text-white"
                        : "border border-[#d9cfbd] bg-white text-[#4e3f2f]"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <input
                value={customTags}
                onChange={(e) => setCustomTags(e.target.value)}
                placeholder="Extra: museum, food, nightlife"
                className="mt-2 w-full rounded-xl border border-[#d9cfbd] bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-[#1f1a15]">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-xl border border-[#d9cfbd] bg-white px-3 py-2 text-sm"
                placeholder="What stood out?"
              />
            </div>

            {comparisonCandidates.length > 0 && (
              <div className="rounded-xl border border-[#d9cfbd] bg-white p-3">
                <p className="text-sm font-semibold text-[#1f1a15]">Compare in the same vibe</p>
                <p className="text-xs text-[#6d5844]">
                  Pick which you liked more. This updates your internal rank scores (Beli-style).
                </p>
                <ul className="mt-3 space-y-3">
                  {comparisonCandidates.map((c) => (
                    <li key={c.place} className="rounded-lg border border-[#eadfce] bg-[#fffdf9] p-2">
                      <p className="text-xs text-[#6d5844]">vs {c.place}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setComparisons((prev) => ({ ...prev, [c.place]: "here" }))}
                          className={`rounded-lg px-2 py-1 text-xs font-semibold ${
                            comparisons[c.place] === "here"
                              ? "bg-[#0f5a6c] text-white"
                              : "border border-[#d9cfbd] bg-white"
                          }`}
                        >
                          Prefer {details.landmark}
                        </button>
                        <button
                          type="button"
                          onClick={() => setComparisons((prev) => ({ ...prev, [c.place]: "there" }))}
                          className={`rounded-lg px-2 py-1 text-xs font-semibold ${
                            comparisons[c.place] === "there"
                              ? "bg-[#0f5a6c] text-white"
                              : "border border-[#d9cfbd] bg-white"
                          }`}
                        >
                          Prefer {c.place}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {formMessage && (
              <p className={`text-sm ${formMessage.type === "ok" ? "text-green-800" : "text-red-700"}`}>
                {formMessage.text}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={saveRanking}
                className="rounded-xl bg-[#0f5a6c] px-4 py-2 text-sm font-semibold text-white"
              >
                Save to my profile
              </button>
              <Link href="/account" className="rounded-xl border border-[#d9cfbd] bg-white px-4 py-2 text-sm font-semibold text-[#4e3f2f]">
                View all my places
              </Link>
            </div>
          </div>
        )}
      </section>

      {typeof details.latitude === "number" && typeof details.longitude === "number" && (
        <section className="overflow-hidden rounded-2xl border border-[#eadfce] bg-white">
          <iframe
            title="Destination map"
            src={`https://www.google.com/maps?q=${details.latitude},${details.longitude}&z=14&output=embed`}
            className="h-72 w-full"
          />
        </section>
      )}

      {!!details.photoUrls.length && (
        <section className="rounded-2xl border border-[#eadfce] bg-white p-4">
          <h2 className="mb-3 text-xl font-bold text-[#1f1a15]">Photos from people</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {details.photoUrls.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={url} src={url} alt={details.landmark} className="h-44 w-full rounded-xl object-cover" />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-2">
        {!details.friendRatings.length ? (
          <article className="rounded-2xl border border-[#eadfce] bg-white p-4">
            <p className="text-sm text-[#5d4d3c]">
              No friend ratings yet for this destination. We are showing live place details, map, and photos instead.
            </p>
          </article>
        ) : (
          details.friendRatings.map((entry) => (
            <article
              key={`${entry.friendName}-${entry.rating}-${entry.notes}`}
              className="rounded-2xl border border-[#eadfce] bg-white p-4"
            >
              <p className="font-semibold text-[#1f1a15]">{entry.friendName}</p>
              <p className="text-sm text-[#5d4d3c]">Rating: {entry.rating} / 5</p>
              <p className="text-sm text-[#6b5742]">Tags: {entry.tags.join(", ")}</p>
              <p className="mt-1 text-sm text-[#3c3024]">{entry.notes}</p>
            </article>
          ))
        )}
      </section>
    </main>
  );
}

export default function DestinationPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto min-h-screen max-w-4xl bg-[#f6f3ee] p-6">
          <p className="text-[#5c5348]">Loading destination…</p>
        </main>
      }
    >
      <DestinationPageContent />
    </Suspense>
  );
}
