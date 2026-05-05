import { NextRequest, NextResponse } from "next/server";
import { fetchGooglePlaceDetails } from "@/lib/google-places";
import { loadDatasetRows } from "@/lib/parser";
import { DestinationDetails } from "@/lib/types";

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export async function GET(request: NextRequest) {
  const landmark = request.nextUrl.searchParams.get("landmark");
  const city = request.nextUrl.searchParams.get("city") || "Dubai";
  if (!landmark) {
    return NextResponse.json({ error: "Missing landmark query param" }, { status: 400 });
  }

  const rows = loadDatasetRows();
  const normalized = landmark.trim().toLowerCase();
  const matches = rows.filter((row) => row.landmark.toLowerCase() === normalized);
  const placeDetails = await fetchGooglePlaceDetails(`${landmark} ${city}`);

  const tagCount: Record<string, number> = {};
  for (const row of matches) {
    for (const tag of row.tags) {
      tagCount[tag] = (tagCount[tag] || 0) + 1;
    }
  }

  const details: DestinationDetails = {
    landmark: matches[0]?.landmark || landmark,
    averageRating: Number(
      (matches.length ? average(matches.map((row) => row.rating)) : placeDetails?.rating || 0).toFixed(2)
    ),
    totalRatings: matches.length,
    topTags: Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([tag]) => tag),
    photoUrls: [],
    friendRatings: matches
      .map((row) => ({
        friendName: row.friend_name,
        rating: row.rating,
        tags: row.tags,
        notes: row.notes,
      }))
      .sort((a, b) => b.rating - a.rating),
  };

  if (placeDetails) {
    details.address = placeDetails.address;
    details.bookingLink = placeDetails.websiteLink;
    details.latitude = placeDetails.latitude;
    details.longitude = placeDetails.longitude;
    details.mapLink = placeDetails.mapLink;
    details.photoUrls = placeDetails.photoUrls;
  }

  return NextResponse.json(details);
}
