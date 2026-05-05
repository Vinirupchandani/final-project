"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui";

type AdminData = {
  users: number;
  importedLinks: number;
  topVibes: [string, number][];
  avgRating: number;
  saveToVisitConversion: number;
  discoveryRate: number;
};

export default function AdminPage() {
  const [data, setData] = useState<AdminData | null>(null);

  useEffect(() => {
    fetch("/api/admin").then((r) => r.json()).then(setData);
  }, []);

  if (!data) return <main className="p-6">Loading admin metrics...</main>;

  return (
    <main className="mx-auto min-h-screen max-w-4xl space-y-4 bg-slate-50 p-4 md:p-8">
      <h1 className="text-2xl font-bold">wandr Admin / Testing View</h1>
      <div className="grid gap-3 md:grid-cols-2">
        <Card><p className="text-sm text-slate-500">Users</p><p className="text-2xl font-bold">{data.users}</p></Card>
        <Card><p className="text-sm text-slate-500">Imported links</p><p className="text-2xl font-bold">{data.importedLinks}</p></Card>
        <Card><p className="text-sm text-slate-500">Average recommendation rating</p><p className="text-2xl font-bold">{data.avgRating.toFixed(2)}</p></Card>
        <Card><p className="text-sm text-slate-500">Save → visit conversion</p><p className="text-2xl font-bold">{(data.saveToVisitConversion * 100).toFixed(1)}%</p></Card>
        <Card><p className="text-sm text-slate-500">Discovery rate</p><p className="text-2xl font-bold">{(data.discoveryRate * 100).toFixed(1)}%</p></Card>
        <Card><p className="text-sm text-slate-500">Top vibe tags</p><p className="mt-2 text-sm">{data.topVibes.map(([v, n]) => `${v} (${n})`).join(", ") || "No data yet"}</p></Card>
      </div>
    </main>
  );
}
