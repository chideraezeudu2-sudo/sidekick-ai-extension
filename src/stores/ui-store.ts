import { create } from 'zustand'
import { STORAGE_KEYS } from '@/lib/constants'

type ActiveView = 'chat' | 'settings' | 'history' | 'activity'

interface UIState {
  activeView: ActiveView
  onboardingCompleted: boolean

  /** Load onboarding state from chrome.storage.local */
  loadOnboardingState: () => Promise<void>

  /** Switch between chat and settings views */
  setActiveView: (view: ActiveView) => void

  /** Mark onboarding as completed and persist */
  completeOnboarding: () => Promise<void>
}

export const useUIStore = create<UIState>((set) => ({
  activeView: 'chat',
  onboardingCompleted: false,

  loadOnboardingState: async () => {
    const result = await chrome.storage.local.get(STORAGE_KEYS.ONBOARDING)
    const completed = result[STORAGE_KEYS.ONBOARDING] === true
    set({ onboardingCompleted: completed })
  },

  setActiveView: (view: ActiveView) => set({ activeView: view }),

  completeOnboarding: async () => {
    await chrome.storage.local.set({ [STORAGE_KEYS.ONBOARDING]: true })
    set({ onboardingCompleted: true, activeView: 'chat' })
  },
}))
