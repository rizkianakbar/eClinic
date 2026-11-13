'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useLayoutEffect, useRef, useState } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { useMessage } from '@/i18n/message';
import { type ErrorText, makeQueryClient } from '@/lib/query';

type ProvidersProps = {
  children: ReactNode;
};

export function Providers(props: ProvidersProps) {
  const message = useMessage();
  const errorText = useRef<ErrorText>(message);
  const [queryClient] = useState(() => makeQueryClient(errorText));

  // The toast reads the current language's text (it changes when someone switches language).
  useLayoutEffect(() => {
    errorText.current = message;
  });

  return (
    <QueryClientProvider client={queryClient}>
      {props.children}
      <Toaster richColors position="top-center" />
    </QueryClientProvider>
  );
}
