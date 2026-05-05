"use client";

import { useRouter } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { Quiz } from "@/components/Quiz";
import { OnboardingQuizInput } from "@/lib/types";

export default function QuizPage() {
  const router = useRouter();

  const onSubmit = (quiz: OnboardingQuizInput) => {
    const id = crypto.randomUUID();
    localStorage.setItem(`wandr-quiz-${id}`, JSON.stringify(quiz));
    router.push(`/results/${id}`);
  };

  return (
    <main className="mx-auto min-h-screen max-w-3xl bg-[#f6f3ee] p-6">
      <BackButton fallbackHref="/" className="mb-4" />
      <h1 className="mb-4 text-3xl font-black text-[#1f1a15]">Dubai taste onboarding quiz</h1>
      <Quiz onSubmit={onSubmit} />
    </main>
  );
}
