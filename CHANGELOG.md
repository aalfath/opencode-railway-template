# Changelog

## 2.3.2 (2026-11-24)

**Breaking changes:** none for this template. No variable is added or changed.

- OpenCode `2.3.0` → `2.3.2` (`ghcr.io/anomalyco/opencode:2.3.2@sha256:be07cc4afd6d668d91b77accf1bc4338c87b39fbacc0a61666eb003781015f5a`). Release notes: [2.3.1](https://github.com/anomalyco/opencode/releases/tag/v2.3.1), [2.3.2](https://github.com/anomalyco/opencode/releases/tag/v2.3.2).
- On first start, OpenCode migrates its SQLite database on the volume (`/data/home`) by itself. The migration adds the tables for the experimental automations feature, and it carries over active plain-prompt schedules. You don't need to do anything.
- Behaviour changes from OpenCode's notes: a shell command that hits its timeout now keeps running in the background instead of being killed. Session compaction now writes its summary in the background (turn it off with `compaction.background: false`). The experimental `/api/experimental/schedule` API is replaced by `/api/experimental/automation`.
- **How to apply:** apply the update from the Railway notice. The service rebuilds and restarts once, and your sessions, provider sign-ins and workspace stay on the `/data` volume.
- **How to go back:** in the service's **Deployments** tab, redeploy the previous (2.3.0) deployment. 2.3.0 starts on the migrated database, which we tested.

## 2.3.0 (2026-11-16)

First release of this template.

- README: Deploy on Railway button for the published template.

- OpenCode `2.3.0` (`ghcr.io/anomalyco/opencode:2.3.0@sha256:998e3e184c650e603d8bacb5cbeaeb090837078262c25521a7136b0375d2b652`).
- One service with a `/data` volume: the workspace is `/data/workspace`, and OpenCode's data and config are in `/data/home`.
- Login gateway: a password form at `/login` that signs the browser in through OpenCode's pairing flow, a `/healthz` health check, and WebSocket and server-sent-event proxying.
- Adds `git`, `bash`, `openssh-client`, `curl`, `jq`, `gh`, Node.js and Python for the agent's tools.
- OpenCode's self-update is turned off. Versions change through this repo.
