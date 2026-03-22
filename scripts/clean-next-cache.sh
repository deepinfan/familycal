#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

find "$ROOT_DIR" -maxdepth 1 -mindepth 1 -type d \
  \( -name '.next' -o -name '.next-dev' -o -name '.next-build' -o -name '.next-health' -o -name '.next.*' -o -name '.next-*.safe.*' \) \
  | while read -r dir; do
    case "$dir" in
      "$ROOT_DIR/.next-health")
        continue
        ;;
    esac
    rm -rf "$dir"
  done

echo "next cache directories cleaned"
