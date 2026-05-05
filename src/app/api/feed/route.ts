import { NextResponse } from "next/server";
import { fetchGooglePlaceDetails } from "@/lib/google-places";
import { loadDatasetRows } from "@/lib/parser";
import { FeedItem } from "@/lib/types";

export async function GET() {
  const rows = loadDatasetRows();
  const sample = [...rows].slice(0, 18);

  const feed = await Promise.all(
    sample.map(async (row) => {
      let details: Awaited<ReturnType<typeof fetchGooglePlaceDetails>> = null;
      try {
        details = await fetchGooglePlaceDetails(`${row.landmark} Dubai`);
      } catch {
        details = null;
      }

      return {
        friendName: row.friend_name,
        landmark: row.landmark,
        rating: row.rating,
        tags: row.tags,
        notes: row.notes,
        cityLabel: "Dubai, UAE",
        photoUrl: details?.photoUrls?.[0],
      } satisfies FeedItem;
    })
  );

  return NextResponse.json({ items: feed });
}
