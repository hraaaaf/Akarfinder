#!/usr/bin/env bash
set -euo pipefail

DUCKDB_BIN="${DUCKDB_BIN:-.tmp/data-1-3b/bin/duckdb}"
PATHS_FILE="${CC_PARQUET_PATHS_FILE:-.tmp/data-1-3b/warc-index-parquet.paths}"
OUT_DIR="${CC_EVIDENCE_OUT_DIR:-.tmp/data-1-3b/results}"
WORK_DIR="${CC_EVIDENCE_WORK_DIR:-.tmp/data-1-3b/batched}"
BATCH_SIZE="${CC_PARQUET_BATCH_SIZE:-20}"
MAX_ATTEMPTS="${CC_BATCH_MAX_ATTEMPTS:-4}"

REAL_ESTATE_RE='(^|[^a-z])(immo|immobilier|appartement|apartment|villa|maison|house|terrain|land|riad|studio|duplex|bureau|office|local-commercial|localcommercial|vente|vendre|sale|location|louer|rent|property|properties|real-estate|realestate|residence)([^a-z]|$)'
LOCATION_RE='(^|[^a-z])(morocco|maroc|casablanca|rabat|temara|marrakech|tanger|agadir|fes|meknes|kenitra|el[-_/. ]*jadida|oujda|tetouan|nador|mohammedia|essaouira|safi|beni[-_/. ]*mellal|khouribga|settat|berrechid|el[-_/. ]*kelaa[-_/. ]*des[-_/. ]*sraghna|youssoufia|ben[-_/. ]*guerir|larache|ksar[-_/. ]*el[-_/. ]*kebir|chefchaouen|al[-_/. ]*hoceima|taza|taounate|sefrou|ifrane|azrou|berkane|taourirt|errachidia|midelt|ouarzazate|tinghir|taroudant|tiznit|guelmim|laayoune|dakhla|sidi[-_/. ]*kacem|sidi[-_/. ]*slimane|khemisset|bouznika|skhirat|benslimane|ouezzane|fnideq|martil)([^a-z]|$)'

if [[ ! -x "${DUCKDB_BIN}" ]]; then
  echo "DuckDB binary not executable: ${DUCKDB_BIN}" >&2
  exit 1
fi
if [[ ! -s "${PATHS_FILE}" ]]; then
  echo "Common Crawl Parquet path list missing: ${PATHS_FILE}" >&2
  exit 1
fi
if ! [[ "${BATCH_SIZE}" =~ ^[0-9]+$ ]] || [[ "${BATCH_SIZE}" -lt 1 ]]; then
  echo "CC_PARQUET_BATCH_SIZE must be a positive integer" >&2
  exit 1
fi

rm -rf "${WORK_DIR}"
mkdir -p "${WORK_DIR}/batches" "${WORK_DIR}/parts" "${OUT_DIR}"
split -l "${BATCH_SIZE}" -d -a 3 "${PATHS_FILE}" "${WORK_DIR}/batches/batch-"

build_remote_list() {
  local batch_file="$1"
  local output_file="$2"
  python - "$batch_file" "$output_file" <<'PY'
from pathlib import Path
import sys
source = Path(sys.argv[1])
out = Path(sys.argv[2])
rows = [line.strip() for line in source.read_text().splitlines() if line.strip()]
values = ["'https://data.commoncrawl.org/" + row.replace("'", "''") + "'" for row in rows]
out.write_text('[\n  ' + ',\n  '.join(values) + '\n]\n')
print(len(values))
PY
}

batch_count=0
for batch_file in "${WORK_DIR}"/batches/batch-*; do
  [[ -f "${batch_file}" ]] || continue
  batch_name="$(basename "${batch_file}")"
  list_file="${WORK_DIR}/${batch_name}-files.sql"
  sql_file="${WORK_DIR}/${batch_name}.sql"
  part_file="${WORK_DIR}/parts/${batch_name}.csv"
  file_count="$(build_remote_list "${batch_file}" "${list_file}")"
  files="$(cat "${list_file}")"

  cat > "${sql_file}" <<SQL
