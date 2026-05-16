# RMNDooh User Guide

RMNDooh is a Digital Out-Of-Home advertising marketplace prototype. It lets an advertiser browse available venues, build a media plan, upload creatives, submit a campaign for review, and inspect campaign delivery reports. It also includes an internal admin dashboard and a screen-player simulator.

Live demo: <https://nichiahung.github.io/RMNDooh/>

## Before You Start

The site currently has four main areas:

| Area | Local route | Live route | Used by |
| --- | --- | --- | --- |
| Campaign Planner | `/campaign-planner` | `/RMNDooh/campaign-planner` | Advertisers planning a campaign |
| Admin Dashboard | `/admin` | `/RMNDooh/admin` | Internal campaign, creative, inventory, and screen operations |
| Reports | `/reports` | `/RMNDooh/reports` | Advertisers reviewing delivery performance |
| Web Player | `/player/[screenId]` | `/RMNDooh/player/[screenId]` | Screen playback simulation |

The home page redirects to Campaign Planner.

The prototype supports English and Traditional Chinese. Use the globe button in Campaign Planner to switch languages. The current MVP does not include user login or role-based access control in the UI.

## Campaign Planner

Use Campaign Planner to create an advertiser campaign. The current planner is a two-step flow: choose InventoryLocations, then review and submit. Creative upload is handled through format-specific upload controls in the Media Plan and Review surfaces.

### 1. Find Inventory

1. Open `/campaign-planner`.
2. Use the left Search & Filter panel to narrow available InventoryLocation venues.
3. Filter by campaign objective, city, district, venue type, screen type, audience, budget, impressions, and availability.
4. Switch between List and Map view from the top toolbar.
5. Sort inventory by impressions, price, or CPM.
6. Select View Details to inspect venue description, pricing, audience profile, operating details, availability, and match score.
7. Select Add to Plan to place the venue in your Media Plan.

On mobile, use the filter icon to open Search & Filter and the calculator icon to open the Media Plan.

### 2. Build The Media Plan And Upload Required Creatives

The Media Plan panel shows all selected locations.

1. Adjust the number of booking days for each selected location.
2. Review estimated impressions, average CPM, and total budget.
3. Remove locations that should not be included.
4. Review the required creative formats generated from the selected screen types.
5. Upload one asset for each required format.
6. Select the continue action when the plan and required assets are ready.

Each location defaults to 7 days when first added.

Current file guidance in the format upload modal: JPG, PNG, and MP4 are supported, with a maximum file size of 50 MB per required format.

### 3. Review And Submit

The Review step summarizes campaign settings, selected InventoryLocations, creatives, estimated impressions, average CPM, and total budget.

1. Check the selected locations and booking days.
2. Check the required creative format list.
3. Upload any missing required creative formats.
4. Review the estimated performance and budget disclaimer.
5. Select Submit Campaign after all required creative formats are uploaded.

After submission, the campaign status becomes Pending Review. The admin team is expected to verify creative compliance and inventory availability before launch.

## Admin Dashboard

Use Admin Dashboard for internal operations.

Open `/admin`. The left sidebar contains:

| Tab | Purpose |
| --- | --- |
| Overview | View total campaigns, pending reviews, approved/live campaigns, active screens, pipeline budget, and estimated reach. |
| Campaigns | Search campaigns, filter by status, inspect campaign details, approve/reject campaigns, and confirm bookings. |
| Creative Review | Review pending creative assets and approve or reject them. |
| Inventory | Review available InventoryLocations, daily impressions, pricing, and availability. |
| Screens | Review screen IDs, online/offline/maintenance status, heartbeat timing, playback, and screen specs. |

The Settings and Sign Out buttons are present as UI placeholders in the current MVP.

## Reports

Use Reports to inspect advertiser campaign delivery.

Open `/reports`.

1. Select a campaign from the campaign filter.
2. Select a date range: Last 7 Days, Last 30 Days, This Month, or All Time.
3. Review KPI cards for verified plays, estimated impressions, spend, and average CPM.
4. Review the Daily Delivery Trend chart.
5. Review Delivery by Location and Delivery by Creative.
6. Review Verified Proof-of-Play Logs.
7. Select Export CSV to download the displayed Proof-of-Play log data.

Important reporting definitions:

| Metric | Meaning |
| --- | --- |
| Verified Plays | Device-verified playback events from Proof-of-Play logs. |
| Estimated Impressions | Mathematical estimates based on venue footfall data. |
| Spend | Budget spent for the selected campaign/date range. |
| Avg CPM | Spend divided by estimated impressions, multiplied by 1,000. |

Location filtering is shown in the UI but disabled in the current MVP.

## Web Player Simulator

Use the player route to simulate screen playback.

1. Open `/player/SCR-1000` or another known screen ID.
2. The player loads the screen playlist and cycles through content.
3. The player sends a heartbeat every 10 seconds in the browser console.
4. Press `Shift + D` to open or close the debug panel.
5. Use the debug panel to inspect the playlist and recent Proof-of-Play events.

If the screen ID does not exist, the player shows Screen Not Found.

## Current MVP Limitations

- Campaign Planner inventory is read from the configured Supabase inventory table when environment variables are available.
- Campaign submission, creative upload, admin campaign status updates, and admin creative approval use Supabase-backed API helpers.
- Reports currently use local mock report data.
- Web Player currently uses local mock screen and playlist data.
- There is no login, advertiser account switcher, or production access-control flow in the UI.
- The planner header Save Draft, Admin Settings, and Admin Sign Out are UI placeholders. The Review step has a simulated save-draft confirmation.
- Final pricing and delivery are not guaranteed at planning time; the UI states that inventory availability must be confirmed after submission.

## Running Locally

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000/campaign-planner
```

For Supabase-backed flows, configure these environment variables before running the app:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Without the expected Supabase configuration and seed data, inventory/admin lists may be empty and upload/submission actions may fail.
