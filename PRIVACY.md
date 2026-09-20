# Privacy Policy — Sidekick AI

**Last updated:** April 6, 2026

---

## 1. Overview

Sidekick AI is a Chrome extension that provides an AI-powered browser automation assistant running directly in Chrome's side panel. This Privacy Policy explains what data the extension accesses, how it is used, and what is never collected or transmitted.

---

## 2. Data We Do NOT Collect

Sidekick AI does **not** collect, store, or transmit any personal user data to any server owned or operated by the developer. Specifically, the extension never collects:

- Names, email addresses, or any personally identifiable information
- Browsing history
- Financial or payment information
- Health information
- Authentication credentials
- Location data
- User activity patterns or analytics

---

## 3. Data Stored Locally

Sidekick AI stores the following data **exclusively on your local device**, using Chrome's built-in `chrome.storage` API. This data never leaves your browser:

| Data | Purpose |
|---|---|
| OpenRouter API key | To authenticate requests to the LLM provider |
| Selected AI model | To remember your model preference |
| Extension settings | To save your configuration |
| Conversation history | To allow you to restore past sessions |
| Custom prompt templates | To save your reusable prompts |
| Activity log | To display tool execution history in the Activity tab |

You can clear all locally stored data at any time by uninstalling the extension or using Chrome's extension data management tools.

---

## 4. Data Sent to Third-Party APIs

When you send a message or trigger an agent action, the content of your request and the current page context are sent to the [OpenRouter API](https://openrouter.ai/) to generate a response. This is a direct API call initiated by you.

- **What is sent:** Your chat message, conversation history, and page content (when read by the agent)
- **What is NOT sent:** Any personal account data, credentials, or information beyond what you explicitly include in your request
- **Who receives it:** OpenRouter and/or the underlying LLM provider you selected (e.g., Anthropic, OpenAI, Google)

Please refer to [OpenRouter's Privacy Policy](https://openrouter.ai/privacy) and the respective LLM provider's policies for details on how they handle this data.

> Your API key is stored locally and sent directly from your browser to OpenRouter. It is never transmitted to any server controlled by the Sidekick AI developer.

---

## 5. Permissions Justification

The extension requests the following Chrome permissions, each serving a specific and necessary purpose:

- **sidePanel** — To display the assistant's chat interface in Chrome's side panel
- **tabs** — To read the active tab's URL and title so the agent understands the current page context
- **tabGroups** — To allow the agent to create or manage tab groups when explicitly requested
- **storage** — To save preferences, history, and settings locally on your device
- **activeTab** — To access the currently active page content when you trigger an agent action
- **scripting** — To inject content scripts that allow the agent to read the DOM and interact with page elements
- **host permissions (https://*/*, http://*/*)** — Required because Sidekick AI is a general-purpose automation tool that must be able to operate on any website the user chooses to automate

---

## 6. Remote Code

Sidekick AI does **not** use remote code. All JavaScript executed by the extension is bundled within the extension package itself. The extension does not load, inject, or execute any external scripts from remote URLs.

---

## 7. Children's Privacy

Sidekick AI is not directed at children under the age of 13 and does not knowingly collect any information from children.

---

## 8. Changes to This Policy

This Privacy Policy may be updated occasionally. Changes will be reflected in the "Last updated" date at the top of this document. Continued use of the extension after any changes constitutes acceptance of the updated policy.

---

## 9. Contact

For any questions or concerns regarding this Privacy Policy, please open an issue on the GitHub repository:

**[https://github.com/Gecko51/gecko-agent/issues](https://github.com/Gecko51/gecko-agent/issues)**

---

*Sidekick AI is open source and licensed under the [MIT License](https://github.com/Gecko51/gecko-agent/blob/master/LICENSE).*
