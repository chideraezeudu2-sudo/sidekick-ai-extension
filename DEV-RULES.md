# Règles de Développement — Sidekick AI

## Règles de code

- Écrire du TypeScript strict. Jamais de `any`. Utiliser `unknown` si le type est incertain.
- Jamais de `as unknown as X`. Typer correctement ou utiliser des type guards.
- Commenter chaque fonction exportée avec JSDoc — c'est le contexte pour l'IA et le développeur entre les sessions.
- Commenter les blocs logiques non triviaux (boucle agentique, state machine, dispatch de tools).
- Ne supprimer un commentaire QUE s'il est devenu obsolète.
- Nommer les variables et fonctions de manière descriptive. Pas d'abréviations cryptiques.
- Une fonction = une responsabilité unique. Max 40 lignes par fonction.
- Un composant React > 150 lignes = le découper en sous-composants.
- Préférer les `const` et les fonctions pures. Minimiser les effets de bord.

## Règles UI/UX

- Mobile-first n'est pas applicable (side panel Chrome = largeur fixe ~400px).
- Designer pour la **largeur contrainte du side panel** : pas de layouts multi-colonnes.
- Utiliser les composants shadcn/ui comme base. Customiser si nécessaire.
- Spacing system cohérent : multiples de 4px uniquement (Tailwind spacing scale).
- Toujours gérer les 4 états UI : `loading`, `empty`, `error`, `success`.
- Le chat doit auto-scroll vers le bas à chaque nouveau message/token.
- Les tool calls en cours doivent être visuellement distincts (spinner, couleur).
- Les actions destructives ou risquées (mode automation) nécessitent une confirmation visuelle.

## Règles de structure

- **Colocation** : garder les fichiers liés proches les uns des autres.
  - Composants de chat dans `sidepanel/components/chat/`.
  - Tools dans `background/tools/`.
  - Types dans `lib/types/`.
- Séparer les 3 contextes Chrome : `sidepanel/`, `background/`, `content/`.
  - Le code partagé entre contextes va dans `lib/`.
  - Ne jamais importer du code `sidepanel/` dans `background/` ou inversement.
  - Le seul lien entre contextes = message passing (`chrome.runtime.sendMessage`).
- Les types partagés vont dans `lib/types/`, les types locaux restent colocalisés.
- Pas d'import circulaire. Vérifier avant chaque nouvelle dépendance.

## Règles spécifiques aux extensions Chrome MV3

- Le service worker peut être tué à tout moment par Chrome.
  - **Toujours persister l'état critique** dans `chrome.storage.local`.
  - Utiliser `chrome.alarms` pour les tâches différées, jamais `setTimeout` > 30s.
  - Au redémarrage du worker, restaurer l'état depuis `chrome.storage`.
- Content scripts et service worker communiquent **uniquement** par messages.
  - Format standardisé : `{ type: string, payload: unknown }`.
  - Valider chaque message reçu avec Zod avant de le traiter.
- `chrome.scripting.executeScript` pour les actions DOM ponctuelles.
  - Content scripts persistants pour l'écoute continue de messages.
- Respecter la Content Security Policy du manifest.
  - Pas d'`eval()`, pas de `new Function()`, pas d'inline scripts.

## Règles de données

- Toute donnée persistante passe par les stores dédiés dans `background/storage/`.
- Settings dans `chrome.storage.sync` (synchronisé entre appareils).
- Conversations et logs dans `chrome.storage.local` (données locales volumineuses).
- Valider toutes les entrées utilisateur avec Zod avant tout traitement.
- La clé API OpenRouter est stockée dans `chrome.storage.sync`.
  - Jamais loggée, jamais envoyée à un serveur tiers.
  - Utilisée uniquement dans le service worker pour les appels directs à OpenRouter.
- Nettoyer les vieilles conversations et logs au-delà d'un seuil configurable.

## Règles d'intégration OpenRouter

- Appels API toujours depuis le service worker, jamais depuis le side panel ou le content script.
- Format de requête OpenAI-compatible (`/v1/chat/completions`).
- Toujours inclure les headers recommandés :
  - `Authorization: Bearer <key>`
  - `HTTP-Referer: chrome-extension://sidekick-ai`
  - `X-Title: Sidekick AI`
- Gérer les erreurs : 401 (clé invalide), 429 (rate limit), 500 (serveur), timeout.
- Streaming via `ReadableStream` pour l'affichage progressif des réponses.
- Limiter la taille du contexte envoyé (tronquer les messages anciens si nécessaire).

## Règles de la boucle agentique

