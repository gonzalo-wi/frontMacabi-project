import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode, useState } from 'react'

import { AuthProvider } from '@/contexts/AuthContext'

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>

    </QueryClientProvider>
  )
}
