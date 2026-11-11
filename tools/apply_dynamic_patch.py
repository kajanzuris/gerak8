#!/usr/bin/env python3
"""
Izinkan tema "dynamic" di tools/validate_scenes.py (tanpa ini, Action berhenti dengan pesan
"theme 'dynamic' tidak dikenal") dan tambahkan pemeriksaan field tema dinamis. Jalankan dari akar repo:

    python3 tools/apply_dynamic_patch.py

Setiap teks yang diganti harus cocok TEPAT satu kali; bila ada yang tidak cocok, tidak ada file yang diubah.
Aman dijalankan ulang. Hanya mengubah tools/validate_scenes.py.
"""
import os
import sys

PATH = 'tools/validate_scenes.py'
if not os.path.exists(PATH):
    sys.exit(f'GAGAL: {PATH} tidak ditemukan (jalankan dari akar repo).')

with open(PATH, encoding='utf-8', newline='') as f:
    s = f.read()
if "'dynamic'" in s:
    print('SKIP: validate_scenes.py sudah mendukung tema dynamic.')
    sys.exit(0)      # kode keluar 0 supaya aman dipakai sebagai langkah di GitHub Action
nl = '\r\n' if '\r\n' in s else '\n'

BLOCK = nl.join([
    "        # tema dinamis (src/parts/dynamic.tsx)",
    "        if s.get('look') is not None and s['look'] not in ('peach', 'violet', 'teal', 'sand', 'night'): err.append(f\"adegan {i}: look '{s['look']}' tidak dikenal (peach / violet / teal / sand / night)\")",
    "        if s.get('punchAt') is not None and s['punchAt'] not in ('top', 'mid', 'low'): err.append(f\"adegan {i}: punchAt '{s['punchAt']}' harus top / mid / low\")",
    "        if s.get('punch') is not None and (not isinstance(s['punch'], str) or len(s['punch'].split()) > 3): warn.append(f\"adegan {i}: punch sebaiknya 1-3 kata\")",
    "        for cj in (s.get('collage') or []):",
    "            if not os.path.exists(f'{D}/{cj}'): err.append(f\"adegan {i}: gambar kolase '{cj}' belum ada di {D}/\")",
    "",
])

PAIRS = [
    ("(None, 'clean', 'hud', 'classic', 'tutorial', 'neon')",
     "(None, 'clean', 'hud', 'classic', 'tutorial', 'neon', 'dynamic')"),
    ("(clean / hud / classic / tutorial / neon)",
     "(clean / hud / classic / tutorial / neon / dynamic)"),
    ("        # objek pelengkap (pops): gambar/emoji yang muncul saat kata tertentu diucapkan",
     BLOCK + "        # objek pelengkap (pops): gambar/emoji yang muncul saat kata tertentu diucapkan"),
]
for old, new in PAIRS:
    n = s.count(old)
    if n != 1:
        sys.exit(f'GAGAL: teks ini ditemukan {n}x (harus 1x), tidak ada file diubah:\n  {old}')
    s = s.replace(old, new)

with open(PATH, 'w', encoding='utf-8', newline='') as f:
    f.write(s)
print('OK  ', PATH, '(tema dynamic diizinkan + pemeriksaan look/punch/collage)')
