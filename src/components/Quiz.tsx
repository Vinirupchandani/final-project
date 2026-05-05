"use client";

import { useState } from "react";
import { OnboardingQuizInput, PreferenceTag } from "@/lib/types";

const PREFERENCES: PreferenceTag[] = ["luxury", "food", "adventure", "culture", "nightlife"];

const INITIAL_QUIZ: OnboardingQuizInput = {
  destinationCity: "Dubai",
  travelType: "friends",
  preferences: ["food", "culture"],
  budget: "medium",
  tripDays: 2,
};

export function Quiz({ onSubmit }: { onSubmit: (quiz: OnboardingQuizInput) => void }) {
  const [quiz, setQuiz] = useState<OnboardingQuizInput>(INITIAL_QUIZ);

  const togglePreference = (preference: PreferenceTag) => {
    setQuiz((current) => {
      const alreadySelected = current.preferences.includes(preference);
      return {
        ...current,
        preferences: alreadySelected
          ? current.preferences.filter((item) => item !== preference)
          : [...current.preferences, preference],
      };
    });
  };

  return (
    <div className="space-y-5 rounded-3xl border border-[#e7dece] bg-white p-6">
      <div>
        <p className="text-sm font-semibold text-[#8a7048]">Destination city</p>
        <input
          className="mt-2 w-full rounded-xl border border-[#e7dece] bg-[#faf7f1] px-3 py-2 text-sm"
          value={quiz.destinationCity || ""}
          onChange={(event) => setQuiz((current) => ({ ...current, destinationCity: event.target.value }))}
          placeholder="Dubai, Singapore, Tokyo..."
        />
      </div>

      <div>
        <p className="text-sm font-semibold text-[#8a7048]">Travel type</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {(["solo", "friends", "date"] as const).map((travelType) => (
            <button
              key={travelType}
              type="button"
              onClick={() => setQuiz((current) => ({ ...current, travelType }))}
              className={`rounded-xl border px-3 py-2 text-sm ${
                quiz.travelType === travelType ? "bg-black text-white" : "bg-[#f8f3ea]"
              }`}
            >
              {travelType}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-[#8a7048]">Preferences</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {PREFERENCES.map((preference) => (
            <button
              key={preference}
              type="button"
              onClick={() => togglePreference(preference)}
              className={`rounded-full px-3 py-2 text-sm ${
                quiz.preferences.includes(preference) ? "bg-black text-white" : "bg-[#f0eadf] text-[#4d3f2d]"
              }`}
            >
              {preference}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-[#8a7048]">Budget</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {(["low", "medium", "high"] as const).map((budget) => (
            <button
              key={budget}
              type="button"
              onClick={() => setQuiz((current) => ({ ...current, budget }))}
              className={`rounded-xl border px-3 py-2 text-sm ${quiz.budget === budget ? "bg-black text-white" : "bg-[#f8f3ea]"}`}
            >
              {budget}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-[#8a7048]">Trip duration</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {[1, 2, 3].map((dayCount) => (
            <button
              key={dayCount}
              type="button"
              onClick={() => setQuiz((current) => ({ ...current, tripDays: dayCount as 1 | 2 | 3 }))}
              className={`rounded-xl border px-3 py-2 text-sm ${quiz.tripDays === dayCount ? "bg-black text-white" : "bg-[#f8f3ea]"}`}
            >
              {dayCount} day{dayCount > 1 ? "s" : ""}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onSubmit(quiz)}
        className="w-full rounded-xl bg-black px-4 py-3 font-semibold text-white"
      >
        See recommendations
      </button>
    </div>
  );
}
