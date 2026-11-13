'use client';

import { Menu as MenuPrimitive } from '@base-ui/react/menu';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

const DropdownMenu = MenuPrimitive.Root;
const DropdownMenuTrigger = MenuPrimitive.Trigger;
const DropdownMenuGroup = MenuPrimitive.Group;

type DropdownMenuContentProps = MenuPrimitive.Popup.Props & {
  align?: MenuPrimitive.Positioner.Props['align'];
  side?: MenuPrimitive.Positioner.Props['side'];
  sideOffset?: number;
};

/** Grows from its trigger (origin-aware), 150ms ease-out; instant when opened by keyboard is fine. */
function DropdownMenuContent({
  className,
  align = 'end',
  side = 'bottom',
  sideOffset = 6,
  ...props
}: DropdownMenuContentProps) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner align={align} side={side} sideOffset={sideOffset} className="z-50 outline-none">
        <MenuPrimitive.Popup
          className={cn(
            'min-w-48 origin-(--transform-origin) rounded-xl border bg-popover p-1 text-sm text-popover-foreground shadow-[0_16px_40px_-12px_rgb(15_31_27/0.25),0_2px_6px_rgb(15_31_27/0.06)] outline-none transition-[transform,opacity] duration-150 ease-out data-ending-style:scale-[0.97] data-ending-style:opacity-0 data-starting-style:scale-[0.97] data-starting-style:opacity-0',
            className,
          )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

const itemClass =
  'flex h-8 w-full cursor-default items-center gap-2 rounded-lg px-2 text-sm outline-none select-none data-highlighted:bg-muted data-disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground';

type DropdownMenuItemProps = MenuPrimitive.Item.Props & {
  tone?: 'default' | 'destructive';
};

function DropdownMenuItem({ className, tone = 'default', ...props }: DropdownMenuItemProps) {
  return (
    <MenuPrimitive.Item
      className={cn(
        itemClass,
        tone === 'destructive' && 'text-destructive data-highlighted:bg-status-cancelled-soft [&_svg]:text-destructive',
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuLinkItem({ className, ...props }: MenuPrimitive.LinkItem.Props) {
  return <MenuPrimitive.LinkItem className={cn(itemClass, className)} {...props} />;
}

function DropdownMenuLabel({ className, ...props }: MenuPrimitive.GroupLabel.Props) {
  return (
    <MenuPrimitive.GroupLabel
      className={cn('px-2 pt-1.5 pb-1 text-xs font-medium text-muted-foreground', className)}
      {...props}
    />
  );
}

function DropdownMenuSeparator({ className, ...props }: ComponentProps<typeof MenuPrimitive.Separator>) {
  return <MenuPrimitive.Separator className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />;
}

export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
};
