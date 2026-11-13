'use client';

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { XIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ComponentProps } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/*
 * Right-side drawer for create/edit forms: the page stays in view behind it.
 * Slides on the iOS drawer curve; enters and exits along the same path.
 */
const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;

type SheetContentProps = DialogPrimitive.Popup.Props & {
  /** "md" for most forms, "lg" for wide ones (prescriptions, purchases). */
  size?: 'md' | 'lg';
};

function SheetContent({ className, children, size = 'md', ...props }: SheetContentProps) {
  const t = useTranslations('common');

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-[#0b1714]/25 transition-opacity duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] data-ending-style:opacity-0 data-starting-style:opacity-0" />
      <DialogPrimitive.Popup
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-background text-sm shadow-[-24px_0_64px_-24px_rgb(15_31_27/0.35)] outline-none transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] data-ending-style:translate-x-full data-starting-style:translate-x-full sm:inset-y-2 sm:right-2 sm:rounded-2xl sm:border',
          size === 'md' ? 'sm:max-w-md' : 'sm:max-w-2xl',
          className,
        )}
        {...props}>
        {children}
        <DialogPrimitive.Close
          render={<Button variant="ghost" size="icon-sm" className="absolute top-3.5 right-3.5" />}>
          <XIcon />
          <span className="sr-only">{t('close')}</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  );
}

function SheetHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-1 border-b px-5 pt-5 pb-4 pr-14', className)} {...props} />;
}

function SheetTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return <DialogPrimitive.Title className={cn('text-base leading-tight font-semibold', className)} {...props} />;
}

function SheetDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return <DialogPrimitive.Description className={cn('text-sm text-muted-foreground', className)} {...props} />;
}

/** Scrolls on its own; header and footer stay put. */
function SheetBody({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-5 py-5', className)}
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse gap-2 border-t bg-card px-5 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:rounded-b-2xl',
        className,
      )}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
};
