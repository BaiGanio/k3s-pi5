#!/usr/bin/env bash
# deploy.sh — apply all BGAPI k3s manifests in order.
#
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh
#
# Or apply a single file:
#   kubectl apply -f bgapi.yaml

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KUBECTL="${KUBECTL:-kubectl}"

echo "=== BGAPI k3s deploy ==="
echo "Using kubectl: $(command -v "$KUBECTL")"
echo

apply() {
  local file="$1"
  echo "→ Applying $file ..."
  "$KUBECTL" apply -f "$SCRIPT_DIR/$file"
}

# Order matters: namespace first, then secrets, then infrastructure, then app.
apply namespace.yaml
apply secrets.yaml
apply sqlserver.yaml
apply postgres.yaml

echo
echo "→ Waiting for SQL Server to be ready..."
"$KUBECTL" -n bgapi wait --for=condition=ready pod -l app=sqlserver --timeout=300s

echo
echo "→ Waiting for PostgreSQL to be ready..."
"$KUBECTL" -n bgapi wait --for=condition=ready pod -l app=postgres --timeout=300s

apply db-init-job.yaml

echo
echo "→ Waiting for db-init Job to complete..."
"$KUBECTL" -n bgapi wait --for=condition=complete job/db-init --timeout=120s

apply bgapi.yaml
apply ingress.yaml

echo
echo "→ Waiting for BGAPI to be ready..."
"$KUBECTL" -n bgapi wait --for=condition=ready pod -l app=bgapi --timeout=120s

echo
echo "=== Deploy complete ==="
echo
"$KUBECTL" -n bgapi get pods,svc,ingressroute
echo
echo "Port-forward to test:  kubectl -n bgapi port-forward svc/bgapi 62010:62010"
echo "Ingress (if DNS set):  http://bgapi.local/swagger"
