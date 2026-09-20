
# Roadmap – Extension Chrome agentique (side panel + OpenRouter)

## 0. Cadre, objectifs et contraintes

- Clarifier l’objectif produit
    - Agent dans le side panel qui : lit la page, prend des décisions avec un LLM via OpenRouter, et déclenche des actions sur les onglets (navigation, extraction, assistance à la rédaction, etc.).
    - Cible fonctionnelle : navigation générale, plus éventuellement assistance sur LinkedIn (lecture, résumé, aide à la rédaction), avec un mode très conservateur sur les actions automatiques.
- Poser les contraintes LinkedIn dès le départ
    - Les CGU LinkedIn interdisent explicitement l’automatisation de l’UI, le scraping massif et les bots.[^2][^1]
    - Même un comportement human‑like ne garantit pas d’éviter les restrictions ; LinkedIn utilise des modèles de détection comportementale avancés (timing, volume, patterns d’actions).[^3][^4][^5]
    - Décider :
        - Soit limiter l’agent à un rôle **assistif** sur LinkedIn (pré‑remplir, suggérer, laisser l’humain cliquer).
        - Soit assumer un mode « automations » avec risques, documentés clairement à l’utilisateur.

***

## 1. Architecture globale et tech stack

- Choix techniques
    - Extension Chrome Manifest V3.
    - Side panel + UI en React/TypeScript (Vite ou CRA), ou autre framework.
    - Service worker (background) en TS (module).
    - Content scripts en TS pour la manipulation du DOM.
    - Eventuel backend proxy (FastAPI, Cloudflare Workers, Node) pour appeler OpenRouter.
- Architecture logique
    - **UI Side Panel** : interface de chat + affichage des actions de l’agent.
    - **Service Worker** :
        - Orchestrateur des tâches agentiques.
        - Point central pour les appels OpenRouter et la logique de tools.
        - State machine (jobs, steps, reprise après redémarrage).
    - **Content Scripts** :
        - Fonctions DOM `read_page`, `click_selector`, `fill_input`, `scroll`, etc.
    - **Backend (optionnel mais recommandé)** :
        - Proxy OpenRouter (clé côté serveur, quotas, logs, filtrage).

***

## 2. Setup initial de l’extension MV3

- Étapes
    - Créer le squelette du projet (template MV3 + React ou équivalent).
    - Écrire un `manifest.json` minimal :
        - `manifest_version: 3`, `name`, `version`.
        - `background.service_worker`, `type: module`.
        - `side_panel.default_path`.
        - Permissions : `sidePanel`, `tabs`, `scripting`, `storage`, `activeTab`.[^6][^7][^8]
        - `host_permissions` : `https://*/*`, `http://*/*` (ou domaines restreints).
        - `content_scripts` basiques pour toutes les pages.
- Objectif de ce bloc
    - Avoir une extension installable, avec side panel ouvert au clic et un service worker qui logge les messages.

***

## 3. Intégration OpenRouter (sans agent encore)

- Backend (recommandé)
    - Créer un endpoint `/llm` qui proxy :
        - `POST /llm` → `https://openrouter.ai/api/v1/chat/completions` avec la vraie clé en header `Authorization`.
        - Ajout des headers recommandés (`HTTP-Referer`, `X-Title`).[^9]
    - Gérer les erreurs, timeouts, quotas, logging minimal.
- Service worker
    - Fonction `callLLM(messages)` qui envoie au backend les messages du chat (format OpenAI‑like / OpenRouter).
    - Gestion simple des réponses (`assistant` textuel only).
- UI
    - Chat minimal dans le side panel :
        - Input texte.
        - Affichage des tours de conversation.
        - Envoi des messages au service worker (`chrome.runtime.sendMessage`) qui appelle `callLLM` et renvoie la réponse.
- Objectif
    - Avoir un **chat LLM fonctionnel dans le side panel**, sans tools ni actions sur les onglets.

***

## 4. Système de tools et boucle agentique

### 4.1 Définir le protocole de tools

- Spécifier un format strict pour les tool calls / tool results (JSON) par ex. :
    - Tool call :

```json
{ "type": "tool_call", "tool": "read_page", "args": { "tabId": 123 } }
```

    - Tool result :

```json
{ "type": "tool_result", "tool": "read_page", "result": "…texte de la page…" }
```

