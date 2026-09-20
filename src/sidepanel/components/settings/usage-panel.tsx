import { useEffect, useState } from 'react'
import { Button } from '@/sidepanel/components/ui/button'
import { BACKEND_USAGE_URL, BACKEND_CHECKOUT_URL } from '@/lib/constants'
import { getOrCreateInstallId } from '@/background/storage/install-id'

interface UsageData {
  plan: string
  planLabel: string
  used: number
  limit: number | null
}

const UPGRADE_TIERS: { plan: 'plus' | 'pro' | 'pro_plus'; label: string; price: string }[] = [
  { plan: 'plus', label: 'Plus', price: '$7.99/mo' },
  { plan: 'pro', label: 'Pro', price: '$12.99/mo' },
  { plan: 'pro_plus', label: 'Pro+', price: '$19.99/mo' },
]

const TIER_ORDER = ['free', 'plus', 'pro', 'pro_plus']

/** Fetches this install's plan/usage from the backend and offers upgrade buttons for every tier above the current one */
export function UsagePanel() {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [upgrading, setUpgrading] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const installId = await getOrCreateInstallId()
        const res = await fetch(BACKEND_USAGE_URL, { headers: { 'X-Install-Id': installId } })
        if (!res.ok) throw new Error('Could not load usage')
        const data = await res.json()
        if (!cancelled) setUsage(data)
      } catch {
        if (!cancelled) setError('Could not load your plan/usage right now.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const handleUpgrade = async (plan: 'plus' | 'pro' | 'pro_plus') => {
    setUpgrading(plan)
    try {
      const installId = await getOrCreateInstallId()
      const res = await fetch(BACKEND_CHECKOUT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Install-Id': installId },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (data.url) {
        chrome.tabs.create({ url: data.url })
      } else {
        setError(data.error || 'Could not start checkout.')
      }
    } catch {
      setError('Could not start checkout.')
    } finally {
      setUpgrading(null)
    }
  }

  if (error) return <p className="text-xs text-muted-foreground">{error}</p>
  if (!usage) return <p className="text-xs text-muted-foreground">Loading plan…</p>

  const currentIndex = TIER_ORDER.indexOf(usage.plan)
  const availableUpgrades = UPGRADE_TIERS.filter((t) => TIER_ORDER.indexOf(t.plan) > currentIndex)

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">{usage.planLabel} plan</p>
        <p className="text-xs text-muted-foreground">
          {usage.used} of {usage.limit ?? '\u221E'} tasks used this period
        </p>
      </div>
      {availableUpgrades.length > 0 && (
        <div className="flex flex-col gap-2">
          {availableUpgrades.map((tier) => (
            <Button
              key={tier.plan}
              size="sm"
              variant={tier.plan === 'pro_plus' ? 'default' : 'outline'}
              onClick={() => handleUpgrade(tier.plan)}
              disabled={upgrading !== null}
            >
              {upgrading === tier.plan ? 'Opening…' : `Upgrade to ${tier.label} — ${tier.price}`}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