INSTALL httpfs;
LOAD httpfs;
SET threads=2;
SET memory_limit='6GB';
SET http_retries=8;
SET http_retry_wait_ms=1000;
SET http_retry_backoff=2;
SET http_timeout=60;
SET http_keep_alive=false;
COPY (
  WITH base AS (
    SELECT
      url_host_name AS domain,
      url_host_registered_domain AS registered_domain,
      url_host_registry_suffix AS registry_suffix,
      url,
      fetch_time,
      regexp_matches(
        lower(concat(coalesce(url_host_name, ''), '/', coalesce(url_path, ''))),
        '${REAL_ESTATE_RE}'
      ) AS real_estate_signal,
      regexp_matches(
        lower(concat(coalesce(url_host_name, ''), '/', coalesce(url_path, ''))),
        '${LOCATION_RE}'
      ) AS morocco_location_signal
    FROM read_parquet(${files}, hive_partitioning=true, union_by_name=true)
    WHERE url_host_name IS NOT NULL
      AND url_host_registered_domain IS NOT NULL
      AND fetch_status = 200
  ),
  lane_a AS (
    SELECT
      'MA_TLD_REAL_ESTATE' AS lane,
      domain,
      registered_domain,
      count(*) AS indexed_pages,
      count_if(real_estate_signal) AS real_estate_signal_pages,
      max(fetch_time) AS latest_fetch_at,
      arg_max(url, fetch_time) AS sample_url
    FROM base
    WHERE registry_suffix = 'ma'
    GROUP BY domain, registered_domain
    HAVING count_if(real_estate_signal) >= 1
  ),
  lane_b AS (
    SELECT
      'MOROCCO_EXTERNAL_REAL_ESTATE' AS lane,
      domain,
      registered_domain,
      count(*) AS indexed_pages,
      count(*) AS real_estate_signal_pages,
      max(fetch_time) AS latest_fetch_at,
      arg_max(url, fetch_time) AS sample_url
    FROM base
    WHERE registry_suffix <> 'ma'
      AND real_estate_signal
      AND morocco_location_signal
    GROUP BY domain, registered_domain
    HAVING count(*) >= 1
  )
  SELECT * FROM lane_a
  UNION ALL
  SELECT * FROM lane_b
) TO '${part_file}' (HEADER, DELIMITER ',');
SQL

  echo "[DATA-1.3B] ${batch_name}: ${file_count} parquet files"
  completed=0
  for attempt in $(seq 1 "${MAX_ATTEMPTS}"); do
    rm -f "${part_file}"
    if "${DUCKDB_BIN}" < "${sql_file}"; then
      completed=1
      break
    fi
    echo "[DATA-1.3B] ${batch_name}: attempt ${attempt}/${MAX_ATTEMPTS} failed" >&2
    if [[ "${attempt}" -lt "${MAX_ATTEMPTS}" ]]; then
      sleep $((attempt * 8))
    fi
  done
  if [[ "${completed}" -ne 1 ]] || [[ ! -f "${part_file}" ]]; then
    echo "[DATA-1.3B] ${batch_name}: exhausted retries" >&2
    exit 1
  fi
  batch_count=$((batch_count + 1))
done

echo "batches_completed=${batch_count}" | tee -a "${OUT_DIR}/manifest.txt"

total_sql="${WORK_DIR}/aggregate.sql"
cat > "${total_sql}" <<SQL
COPY (
  WITH parts AS (
    SELECT
      lane,
      domain,
      registered_domain,
      CAST(indexed_pages AS UBIGINT) AS indexed_pages,
      CAST(real_estate_signal_pages AS UBIGINT) AS real_estate_signal_pages,
      CAST(latest_fetch_at AS TIMESTAMP) AS latest_fetch_at,
      sample_url
    FROM read_csv_auto('${WORK_DIR}/parts/*.csv', header=true, union_by_name=true)
  )
  SELECT
    lane,
    domain,
    registered_domain,
    sum(indexed_pages) AS indexed_pages,
    sum(real_estate_signal_pages) AS real_estate_signal_pages,
    max(latest_fetch_at) AS latest_fetch_at,
    arg_max(sample_url, latest_fetch_at) AS sample_url
  FROM parts
  GROUP BY lane, domain, registered_domain
  ORDER BY lane, real_estate_signal_pages DESC, indexed_pages DESC, domain ASC
) TO '${OUT_DIR}/all-candidates.csv' (HEADER, DELIMITER ',');

COPY (
  SELECT * FROM read_csv_auto('${OUT_DIR}/all-candidates.csv', header=true)
  WHERE lane = 'MA_TLD_REAL_ESTATE'
  ORDER BY real_estate_signal_pages DESC, indexed_pages DESC, domain ASC
) TO '${OUT_DIR}/lane-a.csv' (HEADER, DELIMITER ',');

COPY (
  SELECT * FROM read_csv_auto('${OUT_DIR}/all-candidates.csv', header=true)
  WHERE lane = 'MOROCCO_EXTERNAL_REAL_ESTATE'
  ORDER BY real_estate_signal_pages DESC, indexed_pages DESC, domain ASC
) TO '${OUT_DIR}/lane-b.csv' (HEADER, DELIMITER ',');
SQL
"${DUCKDB_BIN}" < "${total_sql}"

python - "${OUT_DIR}" <<'PY'
import csv
import json
from pathlib import Path
import sys

out = Path(sys.argv[1])

def read(name):
    path = out / name
    with path.open(newline='') as f:
        return list(csv.DictReader(f))

a = read('lane-a.csv')
b = read('lane-b.csv')
rows = a + b
unique_hosts = {r['domain'].lower() for r in rows}
unique_registered = {r['registered_domain'].lower() for r in rows}
summary = {
    'schemaVersion': 'data-1-commoncrawl-live-evidence-v1',
    'crawl': 'CC-MAIN-2026-25',
    'warcFetchAllowed': False,
    'laneAComplete': True,
    'laneBComplete': True,
    'laneAHosts': len(a),
    'laneBHosts': len(b),
    'uniqueHosts': len(unique_hosts),
    'uniqueRegisteredDomains': len(unique_registered),
    'rows': len(rows),
    'batchCount': int(next((line.split('=', 1)[1] for line in (out / 'manifest.txt').read_text().splitlines() if line.startswith('batches_completed=')), '0')),
}
(out / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n')
(out / 'all-domains.txt').write_text('\n'.join(sorted(unique_hosts)) + '\n')
print(json.dumps(summary, indent=2))
PY
