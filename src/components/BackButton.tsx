"use client";

import { useRouter } from "next/navigation";

type BackButtonProps = {
  fallbackHref?: string;
  label?: string;
  className?: string;
};

export function BackButton({
  fallbackHref = "/",
  label = "Back",
  className = "",
}: BackButtonProps) {
  const router = useRouter();

  const onBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push(fallbackHref);
  };

  return (
    <button
      type="button"
      onClick={onBack}
      className={`inline-flex rounded-xl border border-[#d9cfbd] bg-[#faf7f1] px-3 py-2 text-sm font-semibold text-[#4e3f2f] ${className}`}
    >
      {label}
    </button>
  );
}
