#!/usr/bin/env bash
# watch-deploy.sh — poll the git remote, rebuild on new commits, redeploy to k3s.
#
# Called by systemd timer every N minutes. Idempotent: if no new commits
# exist, exits immediately without rebuilding. Stores the last-deployed SHA
# in .last-deployed-sha so it survives reboots and timer cycles.
#
# Usage (manual):
#   ./watch-deploy.sh
#
# Or let the systemd timer run it (see bgapi-watch.timer).

set -euo pipefail

# ---- Config ----------------------------------------------------------------
REPO_DIR="${REPO_DIR:-/home/pi/BGAPI}"
STATE_FILE="$REPO_DIR/.last-deployed-sha"
BRANCH="${WATCH_BRANCH:-dev}"
NAMESPACE="${NAMESPACE:-bgapi}"
KUBECTL="${KUBECTL:-kubectl}"
# ---------------------------------------------------------------------------

log() { echo "[$(date -Iseconds)] $*"; }

cd "$REPO_DIR" || { log "ERROR: repo dir $REPO_DIR not found"; exit 1; }

# ------------------------------------------------------------------
# 1. Fetch the remote and compare SHAs
# ------------------------------------------------------------------
log "Fetching origin/$BRANCH ..."
git fetch origin "$BRANCH" 2>&1 || { log "ERROR: git fetch failed"; exit 1; }

REMOTE_SHA=$(git rev-parse "origin/$BRANCH" 2>/dev/null) || { log "ERROR: cannot resolve origin/$BRANCH"; exit 1; }
LAST_SHA=""
if [ -f "$STATE_FILE" ]; then
  LAST_SHA=$(cat "$STATE_FILE")
fi

if [ "$REMOTE_SHA" = "$LAST_SHA" ]; then
  log "No new commits. HEAD: ${REMOTE_SHA:0:8}"
  exit 0
fi

log "NEW COMMITS: ${LAST_SHA:0:8} → ${REMOTE_SHA:0:8}"

# ------------------------------------------------------------------
# 2. Pull and build the Docker image
# ------------------------------------------------------------------
log "Pulling $BRANCH ..."
git checkout "$BRANCH" 2>&1
git pull origin "$BRANCH" 2>&1

log "Building bgapi:local (this will take several minutes on a Pi) ..."
docker build -f APIs/BGAPI/Dockerfile -t bgapi:local . 2>&1

log "Importing image into k3s containerd ..."
docker save bgapi:local | sudo k3s ctr images import - 2>&1

# ------------------------------------------------------------------
# 3. Redeploy to k3s
# ------------------------------------------------------------------
log "Triggering rollout restart for deploy/bgapi ..."
"$KUBECTL" -n "$NAMESPACE" rollout restart deploy/bgapi 2>&1

log "Waiting for rollout to complete ..."
if "$KUBECTL" -n "$NAMESPACE" rollout status deploy/bgapi --timeout=180s 2>&1; then
  log "Rollout successful."
else
  log "WARNING: rollout did not complete in time. Check with: kubectl -n $NAMESPACE get pods"
fi

# ------------------------------------------------------------------
# 4. Record the deployed SHA
# ------------------------------------------------------------------
echo "$REMOTE_SHA" > "$STATE_FILE"
log "Deployed $REMOTE_SHA — recorded to $STATE_FILE"
log "Done."
