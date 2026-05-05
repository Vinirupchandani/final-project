"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { blankItem, defaultQuiz } from "@/lib/quiz-defaults";
import { BudgetLevel, ImportedContentInput, QuizInput } from "@/lib/types";

export default function ImportPage() {
  const router = useRouter();
  const [quiz] = useState<QuizInput | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("wandr-quiz-draft");
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as QuizInput;
      return { ...defaultQuiz, ...parsed, aiSignals: { ...defaultQuiz.aiSignals, ...(parsed.aiSignals || {}) } };
    } catch {
      return null;
    }
  });
  const [items, setItems] = useState<ImportedContentInput[]>([blankItem, { ...blankItem }]);
  const [loading, setLoading] = useState(false);
  const [parsingIndex, setParsingIndex] = useState<number | null>(null);
  const [parseMessages, setParseMessages] = useState<Record<number, string>>({});

  const canSubmit = useMemo(() => items.filter((i) => i.url || i.title || i.rawText).length >= 1 && !!quiz, [items, quiz]);

  const updateItem = (idx: number, patch: Partial<ImportedContentInput>) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  };

  const parseWithAI = async (idx: number) => {
    const target = items[idx];
    if (!target.rawText && !target.url) {
      setParseMessages((prev) => ({ ...prev, [idx]: "Add a URL or caption/description first." }));
      return;
    }
    setParsingIndex(idx);
    setParseMessages((prev) => ({ ...prev, [idx]: "" }));
    const res = await fetch("/api/parse-content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: target.url, text: target.rawText }),
    });
    const data = await res.json();
    if (data.parsed) {
      updateItem(idx, {
        title: data.parsed.title || target.title,
        places: data.parsed.places || [],
        city: data.parsed.city || target.city,
        category: data.parsed.category || target.category,
        vibeTags: data.parsed.vibeTags || [],
        priceLevel: data.parsed.priceLevel || target.priceLevel,
      });
      if (data.note) setParseMessages((prev) => ({ ...prev, [idx]: data.note }));
    } else if (data.error) {
      setParseMessages((prev) => ({ ...prev, [idx]: data.error }));
    }
    setParsingIndex(null);
  };

  const submit = async () => {
    if (!quiz) return;
    setLoading(true);
    const payload = {
      quiz,
      importedContent: items
        .filter((i) => i.url || i.title)
        .slice(0, 10)
        .map((i) => ({
          ...i,
          places: i.places.map((x) => x.trim()).filter(Boolean),
          vibeTags: i.vibeTags.map((x) => x.trim()).filter(Boolean),
        })),
    };

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await res.json();
    localStorage.setItem(`wandr-trip-${result.tripId}`, JSON.stringify(result));
    router.push(`/results/${result.tripId}`);
  };

  if (!quiz) {
    return (
      <main className="mx-auto min-h-screen max-w-3xl bg-[#f6f3ee] p-4 md:p-8">
        <Card>
          <h1 className="text-2xl font-bold text-[#1f1a15]">Start with the AI quiz first</h1>
          <p className="mt-2 text-sm text-[#665845]">We use your answers to shape recommendations before reading your links.</p>
          <Link href="/quiz" className="mt-4 inline-flex rounded-2xl bg-[#111111] px-4 py-2 font-semibold text-white">Go to quiz</Link>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl space-y-5 bg-[#f6f3ee] p-4 md:p-8">
      <Card>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9a8561]">Step 2 of 2</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-[#1f1a15]">Add links you already love</h1>
        <p className="mt-1 text-sm text-[#665845]">TikTok, reels, blogs, or friend lists. wandr learns from what you already trust.</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#665845]">
          <span className="rounded-full bg-[#eee8de] px-3 py-1">{quiz.destinationCity}</span>
          <span className="rounded-full bg-[#eee8de] px-3 py-1">{quiz.tripLengthDays} days</span>
          <span className="rounded-full bg-[#eee8de] px-3 py-1">{quiz.travelStyle}</span>
          <span className="rounded-full bg-[#eee8de] px-3 py-1">{quiz.budget}</span>
        </div>
        <Link href="/quiz" className="mt-3 inline-flex text-sm font-semibold text-[#6f5f49] underline">Edit quiz answers</Link>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Import travel content (5-10 recommended)</h2>
          <button type="button" onClick={() => setItems((prev) => [...prev, { ...blankItem }])} className="rounded-2xl border border-[#ddd6cc] bg-[#faf7f1] px-3 py-1 text-sm font-medium text-[#4f4335]">Add link</button>
        </div>

        <div className="space-y-4">
          {items.map((item, idx) => (
            <div key={idx} className="rounded-2xl border border-[#e7dfd3] bg-[#fffdf9] p-3.5">
              <div className="grid gap-2 md:grid-cols-2">
                <input className="rounded-xl border border-[#e2dbd1] bg-white p-2.5" placeholder="URL" value={item.url} onChange={(e) => updateItem(idx, { url: e.target.value })} />
                <input className="rounded-xl border border-[#e2dbd1] bg-white p-2.5" placeholder="Title / short description" value={item.title} onChange={(e) => updateItem(idx, { title: e.target.value })} />
                <input className="rounded-xl border border-[#e2dbd1] bg-white p-2.5" placeholder="Places (comma separated)" value={item.places.join(", ")} onChange={(e) => updateItem(idx, { places: e.target.value.split(",").map((x) => x.trim()) })} />
                <input className="rounded-xl border border-[#e2dbd1] bg-white p-2.5" placeholder="City" value={item.city} onChange={(e) => updateItem(idx, { city: e.target.value })} />
                <input className="rounded-xl border border-[#e2dbd1] bg-white p-2.5" placeholder="Category" value={item.category} onChange={(e) => updateItem(idx, { category: e.target.value })} />
                <input className="rounded-xl border border-[#e2dbd1] bg-white p-2.5" placeholder="Vibe tags (comma separated)" value={item.vibeTags.join(", ")} onChange={(e) => updateItem(idx, { vibeTags: e.target.value.split(",").map((x) => x.trim()) })} />
                <select className="rounded-xl border border-[#e2dbd1] bg-white p-2.5" value={item.priceLevel} onChange={(e) => updateItem(idx, { priceLevel: e.target.value as BudgetLevel })}>
                  <option value="budget">Budget</option><option value="moderate">Moderate</option><option value="premium">Premium</option><option value="luxury">Luxury</option>
                </select>
                <select className="rounded-xl border border-[#e2dbd1] bg-white p-2.5" value={item.sourceType} onChange={(e) => updateItem(idx, { sourceType: e.target.value as ImportedContentInput["sourceType"] })}>
                  <option value="tiktok">TikTok</option><option value="instagram">Instagram</option><option value="blog">Blog</option><option value="friend_list">Friend list</option><option value="other">Other</option>
                </select>
              </div>
              <textarea className="mt-2 w-full rounded-xl border border-[#e2dbd1] bg-white p-2.5" rows={3} placeholder="Paste caption / description for AI-assisted extraction" value={item.rawText} onChange={(e) => updateItem(idx, { rawText: e.target.value })} />
              <div className="mt-2 flex items-center gap-2">
                <button type="button" className="rounded-xl bg-[#1f1a15] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50" disabled={parsingIndex === idx} onClick={() => parseWithAI(idx)}>
                  {parsingIndex === idx ? "Extracting..." : "AI extract fields"}
                </button>
                <span className="text-xs text-slate-500">If no caption is provided, wandr will try to read the URL automatically.</span>
              </div>
              {parseMessages[idx] && <p className="mt-2 text-xs text-slate-600">{parseMessages[idx]}</p>}
            </div>
          ))}
        </div>
      </Card>

      <button disabled={!canSubmit || loading} onClick={submit} className="w-full rounded-2xl bg-[#111111] px-6 py-3 font-semibold text-white transition hover:bg-[#2b2b2b] disabled:opacity-50">
        {loading ? "Generating..." : "Generate personalized itinerary"}
      </button>
    </main>
  );
}
