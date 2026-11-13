'use client';

import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Wrap a group of tooltips: the first one waits a moment (no flicker while the pointer passes by), the next ones
 * in the group open at once and without animation while one is still showing.
 */
function TooltipProvider(props: { children: ReactNode }) {
  return (
    <TooltipPrimitive.Provider delay={0} closeDelay={0}>
      {props.children}
    </TooltipPrimitive.Provider>
  );
}

type TooltipProps = {
  /** The element that shows the tooltip (rendered as is, so a span stays a span inside a link). */
  trigger: TooltipPrimitive.Trigger.Props['render'];
  content: ReactNode;
  side?: TooltipPrimitive.Positioner.Props['side'];
  className?: string;
};

/** A small dark label that grows from its trigger: 125ms ease-out, instant for the next one in a group. */
function Tooltip(props: TooltipProps) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger render={props.trigger} />
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner side={props.side ?? 'bottom'} sideOffset={6} className="z-50">
          <TooltipPrimitive.Popup
            className={cn(
              'max-w-72 origin-(--transform-origin) rounded-lg bg-foreground px-2.5 py-1.5 text-xs text-background shadow-[0_8px_24px_-8px_rgb(15_31_27/0.4)] transition-[transform,opacity] duration-125 ease-out data-ending-style:scale-[0.97] data-ending-style:opacity-0 data-instant:duration-0 data-starting-style:scale-[0.97] data-starting-style:opacity-0',
              props.className,
            )}>
            {props.content}
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

export { Tooltip, TooltipProvider };
