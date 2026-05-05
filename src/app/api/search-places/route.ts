import { NextRequest, NextResponse } from "next/server";
import { searchGooglePlacesByText } from "@/lib/google-places";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") || "";
  if (!query.trim()) return NextResponse.json({ items: [] });

  const items = await searchGooglePlacesByText(query, 12);
  return NextResponse.json({ items });
}
