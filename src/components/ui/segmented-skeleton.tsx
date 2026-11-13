import type { ReactNode } from 'react';
import { segmentedGroup, segmentedItem } from './segmented';

type SegmentedSkeletonProps = {
  /** The real options (label, or icon + label). */
  options: ReactNode[];
  /** Which one shows as selected (default the first); null when the choice is not known yet. */
  selected?: number | null;
};

/** A segmented control drawn exactly as it will be (same labels), inert until the page arrives. */
export function SegmentedSkeleton(props: SegmentedSkeletonProps) {
  return (
    <div aria-hidden className={segmentedGroup}>
      {props.options.map((option, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: a fixed list of options; the position is their identity.
        <span key={index} className={segmentedItem(index === (props.selected === undefined ? 0 : props.selected))}>
          {option}
        </span>
      ))}
    </div>
  );
}
