'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils';
import { segmentedGroup, segmentedRadioItem } from './segmented';

type SegmentedControlProps<T extends string> = {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
};

/** A small set of mutually exclusive views (filters, modes): native radios, so arrow keys move between them. */
export function SegmentedControl<T extends string>(props: SegmentedControlProps<T>) {
  const name = useId();

  return (
    <fieldset className={cn(segmentedGroup, props.className)}>
      <legend className="sr-only">{props.label}</legend>
      {props.options.map((option) => (
        <label key={option.value} className={segmentedRadioItem}>
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={props.value === option.value}
            onChange={() => props.onChange(option.value)}
            className="sr-only"
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}
