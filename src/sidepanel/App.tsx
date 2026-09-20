import { useEffect } from 'react'
import { useUIStore } from '@/stores/ui-store'
import { useChatStore } from '@/stores/chat-store'
import { useSettingsStore } from '@/stores/settings-store'
import { usePromptsStore } from '@/stores/prompts-store'
import { useActivityStore } from '@/stores/activity-store'
import { Header } from './components/layout/header'
import { NavigationTabs } from './components/layout/navigation-tabs'
import { ChatView } from './views/chat-view'
import { SettingsView } from './views/settings-view'
import { OnboardingView } from './views/onboarding-view'
import { HistoryView } from './views/history-view'
import { ActivityView } from './views/activity-view'
import { Toaster } from '@/sidepanel/components/ui/sonner'

/** Root component — routes between onboarding, chat, activity, and settings */
export function App() {
  const { activeView, onboardingCompleted, loadOnboardingState } = useUIStore()
  const loadConversations = useChatStore((s) => s.loadConversations)
  const loadSettings = useSettingsStore((s) => s.loadSettings)
  const loadPrompts = usePromptsStore((s) => s.loadPrompts)
  const loadEntries = useActivityStore((s) => s.loadEntries)

  // Load persisted state on mount
  useEffect(() => {
    loadOnboardingState()
    loadConversations()
    loadSettings()
    loadPrompts()
    loadEntries()
  }, [loadOnboardingState, loadConversations, loadSettings, loadPrompts, loadEntries])

  if (!onboardingCompleted) {
    return (
      <>
        <OnboardingView />
        <Toaster />
      </>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      <Header />
      <main className="flex-1 overflow-hidden">
        {activeView === 'chat' && <ChatView />}
        {activeView === 'history' && <HistoryView />}
        {activeView === 'activity' && <ActivityView />}
        {activeView === 'settings' && <SettingsView />}
      </main>
      <NavigationTabs />
      <Toaster />
    </div>
  )
}