- La boucle suit le cycle : **Think → Act → Observe → Repeat**.
- Limite stricte d'itérations par tâche (`max_steps` dans les settings, défaut 10).
- Si le LLM ne retourne pas de tool call, la boucle s'arrête et la réponse est affichée.
- Si un tool retourne une erreur, l'agent peut réessayer UNE fois, puis la boucle s'arrête.
- Le prompt système doit lister explicitement chaque tool avec ses paramètres et son format de retour.
- Format de tool call en JSON strict :
  ```json
  { "type": "tool_call", "tool": "tool_name", "args": { ... } }
  ```
- Format de tool result en JSON strict :
  ```json
  { "type": "tool_result", "tool": "tool_name", "result": { ... } }
  ```

## Règles du mode assistif vs automation

### Mode assistif (par défaut)
- L'agent lit les pages et propose des actions.
- L'agent ne clique PAS et ne remplit PAS de formulaires automatiquement.
- Chaque action proposée est affichée dans le chat avec un bouton "Exécuter".
- L'utilisateur doit cliquer pour valider chaque action.

### Mode automation
- L'agent exécute les actions automatiquement après confirmation initiale de la tâche.
- Bannière de warning permanente dans l'UI.
- Délais human-like entre chaque action (configurable).
- Limites quotidiennes strictes appliquées.
- Stop automatique si erreurs répétées (3 erreurs consécutives = arrêt).
- Sur les domaines sensibles (LinkedIn) : warning supplémentaire + limites réduites.

## Règles de documentation externe

- Pour toute librairie de la stack, utiliser le MCP Context7 pour obtenir la documentation à jour avant de coder.
- Ne jamais coder une API de librairie de mémoire sans vérification via Context7.
- APIs Chrome : toujours vérifier la documentation officielle sur `developer.chrome.com`.
- Maintenir le README.md à jour à chaque phase terminée.
- Documenter toutes les variables d'environnement dans `.env.example`.

## Règles Git

- Un commit par tâche atomique. Message format : `type(scope): description`.
- Types valides : `feat` | `fix` | `refactor` | `docs` | `chore` | `test`.
- Scopes valides : `sidepanel` | `background` | `content` | `tools` | `agent` | `config` | `ui`.
- Créer un tag Git à chaque fin de phase (`git tag v0.X-label`).
- Ne jamais committer de secrets, de `.env`, de `node_modules`, ou de `dist/`.
- Pour les fixes, ajouter Cause + Fix dans le body du commit.

## Règles de sécurité

- Inputs utilisateur : toujours valider avec Zod côté service worker.
- Le contenu DOM extrait par `read_page` doit être sanitizé (pas de scripts, pas de HTML brut envoyé au LLM si évitable).
- CSP stricte dans le manifest : pas d'`unsafe-eval`, pas d'`unsafe-inline`.
- La clé API ne quitte jamais le service worker.
- Les `host_permissions` sont larges (`https://*/*`) — documenter pourquoi et envisager de restreindre en production.
- Ne jamais exécuter de code arbitraire retourné par le LLM. Les tool calls passent par un registre de fonctions connues.

## Workflow de fin de phase

À chaque fin de phase, exécuter dans l'ordre :

1. Lancer `npm run build` → confirmer que le build passe sans erreur.
2. Lancer `npm run lint` → corriger tous les warnings/erreurs.
3. Charger l'extension en mode développeur dans Chrome et tester manuellement les fonctionnalités de la phase.
4. Vérifier que le side panel s'ouvre, que le chat fonctionne, que les tools répondent.
5. Mettre à jour le README.md : section "Avancement" avec ce qui est fait.
6. Mettre à jour `.env.example` si de nouvelles variables ont été ajoutées.
7. Proposer le message de commit final pour la phase.
8. Rappeler la commande de tag Git : `git tag v0.X-[label]`.

Rapport de phase attendu :

- Ce qui a été implémenté.
- Ce qui a été laissé de côté (et pourquoi).
- Problèmes rencontrés + solutions appliquées.
- Recommandations pour la phase suivante.

## Workflow de diagnostic (debug)

1. Reproduire le problème en lisant les fichiers concernés (ne toucher à rien).
2. Identifier la cause racine — pas juste le symptôme.
3. Vérifier dans quel contexte Chrome le bug se produit (sidepanel ? worker ? content script ?).
4. Proposer 2-3 hypothèses classées par probabilité.
5. Attendre la validation du développeur avant de corriger.
6. Appliquer le fix minimal — ne pas refactoriser en même temps.
7. Expliquer ce qui a été changé et pourquoi.

Outils de debug spécifiques :

- **Side panel** : DevTools classiques (clic droit → Inspecter sur le side panel).
- **Service worker** : `chrome://extensions` → "Service worker" → lien "Inspect".
- **Content script** : DevTools de la page web, onglet Console (filtrer par contexte).
- **Messages** : Logger tous les messages entrants/sortants dans chaque contexte en mode dev.
- Consulter Context7 si le bug semble lié à une API Chrome ou une librairie.
