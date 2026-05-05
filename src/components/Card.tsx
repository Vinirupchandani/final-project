"use client";

import { ReactNode } from "react";

export function PlaceCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#e8e0d4] bg-white p-4 shadow-sm">
      {children}
    </div>
  );
}
