"use client";

import { useEffect, useState } from "react";

type Appearance = "dark" | "light";
const STORAGE_KEY = "veto-sport-appearance";

function storedAppearance(): Appearance {
  if (typeof window === "undefined") return "dark";
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function applyAppearance(next: Appearance) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.vetoSportAppearance = next;
  document.documentElement.style.colorScheme = next;
  document.querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", next === "light" ? "#f5f7fb" : "#07090c");
}

export function SportAppearanceToggle() {
  const [appearance, setAppearance] = useState<Appearance>("dark");

  useEffect(() => {
    const value = storedAppearance();
    setAppearance(value);
    applyAppearance(value);
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) {
        const next = storedAppearance();
        setAppearance(next);
        applyAppearance(next);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggle = () => {
    const next = appearance === "dark" ? "light" : "dark";
    applyAppearance(next);
    setAppearance(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private windows may deny localStorage. Switching stays functional.
    }
  };

  const label = appearance === "dark" ? "Включить светлую тему" : "Включить тёмную тему";
  return (
    <button
      type="button"
      className="vetoSportAppearanceToggle"
      onClick={toggle}
      title={label}
      aria-label={label}
      aria-pressed={appearance === "light"}
      data-appearance={appearance}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {appearance === "dark" ? (
          <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></>
        ) : (
          <path d="M20.98 13.02A9 9 0 0 1 10.98 3.02 9 9 0 1 0 20.98 13.02Z" />
        )}
      </svg>
      <span>{appearance === "dark" ? "Светлая" : "Тёмная"}</span>
    </button>
  );
}
