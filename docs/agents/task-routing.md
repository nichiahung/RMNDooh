# Task Routing For Agents

Use this file to decide what to read before editing.

## Always Read First

For any non-trivial task:

1. `AGENTS.md`
2. `docs/agents/runtime-truth.md`
3. This file

If the task touches Next.js APIs, also read the relevant docs under `node_modules/next/dist/docs/` because this repo uses Next.js 16.

## Routing Table

| Task | Required docs | Likely implementation areas |
| --- | --- | --- |
| Campaign Planner UI | `business-context.md`, `feature-map.md`, PRD | `src/components/campaign-planner`, `src/store/usePlannerStore.ts`, `src/utils/inventoryFilters.ts` |
| Search/filter/list/map UX | Search/filter spec/plan, `feature-map.md` | `FilterSidebar`, `InventoryDiscovery`, `ListView`, `MapWrapper` |
| Media Plan calculations | `business-context.md`, `data-contracts.md` | `src/utils/mediaPlanCalculations.ts`, `MediaPlanSummary`, `CampaignReviewStep` |
| Creative requirements | `business-context.md`, creative requirement spec/plan | `src/utils/creativeRequirements.ts`, `CreativeRequirements`, `CreativeUploadModal`, `MediaPlanSummary`, `CampaignReviewStep` |
| Campaign submission | `campaign-draft-self-service.md`, Step 15 API docs, `runtime-truth.md` | `src/lib/api/campaigns.ts`, `src/lib/api/campaign-draft.ts`, review/submit UI |
| Admin dashboard | `business-context.md`, Step 15 API docs | `src/components/admin`, `src/lib/api/admin.ts` |
| Database/schema | `docs/backend/step14-schema-design.md` | Supabase migrations or schema docs only unless explicitly requested |
| API contract | `docs/backend/step15-api-design-v2.md` or newer | API helper files, backend docs |
| Programmatic DOOH | `docs/backend/programmatic-schema-design.md`, `business-context.md` | Programmatic docs first; code only if explicitly requested |
| Reports | `business-context.md`, `feature-map.md` | `src/components/reports`, `src/data/mockReportData.ts`, `src/utils/reportCalculations.ts` |
| Web Player | `business-context.md`, `feature-map.md` | `src/components/player`, `src/data/mockScreens.ts`, `src/data/mockPlaylists.ts`, `src/utils/proofOfPlay.ts` |
| i18n / zh-TW | `runtime-truth.md`, `testing-playbook.md` | `src/i18n/dictionaries.ts`, `src/i18n/filterLabels.ts`, visible components |
| GitHub Pages deploy | `deploy-runbook.md`, `env-and-secrets.md` | `next.config.ts`, workflows, `public/404.html`, asset path helpers |

## Decision Rules

- If a request says "DB schema", use Step 14 exactly. Do not invent tables.
- If a request says "API", use Step 15 and note whether the current app has a real backend route or only frontend Supabase helpers.
- If a request says "current site", prioritize runtime truth over future-state backend docs.
- If a request says "business flow", start from `business-context.md`, then check active code.
- If multiple files duplicate a component name, trace the route import before editing.
- If changing labels visible to users, update both English and Traditional Chinese where applicable.

## When To Ask The User

Ask only when the repo cannot answer:

- Which business flow is intended when docs and runtime conflict.
- Whether a placeholder should become real behavior.
- Whether to preserve MVP shortcuts such as default Advertiser/User IDs.
- Whether a future-state backend spec should be implemented now or only documented.