- Définir un schéma TS (types) pour : `AgentMessage`, `ToolCall`, `ToolResult`, `AgentTask`.


### 4.2 Implémenter un premier tool : `read_page`

- Côté content script / scripting :
    - Fonction `readPage(tabId)` qui :
        - Utilise `chrome.scripting.executeScript` sur le tab courant pour renvoyer `document.body.innerText` tronqué.[^10]
- Côté worker :
    - Quand un tool call `read_page` arrive, exécuter `readPage`, puis renvoyer un message `tool_result` au LLM comme nouveau message dans le chat.


### 4.3 Prompt système pour l’agent

- Écrire un prompt système qui :
    - Décrit les tools disponibles (`read_page` au début).
    - Impose le format JSON pour les tool calls.
    - Explique la boucle : réfléchir, appeler un tool si besoin, intégrer son résultat, puis répondre.
- Objectif de cette phase
    - Obtenir un agent qui sait **lire** la page active et utiliser cette info dans sa réponse.

***

## 5. Ajout progressif des tools de navigation

### 5.1 Tools génériques

- `goto_url(url)` :
    - Utilise `chrome.tabs.update({ url })` sur le tab actif.
- `open_tab(url)` :
    - Utilise `chrome.tabs.create({ url })`.
- `click_selector(selector)` :
    - Injecte une fonction via `chrome.scripting.executeScript` qui fait `document.querySelector(selector)?.click()`.
- `fill_input(selector, value)` :
    - Même principe, mais modifie `value` et déclenche les events nécessaires.


### 5.2 Orchestration dans le service worker

- Mapper chaque nom de tool à une fonction TS pure qui :
    - Valide les arguments.
    - Appelle `tabs` / `scripting` / content scripts.
    - Retourne un objet structuré (succès/échec, infos pertinentes).
- Gérer la **state machine** de tâche :
    - `PENDING → RUNNING → WAITING_TOOL → DONE / ERROR`.
    - Persister l’état dans `chrome.storage` pour les longues opérations / redémarrage du worker.[^11]
- Objectif
    - Arriver à un agent qui peut enchaîner plusieurs actions (ouvrir une page, lire, cliquer, revenir, etc.).

***

## 6. Comportement human‑like générique (tout web)

### 6.1 Scheduler et délais

- Ajouter un module de **scheduler** côté worker qui :
    - Planifie les tool calls dans le temps, au lieu de tout lancer immédiatement.
    - Introduit des **délais aléatoires** entre les actions, avec des plages larges (ex. 10–120 s) plutôt que de petites variations de quelques secondes.[^4][^3]
    - Imite des sessions avec pauses (ex. après 10–15 actions, pause 10–15 min).[^3][^4]


### 6.2 Actions « gratuites » et bruit comportemental

- Ajouter des tools internes utilisés par l’agent pour générer du « bruit » humain crédible sur les sites cibles (quand c’est acceptable) :
    - `scroll_naturally(direction, duration)` : scroll progressif avec pauses.
    - `open_random_internal_link()` : clic sur un lien interne choisi dans une liste pré‑filtrée.
- Varier l’ordre et la nature des actions pour éviter des patterns trop rigides (toujours le même enchaînement).[^4]


### 6.3 Limitations globales

- Limites journalières / par session configurables :
    - Nombre maximal de tool calls « sensibles » (clics, formulaires).
    - Durée maximale d’une session agentique avant arrêt forcé (cooldown).

***

## 7. Cas spécifique LinkedIn : contraintes et mode « sécurité »

### 7.1 Comprendre les signaux de détection

- Intégrer dans le design les points suivants (à rappeler dans la doc utilisateur) :
    - LinkedIn surveille volume, rapidité, répétitivité des actions (vues profils, invités, messages).[^5][^3][^4]
    - Comportements typiques de bots :
        - Actions à intervalles quasi constants.
        - Pics d’activité massifs en peu de temps.
        - Faible variété d’actions (que des visites/invitations, aucun contenu).
        - Messages très répétitifs / peu personnalisés.[^12][^3]


### 7.2 Mode « assistif » recommandé

