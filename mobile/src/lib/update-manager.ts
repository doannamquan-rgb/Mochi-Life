import * as Updates from 'expo-updates'
import Constants from 'expo-constants'
import { useState, useEffect, useCallback } from 'react'

export interface UpdateInfo {
  isEnabled: boolean
  isChecking: boolean
  isDownloading: boolean
  isUpdateAvailable: boolean
  isUpdateDownloaded: boolean
  appVersion: string
  runtimeVersion: string
  channel: string
  updateId: string | null
  createdAt: Date | null
  lastCheckedAt: Date | null
  error: string | null
}

/**
 * Robust OTA Update Manager for Mochi Life Mobile.
 * Interfaces with Expo / EAS Updates and gracefully handles dev / preview / production environments.
 */
export function useAppUpdates() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>({
    isEnabled: Updates.isEnabled,
    isChecking: false,
    isDownloading: false,
    isUpdateAvailable: false,
    isUpdateDownloaded: false,
    appVersion: Constants.expoConfig?.version || '6.3.0',
    runtimeVersion:
      typeof Updates.runtimeVersion === 'string'
        ? Updates.runtimeVersion
        : Constants.expoConfig?.version || '6.1.0',
    channel: Updates.channel || 'development',
    updateId: Updates.updateId || null,
    createdAt: Updates.createdAt || null,
    lastCheckedAt: null,
    error: null,
  })

  // Check for updates manually or automatically
  const checkForUpdate = useCallback(async () => {
    if (!Updates.isEnabled || __DEV__) {
      setUpdateInfo(prev => ({
        ...prev,
        isChecking: false,
        error: null,
        lastCheckedAt: new Date(),
      }))
      return { available: false, downloaded: false }
    }

    setUpdateInfo(prev => ({ ...prev, isChecking: true, error: null }))

    try {
      const checkResult = await Updates.checkForUpdateAsync()

      if (checkResult.isAvailable) {
        setUpdateInfo(prev => ({
          ...prev,
          isChecking: false,
          isUpdateAvailable: true,
          isDownloading: true,
          lastCheckedAt: new Date(),
        }))

        // Automatically fetch the available update bundle
        const fetchResult = await Updates.fetchUpdateAsync()
        if (fetchResult.isNew) {
          setUpdateInfo(prev => ({
            ...prev,
            isDownloading: false,
            isUpdateDownloaded: true,
            updateId: fetchResult.manifest?.id || prev.updateId,
          }))
          return { available: true, downloaded: true }
        }
      }

      setUpdateInfo(prev => ({
        ...prev,
        isChecking: false,
        isDownloading: false,
        isUpdateAvailable: false,
        lastCheckedAt: new Date(),
      }))
      return { available: false, downloaded: false }
    } catch (err: any) {
      const safeMessage = err?.message || 'Không thể kiểm tra cập nhật'
      setUpdateInfo(prev => ({
        ...prev,
        isChecking: false,
        isDownloading: false,
        error: safeMessage,
        lastCheckedAt: new Date(),
      }))
      return { available: false, downloaded: false, error: safeMessage }
    }
  }, [])

  // Reload the application to apply the downloaded update.
  // On Android: BackHandler.exitApp() causes a clean native restart,
  // avoiding the white screen issue caused by Updates.reloadAsync().
  // On iOS: reloadAsync() works fine.
  const reloadAndApplyUpdate = useCallback(async () => {
    if (!Updates.isEnabled) return
    try {
      const { Platform, BackHandler } = require('react-native')
      if (Platform.OS === 'android') {
        // Give a brief moment for any UI state to settle, then force-close.
        // Android will restart the app cleanly from the newly downloaded bundle.
        setTimeout(() => {
          BackHandler.exitApp()
        }, 300)
      } else {
        await Updates.reloadAsync()
      }
    } catch {
      // Last-resort fallback
      try {
        await Updates.reloadAsync()
      } catch {}
    }
  }, [])

  // Initial background update check on app launch
  useEffect(() => {
    if (Updates.isEnabled && !__DEV__) {
      // Delay initial check by 5 seconds to let UI fully mount and stabilize
      const timer = setTimeout(() => {
        checkForUpdate().catch(() => {})
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [checkForUpdate])

  return {
    ...updateInfo,
    checkForUpdate,
    reloadAndApplyUpdate,
  }
}
