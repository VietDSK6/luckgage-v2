#!/usr/bin/env bash
set -euo pipefail

database_name="${1:-luckgage_integration}"
if [[ ! "$database_name" =~ ^[a-z0-9_]+(_integration|_demo)$ ]]; then
  echo 'Use only a database ending in _integration or _demo.' >&2
  exit 1
fi

restore_name="${database_name}_restore_check"
if (( ${#restore_name} > 63 )); then
  echo 'Restore database name is too long for PostgreSQL.' >&2
  exit 1
fi

db() { docker compose exec -T postgres "$@"; }
if [[ "$(db psql -U luckgage -d postgres -Atc "SELECT 1 FROM pg_database WHERE datname = '$database_name'")" != '1' ]]; then
  echo "Database $database_name does not exist." >&2
  exit 1
fi
if [[ "$(db psql -U luckgage -d postgres -Atc "SELECT 1 FROM pg_database WHERE datname = '$restore_name'")" == '1' ]]; then
  echo "Refusing to replace existing database $restore_name." >&2
  exit 1
fi

umask 077
temporary_directory="$(mktemp -d)"
created_restore=false
cleanup() {
  if [[ "$created_restore" == true ]]; then
    db dropdb -U luckgage "$restore_name" >/dev/null || true
  fi
  rm -rf "$temporary_directory"
}
trap cleanup EXIT

dump_file="$temporary_directory/demo.dump"
db pg_dump -U luckgage -d "$database_name" -Fc > "$dump_file"
db createdb -U luckgage "$restore_name"
created_restore=true
db pg_restore -U luckgage -d "$restore_name" --no-owner --no-privileges < "$dump_file"

summary_query='SELECT (SELECT count(*) FROM users), (SELECT count(*) FROM trips), (SELECT count(*) FROM guides), (SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL)'
source_summary="$(db psql -U luckgage -d "$database_name" -Atc "$summary_query")"
restored_summary="$(db psql -U luckgage -d "$restore_name" -Atc "$summary_query")"
if [[ "$source_summary" != "$restored_summary" ]]; then
  echo "Restore counts differ: source=$source_summary restored=$restored_summary" >&2
  exit 1
fi
echo "Backup and restore verified for $database_name (users|trips|guides|migrations: $restored_summary)."
