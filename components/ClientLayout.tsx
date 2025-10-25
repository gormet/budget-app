'use client'

import { Suspense } from 'react'
import { WorkspaceProvider } from '@/lib/workspace-context'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <WorkspaceProvider>
        {children}
      </WorkspaceProvider>
    </Suspense>
  )
}

