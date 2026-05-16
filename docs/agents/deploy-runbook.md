# Deploy Runbook

This app is deployed as a static Next.js export to GitHub Pages.

## Build Model

Current config:

- `next.config.ts`
- `output: "export"`
- production `basePath: "/RMNDooh"`
- production `assetPrefix: "/RMNDooh/"`
- image optimization disabled

Local dev:

```text
http://localhost:3000/campaign-planner
```

Production:

```text
https://nichiahung.github.io/RMNDooh/campaign-planner
```

## Local Build Check

Run:

```bash
npm run build
```

Expected output:

- static export succeeds
- `out/` is generated
- dynamic player routes are generated from `mockScreens` via `generateStaticParams()`

## GitHub Pages Details

The root production route is:

```text
https://nichiahung.github.io/RMNDooh/
```

Known production route family:

- `/RMNDooh/campaign-planner`
- `/RMNDooh/admin`
- `/RMNDooh/reports`
- `/RMNDooh/player/SCR-1000`

## SPA 404 Recovery

`public/404.html` is used for GitHub Pages SPA-style deep route recovery. The home route reads `?p=` and `?h=` params and redirects back to the intended route.

If deployed deep links return `404 File not found`:

1. Check GitHub Pages workflow completed successfully.
2. Check `out/404.html` exists in build output.
3. Check `next.config.ts` production basePath/assetPrefix.
4. Check the actual hosted URL in a browser, not only workflow logs.
5. Check static image paths are prefixed with `/RMNDooh` where needed.

## Asset Path Rules

- Public images are stored in `public/images`.
- Static production assets must respect the `/RMNDooh` base path.
- Use the existing image path helper where applicable instead of hardcoding production paths.

## Deployment Acceptance

After deploy, manually verify:

- `/RMNDooh/` redirects to planner.
- `/RMNDooh/campaign-planner` loads inventory UI.
- `/RMNDooh/admin` renders dashboard shell.
- `/RMNDooh/reports` renders report dashboard.
- `/RMNDooh/player/SCR-1000` renders player.
- No broken images in planner cards/details.
- No mixed-language regressions in the validated language.

## Agent Rule

Do not declare deploy success from a green build alone. Verify the hosted route behavior.
