# Agent Documentation Index

This folder is the operational context pack for Codex, Claude Code, and other AI agents working in this repository.

Read these files before changing code:

| File | Use when |
| --- | --- |
| `business-context.md` | You need product intent, user roles, sales model, or business rules. |
| `runtime-truth.md` | You need to know what is real, mocked, Supabase-backed, or placeholder today. |
| `task-routing.md` | You need to decide which docs and source files to inspect for a task. |
| `feature-map.md` | You need route/component/data-source ownership. |
| `env-and-secrets.md` | You need to run the app locally or debug env-related failures. |
| `testing-playbook.md` | You need to verify a change before reporting it complete. |
| `deploy-runbook.md` | You need to build, export, deploy, or debug GitHub Pages. |
| `data-contracts.md` | You need to align frontend types, Supabase rows, and API helper shapes. |
| `change-log-for-agents.md` | You need recent agent-relevant decisions and drift warnings. |

Core rule: do not infer architecture from old comments alone. Check `runtime-truth.md`, then the relevant implementation files.
