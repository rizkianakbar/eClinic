'use client';

import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from 'lucide-react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

/* Light theme only. */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      duration={5000}
      closeButton
      icons={{
        success: <CircleCheckIcon className="size-4 text-primary" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4 text-status-waiting" />,
        error: <OctagonXIcon className="size-4 text-destructive" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': '0.75rem',
          '--width': '22rem',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: 'text-sm! leading-snug! gap-2.5! shadow-[0_12px_32px_-12px_rgb(15_31_27/0.25)]!',
          title: 'font-medium!',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
