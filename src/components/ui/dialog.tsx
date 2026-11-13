'use client';

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { cn } from 'cn';
import { XIcon } from 'lucide-react';
import type * as React from 'react';
import { Button } from '@/components/ui/button';

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({ className, ...props }: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        // Transitions (not keyframes): they hold the faded-out state until unmount, so no flash on close.
        'fixed inset-0 isolate z-50 bg-[#0b1714]/30 backdrop-blur-[2px] transition-opacity duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] data-starting-style:opacity-0 data-ending-style:opacity-0',
        className,
      )}
      {...props}
    />
  );
}

/*
 * "dialog": centred, for quick confirmations.
 * "drawer": slides in from the right for create/edit forms; the page stays in
 * view, the footer stays pinned while the fields scroll.
 */
function DialogContent({
  className,
  children,
  showCloseButton = true,
  variant = 'dialog',
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean;
  variant?: 'dialog' | 'drawer';
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        data-variant={variant}
        className={cn(
          'group/dialog z-50 overflow-y-auto overscroll-contain bg-popover p-5 text-sm text-popover-foreground outline-none',
          variant === 'dialog' &&
            'fixed top-1/2 left-1/2 grid max-h-[calc(100dvh-2rem)] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-5 rounded-xl shadow-[0_24px_64px_-16px_rgb(15_31_27/0.35)] ring-1 ring-foreground/8 transition-[opacity,scale] duration-200 ease-out sm:max-w-md data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0',
          variant === 'drawer' &&
            'fixed inset-y-0 right-0 flex w-full max-w-full flex-col gap-5 bg-background shadow-[-24px_0_64px_-24px_rgb(15_31_27/0.35)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] sm:inset-y-2 sm:right-2 sm:max-w-md sm:rounded-2xl sm:border data-starting-style:translate-x-[calc(100%+1rem)] data-ending-style:translate-x-[calc(100%+1rem)] [&>form]:flex [&>form]:flex-1 [&>form]:flex-col',
          className,
        )}
        {...props}>
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={<Button variant="ghost" className="absolute top-3 right-3" size="icon-sm" />}>
            <XIcon />
            <span className="sr-only">Tutup</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        'flex flex-col gap-1.5 group-data-[variant=drawer]/dialog:-mx-5 group-data-[variant=drawer]/dialog:-mt-5 group-data-[variant=drawer]/dialog:border-b group-data-[variant=drawer]/dialog:px-5 group-data-[variant=drawer]/dialog:pt-5 group-data-[variant=drawer]/dialog:pb-4',
        className,
      )}
      {...props}
    />
  );
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  showCloseButton?: boolean;
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        '-mx-5 -mb-5 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 px-5 py-3.5 sm:flex-row sm:justify-end group-data-[variant=drawer]/dialog:sticky group-data-[variant=drawer]/dialog:-bottom-5 group-data-[variant=drawer]/dialog:mt-auto group-data-[variant=drawer]/dialog:bg-card group-data-[variant=drawer]/dialog:pb-[max(0.875rem,env(safe-area-inset-bottom))]',
        className,
      )}
      {...props}>
      {children}
      {showCloseButton && <DialogPrimitive.Close render={<Button variant="outline" />}>Tutup</DialogPrimitive.Close>}
    </div>
  );
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('font-heading pr-8 text-base leading-tight font-semibold', className)}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        'text-sm leading-relaxed text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground',
        className,
      )}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
