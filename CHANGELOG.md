# Changelog

## 2.3.0 (2026-11-16)

First release of this template.

- README: Deploy on Railway button for the published template.

- OpenCode `2.3.0` (`ghcr.io/anomalyco/opencode:2.3.0@sha256:998e3e184c650e603d8bacb5cbeaeb090837078262c25521a7136b0375d2b652`).
- One service with a `/data` volume: the workspace is `/data/workspace`, and OpenCode's data and config are in `/data/home`.
- Login gateway: a password form at `/login` that signs the browser in through OpenCode's pairing flow, a `/healthz` health check, and WebSocket and server-sent-event proxying.
- Adds `git`, `bash`, `openssh-client`, `curl`, `jq`, `gh`, Node.js and Python for the agent's tools.
- OpenCode's self-update is turned off. Versions change through this repo.
