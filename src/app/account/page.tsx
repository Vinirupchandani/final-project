"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AppTabs } from "@/components/AppTabs";
import { BackButton } from "@/components/BackButton";
import {
  getActiveUserName,
  loadUserVisits,
  logoutUser,
  saveUserVisits,
  seedStarterVisitsIfEmpty,
  setActiveUser,
  STARTER_VISITS,
  type UserAccount,
  type UserVisit,
} from "@/lib/user-profile";

export default function AccountPage() {
  const [nameInput, setNameInput] = useState("");
  const [activeName, setActiveName] = useState<string | null>(null);
  const [visits, setVisits] = useState<UserVisit[]>([]);

  const refresh = useCallback(() => {
    const name = getActiveUserName();
    setActiveName(name);
    if (name) {
      setVisits(
        loadUserVisits(name).sort((a, b) => b.rankScore - a.rankScore || b.rating - a.rating)
      );
    } else {
      setVisits([]);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const signInOrCreate = () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    const account: UserAccount = { userName: trimmed, createdAt: new Date().toISOString() };
    setActiveUser(account);
    seedStarterVisitsIfEmpty(trimmed);
    setNameInput("");
    refresh();
    window.dispatchEvent(new Event("wandr-auth-changed"));
  };

  const loadDemoProfile = () => {
    const demo = STARTER_VISITS[0]?.userName;
    if (!demo) return;
    setActiveUser({ userName: demo, createdAt: new Date().toISOString() });
    seedStarterVisitsIfEmpty(demo);
    refresh();
    window.dispatchEvent(new Event("wandr-auth-changed"));
  };

  const onLogout = () => {
    logoutUser();
    refresh();
    window.dispatchEvent(new Event("wandr-auth-changed"));
  };

  const removeVisit = (place: string) => {
    if (!activeName) return;
    const next = loadUserVisits(activeName).filter((v) => v.place.toLowerCase() !== place.toLowerCase());
    saveUserVisits(activeName, next);
    refresh();
  };

  const hasDemoSeed = STARTER_VISITS.length > 0;

  return (
    <main className="mx-auto min-h-screen max-w-3xl space-y-6 bg-[#f6f3ee] p-6">
      <AppTabs active="feed" />
      <BackButton fallbackHref="/" />

      <section className="rounded-2xl border border-[#eadfce] bg-white p-5">
        <h1 className="text-2xl font-black text-[#1f1a15]">Your profile</h1>
        <p className="mt-2 text-sm text-[#5d4d3c]">
          Rankings and visits are saved in this browser only (localStorage). Use the same device to see them on
          destination pages and in recommendations.
        </p>

        {!activeName ? (
          <div className="mt-4 space-y-3">
            <label className="block text-sm font-semibold text-[#3a3026]">Display name</label>
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="e.g. Vini Rupchandani"
              className="w-full rounded-xl border border-[#d9cfbd] bg-[#faf7f1] px-3 py-2 text-[#1f1a15]"
            />
            <button
              type="button"
              onClick={signInOrCreate}
              className="rounded-xl bg-[#0f5a6c] px-4 py-2 text-sm font-semibold text-white"
            >
              Create account / sign in
            </button>
            {hasDemoSeed && (
              <div className="rounded-xl border border-dashed border-[#d9cfbd] bg-[#fffdf9] p-3">
                <p className="text-sm text-[#5d4d3c]">
                  Have the demo Tokyo list? Load it under the name <strong>{STARTER_VISITS[0]?.userName}</strong>.
                </p>
                <button
                  type="button"
                  onClick={loadDemoProfile}
                  className="mt-2 rounded-xl border border-[#d9cfbd] bg-white px-3 py-2 text-sm font-semibold text-[#4e3f2f]"
                >
                  Load demo visits (Tokyo)
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-[#5d4d3c]">
              Signed in as <strong className="text-[#1f1a15]">{activeName}</strong>
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onLogout}
                className="rounded-xl border border-[#d9cfbd] bg-white px-3 py-2 text-sm font-semibold text-[#4e3f2f]"
              >
                Sign out
              </button>
              <Link href="/quiz" className="rounded-xl bg-black px-3 py-2 text-sm font-semibold text-white">
                New trip quiz
              </Link>
            </div>
          </div>
        )}
      </section>

      {activeName && (
        <section className="rounded-2xl border border-[#eadfce] bg-white p-5">
          <h2 className="text-lg font-bold text-[#1f1a15]">My ranked places ({visits.length})</h2>
          <p className="mt-1 text-sm text-[#6d5844]">
            Higher rank score means you preferred that spot in head-to-head comparisons. Open any recommendation →
            destination page to add or update a place.
          </p>
          {visits.length === 0 ? (
            <p className="mt-3 text-sm text-[#5d4d3c]">No visits yet. Rank a place from a destination page.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {visits.map((v) => (
                <li
                  key={`${v.place}-${v.createdAt}`}
                  className="flex flex-col gap-1 rounded-xl border border-[#eadfce] bg-[#fffdf9] p-3 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-[#1f1a15]">{v.place}</p>
                    <p className="text-xs text-[#6d5844]">
                      {v.city || "—"} · {v.rating}/5 · rank {Math.round(v.rankScore)}
                    </p>
                    <p className="mt-1 text-sm text-[#6b5742]">Tags: {v.tags.join(", ")}</p>
                    {v.notes ? <p className="mt-1 text-sm text-[#3c3024]">{v.notes}</p> : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeVisit(v.place)}
                    className="shrink-0 self-start text-xs font-semibold text-red-700 underline"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}
