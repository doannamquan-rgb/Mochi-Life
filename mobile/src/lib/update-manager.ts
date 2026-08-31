import * as Updates from 'expo-updates'
import Constants from 'expo-constants'
import { useEffect, useCallback, useSyncExternalStore } from 'react'

export type OTAStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'reloading'
  | 'check_failed'
  | 'download_failed'
  | 'reload_failed'
  | 'rollback'

export interface OTAState {
  status: OTAStatus
  isEnabled: boolean
  isChecking: boolean
  isDownloading: boolean
  isUpdateAvailable: boolean
  isUpdateDownloaded: boolean
  isReloading: boolean
  isEmbeddedLaunch: boolean
  isEmergencyLaunch: boolean
  emergencyLaunchReason: string | null
  appVersion: string
  runtimeVersion: string
  channel: string
  runningUpdateId: string | null
  downloadedUpdateId: string | null
  createdAt: Date | null
  lastCheckedAt: Date | null
  error: string | null
}

// ---------------------------------------------------------------------------
// 1. Initial boot diagnostics & logging
// ---------------------------------------------------------------------------
const initialIsEmergency = Boolean(Updates.isEmergencyLaunch)
const initialEmergencyReason = Updates.emergencyLaunchReason || null
const initialIsEmbedded = Boolean(Updates.isEmbeddedLaunch)
const initialRunningUpdateId = Updates.updateId || null
const initialRuntimeVersion =
  typeof Updates.runtimeVersion === 'string'
    ? Updates.runtimeVersion
    : Constants.expoConfig?.runtimeVersion
      ? String(Constants.expoConfig.runtimeVersion)
      : '6.1.0'
const initialAppVersion = Constants.expoConfig?.version || '6.3.0'
const initialChannel = Updates.channel || 'development'

if (Updates.isEnabled) {
  if (initialIsEmergency) {
    console.warn(
      `[OTA] EMERGENCY_LAUNCH: Rollback active. Reason: ${initialEmergencyReason || 'Unknown'}`
    )
  } else if (initialIsEmbedded) {
    console.log(
      `[OTA] APP_BOOT: Source=EMBEDDED, RuntimeVersion=${initialRuntimeVersion}, Channel=${initialChannel}`
    )
  } else {
    console.log(
      `[OTA] APP_BOOT: Source=OTA, UpdateId=${initialRunningUpdateId}, RuntimeVersion=${initialRuntimeVersion}, Channel=${initialChannel}`
    )
  }
} else {
  console.log('[OTA] APP_BOOT: Updates disabled (__DEV__ or unsupported environment)')
}

// ---------------------------------------------------------------------------
// 2. Singleton Store Pattern (Single source of truth across all components)
// ---------------------------------------------------------------------------
let globalState: OTAState = {
  status: initialIsEmergency ? 'rollback' : 'idle',
  isEnabled: Boolean(Updates.isEnabled),
  isChecking: false,
  isDownloading: false,
  isUpdateAvailable: false,
  isUpdateDownloaded: false,
  isReloading: false,
  isEmbeddedLaunch: initialIsEmbedded,
  isEmergencyLaunch: initialIsEmergency,
  emergencyLaunchReason: initialEmergencyReason,
  appVersion: initialAppVersion,
  runtimeVersion: initialRuntimeVersion,
  channel: initialChannel,
  runningUpdateId: initialRunningUpdateId,
  downloadedUpdateId: null,
  createdAt: Updates.createdAt || null,
  lastCheckedAt: null,
  error: initialIsEmergency ? `Emergency Launch: ${initialEmergencyReason || 'Rollback triggered'}` : null,
}

const listeners = new Set<() => void>()

function emitChange() {
  for (const listener of listeners) {
    listener()
  }
}

function updateGlobalState(partial: Partial<OTAState>) {
  globalState = { ...globalState, ...partial }
  emitChange()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): OTAState {
  return globalState
}

function getServerSnapshot(): OTAState {
  return globalState
}

// ---------------------------------------------------------------------------
// 3. Single-Flight Concurrency Controls
// ---------------------------------------------------------------------------
let inFlightCheck: Promise<{ available: boolean; downloaded: boolean; error?: string }> | null = null
let inFlightFetch: Promise<boolean> | null = null
let inFlightReload: Promise<void> | null = null

/**
 * Check if a new update is available on EAS Update server.
 * Automatically fetches the update by default when found.
 */
