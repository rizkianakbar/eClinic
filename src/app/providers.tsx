'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { makeQueryClient } from '@/lib/query';

type ProvidersProps = {
  children: ReactNode;
};

export function Providers(props: ProvidersProps) {
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      {props.children}
      <Toaster richColors position="top-center" />
    </QueryClientProvider>
  );
}
