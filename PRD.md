# PRD — Sidekick AI

## En-tête

| Champ | Valeur |
|-------|--------|
| **Nom du projet** | Sidekick AI |
| **Date** | 2026-03-20 |
| **Version** | v0.1 (MVP) |
| **Auteur** | AI-Generated PRD |
| **Type** | Extension Chrome (Manifest V3) — Side Panel |

---

## Vision & Problème

### Problème

Les utilisateurs avancés du web effectuent quotidiennement des tâches répétitives : naviguer entre onglets, remplir des formulaires, extraire des informations de pages, comparer des résultats entre sites. Ces workflows sont manuels, chronophages et sujets aux erreurs.

### Pour qui

**Persona principal : Le professionnel digital (sales, recruteur, marketer, solopreneur)**
Utilise intensivement le navigateur pour son travail. Jongle entre 10-30 onglets. Effectue des tâches de prospection, veille, saisie de données. Cherche à gagner du temps sans sortir de Chrome.

### Résultat attendu

Un assistant IA intégré directement dans le navigateur (side panel) capable de :
- Comprendre le contexte de la page active
- Exécuter des actions de navigation, clic et saisie sur commande
- Enchaîner plusieurs actions de manière autonome (boucle agentique)
- Fonctionner sur tout le web, avec un mode spécifique et sécurisé pour LinkedIn

### Différenciation

- **vs Claude for Chrome / Comet (Perplexity)** : Sidekick AI est open-source, utilise OpenRouter (choix du modèle LLM), et offre un contrôle granulaire sur les actions automatisées (limites, délais, modes).
- **vs outils d'automation LinkedIn (Phantombuster, Dripify)** : Sidekick AI est un assistant généraliste, pas limité à un site. Le mode LinkedIn est un cas d'usage, pas le produit entier.
- **vs extensions de scraping** : Sidekick AI est conversationnel et agentique — il raisonne, pas juste exécute un script.

---

## User Stories (MVP)

| # | Priorité | User Story |
|---|----------|------------|
| US1 | 🔴 Must-have | **En tant qu'** utilisateur, **je veux** ouvrir le side panel et chatter avec un LLM, **afin de** poser des questions et recevoir des réponses directement dans Chrome. |
| US2 | 🔴 Must-have | **En tant qu'** utilisateur, **je veux** que l'agent lise le contenu de la page active, **afin de** obtenir un résumé ou des réponses basées sur le contenu visible. |
| US3 | 🔴 Must-have | **En tant qu'** utilisateur, **je veux** que l'agent navigue vers une URL, **afin de** me déplacer sur le web par commande vocale/textuelle. |
| US4 | 🔴 Must-have | **En tant qu'** utilisateur, **je veux** que l'agent clique sur un élément de la page, **afin d'** interagir avec l'UI sans toucher la souris. |
| US5 | 🔴 Must-have | **En tant qu'** utilisateur, **je veux** que l'agent remplisse un champ de formulaire, **afin d'** automatiser la saisie de données. |
| US6 | 🔴 Must-have | **En tant qu'** utilisateur, **je veux** configurer ma clé API OpenRouter dans les paramètres, **afin de** connecter l'agent à mon compte LLM. |
| US7 | 🟡 Should-have | **En tant qu'** utilisateur, **je veux** voir un journal des actions effectuées par l'agent, **afin de** comprendre et vérifier ce qu'il fait. |
| US8 | 🟡 Should-have | **En tant qu'** utilisateur, **je veux** que l'agent enchaîne plusieurs actions automatiquement (boucle agentique), **afin de** compléter des workflows multi-étapes. |
| US9 | 🟡 Should-have | **En tant qu'** utilisateur, **je veux** choisir entre un mode assistif et un mode automation, **afin de** contrôler le niveau d'autonomie de l'agent. |
| US10 | 🟢 Nice-to-have | **En tant qu'** utilisateur, **je veux** que l'agent simule un comportement humain (délais, scrolls), **afin de** réduire les risques de détection sur les plateformes sensibles. |

---

## Fonctionnalités Clés (MVP)

### Module 1 — Chat LLM (Side Panel)

