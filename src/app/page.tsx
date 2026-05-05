"use client";

import { useRouter } from "next/navigation";
import { AppTabs } from "@/components/AppTabs";
import { Quiz } from "@/components/Quiz";
import { OnboardingQuizInput } from "@/lib/types";

export default function Home() {
  const router = useRouter();

  const onSubmit = (quiz: OnboardingQuizInput) => {
    const id = crypto.randomUUID();
    localStorage.setItem(`wandr-quiz-${id}`, JSON.stringify(quiz));
    router.push(`/results/${id}`);
  };

  return (
    <main className="min-h-screen bg-[#f6f3ee] p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <AppTabs active="search" />
        <section className="rounded-2xl border border-[#d9cfbf] bg-white p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8e7754]">wandr x beli style</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-[#1f1a15]">Search and discover places in your city.</h1>
          <p className="mt-2 text-[#5c4b37]">
            Pick a city and taste profile. We combine your preferences, friend similarity, and live places data for recommendations.
          </p>
        </section>
        <section className="grid gap-5 lg:grid-cols-[1.05fr_1fr]">
          <Quiz onSubmit={onSubmit} />
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#d9cfbf] bg-white p-5">
              <h2 className="text-xl font-bold text-[#1f1a15]">Trending in Dubai</h2>
              <ul className="mt-2 space-y-2 text-sm text-[#5c4b37]">
                <li>Dubai Creek Harbour</li>
                <li>Museum of the Future</li>
                <li>Burj Khalifa</li>
                <li>Kite Beach</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-[#d9cfbf] bg-white p-5">
              <h2 className="text-xl font-bold text-[#1f1a15]">Recent searches</h2>
              <ul className="mt-2 space-y-2 text-sm text-[#5c4b37]">
                <li>Dubai</li>
                <li>Abu Dhabi</li>
                <li>Doha</li>
                <li>Istanbul</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
