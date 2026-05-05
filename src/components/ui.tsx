import { ReactNode } from "react";
import clsx from "clsx";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={clsx(
        "rounded-3xl border border-[#ece7de] bg-white p-5 shadow-[0_2px_20px_rgba(15,23,42,0.04)]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-[#e9e1d4] bg-[#fbf8f2] px-3 py-1 text-xs font-semibold text-[#5f4d2f]">
      {children}
    </span>
  );
}
