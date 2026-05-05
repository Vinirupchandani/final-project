"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AppTabs } from "@/components/AppTabs";

type SearchItem = {
  name: string;
  address: string;
  city: string;
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);

  const canSearch = useMemo(() => query.trim().length >= 2, [query]);

  const runSearch = async () => {
    if (!canSearch) return;
    setLoading(true);
    const res = await fetch(`/api/search-places?q=${encodeURIComponent(query.trim())}`);
    const data = (await res.json()) as { items: SearchItem[] };
    setItems(data.items || []);
    setLoading(false);
  };

  return (
    <main className="mx-auto min-h-screen max-w-6xl bg-[#f6f3ee] p-6">
      <AppTabs active="search" />
      <section className="rounded-2xl border border-[#dfd6c8] bg-white p-5">
        <h1 className="text-3xl font-black text-[#1f1a15]">Search places</h1>
        <p className="mt-1 text-[#695847]">Find any destination and open the full destination page view.</p>
        <div className="mt-3 flex gap-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search restaurant, destination, city..."
            className="w-full rounded-xl border border-[#d9cfbd] bg-[#faf7f1] px-3 py-2"
          />
          <button
            type="button"
            onClick={runSearch}
            disabled={!canSearch || loading}
            className="rounded-xl bg-[#0f5a6c] px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
      </section>

      <section className="mt-4 space-y-2">
        {items.map((item) => (
          <article key={`${item.name}-${item.address}`} className="rounded-2xl border border-[#dfd6c8] bg-white p-4">
            <p className="text-lg font-semibold text-[#1f1a15]">{item.name}</p>
            <p className="text-sm text-[#6e5a46]">{item.address}</p>
            <Link
              href={`/destination/${encodeURIComponent(item.name)}?city=${encodeURIComponent(item.city || "Dubai")}`}
              className="mt-2 inline-flex rounded-xl border border-[#d9cfbd] bg-[#faf7f1] px-3 py-1.5 text-sm font-semibold text-[#4e3f2f]"
            >
              Open destination page
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
