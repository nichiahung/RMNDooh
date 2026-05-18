<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# DOOH Platform - AI Context & Constraints

Welcome to the DOOH (Digital Out-Of-Home) Platform repository. This document serves as a strict routing guide and context boundary for all AI agents working on this project.

## 1. Domain Model Terminology
Do not invent terms. Strictly adhere to the following definitions:
* **Advertiser**: A company buying ads.
* **Campaign**: An advertising initiative created by an Advertiser.
* **InventoryLocation (Venue)**: A physical location (e.g., Taipei 101, Mall).
* **Screen**: A digital billboard or display situated within an InventoryLocation.
* **Playlist / Loop**: A cycle of content playing on a Screen.
* **Slot**: A time segment within a Loop (e.g., 10 seconds). Can be Direct-sold or Programmatic.
* **Proof-of-Play (POP)**: A log verifying that a creative actually played on a screen.

## 2. Documentation Routing (STRICT)
Before implementing backend features, modifying the database, or writing core UI components, you **MUST** consult the appropriate documentation. Do NOT hallucinate architectures.

Start with the agent context pack for current runtime and task routing:

| Agent Context Topic | Required Reading (Use `view_file`) |
| :--- | :--- |
| **Agent Doc Index** | `docs/agents/README.md` |
| **Current Runtime Truth** | `docs/agents/runtime-truth.md` |
| **Business Context & Rules** | `docs/agents/business-context.md` |
| **Task Routing For Agents** | `docs/agents/task-routing.md` |
| **Feature / Data Source Map** | `docs/agents/feature-map.md` |

Then read the canonical product/backend documents for the target task:

| Topic / Task | Required Reading (Use `view_file`) |
| :--- | :--- |
| **High-Level Architecture** | `ARCHITECTURE.md` (Root directory) |
| **MVP Product Scope & UI Specs** | `DOOH_Advertiser_Marketplace_MVP_PRD_v0.1.md` |
| **Database Schema & Models** | `docs/backend/step14-schema-design.md` |
| **Backend API Design** | `docs/backend/step15-api-design-v2.md` |
| **Programmatic DOOH Logic** | `docs/backend/programmatic-schema-design.md` |

## 3. Technology & Architecture Rules
* **Frontend**: Next.js App Router, TailwindCSS, React Context (for MVP state/i18n).
* **Map**: `react-leaflet` with OpenStreetMap. No Google Maps API for MVP.
* **Backend/DB**: Designed for Supabase / PostgreSQL. Current runtime is hybrid: some planner/admin/campaign/creative paths are Supabase-backed, while reports/player and some workflows remain mocked. Check `docs/agents/runtime-truth.md` before changing data flow.
* **Multi-Language**: Custom lightweight `I18nProvider` (Context-based). Do NOT install `next-i18next` or heavy libraries.

> **CRITICAL**: If the user asks you to "implement the DB schema", you must read `docs/backend/step14-schema-design.md` and use the exact table structures defined there. Do not reinvent them.

## 4. Working Workflow & Commands
* **Baseline verification commands**: use `npm run lint`, `npm run test`, and `npm run build` after code changes. For docs-only edits, use `git diff --check`.
* **GitHub Pages deploy model**: production is static export via `next.config.ts` with `output: "export"`, `basePath: "/RMNDooh"`, and `assetPrefix: "/RMNDooh/"`. Validate the hosted route behavior, not just a green build.
* **Campaign Planner editing rule**: edit `src/components/campaign-planner/*` for feature logic. `src/components/planner/*` are thin wrappers and should only change when store wiring changes.
* **Shell route ownership**: non-admin app routes live under `src/app/(shell)/`; `/admin` uses its own route and sidebar. Trace the active route before editing duplicate-looking files.
