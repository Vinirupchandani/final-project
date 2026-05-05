"use client";

import { useEffect, useState } from "react";
import { AppTabs } from "@/components/AppTabs";
import { FeedItem } from "@/lib/types";

export default function FeedPage() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/feed")
      .then(async (res) => {
        if (!res.ok) {
          const payload = (await res.json()) as { error?: string };
          throw new Error(payload.error || "Could not load feed");
        }
        return res.json() as Promise<{ items: FeedItem[] }>;
      })
      .then((data) => setItems(data.items || []))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="mx-auto min-h-screen max-w-6xl bg-[#f6f3ee] p-6">
      <AppTabs active="feed" />
      <section className="mb-4 rounded-2xl border border-[#ded4c6] bg-white p-5">
        <h1 className="text-3xl font-black text-[#1f1a15]">Your Feed</h1>
        <p className="mt-1 text-[#665745]">New ratings and notes from people in your network.</p>
      </section>

      {loading && <p className="mb-4 text-sm text-[#6f5d4b]">Loading feed...</p>}
      {error && <p className="mb-4 text-sm text-red-700">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p className="mb-4 text-sm text-[#6f5d4b]">No feed items yet. Try refreshing in a few seconds.</p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item, index) => (
          <article key={`${item.friendName}-${item.landmark}-${index}`} className="overflow-hidden rounded-2xl border border-[#dfd4c4] bg-white">
            <div className="h-52 w-full bg-[#e8dfd1]">
              {item.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.photoUrl} alt={item.landmark} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-[#6f5d4b]">No photo available</div>
              )}
            </div>
            <div className="space-y-1 p-4">
              <p className="text-sm text-[#6d5945]">{item.friendName} rated</p>
              <h2 className="text-xl font-semibold text-[#1f1a15]">{item.landmark}</h2>
              <p className="text-sm text-[#6b5948]">{item.cityLabel}</p>
              <p className="text-sm text-[#5a4a38]">Rating: {item.rating}/5</p>
              <p className="text-sm text-[#5a4a38]">Tags: {item.tags.join(", ")}</p>
              <p className="pt-1 text-sm text-[#3e3227]">{item.notes}</p>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
