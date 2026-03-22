#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT_DIR/.next-health"
LOG_FILE="$LOG_DIR/dev.log"
DEV_DIST_DIR="$ROOT_DIR/.next-dev"
KEEP_ROTATED_CACHE_COUNT=2
MAX_ATTEMPTS=3
HEALTH_TIMEOUT=45

mkdir -p "$LOG_DIR"

cleanup_previous() {
  pkill -f "next dev" >/dev/null 2>&1 || true
}

cleanup_old_rotated_caches() {
  local old_caches
  old_caches="$(
    find "$ROOT_DIR" -maxdepth 1 -mindepth 1 -type d \
      \( -name '.next-dev.safe.*' -o -name '.next.safe.*' -o -name '.next.*' -o -name '.next-*.safe.*' \) \
      | grep -vE '/\.next-dev$|/\.next-build$|/\.next-health$' \
      | sort
  )"

  if [ -z "$old_caches" ]; then
    return 0
  fi

  echo "$old_caches" | head -n -"${KEEP_ROTATED_CACHE_COUNT}" 2>/dev/null | while read -r dir; do
    [ -n "$dir" ] || continue
    rm -rf "$dir"
  done
}

rotate_next_cache() {
  if [ -d "$DEV_DIST_DIR" ]; then
    mv "$DEV_DIST_DIR" "$ROOT_DIR/.next-dev.safe.$(date +%s)"
  fi
}

start_server() {
  : > "$LOG_FILE"
  (
    cd "$ROOT_DIR"
    npm run dev:raw
  ) >"$LOG_FILE" 2>&1 &
  DEV_PID=$!
}

log_has_broken_cache_error() {
  grep -Eq "Cannot find module '\./[0-9]+\.js'|_document\.js|reading '/_app'|MODULE_NOT_FOUND" "$LOG_FILE"
}

health_check() {
  local status

  status="$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login || true)"
  if [ "$status" != "200" ]; then
    return 1
  fi

  status="$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/auth || true)"
  if [ "$status" != "200" ]; then
    return 1
  fi

  status="$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/admin || true)"
  case "$status" in
    200|307)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

wait_until_healthy() {
  local elapsed=0

  while [ "$elapsed" -lt "$HEALTH_TIMEOUT" ]; do
    if ! kill -0 "$DEV_PID" >/dev/null 2>&1; then
      return 1
    fi

    if log_has_broken_cache_error; then
      return 1
    fi

    if health_check; then
      return 0
    fi

    sleep 1
    elapsed=$((elapsed + 1))
  done

  return 1
}

stop_server() {
  if [ -n "${DEV_PID:-}" ] && kill -0 "$DEV_PID" >/dev/null 2>&1; then
    kill "$DEV_PID" >/dev/null 2>&1 || true
    wait "$DEV_PID" >/dev/null 2>&1 || true
  fi
}

trap 'stop_server' INT TERM

cleanup_previous
cleanup_old_rotated_caches

attempt=1
while [ "$attempt" -le "$MAX_ATTEMPTS" ]; do
  rotate_next_cache
  start_server

  if wait_until_healthy; then
    echo "dev server healthy on http://localhost:3000"
    echo "health checks passed: /login 200, /api/auth 200, /admin 200/307"
    tail -n +1 -f "$LOG_FILE" &
    TAIL_PID=$!
    wait "$DEV_PID"
    kill "$TAIL_PID" >/dev/null 2>&1 || true
    exit 0
  fi

  echo "attempt $attempt failed, retrying..." >&2
  stop_server
  attempt=$((attempt + 1))
done

echo "dev server failed health checks after $MAX_ATTEMPTS attempts" >&2
echo "last log output:" >&2
tail -n 80 "$LOG_FILE" >&2 || true
exit 1
