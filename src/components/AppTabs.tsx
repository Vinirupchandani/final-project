"use client";

import Link from "next/link";

type TabKey = "feed" | "search" | "results" | "itinerary";

export function AppTabs({ active, tripId }: { active: TabKey; tripId?: string }) {
  const tabs: Array<{ key: TabKey; label: string; href: string }> = [
    { key: "feed", label: "Feed", href: "/feed" },
    { key: "search", label: "Search", href: "/search" },
    { key: "results", label: "Results", href: tripId ? `/results/${tripId}` : "/quiz" },
    { key: "itinerary", label: "Itinerary", href: tripId ? `/plan?tripId=${tripId}` : "/plan" },
  ];

  return (
    <nav className="mb-4 flex flex-wrap gap-2 rounded-2xl border border-[#d6cdbf] bg-white p-2">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={`rounded-xl px-4 py-2 text-sm font-semibold ${
            active === tab.key ? "bg-[#0f5a6c] text-white" : "text-[#2f2b26]"
          }`}
        >
          {tab.label}
        </Link>
      ))}
      <Link href="/account" className="ml-auto rounded-xl px-4 py-2 text-sm font-semibold text-[#2f2b26]">
        Profile
      </Link>
    </nav>
  );
}
