import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

function sanitizeText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchTextFromUrl(url: string): Promise<{ text: string; note?: string }> {
  if (!url) return { text: "" };
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; wandr-mvp/1.0; +https://wandr.local)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      cache: "no-store",
      redirect: "follow",
    });
    if (!response.ok) {
      return { text: "", note: `URL fetch failed (${response.status}).` };
    }
    const html = await response.text();
    const text = sanitizeText(html).slice(0, 7000);
    if (!text) return { text: "", note: "Fetched URL but could not extract readable text." };
    return { text, note: "Auto-extracted text from URL." };
  } catch {
    return { text: "", note: "Could not fetch URL content (platform restrictions or CORS)." };
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { url, text } = body as { url: string; text: string };
  const normalizedInputText = text?.trim() || "";
  let workingText = normalizedInputText;
  let note = "";

  if (!workingText && url?.trim()) {
    const fetched = await fetchTextFromUrl(url.trim());
    workingText = fetched.text;
    note = fetched.note || "";
  }

  if (!workingText) {
    return NextResponse.json({ error: "Missing caption/description and could not auto-extract URL text." }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      parsed: {
        title: `Imported from ${url}`,
        places: [],
        city: "",
        category: "food",
        vibeTags: ["local"],
        priceLevel: "moderate",
      },
      note: note || "OPENAI_API_KEY not configured, using fallback extraction.",
    });
  }

  try {
    const client = new OpenAI({ apiKey });
    const prompt = `Extract travel metadata from this content. Return strict JSON with keys: title, places (array), city, category, vibeTags (array), priceLevel (budget|moderate|premium|luxury). Text: ${workingText}`;
    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    const raw = response.output_text;
    let parsed: unknown = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {
        title: workingText.slice(0, 60),
        places: [],
        city: "",
        category: "local culture",
        vibeTags: ["aesthetic"],
        priceLevel: "moderate",
      };
    }

    return NextResponse.json({ parsed, note: note || "Parsed from provided text." });
  } catch (error) {
    return NextResponse.json({ error: "AI parsing failed", details: String(error) }, { status: 500 });
  }
}