| Feature | Description | Critères d'acceptation | Complexité |
|---------|-------------|----------------------|------------|
| Chat conversationnel | Interface de chat dans le side panel avec historique | Messages envoyés/reçus affichés • Historique persistant dans la session • Indicateur de chargement | Simple |
| Intégration OpenRouter | Appels LLM via l'API OpenRouter | Réponses reçues et affichées • Gestion des erreurs réseau/API • Format OpenAI-compatible | Moyen |
| Streaming des réponses | Affichage progressif des réponses LLM | Tokens affichés au fil de l'eau • UX fluide sans blocage | Moyen |

### Module 2 — Système de Tools

| Feature | Description | Critères d'acceptation | Complexité |
|---------|-------------|----------------------|------------|
| `read_page` | Lecture du contenu textuel de la page active | Retourne le texte visible tronqué • Fonctionne sur tout domaine autorisé | Simple |
| `goto_url` | Navigation vers une URL dans l'onglet actif | L'onglet navigue vers l'URL • Gestion des URLs invalides | Simple |
| `open_tab` | Ouvre un nouvel onglet avec une URL | Nouvel onglet créé et actif • URL chargée correctement | Simple |
| `click_selector` | Clic sur un élément DOM via sélecteur CSS | Élément cliqué • Erreur retournée si sélecteur invalide/absent | Moyen |
| `fill_input` | Remplissage d'un champ de formulaire | Valeur insérée • Events input/change déclenchés • Erreur si sélecteur invalide | Moyen |
| `scroll_page` | Scroll de la page (haut/bas/élément) | Scroll effectué dans la direction demandée | Simple |

### Module 3 — Boucle Agentique

| Feature | Description | Critères d'acceptation | Complexité |
|---------|-------------|----------------------|------------|
| Orchestrateur de tâches | State machine dans le service worker | États PENDING → RUNNING → WAITING_TOOL → DONE/ERROR • Transitions correctes | Complexe |
| Prompt système | Prompt décrivant les tools et le format de tool calls | L'agent utilise les tools correctement • Format JSON respecté | Moyen |
| Boucle think-act-observe | L'agent raisonne, appelle un tool, intègre le résultat, itère | Enchaînement multi-étapes fonctionnel • Limite d'itérations max | Complexe |

### Module 4 — Configuration & Settings

| Feature | Description | Critères d'acceptation | Complexité |
|---------|-------------|----------------------|------------|
| Page de settings | Configuration accessible depuis le side panel | Clé API OpenRouter sauvegardée • Choix du modèle LLM | Simple |
| Choix du modèle | Sélection du modèle LLM parmi ceux disponibles sur OpenRouter | Liste de modèles affichée • Modèle sélectionné utilisé pour les appels | Moyen |
| Modes assistif / automation | Bascule entre les deux modes de fonctionnement | Mode assistif : agent suggère, utilisateur exécute • Mode automation : agent exécute | Moyen |

### Module 5 — Journal d'activité

| Feature | Description | Critères d'acceptation | Complexité |
|---------|-------------|----------------------|------------|
| Log des actions | Historique des actions effectuées par l'agent | Chaque action loggée (type, cible, timestamp, résultat) • Consultable dans le side panel | Moyen |

---

## Stack Technique

| Couche | Technologie | Justification |
|--------|-------------|---------------|
| Extension | Chrome Manifest V3 | Standard actuel, requis pour le Chrome Web Store |
| Langage | TypeScript 5.x (strict mode) | Type safety, autocomplétion, moins de bugs runtime |
| UI Framework | React 19 + Vite 6 | Build rapide, HMR, écosystème mature pour extensions Chrome |
| Styling | TailwindCSS 4.x + shadcn/ui | Prototypage rapide, composants accessibles, thème cohérent |
| State Management | Zustand | Léger, simple, adapté à une extension (pas de Redux overhead) |
| LLM API | OpenRouter API (format OpenAI-compatible) | Multi-modèle, un seul endpoint, pricing flexible |
| Storage | chrome.storage.local + chrome.storage.sync | Natif MV3, sync pour les settings, local pour les données |
| Build | Vite + CRXJS ou Plasmo | Build optimisé pour extensions Chrome MV3 |
| Validation | Zod | Validation des inputs utilisateur et des réponses API |
| Documentation IA | Context7 MCP | Docs à jour injectées directement dans Claude Code |

