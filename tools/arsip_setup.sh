#!/usr/bin/env bash
# Pasang tabel Arsip Blog ke Supabase SATU KALI, tanpa membuka SQL Editor.
# Pakai:  export SUPABASE_ACCESS_TOKEN=sbp_xxx   (supabase.com/dashboard/account/tokens)
#         bash tools/arsip_setup.sh
set -e
cd "$(dirname "$0")/.."
[ -n "$SUPABASE_ACCESS_TOKEN" ] || { echo "Isi dulu: export SUPABASE_ACCESS_TOKEN=sbp_xxx"; exit 1; }
REF=$(grep -o 'https://[a-z0-9]*\.supabase\.co' js/config.js | head -1 | sed 's#https://##;s#\.supabase\.co##')
echo "Proyek Supabase: $REF"
python3 - "$REF" <<'PY'
import sys,json,os,urllib.request
ref=sys.argv[1]; sql=open("supabase/schema_arsip.sql",encoding="utf-8").read()
req=urllib.request.Request(f"https://api.supabase.com/v1/projects/{ref}/database/query",data=json.dumps({"query":sql}).encode(),
  headers={"Authorization":"Bearer "+os.environ["SUPABASE_ACCESS_TOKEN"],"Content-Type":"application/json","User-Agent":"gwm-arsip-setup"},method="POST")
try:
  r=urllib.request.urlopen(req,timeout=120); print("OK",r.status,"- tabel arsip siap.")
except urllib.error.HTTPError as e:
  print("GAGAL",e.code,e.read().decode()[:600]); sys.exit(1)
PY
