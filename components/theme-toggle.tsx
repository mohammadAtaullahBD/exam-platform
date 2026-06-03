"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";

type ThemeMode = "system" | "light" | "dark";

const storageKey = "exam-platform-theme";
const themeChangeEvent = "exam-platform-theme-change";

function getStoredMode(): ThemeMode {
  if (typeof window === "undefined") {
    return "system";
  }

  const stored = window.localStorage.getItem(storageKey);

  return stored === "light" || stored === "dark" || stored === "system"
    ? stored
    : "system";
}

function applyTheme(mode: ThemeMode) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved = mode === "system" ? (prefersDark ? "dark" : "light") : mode;

  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.dataset.themeMode = mode;
}

export function ThemeToggle() {
  const mode = useSyncExternalStore<ThemeMode>(
    (onStoreChange) => {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      const onMediaChange = () => {
        if (getStoredMode() === "system") {
          onStoreChange();
        }
      };

      window.addEventListener("storage", onStoreChange);
      window.addEventListener(themeChangeEvent, onStoreChange);
      media.addEventListener("change", onMediaChange);

      return () => {
        window.removeEventListener("storage", onStoreChange);
        window.removeEventListener(themeChangeEvent, onStoreChange);
        media.removeEventListener("change", onMediaChange);
      };
    },
    getStoredMode,
    () => "system",
  );

  useEffect(() => {
    applyTheme(mode);
  }, [mode]);

  function updateMode(nextMode: ThemeMode) {
    window.localStorage.setItem(storageKey, nextMode);
    applyTheme(nextMode);
    window.dispatchEvent(new Event(themeChangeEvent));
  }

  const options = [
    { value: "system", label: "System", icon: Monitor },
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
  ] satisfies Array<{
    value: ThemeMode;
    label: string;
    icon: typeof Monitor;
  }>;

  return (
    <div
      aria-label="Theme"
      className="inline-flex rounded-md border border-[#cfd8d2] bg-white p-1 shadow-sm dark:border-[#3c4d42] dark:bg-[#1a241e]"
      role="group"
    >
      {options.map((option) => {
        const Icon = option.icon;
        const isActive = mode === option.value;

        return (
          <button
            aria-pressed={isActive}
            className={`inline-flex h-9 items-center gap-2 rounded px-3 text-sm font-semibold transition ${
              isActive
                ? "bg-[#17211b] text-white dark:bg-[#edf3ec] dark:text-[#17211b]"
                : "text-[#607066] hover:bg-[#eef5f0] hover:text-[#1f3528] dark:text-[#b8c7bb] dark:hover:bg-[#223126] dark:hover:text-[#edf3ec]"
            }`}
            key={option.value}
            onClick={() => updateMode(option.value)}
            title={`${option.label} theme`}
            type="button"
          >
            <Icon className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
