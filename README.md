<p align="center">
  <img src="public/icons/icon-128.png" alt="Sidekick AI Logo" width="128" height="128" />
</p>

<h1 align="center">Sidekick AI</h1>

<p align="center">
  <strong>AI-powered agentic browser automation assistant - right in your Chrome side panel.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.1.0-blue" alt="Version" />
  <img src="https://img.shields.io/badge/manifest-v3-green" alt="Manifest V3" />
  <img src="https://img.shields.io/badge/TypeScript-strict-blue?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/license-MIT-yellow" alt="License" />
</p>

---

## Table of Contents

- [What is Sidekick AI?](#what-is-sidekick-ai)
- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Available Tools](#available-tools)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Contributing](#contributing)
- [License](#license)

---

## What is Sidekick AI?

Sidekick AI is a Chrome extension that brings an AI-powered assistant directly into your browser's side panel. It connects to large language models (LLMs) through the [OpenRouter](https://openrouter.ai/) API and can **read web pages, automate browser interactions, and execute multi-step workflows**, all from a conversational chat interface.

The agent operates in a **think → act → observe** loop: it analyzes your request, decides which browser action to take, executes it, observes the result, and repeats until the task is complete.

**Built for:** Sales professionals, recruiters, marketers, and anyone who needs to automate repetitive web tasks like data extraction, form filling, prospect research, and spreadsheet automation. Includes specialized support for **Airtable** and **LinkedIn**.

---

## Features

- **AI Chat in Side Panel** -> Conversational interface that lives alongside your browsing
- **Multi-Model Support** -> Choose from Claude, GPT-4o, Gemini, Llama, and any model available on OpenRouter
- **9 Browser Automation Tools** -> Click, type, scroll, navigate, read pages, and more
- **Agentic Loop** -> Configurable up to 40 iterations for complex multi-step tasks
- **Real-Time Streaming** -> Token-by-token response display for instant feedback
- **LinkedIn Optimization** -> Structured data extraction from LinkedIn profiles via JSON-LD
- **Airtable Support** -> Smart text-based clicking to handle Airtable's dynamic CSS classes
- **Activity Log** -> Track every tool execution with status, target, and timestamp
- **Conversation History** -> Save and restore past conversations
- **Custom Prompts** -> Create and manage reusable prompt templates
- **Guided Onboarding** -> Step-by-step first-launch setup
- **Stop Mechanism** -> Cancel the agent mid-execution at any time
  
<img width="3500" height="1969" alt="gecko agent cover" src="https://github.com/user-attachments/assets/f2825d8a-9dcb-4981-a4cc-7c748770176e" />

---

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- npm (comes with Node.js)
- Google Chrome (or any Chromium-based browser)
- An [OpenRouter API key](https://openrouter.ai/keys)

### Steps

**1. Clone the repository**

```bash
git clone https://github.com/your-username/sidekick-ai.git
cd sidekick-ai
```

**2. Install dependencies**

```bash
npm install
```

**3. Build the extension**

```bash
npm run build
```

This compiles the project into the `dist/` folder.

> For development with hot reload, use `npm run dev` instead (see [Development Setup](#development-setup)).

**4. Load the extension in Chrome**

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** using the toggle in the top-right corner
3. Click **"Load unpacked"**
4. Select the `dist/` folder from the cloned repository

**5. Open Sidekick AI**

- Click the Sidekick AI icon in your Chrome toolbar
- The side panel opens on the right side of your browser
- If you don't see the icon, click the puzzle piece icon (Extensions) in the toolbar and pin Sidekick AI

> **Note:** After each rebuild (`npm run build`), go back to `chrome://extensions` and click the refresh icon on the Sidekick AI card to reload the extension.

---

## Configuration

### 1. Get an OpenRouter API Key

1. Go to [openrouter.ai/keys](https://openrouter.ai/keys)
2. Create an account or sign in
3. Generate a new API key
4. Copy the key.

### 2. Configure the Extension

1. Open the Sidekick AI side panel
2. On first launch, the **onboarding screen** will guide you through setup
3. Paste your OpenRouter API key
4. Select your preferred LLM model (default: Claude 3.5 Sonnet)
5. Click **Save**

You can change these settings at any time from the **Settings** tab.

### Supported Models

| Model | Provider | Best For |
|-------|----------|----------|
| Claude 4.6 Opus | Anthropic | Complex reasoning, code |
| GPT-5.4 | OpenAI | General-purpose tasks |
| Gemini 3.0 Flash | Google | Fast responses, simple tasks |
| Llama 3.3 70B | Meta | Open-source alternative |
| *Any OpenRouter model* | Various | Your choice |

---

## Usage

### Basic Chat

Open the side panel and type your message. Sidekick AI will respond using the selected LLM, just like any AI chat.

### Browser Automation

Ask the agent to interact with the current page or navigate the web. Examples:

```
Read this page and give me a summary.
```

```
Go to https://example.com and fill the contact form with the following info: ...
```

```
Open Airtable, find the "Prospects" table, and extract all company names.
```

```
Click the "Submit" button on this page.
```

### How the Agent Loop Works

1. **Think** -> The AI analyzes your request and the current page state
2. **Act** -> It selects and executes a browser tool (click, type, read, navigate...)
3. **Observe** -> It reads the result of the action
4. **Repeat** -> Steps 1–3 repeat until the task is complete (up to 40 iterations)

### Stopping the Agent

Click the **Stop** button in the chat input area at any time to cancel the current agent loop.

### Activity Log

Switch to the **Activity** tab to see a detailed log of every tool the agent has executed, with status (success/error), target, and timestamp.

---

## Available Tools

The agent has access to 9 browser automation tools:

| Tool | Description | Example Use Case |
|------|-------------|------------------|
| `read_page` | Extracts the current page's content (HTML/text). Special handling for LinkedIn (JSON-LD). | "Read this page and summarize it" |
| `goto_url` | Navigates the current tab to a URL. | "Go to https://example.com" |
| `open_tab` | Opens a new browser tab with a URL. | "Open LinkedIn in a new tab" |
| `click_selector` | Clicks an element by CSS selector. Supports double-click. | "Click the submit button" |
| `click_text` | Finds and clicks an element by its visible text. Position control (on, right, below). | "Click the cell next to 'Company Name'" |
| `fill_input` | Fills a text input, textarea, or contenteditable element. | "Fill the email field with john@example.com" |
| `type_text` | Types text into the currently focused element, character by character. | "Type 'Hello' into the active cell" |
| `scroll_page` | Scrolls the page by a pixel amount or to a specific element. | "Scroll down to see more results" |
| `press_key` | Presses a keyboard key (Tab, Enter, Escape, arrows, etc.) with optional modifiers. | "Press Enter to submit" |

> **Airtable users:** The `click_text` and `type_text` tools are specifically designed for Airtable, where CSS selectors are unreliable due to obfuscated class names.

---

## Development Setup

### Getting Started

```bash
# Clone the repository
git clone https://github.com/your-username/sidekick-ai.git
cd sidekick-ai

# Install dependencies
npm install

# Start development server with hot reload
npm run dev
```

The `npm run dev` command uses Vite with the CRXJS plugin, which enables **hot module replacement**, changes to the side panel UI update instantly without reloading the extension.

### Loading in Chrome (Dev Mode)

1. Run `npm run dev`
2. Open `chrome://extensions`
3. Enable **Developer mode**
4. Click **"Load unpacked"**
5. Select the `dist/` folder
6. The extension reloads automatically on code changes

### Build for Production

```bash
npm run build
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Type-check with TSC + production build |
| `npm run preview` | Preview the production build |

---

## Project Structure

```
sidekick-ai/
├── src/
│   ├── sidepanel/          # React UI (side panel)
│   │   ├── views/          # Chat, Settings, Activity, History, Onboarding
│   │   ├── components/     # Reusable UI components
│   │   ├── hooks/          # Custom React hooks
│   │   └── globals.css     # Tailwind styles
│   │
│   ├── background/         # Service worker (Manifest V3)
│   │   ├── agent/          # Agent loop orchestration
│   │   ├── tools/          # 9 browser automation tools
│   │   ├── llm/            # OpenRouter API client + prompts
│   │   └── storage/        # Chrome storage CRUD
│   │
│   ├── content/            # Content scripts (injected into pages)
│   │   ├── dom-reader.ts   # DOM extraction
│   │   └── scan-overlay.ts # Visual scanning animation
│   │
│   ├── lib/                # Shared types, validations, constants
│   └── stores/             # Zustand state management
│
├── public/icons/           # Extension icons
├── manifest.json           # Chrome extension manifest (V3)
├── vite.config.ts          # Vite + CRXJS configuration
├── tsconfig.json           # TypeScript (strict mode)
├── tailwind.config.ts      # Tailwind CSS configuration
├── PRD.md                  # Product Requirements Document
├── STRUCTURE.md            # Architecture documentation
└── DEV-RULES.md            # Development guidelines & conventions
```

---

## Tech Stack

| Technology | Role |
|------------|------|
| [React 19](https://react.dev/) | Side panel UI |
| [TypeScript](https://www.typescriptlang.org/) | Type safety (strict mode) |
| [Vite](https://vitejs.dev/) | Build tool |
| [CRXJS](https://crxjs.dev/) | Chrome extension Vite plugin |
| [Zustand](https://zustand.docs.pmnd.rs/) | State management |
| [Tailwind CSS](https://tailwindcss.com/) | Styling |
| [Radix UI](https://www.radix-ui.com/) | Accessible component primitives |
| [Zod](https://zod.dev/) | Runtime validation |
| [Lucide](https://lucide.dev/) | Icons |
| [OpenRouter API](https://openrouter.ai/) | LLM access (multi-model) |

---

## Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feat/my-feature`)
3. **Commit** your changes (`git commit -m "feat: add my feature"`)
4. **Push** to your branch (`git push origin feat/my-feature`)
5. **Open** a Pull Request

### Guidelines

- Follow the conventions documented in [`DEV-RULES.md`](DEV-RULES.md)
- Use TypeScript strict mode, no `any` types
- Keep functions under 40 lines, components under 150 lines
- Add comments in code to explain complex logic
- Test your changes by loading the extension in Chrome

---

## License

This project is licensed under the [MIT License](LICENSE).
