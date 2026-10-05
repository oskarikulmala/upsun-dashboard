# Upsun Dashboard

Dashboard for [Upsun](https://upsun.com): production status, environments, integrations and costs across all your projects, with one-click redeploy, backup and pause/resume.

## Features

- **Overview**: a health summary of every project (healthy, deploying, failing, inactive). Each project card shows the production branch and URL, last deployment, last backup (highlighted when older than 48 hours), active environment count, head commit and recent activity.
- **Project page**: all environments in one table, production CPU and memory over the last 24 hours compared with limits, usage for the current billing period, and an activity log with cron runs filtered out.
- **Environments**: every environment across all projects, filterable by status (active, paused, inactive) and type (production, staging, development).
- **Costs**: estimated spend per organization, broken down by project.
- **Integrations**: a modal listing each project's third-party integrations (Git, notifications, webhooks, log forwarding and so on), with warnings for expiring GitLab tokens.
- **Actions** (opt-in): redeploy, back up, pause and resume environments.

Data refreshes automatically every 60 seconds while the tab is visible.

## Setup

Requires Node.js 20.9 or newer.

```bash
npm install
cp .env.example .env.local   # then fill in your token
npm run dev
```

Open <http://localhost:3000>.

### Configuration

| Variable                 | Required | Description                                                                                                      |
| ------------------------ | -------- | ---------------------------------------------------------------------------------------------------------------- |
| `UPSUN_API_TOKEN`        | Yes      | API token, created in the Upsun Console under **My profile → API tokens**.                                        |
| `UPSUN_ORGANIZATION_IDS` | No       | Comma-separated organization IDs to show. If empty, every organization the token's user belongs to is shown.      |
| `UPSUN_ENABLE_ACTIONS`   | No       | Set to `true` to show the redeploy, backup, pause and resume buttons. Defaults to `false`.                        |

### Token permissions

The dashboard can only show what the token's user is allowed to see. Sections the user can't access display a "not available with this API token's role" notice instead of failing:

| To see                         | The token's user needs                    |
| ------------------------------ | ----------------------------------------- |
| Projects and environments      | Access to the projects                    |
| Activity log, resource metrics | At least **Viewer** on the environments   |
| Costs                          | Billing permission in the organization    |
| Actions                        | Permission for that action on the environment type (usually **Admin**) |

A dedicated service user with exactly these roles works better than a personal token.

### Opening the dev server through a hostname other than `localhost`

Next.js blocks its dev scripts for unknown hosts. When that happens the page loads but nothing on it is clickable. Add the hostname to `allowedDevOrigins` in `next.config.ts` and restart the dev server.

## Security

> [!WARNING]
> The dashboard has **no login of its own**. Anyone who can open it sees what the token can see, and, when `UPSUN_ENABLE_ACTIONS=true`, can redeploy, back up or pause environments with the token's permissions. Host it only behind access control, such as a VPN, SSO, or Upsun's HTTP access control.

Safeguards in place:

- The token is used only on the server and never reaches the browser.
- Every action is re-checked on the server: actions must be enabled, the project must be one the dashboard shows, and production environments can't be paused.
- The integrations modal shows only non-secret fields. Webhook keys, PagerDuty routing keys, log-forwarding headers and full endpoint URLs are never sent to the browser. Git access tokens can't be read through the Upsun API at all.

## Production

```bash
npm run build
npm start
```

## How it works

Built with Next.js 16 (App Router, Cache Components) and Tailwind CSS 4. All Upsun data is fetched on the server, fresh on every request.

```
lib/upsun/
  auth.ts           Exchanges the API token for short-lived access tokens; caches and renews them
  client.ts         Authenticated fetch with retry on 401 and pagination
  common.ts         Shared queries: organizations, projects, environments, activities
  dashboard.ts      Overview data and health calculation
  project.ts        Project page: environments, resources, usage, activities
  environments.ts   All environments across projects
  costs.ts          Organization cost estimates
  integrations.ts   Integrations, reduced to non-secret fields
app/
  page.tsx                   Overview
  projects/[projectId]/      Project page
  environments/              Environment list
  costs/                     Costs
  actions.ts                 Server actions (environment actions, integrations)
```

The Upsun REST API is documented at <https://developer.upsun.com/api/rest/overview>. The OpenAPI spec is at <https://meta.upsun.com/openapi-spec>.
