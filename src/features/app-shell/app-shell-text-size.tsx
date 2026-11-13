'use client';

import { useSyncExternalStore } from 'react';
import { segmentedGroup, segmentedRadioItem } from '@/components/ui/segmented';
import { parseTextSize, TEXT_SIZE_STORAGE_KEY, TEXT_SIZES, type TextSize } from './app-shell.lib';

const CHANGE_EVENT = 'e-clinic:text-size-change';

// The <html data-text-size> attribute (set before paint) is the source of truth.
const readTextSize = (): TextSize => parseTextSize(document.documentElement.dataset.textSize);

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);

  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

function applyTextSize(size: TextSize) {
  if (size === 'normal') delete document.documentElement.dataset.textSize;
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
  const size = useSyncExternalStore(subscribe, readTextSize, () => 'normal' as const);

  return (
    <fieldset className={segmentedGroup}>
      <legend className="sr-only">Ukuran teks</legend>
      {TEXT_SIZES.map((option, index) => (
        <label key={option.value} className={segmentedRadioItem}>
          <input
            type="radio"
            name="text-size"
            value={option.value}
            checked={size === option.value}
            onChange={() => applyTextSize(option.value)}
            className="sr-only"
          />
          <span className="font-semibold" style={{ fontSize: `${0.75 + index * 0.15}rem` }} aria-hidden>
            A
          </span>
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}
