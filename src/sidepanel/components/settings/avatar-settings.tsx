import type { Settings } from '@/lib/types/settings'

interface AvatarSettingsProps {
  avatarEnabled: boolean
  confirmationPolicy: Settings['confirmationPolicy']
  onChangeAvatarEnabled: (value: boolean) => void
  onChangeConfirmationPolicy: (value: Settings['confirmationPolicy']) => void
}

/** Toggle for the flying on-page avatar, and the policy for when to pause and ask before acting */
export function AvatarSettings({
  avatarEnabled,
  confirmationPolicy,
  onChangeAvatarEnabled,
  onChangeConfirmationPolicy,
}: AvatarSettingsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <label htmlFor="avatar-toggle" className="text-sm font-medium">
            Show flying avatar
          </label>
          <p className="text-xs text-muted-foreground">
            A little buddy flies to whatever it's about to click or fill in on the page.
          </p>
        </div>
        <input
          id="avatar-toggle"
          type="checkbox"
          className="h-5 w-5 accent-primary shrink-0"
          checked={avatarEnabled}
          onChange={(e) => onChangeAvatarEnabled(e.target.checked)}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="confirm-policy" className="text-sm font-medium">
          Ask before acting
        </label>
        <select
          id="confirm-policy"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={confirmationPolicy}
          onChange={(e) => onChangeConfirmationPolicy(e.target.value as Settings['confirmationPolicy'])}
        >
          <option value="high_risk_only">Only for payments, purchases &amp; other risky actions (recommended)</option>
          <option value="always">Before every click or form fill</option>
          <option value="never">Never — let it act on its own</option>
        </select>
        {confirmationPolicy === 'never' && (
          <p className="text-xs text-destructive">
            Not recommended — the agent can complete purchases, cancellations, and other
            irreversible actions without asking you first.
          </p>
        )}
      </div>
    </div>
  )
}
