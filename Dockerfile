# OpenCode for Railway: https://github.com/aalfath/opencode-railway-template
# Official image, pinned by version and digest. Bump both together (see CHANGELOG.md).
FROM ghcr.io/anomalyco/opencode:2.3.2@sha256:be07cc4afd6d668d91b77accf1bc4338c87b39fbacc0a61666eb003781015f5a

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
