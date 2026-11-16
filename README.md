[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/new/template/opencode-3?utm_medium=integration&utm_source=button&utm_campaign=opencode)

# OpenCode on Railway

This repo packages the official [OpenCode](https://github.com/anomalyco/opencode) image for one-click deployment on [Railway](https://railway.com). OpenCode is an open-source AI coding agent. This template runs its web UI and server, so you can code with it from any browser.

## What it deploys

| Service | Builds from | Version |
|---|---|---|
| `OpenCode` | this repo (`Dockerfile`) | `ghcr.io/anomalyco/opencode:2.3.0`, pinned by digest `sha256:998e3e184c650e603d8bacb5cbeaeb090837078262c25521a7136b0375d2b652` |

It's one service with a Railway domain and one volume at `/data`:

- `/data/workspace` holds your projects. Clone repositories here.
- `/data/home` holds OpenCode's sessions database, provider credentials, config and logs.

The wrapper adds the tools the agent needs for real work (`git`, `bash`, `openssh-client`, `curl`, `jq`, `gh`, Node.js and Python) and a small login gateway (`gateway.js`). The gateway runs on the Bun runtime that is built into the `opencode` binary. It:

- starts `opencode serve` on `127.0.0.1:4096` and proxies HTTP, server-sent events and WebSockets to it from `PORT`;
- serves `/login`, a password form. OpenCode 2's web UI signs in only with one-time pairing links from `opencode pair`. The form checks the password, creates a pairing link through OpenCode's API and opens it, so the browser gets OpenCode's own 30-day session cookie. Failed attempts are throttled;
- serves `/healthz` (no login) for Railway's health check;
- refuses to start without a password of at least 12 characters.

## Variables

| Variable | Default | What it does |
|---|---|---|
| `OPENCODE_PASSWORD` | generated per deploy (`${{secret(32)}}`, letters and digits) | Password for the web UI and the API. The username is always `opencode` |
| `PORT` | `8080` | Port the gateway listens on. The Railway domain points at it |

There's nothing to fill in on the deploy form. OpenCode's free models work with no API key. To use your own provider (Anthropic, OpenAI, OpenRouter and others), connect it in the web UI under **Settings → Providers**. The credentials are stored on the volume. You can also set the provider's usual variable, such as `ANTHROPIC_API_KEY`, on the service.

## After deploying

1. Open the service's **Variables** tab and copy `OPENCODE_PASSWORD`.
2. Open the Railway domain and sign in.
3. Open a project in `/data/workspace`, or clone one there from the built-in terminal (for example `git clone https://github.com/you/repo /data/workspace/repo`).

API clients and the CLI use HTTP Basic auth with the user `opencode` and the same password, for example `opencode --server https://YOUR-DOMAIN` with `OPENCODE_PASSWORD` set.

## Updates

Railway tells everyone who deployed this template when a new version is merged to `main`. Read [CHANGELOG.md](CHANGELOG.md), then apply the update from the Railway dashboard. Your data stays on the `/data` volume. OpenCode's own self-update is turned off (`OPENCODE_DISABLE_AUTOUPDATE=1`), so the version only changes through this repo.

To pin a different OpenCode release yourself, change the `FROM` line in `Dockerfile` to `ghcr.io/anomalyco/opencode:<version>@sha256:<digest>`.

## Local run

```sh
docker build -t opencode-railway .
docker run --rm -p 8080:8080 -e OPENCODE_PASSWORD=change-me-to-something-long -v opencode-data:/data opencode-railway
```

Then open http://localhost:8080.

## Licence

OpenCode is MIT-licensed by its authors. This wrapper is MIT-licensed as well.