---

## Modèle de Données

> Note : Pas de base de données externe. Toutes les données sont stockées via `chrome.storage`.

### Structures de données (stockées en JSON dans chrome.storage)

```sql
-- Stocké dans chrome.storage.sync (synchronisé entre appareils)
table settings {
  openrouter_api_key    text NOT NULL
  selected_model        text default 'anthropic/claude-sonnet-4-20250514'
  mode                  enum('assistive', 'automation') default 'assistive'
  daily_action_limit    integer default 50
  session_timeout_min   integer default 30
  active_hours_start    text default '09:00'      -- format HH:mm
  active_hours_end      text default '18:00'
  human_like_delays     boolean default true
}

-- Stocké dans chrome.storage.local (données locales uniquement)
table conversations {
  id              text PK                          -- nanoid
  title           text
  messages        json[]                           -- tableau de Message
  created_at      text                             -- ISO 8601
  updated_at      text
}

table message {
  id              text PK                          -- nanoid
  role            enum('user', 'assistant', 'system', 'tool')
  content         text
  tool_calls      json[]                           -- nullable, tableau de ToolCall
  tool_call_id    text                             -- nullable, pour les messages tool
  timestamp       text                             -- ISO 8601
}

table tool_call {
  id              text PK                          -- nanoid
  tool            text NOT NULL                    -- nom du tool
  args            json NOT NULL                    -- arguments du tool
  status          enum('pending', 'running', 'success', 'error')
  result          json                             -- nullable, résultat du tool
  started_at      text
  completed_at    text
}

table agent_task {
  id              text PK                          -- nanoid
  conversation_id text FK -> conversations.id
  status          enum('pending', 'running', 'waiting_tool', 'done', 'error')
  current_step    integer default 0
  max_steps       integer default 10
  created_at      text
  updated_at      text
}

table activity_log {
  id              text PK
  task_id         text FK -> agent_task.id
  action          text NOT NULL                    -- 'read_page', 'click_selector', etc.
  target          text                             -- URL ou selector
  result          enum('success', 'error')
  details         text                             -- message d'erreur ou résumé
  timestamp       text
}
```

---

## Routes API / Server Actions

> Sidekick AI n'a pas de backend dans le MVP. Les appels se font directement depuis le service worker vers OpenRouter. L'architecture repose sur le message passing Chrome.

### Messages internes (chrome.runtime.sendMessage)

| Direction | Message Type | Payload | Description |
|-----------|-------------|---------|-------------|
| UI → Worker | `SEND_MESSAGE` | `{ conversationId, content }` | Envoyer un message utilisateur |
| Worker → UI | `STREAM_TOKEN` | `{ conversationId, token }` | Token de réponse en streaming |
| Worker → UI | `STREAM_END` | `{ conversationId, fullContent }` | Fin du streaming |
| Worker → UI | `TOOL_CALL_START` | `{ toolCall }` | Début d'exécution d'un tool |
| Worker → UI | `TOOL_CALL_END` | `{ toolCall, result }` | Fin d'exécution d'un tool |
| Worker → ContentScript | `EXECUTE_TOOL` | `{ tool, args }` | Exécuter une action DOM |
| ContentScript → Worker | `TOOL_RESULT` | `{ tool, result }` | Retour du content script |
| UI → Worker | `UPDATE_SETTINGS` | `{ settings }` | Mise à jour des paramètres |
| UI → Worker | `STOP_TASK` | `{ taskId }` | Arrêter une tâche en cours |

### Appel externe (service worker → OpenRouter)

| Méthode | URL | Description | Auth |
|---------|-----|-------------|------|
| POST | `https://openrouter.ai/api/v1/chat/completions` | Appel LLM avec messages + tools | Bearer token (clé utilisateur) |
| GET | `https://openrouter.ai/api/v1/models` | Liste des modèles disponibles | Bearer token |

---

## Pages & Navigation

> L'extension n'a pas de pages web classiques. L'UI est dans le side panel Chrome.