- Pour rester au plus près d’un usage « tolérable » :
    - Limiter l’agent aux tasks suivantes sur LinkedIn :
        - **Lecture et analyse** (extraction de données, résumé de profil) côté content script.
        - **Aide à la rédaction** : l’agent génère un message / commentaire, mais ne clique pas sur « envoyer ».
    - Laisser l’utilisateur :
        - Cliquer sur les boutons d’invitation / message.
        - Valider ou éditer chaque message généré.
- Mettre en avant ce mode comme **par défaut** dans ton UI LinkedIn.


### 7.3 Mode « automation » (à haut risque, clairement étiqueté)

Si tu choisis de proposer un mode plus intrusif (toujours en rappelant que c’est contre les CGU et à risque) :

- **Limites strictes côté agent** (non négociables) :
    - Volume très faible : ex. 10–20 connexions / jour, 20–40 likes / jour max, etc., en‑dessous des recommandations des outils spécialisés.[^3][^4]
    - Rampe progressive : démarrer avec quelques actions/jour, augmenter lentement si les taux d’acceptation / absence d’alertes sont bons.[^3]
- **Comportement human‑like appliqué** :
    - Randomiser les délais entre actions (plage large, 45–90 s entre actions critiques).[^4][^3]
    - Répartir les actions sur les heures de travail typiques de l’utilisateur (profilable dans les settings), pas de « blast » concentré.[^4][^3]
    - Mixer actions « utiles » et bruit : vues de profil, visites de feed, check notifications, etc., pas seulement des invitations.[^13][^4]
- **Qualité du contenu** :
    - Génération de messages ultra personnalisés (référence poste récent, détail du profil, etc.), en ligne avec les bonnes pratiques d’outreach.[^14][^15][^3]
    - Variantes multiples de templates pour éviter l’uniformité (au moins 5–7 variations par séquence).[^3][^4]
- **Garde‑fous** :
    - Stop rules : si une alerte LinkedIn apparaît ou si les metrics (acceptation / réponses) chutent sous un seuil, pause auto.[^4][^3]
    - Jamais de conversation full auto : dès qu’un prospect répond, passage en mode manuel.[^16][^3]

***

## 8. UX produit, configuration et transparence

- Écran de configuration
    - Modes : `Assistif (recommandé)` / `Automation (risqué)`.
    - Limites quotidiennes configurables par l’utilisateur (avec valeurs max sûres prédéfinies).
    - Plages horaires d’activité autorisée.
- Journal d’activité
    - Log détaillé des actions effectuées par l’agent (page, action, timestamp, statut).
    - Filtre spécial LinkedIn pour que l’utilisateur voie exactement ce que l’agent fait sur la plateforme.
- Messages de warning
    - Bannières dans l’UI rappelant que :
        - LinkedIn peut restreindre / bannir le compte en cas de suspicion d’automation.[^1][^12]
        - Tu ne garantis pas l’absence de risque.
        - Le mode assistif reste la voie la plus prudente.

***

## 9. Tests, itérations et hardening

- Tests techniques
    - Tests unitaires des tools (fonctions DOM, `tabs`, `scripting`).
    - Tests d’intégration : flow complet UI → worker → tool → LLM → retour UI.
    - Tests du cycle de vie MV3 : redémarrage du worker, reprise de tâche.
- Tests comportementaux
    - Scénarios multi‑étapes : navigation sur un site, lecture, clics, etc.
    - Sur LinkedIn, tester uniquement avec comptes de test en mode assistif ; surveiller toute alerte.
- Hardening
    - Ajout de garde‑fous supplémentaires (blacklist de domaines, impossibilité d’exécuter certains tools sur `linkedin.com` si tu veux un mode 100% safe).
    - Debrief sur le comportement observé et ajustement des délais, de la variété et des limites.

***

## 10. Documentation et onboarding

- Documentation développeur
    - Schémas d’architecture (UI / worker / tools / backend).
    - Spécification du protocole de tools.
    - Guide d’extension MV3 (permissions, limitations, bonnes pratiques).
- Documentation utilisateur
    - Tutoriel d’installation et de configuration.
    - Explication claire des modes (assistif vs automation) et de leurs implications.
    - Section dédiée (LinkedIn) qui :
        - Explique les règles de la plateforme.[^2][^1]
        - Donne les recommandations de volume, lent ramp‑up et human‑like (d’après les bonnes pratiques publiques).[^3][^4]
        - Rappelle que la responsabilité d’usage final revient à l’utilisateur.


