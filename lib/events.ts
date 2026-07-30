export type DataModule = 'chinese' | 'fitness' | 'expenses' | 'all'

export type DataChangeEventDetail = {
  module: DataModule
  entity?: string
  courseId?: string
}

/**
 * Dispatch a custom event to notify all mounted components that data has changed.
 */
export function notifyDataChanged(module: DataModule = 'all', entity?: string, courseId?: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<DataChangeEventDetail>('mochi:data-changed', {
        detail: { module, entity, courseId },
      })
    )
  }
}
