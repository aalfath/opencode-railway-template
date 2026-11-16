# OpenCode for Railway: https://github.com/aalfath/opencode-railway-template
# Official image, pinned by version and digest. Bump both together (see CHANGELOG.md).
FROM ghcr.io/anomalyco/opencode:2.3.0@sha256:998e3e184c650e603d8bacb5cbeaeb090837078262c25521a7136b0375d2b652

# Tools the agent needs for real work: git, a shell, SSH for git remotes, Node.js and Python for MCP servers.
RUN apk add --no-cache bash git git-lfs openssh-client curl jq ca-certificates nodejs npm python3 github-cli

# Everything OpenCode stores (sessions database, provider credentials, config, logs) lives under HOME,
# and your code lives in /data/workspace. Mount one Railway volume at /data.
ENV HOME=/data/home \
    OPENCODE_DISABLE_AUTOUPDATE=1 \
    PORT=8080

COPY gateway.js /opt/railway/gateway.js

EXPOSE 8080
# The opencode binary embeds the Bun runtime; BUN_BE_BUN=1 makes it run the gateway script.
ENTRYPOINT ["/bin/sh", "-c", "mkdir -p /data/home /data/workspace && BUN_BE_BUN=1 exec /usr/local/bin/opencode /opt/railway/gateway.js"]
