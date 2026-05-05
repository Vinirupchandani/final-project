import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const supabase = getSupabaseServerClient();

  if (supabase) {
    await supabase.from("feedback_events").insert({
      trip_id: body.tripId,
      place_id: body.placeId,
      action: body.action,
      rating: body.rating ?? null,
      discovered_by_wandr: body.discoveredByWandr ?? null,
    });
  }

  return NextResponse.json({ ok: true });
}
