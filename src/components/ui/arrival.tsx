'use client';

import { createContext, type ReactNode, use, useState } from 'react';

/**
 * Rows that mount this long after their list first showed are live arrivals (another desk's change via
 * Realtime). Anything rendered with the list itself, on page load or navigation, is not.
 */
const SETTLE_MS = 1000;

const ArrivalContext = createContext<number | null>(null);

type ArrivalScopeProps = {
  /** False while the list's data is still loading, so the first batch does not count as arrivals. */
  ready?: boolean;
  children: ReactNode;
};

/** Marks when a live list first showed. Place it above the list's empty state, so the first arrival counts too. */
export function ArrivalScope(props: ArrivalScopeProps) {
  const ready = props.ready ?? true;
  const [start, setStart] = useState<number | null>(() => (ready ? Date.now() : null));

  // Data just arrived: the list starts now. Adjusting state during render, per React docs.
  if (ready && start === null) setStart(Date.now());

  return <ArrivalContext value={start}>{props.children}</ArrivalContext>;
}

/** True when this row arrived live, decided once when it mounts. */
export function useArriving() {
  const start = use(ArrivalContext);
  const [arriving] = useState(() => start !== null && Date.now() - start > SETTLE_MS);

  return arriving;
}

type ArrivalProps = {
  as?: 'div' | 'li';
  className?: string;
  children: ReactNode;
};

/**
 * A list row that fades in from just above when it arrives live (`[data-arriving]` in globals.css).
 * The element must not carry its own `transition-*` classes: they would replace the arrival transition.
 */
export function Arrival(props: ArrivalProps) {
  const arriving = useArriving();
  const Tag = props.as ?? 'div';

  return (
    <Tag data-arriving={arriving || undefined} className={props.className}>
      {props.children}
    </Tag>
  );
}
