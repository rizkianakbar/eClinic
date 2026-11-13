"use client";

import { cn } from "@/lib/utils";
import { segmentedGroup, segmentedItem } from "./segmented";

type SegmentedControlProps<T extends string> = {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
};

/** A small set of mutually exclusive views (filters, modes). */
export function SegmentedControl<T extends string>(props: SegmentedControlProps<T>) {
  return (
    <div role="radiogroup" aria-label={props.label} className={cn(segmentedGroup, props.className)}>
      {props.options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={props.value === option.value}
          onClick={() => props.onChange(option.value)}
          className={segmentedItem(props.value === option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
