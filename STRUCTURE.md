# Arborescence du Projet — Sidekick AI

```
sidekick-ai/
├── src/
│   ├── sidepanel/                          # UI React du side panel
│   │   ├── App.tsx                         # Composant racine + router interne
│   │   ├── index.tsx                       # Point d'entrée React
│   │   ├── index.html                      # HTML template pour le side panel
│   │   ├── globals.css                     # Styles globaux + Tailwind directives
│   │   ├── views/                          # Vues principales (pages internes)
│   │   │   ├── chat-view.tsx               # Vue chat (par défaut)
│   │   │   ├── settings-view.tsx           # Vue paramètres
│   │   │   ├── activity-view.tsx           # Vue journal d'activité
│   │   │   └── onboarding-view.tsx         # Vue premier lancement
│   │   ├── components/
│   │   │   ├── ui/                         # Composants shadcn/ui
│   │   │   │   ├── button.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── badge.tsx
│   │   │   │   ├── switch.tsx
│   │   │   │   ├── select.tsx
│   │   │   │   ├── slider.tsx
│   │   │   │   ├── tabs.tsx
│   │   │   │   ├── scroll-area.tsx
│   │   │   │   ├── toast.tsx
│   │   │   │   └── tooltip.tsx
│   │   │   ├── chat/                       # Composants du chat
│   │   │   │   ├── chat-input.tsx          # Barre de saisie + bouton envoi
│   │   │   │   ├── message-list.tsx        # Liste scrollable des messages
│   │   │   │   ├── message-bubble.tsx      # Bulle de message (user/assistant)
│   │   │   │   ├── tool-call-card.tsx      # Carte affichant un tool call en cours/terminé
│   │   │   │   └── streaming-indicator.tsx # Indicateur de réponse en cours
│   │   │   ├── settings/                   # Composants des paramètres
│   │   │   │   ├── api-key-input.tsx       # Champ clé API OpenRouter
│   │   │   │   ├── model-selector.tsx      # Sélecteur de modèle LLM
│   │   │   │   ├── mode-toggle.tsx         # Bascule assistif / automation
│   │   │   │   └── limits-config.tsx       # Config limites et plages horaires
│   │   │   ├── activity/                   # Composants du journal
│   │   │   │   ├── activity-table.tsx      # Table des actions loggées
│   │   │   │   ├── action-badge.tsx        # Badge coloré par type d'action
│   │   │   │   └── filter-bar.tsx          # Filtres par type/date/statut
│   │   │   └── layout/                     # Composants structurels
│   │   │       ├── navigation-tabs.tsx     # Tabs Chat / Settings / Activity
│   │   │       ├── header.tsx              # Header du side panel
│   │   │       └── warning-banner.tsx      # Bannière d'alerte (LinkedIn, etc.)
│   │   └── hooks/                          # Custom hooks React
│   │       ├── use-chat.ts                 # Hook pour le state du chat
│   │       ├── use-settings.ts             # Hook pour les settings
│   │       ├── use-chrome-message.ts       # Hook pour chrome.runtime messaging
│   │       └── use-activity-log.ts         # Hook pour le journal d'activité
│   │
│   ├── background/                         # Service worker MV3
│   │   ├── index.ts                        # Point d'entrée du service worker
│   │   ├── message-handler.ts             # Router des messages chrome.runtime
│   │   ├── llm/
│   │   │   ├── openrouter-client.ts       # Client API OpenRouter (fetch + streaming)
│   │   │   ├── prompts.ts                 # Prompts système (agent, tools description)
│   │   │   └── message-formatter.ts       # Formatage des messages pour l'API
│   │   ├── agent/
│   │   │   ├── agent-loop.ts              # Boucle agentique principale (think-act-observe)
│   │   │   ├── task-manager.ts            # State machine des tâches (PENDING→DONE)
│   │   │   └── tool-dispatcher.ts         # Dispatch des tool calls vers content scripts
│   │   ├── tools/
│   │   │   ├── tool-registry.ts           # Registre des tools disponibles
│   │   │   ├── read-page.ts               # Tool : lecture du contenu de la page
│   │   │   ├── goto-url.ts               # Tool : navigation vers URL
│   │   │   ├── open-tab.ts               # Tool : ouvrir un nouvel onglet
│   │   │   ├── click-selector.ts          # Tool : clic sur élément DOM
│   │   │   ├── fill-input.ts             # Tool : remplissage de formulaire
│   │   │   └── scroll-page.ts            # Tool : scroll de la page
│   │   ├── scheduler/
│   │   │   ├── delay-engine.ts            # Moteur de délais human-like
│   │   │   └── rate-limiter.ts            # Limites quotidiennes et par session
│   │   └── storage/
│   │       ├── settings-store.ts          # CRUD settings dans chrome.storage.sync
│   │       ├── conversation-store.ts      # CRUD conversations dans chrome.storage.local
│   │       └── activity-store.ts          # CRUD activity log dans chrome.storage.local
│   │
│   ├── content/                            # Content scripts injectés dans les pages
│   │   ├── index.ts                       # Point d'entrée du content script
│   │   ├── dom-reader.ts                  # Extraction de texte/structure du DOM
│   │   ├── dom-actor.ts                   # Actions DOM (click, fill, scroll)
│   │   └── message-bridge.ts             # Communication avec le service worker
│   │
│   ├── lib/                                # Code partagé entre toutes les couches
│   │   ├── types/
│   │   │   ├── messages.ts                # Types pour le message passing Chrome
│   │   │   ├── tools.ts                   # Types ToolCall, ToolResult, AgentTask
│   │   │   ├── settings.ts               # Type Settings
│   │   │   ├── conversation.ts            # Types Message, Conversation
│   │   │   └── activity.ts               # Type ActivityLogEntry
│   │   ├── validations/
│   │   │   ├── settings-schema.ts         # Schéma Zod pour les settings
│   │   │   ├── tool-call-schema.ts        # Schéma Zod pour les tool calls
│   │   │   └── message-schema.ts          # Schéma Zod pour les messages
│   │   ├── constants.ts                   # Constantes globales (limites, defaults, etc.)
│   │   └── utils.ts                       # Utilitaires partagés (nanoid, formatDate, etc.)
│   │
│   └── stores/                             # State management (Zustand)
│       ├── chat-store.ts                  # Store du chat (messages, conversations)
│       ├── settings-store.ts              # Store des settings (miroir UI du chrome.storage)
│       └── ui-store.ts                    # Store UI (vue active, loading states)
│
├── public/
│   ├── icons/
│   │   ├── icon-16.png
│   │   ├── icon-32.png
│   │   ├── icon-48.png
│   │   └── icon-128.png
│   └── sidepanel.html                     # Fallback HTML si non géré par Vite
│
├── manifest.json                           # Manifest V3 de l'extension
├── vite.config.ts                          # Config Vite (multi-entry: sidepanel, background, content)
├── tailwind.config.ts                      # Config TailwindCSS
├── tsconfig.json                           # Config TypeScript (strict)
├── postcss.config.js                       # Config PostCSS pour Tailwind
├── components.json                         # Config shadcn/ui
├── package.json
├── .env.example                            # Variables d'env documentées (aucune en prod, tout dans chrome.storage)
├── .gitignore
├── PRD.md                                  # Product Requirement Document
├── STRUCTURE.md                            # Ce fichier
├── DEV-RULES.md                            # Règles de développement
└── README.md                               # Documentation du projet
```

