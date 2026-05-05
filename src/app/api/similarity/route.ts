import { NextRequest, NextResponse } from "next/server";
import { getTopSimilarFriends } from "@/lib/similarity";
import { OnboardingQuizInput } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as OnboardingQuizInput;
  const friends = getTopSimilarFriends(body, 10);

  return NextResponse.json({
    topFriends: friends,
  });
}
