# Attribution

Sidekick AI is a derivative work of **Gecko Agent**, used under the MIT License.

- Upstream project: https://github.com/Gecko51/gecko-agent
- Upstream copyright: Copyright (c) 2026 Gecko Agent
- Upstream license: MIT (see `LICENSE`)

Sidekick AI modifies and extends the original work, including:

- Renamed branding, storage keys, and internal identifiers from "Gecko Agent" /
  "ClickyWeb" to "Sidekick AI"
- Added a hosted backend proxy (`/v1/chat/completions`, `/v1/vision-locate`) with
  plan-based usage limits and Stripe billing, replacing the original bring-your-own-key
  OpenRouter model
- Added a vision-based click fallback (`click_by_vision`) for canvas/custom-UI pages
- Added a confirmation gate for high-risk actions (`risk-classifier.ts`)
- Added a model-ID migration so existing installs recover from retired model names

The original MIT copyright notice is retained in `LICENSE`, as the license requires.