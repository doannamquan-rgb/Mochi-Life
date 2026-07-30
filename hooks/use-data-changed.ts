'use client'

import { useEffect } from 'react'
import type { DataModule, DataChangeEventDetail } from '@/lib/events'

/**
 * Hook to listen for data change events and window focus/visibility changes
 * to trigger callback for refreshing component state without full page reload (F5).
 */
export function useDataChanged(moduleFilter: DataModule, callback: () => void) {
  useEffect(() => {
    function handleDataChangeEvent(e: Event) {
      const customEvent = e as CustomEvent<DataChangeEventDetail>
      const mod = customEvent.detail?.module
      if (mod === 'all' || mod === moduleFilter || moduleFilter === 'all') {
        callback()
      }
    }

    function handleVisibilityOrFocus() {
      if (document.visibilityState === 'visible') {
        callback()
      }
    }

    window.addEventListener('mochi:data-changed', handleDataChangeEvent)
    window.addEventListener('focus', handleVisibilityOrFocus)
    document.addEventListener('visibilitychange', handleVisibilityOrFocus)

    return () => {
      window.removeEventListener('mochi:data-changed', handleDataChangeEvent)
      window.removeEventListener('focus', handleVisibilityOrFocus)
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus)
    }
  }, [moduleFilter, callback])
}
