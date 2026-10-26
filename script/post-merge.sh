#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

# Restore the exact dependencies recorded by the merged lockfile.
npm ci --no-audit --no-fund
