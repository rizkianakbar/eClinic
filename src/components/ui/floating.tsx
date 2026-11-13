"use client";

import { useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
import { cn } from "@/lib/utils";

type FloatingProps = {
  /** The input (or wrapper) the panel hangs from. */
  anchor: RefObject<HTMLElement | null>;
  className?: string;
  children: ReactNode;
};

const GAP = 4;
const MIN_SPACE = 240;
const MAX_HEIGHT = 320;

/**
 * A suggestion panel rendered above the page, so a card, table or list with
 * `overflow: hidden` can never cut it off. It matches the anchor's width,
 * opens below (or above when there is no room), and follows scrolling.
 * It stays in place in the DOM (no portal): `position: fixed` already escapes
 * the clipping, and inside a dialog a pick is not a click outside it.
 */
export function Floating(props: FloatingProps) {
  const panel = useRef<HTMLDivElement>(null);

  // Positioning is written straight to the DOM: it changes on every scroll, no re-render needed.
  useLayoutEffect(() => {
    function place() {
      const anchor = props.anchor.current;
      const node = panel.current;
      if (!anchor || !node) return;
      const rect = anchor.getBoundingClientRect();
      const below = window.innerHeight - rect.bottom;
      const above = rect.top;
      const up = below < MIN_SPACE && above > below;
      node.style.left = `${rect.left}px`;
      node.style.width = `${rect.width}px`;
      node.style.top = up ? "" : `${rect.bottom + GAP}px`;
      node.style.bottom = up ? `${window.innerHeight - rect.top + GAP}px` : "";
      node.style.maxHeight = `${Math.min(MAX_HEIGHT, Math.max(160, (up ? above : below) - GAP * 4))}px`;
    }
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [props.anchor]);

  return (
    <div
      ref={panel}
      className={cn(
        "fixed z-[60] flex flex-col overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-[0_16px_40px_-12px_rgb(15_31_27/0.25)]",
        props.className,
      )}
    >
      {props.children}
    </div>
  );
}