| Vue | Contexte | Composants clés | Auth |
|-----|----------|----------------|------|
| Chat | Side panel — vue principale | ChatInput, MessageList, MessageBubble, ToolCallIndicator | ❌ (clé API requise) |
| Settings | Side panel — onglet paramètres | ApiKeyInput, ModelSelector, ModeToggle, LimitsConfig | ❌ |
| Activity Log | Side panel — onglet journal | ActivityTable, ActionBadge, FilterBar | ❌ |
| Onboarding | Side panel — premier lancement | WelcomeScreen, ApiKeySetup, QuickTutorial | ❌ |

### Navigation dans le side panel

```
[Chat] ←→ [Settings] ←→ [Activity Log]
   ↑
[Onboarding] (premier lancement uniquement)
```

---

## Contraintes Techniques

### Performance
- Le side panel doit s'ouvrir en < 500ms.
- Le streaming LLM doit commencer à afficher des tokens en < 2s après envoi.
- Les tool calls DOM (read_page, click, fill) doivent s'exécuter en < 1s.
- Le service worker MV3 peut être tué par Chrome après ~30s d'inactivité — gérer la persistance de l'état.

### Sécurité
- La clé API OpenRouter est stockée dans `chrome.storage.sync` (chiffrée par Chrome, liée au compte Google).
- Jamais d'envoi de la clé API à un serveur tiers (appel direct depuis le worker).
- Validation Zod de toutes les entrées utilisateur et des réponses API.
- Content Security Policy stricte dans le manifest.
- Sanitization du contenu DOM extrait (pas d'exécution de scripts injectés).

### Compatibilité
- Chrome 116+ (support stable de `chrome.sidePanel` API).
- Manifest V3 uniquement.
- Pas de support Firefox/Safari dans le MVP.

### Limitations MV3
- Service worker stateless — persister l'état dans `chrome.storage.local`.
- Pas de DOM access dans le worker — tout passe par content scripts ou `chrome.scripting.executeScript`.
- Alarmes Chrome (`chrome.alarms`) pour les tâches différées si le worker se réveille.

---

## Milestones de développement

### Phase 1 — Setup + Side Panel + Chat LLM basique
> `git tag v0.1-chat`

- Scaffold du projet (Vite + React + TS + TailwindCSS + shadcn/ui).
- `manifest.json` MV3 avec permissions de base.
- Side panel fonctionnel avec UI de chat.
- Intégration OpenRouter : envoi de messages, réception de réponses (sans streaming).
- Page de settings : saisie et sauvegarde de la clé API + choix du modèle.
- Onboarding premier lancement.

### Phase 2 — Système de Tools + Premier tool (`read_page`)
> `git tag v0.2-tools`

- Architecture du protocole de tools (types TS, format JSON).
- Content script de base injecté sur toutes les pages.
- Implémentation de `read_page` (lecture du DOM).
- Prompt système décrivant les tools et le format attendu.
- Boucle agentique basique : think → tool_call → tool_result → respond.
- Affichage des tool calls dans le chat (indicateur visuel).

### Phase 3 — Tools de navigation + Boucle agentique complète
> `git tag v0.3-agent`

- Implémentation des tools : `goto_url`, `open_tab`, `click_selector`, `fill_input`, `scroll_page`.
- State machine complète dans le service worker (PENDING → RUNNING → WAITING_TOOL → DONE/ERROR).
- Persistance de l'état dans `chrome.storage.local`.
- Enchaînement multi-étapes fonctionnel.
- Journal d'activité (activity log).
- Streaming des réponses LLM.

### Phase 4 — Modes, Human-like, Polish
> `git tag v0.4-modes`

- Mode assistif vs automation (toggle dans settings).
- Délais human-like configurables (scheduler).
- Limites quotidiennes d'actions.
- Plages horaires autorisées.
- Garde-fous LinkedIn (blacklist domaine optionnelle, warnings UI).
- Stop rules (arrêt automatique si erreurs répétées).

### Phase 5 — Tests, Hardening, Release
> `git tag v1.0-mvp`

- Tests unitaires des tools et du service worker.
- Tests d'intégration du flow complet.
- Gestion du cycle de vie MV3 (redémarrage worker, reprise de tâche).
- CSP et headers de sécurité finalisés.
- Documentation utilisateur (README).
- Build de production prêt pour le Chrome Web Store.