export async function checkForUpdate(autoDownload = true): Promise<{
  available: boolean
  downloaded: boolean
  error?: string
}> {
  if (!Updates.isEnabled || __DEV__) {
    console.log('[OTA] CHECK_START: Skipped (__DEV__ or Updates disabled)')
    updateGlobalState({ isChecking: false, lastCheckedAt: new Date() })
    return { available: false, downloaded: false }
  }

  // Reuse in-flight check if one is already running
  if (inFlightCheck) {
    return inFlightCheck
  }

  inFlightCheck = (async () => {
    console.log(
      `[OTA] CHECK_START: Channel=${globalState.channel}, RuntimeVersion=${globalState.runtimeVersion}`
    )
    updateGlobalState({ isChecking: true, error: null, status: 'checking' })

    try {
      const checkResult = await Updates.checkForUpdateAsync()
      console.log(`[OTA] CHECK_RESULT: isAvailable=${checkResult.isAvailable}`)

      if (checkResult.isAvailable) {
        const manifestId = (checkResult.manifest as any)?.id || null
        console.log(`[OTA] UPDATE_AVAILABLE: UpdateId=${manifestId || 'unknown'}`)

        updateGlobalState({
          isChecking: false,
          isUpdateAvailable: true,
          status: 'available',
          lastCheckedAt: new Date(),
        })

        if (autoDownload) {
          const downloadSuccess = await fetchUpdate()
          return { available: true, downloaded: downloadSuccess }
        }

        return { available: true, downloaded: false }
      }

      // No update available
      updateGlobalState({
        isChecking: false,
        isUpdateAvailable: false,
        status: globalState.isEmergencyLaunch ? 'rollback' : 'idle',
        lastCheckedAt: new Date(),
      })
      return { available: false, downloaded: false }
    } catch (err: any) {
      const safeMessage = err?.message || 'Không thể kiểm tra cập nhật'
      console.warn(`[OTA] CHECK_FAILED: ${safeMessage}`)
      updateGlobalState({
        isChecking: false,
        status: 'check_failed',
        error: safeMessage,
        lastCheckedAt: new Date(),
      })
      return { available: false, downloaded: false, error: safeMessage }
    } finally {
      inFlightCheck = null
    }
  })()

  return inFlightCheck
}

/**
 * Downloads the available update bundle from the update server into local storage.
 */
export async function fetchUpdate(): Promise<boolean> {
  if (!Updates.isEnabled || __DEV__) return false

  if (inFlightFetch) {
    return inFlightFetch
  }

  inFlightFetch = (async () => {
    console.log('[OTA] FETCH_START: Fetching new bundle...')
    updateGlobalState({ isDownloading: true, status: 'downloading', error: null })

    try {
      const fetchResult = await Updates.fetchUpdateAsync()
      const manifestId = (fetchResult.manifest as any)?.id || null
      console.log(`[OTA] FETCH_SUCCESS: isNew=${fetchResult.isNew}, UpdateId=${manifestId || 'unknown'}`)

      if (fetchResult.isNew || fetchResult.manifest) {
        updateGlobalState({
          isDownloading: false,
          isUpdateDownloaded: true,
          downloadedUpdateId: manifestId,
          status: 'downloaded',
        })
        return true
      } else {
        updateGlobalState({
          isDownloading: false,
          status: 'idle',
        })
        return false
      }
    } catch (err: any) {
      const safeMessage = err?.message || 'Không thể tải bản cập nhật'
      console.error(`[OTA] FETCH_FAILED: ${safeMessage}`, err)
      updateGlobalState({
        isDownloading: false,
        status: 'download_failed',
        error: safeMessage,
      })
      return false
    } finally {
      inFlightFetch = null
    }
  })()

  return inFlightFetch
}

/**
 * Reloads the application natively using Updates.reloadAsync() to apply the downloaded bundle.
 * Completely eliminates BackHandler.exitApp() and guarantees clean React Native restart.
 */
export async function reloadAndApplyUpdate(): Promise<void> {
  if (!Updates.isEnabled) {
    console.log('[OTA] RELOAD_START: Updates is not enabled, skipping reload')
    return
  }

  // Prevent multiple concurrent reloads / double-tap
  if (globalState.isReloading || inFlightReload) {
    console.log('[OTA] RELOAD_START: Reload already in progress, ignoring duplicate call')
    return
  }

  inFlightReload = (async () => {
    console.log('[OTA] RELOAD_START: Calling Updates.reloadAsync()...')
    updateGlobalState({ isReloading: true, status: 'reloading' })

    try {
      await Updates.reloadAsync()
      // NOTE: Do NOT place any meaningful logic or state updates after await Updates.reloadAsync().
      // The native JS runtime will be torn down and restarted by expo-updates.
    } catch (err: any) {
      const safeMessage = err?.message || 'Lỗi khởi động lại ứng dụng'
      console.error(`[OTA] RELOAD_FAILED: ${safeMessage}`, err)
      updateGlobalState({
        isReloading: false,
        status: 'reload_failed',
        error: safeMessage,
      })
      inFlightReload = null
      throw err
    }
  })()

  return inFlightReload
}

// ---------------------------------------------------------------------------
// 4. Auto-check on launch (Runs once per app process)
// ---------------------------------------------------------------------------
let hasInitiatedAutoCheck = false

function initAutoCheckOnce() {
  if (hasInitiatedAutoCheck || !Updates.isEnabled || __DEV__) return
  hasInitiatedAutoCheck = true

  // Delay initial check by 5 seconds to let UI fully mount and stabilize
  const timer = setTimeout(() => {
    checkForUpdate(true).catch(() => {})
  }, 5000)

  return () => clearTimeout(timer)
}

// ---------------------------------------------------------------------------
// 5. Main React Hook: useAppUpdates
// ---------------------------------------------------------------------------
/**
 * React hook exposing the shared singleton OTA state and update actions.
 */
export function useAppUpdates() {
  const currentSnapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  useEffect(() => {
    initAutoCheckOnce()
  }, [])

  return {
    ...currentSnapshot,
    checkForUpdate: useCallback((autoDownload = true) => checkForUpdate(autoDownload), []),
    fetchUpdate: useCallback(() => fetchUpdate(), []),
    reloadAndApplyUpdate: useCallback(() => reloadAndApplyUpdate(), []),
  }
}
