import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { getAllTrips } from "@/lib/store";

export async function GET() {
  const supabase = getSupabaseServerClient();

  if (supabase) {
    const [users, links, feedback, vibes] = await Promise.all([
      supabase.from("users").select("id", { count: "exact", head: true }),
      supabase.from("imported_content").select("id", { count: "exact", head: true }),
      supabase.from("feedback_events").select("rating, action, discovered_by_wandr"),
      supabase.from("imported_content").select("vibe_tags"),
    ]);

    type FeedbackRow = { rating: number | null; action: string | null; discovered_by_wandr: boolean | null };
    type VibeRow = { vibe_tags: string[] | null };
    const feedbackRows = (feedback.data || []) as FeedbackRow[];
    const vibeRows = (vibes.data || []) as VibeRow[];

    const ratings = feedbackRows.map((f) => f.rating).filter((n): n is number => typeof n === "number");
    const saved = feedbackRows.filter((f) => f.action === "save").length;
    const visited = feedbackRows.filter((f) => f.action === "visited").length;
    const discovered = feedbackRows.filter((f) => f.discovered_by_wandr === true).length;

    const vibeCounts: Record<string, number> = {};
    for (const row of vibeRows) {
      for (const vibe of row.vibe_tags || []) vibeCounts[vibe] = (vibeCounts[vibe] || 0) + 1;
    }

    return NextResponse.json({
      users: users.count || 0,
      importedLinks: links.count || 0,
      topVibes: Object.entries(vibeCounts).sort((a, b) => b[1] - a[1]).slice(0, 5),
      avgRating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
      saveToVisitConversion: saved ? visited / saved : 0,
      discoveryRate: feedbackRows.length ? discovered / feedbackRows.length : 0,
    });
  }

  const trips = getAllTrips();
  const imported = trips.flatMap((t) => t.importedContent);
  const vibes = imported.flatMap((i) => i.vibeTags);
  const vibeCounts: Record<string, number> = {};
  vibes.forEach((v) => (vibeCounts[v] = (vibeCounts[v] || 0) + 1));

  return NextResponse.json({
    users: trips.length,
    importedLinks: imported.length,
    topVibes: Object.entries(vibeCounts).sort((a, b) => b[1] - a[1]).slice(0, 5),
    avgRating: 0,
    saveToVisitConversion: 0,
    discoveryRate: 0,
  });
}
