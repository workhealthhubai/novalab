#!/usr/bin/env bash
set -euo pipefail

# DICOM protocol acceptance test for a Novalab radiology order.
# Requires DCMTK (echoscu, findscu, storescu, dump2dcm), curl and jq.

required=(echoscu findscu storescu dump2dcm curl jq)
for command_name in "${required[@]}"; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Missing command: $command_name" >&2
    echo "Install DCMTK, curl and jq, then run this script again." >&2
    exit 2
  fi
done

: "${DICOM_PATIENT_ID:?Set DICOM_PATIENT_ID to the employee UUID from the Novalab request}"
: "${DICOM_ACCESSION_NUMBER:?Set DICOM_ACCESSION_NUMBER to the request accession number}"

PACS_HOST="${PACS_HOST:-127.0.0.1}"
PACS_PORT="${PACS_PORT:-4242}"
PACS_AET="${PACS_AET:-OSGB}"
MODALITY_AET="${MODALITY_AET:-XRAY01}"
DICOM_MODALITY="${DICOM_MODALITY:-DX}"

test_dir="$(mktemp -d "${TMPDIR:-/tmp}/novalab-dicom.XXXXXX")"
cleanup() {
  if [[ -n "${test_dir:-}" && "$test_dir" == *novalab-dicom.* ]]; then
    rm -rf -- "$test_dir"
  fi
}
trap cleanup EXIT

echo "[1/4] C-ECHO ${MODALITY_AET} -> ${PACS_AET}@${PACS_HOST}:${PACS_PORT}"
echoscu -aet "$MODALITY_AET" -aec "$PACS_AET" "$PACS_HOST" "$PACS_PORT"

echo "[2/4] MWL C-FIND by PatientID + AccessionNumber"
findscu -W -aet "$MODALITY_AET" -aec "$PACS_AET" \
  -k "(0010,0020)=${DICOM_PATIENT_ID}" \
  -k "(0008,0050)=${DICOM_ACCESSION_NUMBER}" \
  -k "(0040,0100)[0].(0008,0060)" \
  "$PACS_HOST" "$PACS_PORT" 2>&1 | tee "$test_dir/worklist.txt"

if ! grep -Fq "$DICOM_ACCESSION_NUMBER" "$test_dir/worklist.txt"; then
  echo "MWL response did not contain accession ${DICOM_ACCESSION_NUMBER}." >&2
  exit 3
fi

uid_root="1.2.826.0.1.3680043.10.5432"
uid_suffix="$(date -u +%Y%m%d%H%M%S).$$.${RANDOM}"
study_uid="${uid_root}.1.${uid_suffix}"
series_uid="${uid_root}.2.${uid_suffix}"
instance_uid="${uid_root}.3.${uid_suffix}"

dump_file="$test_dir/instance.dump"
dcm_file="$test_dir/instance.dcm"
cat >"$dump_file" <<EOF
(0008,0016) UI [1.2.840.10008.5.1.4.1.1.7]
(0008,0018) UI [${instance_uid}]
(0008,0020) DA [$(date -u +%Y%m%d)]
(0008,0030) TM [$(date -u +%H%M%S)]
(0008,0050) SH [${DICOM_ACCESSION_NUMBER}]
(0008,0060) CS [${DICOM_MODALITY}]
(0008,1030) LO [NOVALAB ACCEPTANCE TEST]
(0010,0010) PN [TEST^NOVALAB]
(0010,0020) LO [${DICOM_PATIENT_ID}]
(0020,000D) UI [${study_uid}]
(0020,000E) UI [${series_uid}]
(0020,0011) IS [1]
(0020,0013) IS [1]
(0028,0002) US 1
(0028,0004) CS [MONOCHROME2]
(0028,0010) US 1
(0028,0011) US 1
(0028,0100) US 8
(0028,0101) US 8
(0028,0102) US 7
(0028,0103) US 0
(7fe0,0010) OB 00
EOF

echo "[3/4] Generate and send one Secondary Capture instance via C-STORE"
dump2dcm "$dump_file" "$dcm_file"
storescu -aet "$MODALITY_AET" -aec "$PACS_AET" "$PACS_HOST" "$PACS_PORT" "$dcm_file"

if [[ -n "${NOVALAB_API_BASE_URL:-}" && -n "${NOVALAB_ACCESS_TOKEN:-}" && -n "${RADIOLOGY_REQUEST_ID:-}" ]]; then
  echo "[4/4] Reconcile through Novalab and verify the linked StudyInstanceUID"
  curl --fail --silent --show-error \
    -X POST \
    -H "Authorization: Bearer ${NOVALAB_ACCESS_TOKEN}" \
    "${NOVALAB_API_BASE_URL%/}/radiology/pacs/reconcile?limit=25" >/dev/null
  linked_uid="$(curl --fail --silent --show-error \
    -H "Authorization: Bearer ${NOVALAB_ACCESS_TOKEN}" \
    "${NOVALAB_API_BASE_URL%/}/radiology/${RADIOLOGY_REQUEST_ID}" | jq -r '.data.studyInstanceUid // .studyInstanceUid // empty')"
  if [[ "$linked_uid" != "$study_uid" ]]; then
    echo "Novalab linked UID '${linked_uid:-none}', expected '${study_uid}'." >&2
    exit 4
  fi
else
  echo "[4/4] API verification skipped. Set NOVALAB_API_BASE_URL, NOVALAB_ACCESS_TOKEN and RADIOLOGY_REQUEST_ID to enable it."
fi

echo "DICOM acceptance passed. StudyInstanceUID=${study_uid}"
