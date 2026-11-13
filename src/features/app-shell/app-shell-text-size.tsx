"use client";

import { useSyncExternalStore } from "react";
import { segmentedGroup, segmentedItem } from "@/components/ui/segmented";
import {
  parseTextSize,
  TEXT_SIZE_STORAGE_KEY,
  TEXT_SIZES,
  type TextSize,
} from "./app-shell.lib";

const CHANGE_EVENT = "e-clinic:text-size-change";

// The <html data-text-size> attribute (set before paint) is the source of truth.
const readTextSize = (): TextSize =>
  parseTextSize(document.documentElement.dataset.textSize);

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

function applyTextSize(size: TextSize) {
  if (size === "normal") delete document.documentElement.dataset.textSize;
  else document.documentElement.dataset.textSize = size;
  try {
    localStorage.setItem(TEXT_SIZE_STORAGE_KEY, size);
  } catch {
    // Storage blocked: the size still applies for this page view.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Per-computer text size (shared PCs: each workstation keeps its own). */
export function AppShellTextSize() {
  const size = useSyncExternalStore(
    subscribe,
    readTextSize,
    () => "normal" as const,
  );

  return (
    <div role="radiogroup" aria-label="Ukuran teks" className={segmentedGroup}>
      {TEXT_SIZES.map((option, index) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={size === option.value}
          onClick={() => applyTextSize(option.value)}
          className={segmentedItem(size === option.value)}
        >
          <span
            className="font-semibold"
            style={{ fontSize: `${0.75 + index * 0.15}rem` }}
            aria-hidden
          >
            A
          </span>
          {option.label}
        </button>
      ))}
    </div>
  );
}
