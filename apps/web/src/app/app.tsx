import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppToaster } from '@/design-system/toast';
import { SessionProvider } from '@/features/auth/session-provider';
import { createQueryClient } from '@/lib/query-client';
import { AppRouter } from './router';

export function App() {
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SessionProvider>
          <AppRouter />
        </SessionProvider>
        <AppToaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