## Notes sur l'arborescence

### Pourquoi cette structure ?

- **`src/sidepanel/`** : Isolé car c'est un point d'entrée Vite distinct (HTML + React). Le side panel est le seul contexte UI de l'extension.
- **`src/background/`** : Le service worker est le cerveau de l'extension. Il orchestre les appels LLM, la boucle agentique et le dispatch des tools.
- **`src/content/`** : Les content scripts sont injectés dans les pages web. Ils n'ont accès qu'au DOM de la page, pas aux APIs Chrome avancées.
- **`src/lib/`** : Code partagé entre les 3 contextes (sidepanel, background, content). Types, validations et constantes.
- **`src/stores/`** : Zustand stores pour l'UI React du side panel uniquement.

### Points d'entrée Vite (multi-entry build)

| Entrée | Fichier | Contexte Chrome |
|--------|---------|-----------------|
| Side Panel | `src/sidepanel/index.tsx` | `chrome.sidePanel` |
| Background | `src/background/index.ts` | Service Worker |
| Content Script | `src/content/index.ts` | Injection dans les pages web |

### Fichier `manifest.json` attendu

```json
{
  "manifest_version": 3,
  "name": "Sidekick AI",
  "version": "0.1.0",
  "description": "Assistant agentique IA dans le side panel Chrome",
  "permissions": [
    "sidePanel",
    "tabs",
    "scripting",
    "storage",
    "activeTab",
    "alarms"
  ],
  "host_permissions": [
    "https://*/*",
    "http://*/*"
  ],
  "background": {
    "service_worker": "src/background/index.ts",
    "type": "module"
  },
  "side_panel": {
    "default_path": "src/sidepanel/index.html"
  },
  "content_scripts": [
    {
      "matches": ["https://*/*", "http://*/*"],
      "js": ["src/content/index.ts"],
      "run_at": "document_idle"
    }
  ],
  "icons": {
    "16": "public/icons/icon-16.png",
    "32": "public/icons/icon-32.png",
    "48": "public/icons/icon-48.png",
    "128": "public/icons/icon-128.png"
  }
}
```

> Note : Les chemins seront résolus par Vite/CRXJS au build. Le manifest ci-dessus est la version source.
