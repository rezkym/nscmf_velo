# Verifikasi dokumen dan evidence implementasi

## E-01 — catatan per microtask mendatang

| Evidence             | Isi yang wajib disimpan                                                                           | Status awal       |
| -------------------- | ------------------------------------------------------------------------------------------------- | ----------------- |
| Identitas            | BE ID, parent19, source sections, branch, candidate SHA, tanggal/timezone                         | PLANNED           |
| Test-first           | RED command/target, actual failure summary sesuai AC, RED commit SHA sebelum code                 | NOT RUN           |
| Implementasi         | GREEN command/output/exit code, implementation commit SHA                                         | NOT RUN           |
| Regression           | Target scope, data/env isolation, hasil relevan                                                   | NOT RUN           |
| Quality              | Pint/max-no-baseline/PHP coverage, ESLint/Prettier/strict/Vitest/FE coverage/build                | NOT RUN           |
| MySQL                | Actual8.4/version/+07:00, forward migration/constraints, separate-connection race, rollback proof | NOT RUN           |
| Real capability      | Storage/DB queue/clamd/official workbook/renderer/nonprod cryptography sesuai scope               | NOT RUN           |
| FE binding           | Real request/response fixture, JSON vs Inertia, errors/version, browser journey ID/trace aman     | NOT RUN           |
| Keputusan            | Gap closure approval/source-sync/measurement/artifact hash; bukan assumed default                 | OPEN bila berlaku |
| Migration/dependency | Forward history note, approval new package jika diperlukan; no unrelated lock churn               | NOT RUN           |
| Review               | Human implementation review; explicit human security review untuk18 §17                           | NOT RUN           |
| CI                   | Run/check URL + SHA + actual results; required failure remains FAIL                               | NOT RUN           |
| Manual/fidelity      | Reviewer dan artifact/version/page/font/tolerance yang diperiksa bila berlaku                     | NOT RUN           |
| Completion level     | Task/PR vs Feature/Module vs Release, outstanding applicable gates                                | PLANNED           |

N/A harus punya alasan scope, bukan karena gate sulit atau infra belum ada. Pure refactor boleh N/A RED dengan before/after GREEN. Credentials/private files/key tidak boleh dimasukkan ke evidence. Reopen hasil test lama hanya jika candidate/environment masih tepat; perubahan material memerlukan run baru.

## Bukti penyusunan paket ini

Inspeksi dan review hanya dokumen/source/Git. Application runtime tests, MySQL queries/migrations, browser journeys, scanner/render/signing integrations, CI serta staging **NOT RUN** selama penyusunan; tidak mengklaim implementasi backend/FE selesai. Alasan tidak menjalankan app suites: seluruh diff hanya dokumen sesuai16 §92, tidak ada executable/config/lock/runtime change.

Pemeriksaan struktural membuktikan ID, dependency, source coverage mapping, link dan scope. Itu berbeda dari membuktikan bahwa implementasi memenuhi requirements. Review semantic dilakukan terhadap sumber per concern: schema14 slices, T18/T19 atomicity, endpoint transport, FE01..57, actual template/signing prerequisites, audit/cleanup serta seed matrix. Temuan review ditutup pada dokumen task sebelum handoff; review dokumentasi ini bukan human implementation/security review.

## Reproduksi pemeriksaan dokumen

Dari root repository, jalankan potongan Python berikut (`python3` dengan stdin/heredoc). Hanya membaca file dan status Git; tidak menjalankan aplikasi atau mengubah database. `authority/application tracked files unchanged` memverifikasi sesi penyusunan uncommitted ini; setelah dokumen dikomit, verifikasi diff terhadap base8f365a8 tetap hanya microtask_be. Formatting Markdown tidak menjadi existing Prettier gate karena `.prettierignore` mengecualikan `*.md`; paket diperiksa eksplisit memakai empty ignore file sementara.

````python
from pathlib import Path
import json,re,subprocess,hashlib
root=Path.cwd(); out=root/'microtask_be'; errors=[]; checks=[]
def check(name,condition):
 checks.append(name)
 if not condition:errors.append(name)
tasks=json.loads((out/'catalog.json').read_text());bykey={t['key']:t for t in tasks};ids={t['id'] for t in tasks}
check('unique contiguous task IDs',len(ids)==len(tasks) and ids=={f'BE-{n:03d}' for n in range(1,len(tasks)+1)})
check('unique task symbolic keys',len(bykey)==len(tasks))
check('one file per task', {p.stem for p in out.glob('BE-*.md')}==ids)
parents={p for t in tasks for p in t['parents']}
required={f'T{n:02d}' for n in range(82)}|{f'T05-{n}' for n in range(1,15)}|{'T05A','T05B','T05C','DG-01','DG-02'}|{f'T{n}{c}' for n in [18,19] for c in 'ABCDEF'}
check('all 113 official parents/subtasks/gates mapped',required<=parents)
check('no unapproved official parent identifiers',parents<=required)
check('all thirteen phases', {t['phase'] for t in tasks}==set(range(13)))
for t in tasks:
 p=out/(t['id']+'.md');s=p.read_text()
 check(t['id']+' metadata/AC/test/source',all(t.get(k) for k in ['parents','refs','files','test','contract','acceptance']) and len(t['acceptance'])>=3 and t['test'] in s)
 check(t['id']+' planned/not-run',t['status']=='PLANNED' and t['evidence']=='NOT RUN' and '**Hasil pengujian:** NOT RUN' in s)
 check(t['id']+' dependencies prior/no self',all(k in bykey and bykey[k]['id']<t['id'] for k in t['deps']))
 check(t['id']+' source reference links','../project_doc/' in s)
 ac=re.findall(r'^- \[ \] \*\*AC-\d+:\*\* (.*)',s,re.M)
 normalize=lambda value:re.sub(r'\s+',' ',value).strip().rstrip('.')
 check(t['id']+' catalog/document acceptance parity',[normalize(value) for value in ac]==[normalize(value) for value in t['acceptance']])
 for dep in t['deps']:check(t['id']+' dependency rendered '+dep,bykey[dep]['id'] in s)
# independent cycle audit
state={}
def visit(k):
 if state.get(k)==1:errors.append('dependency cycle '+k);return
 if state.get(k)==2:return
 state[k]=1
 for d in bykey[k]['deps']:
  if d in bykey:visit(d)
 state[k]=2
for k in bykey:visit(k)
# Local Markdown links only outside code fences; explicit anchors and normal heading slugs.
link_count=0
for p in out.glob('*.md'):
 text=re.sub(r'```.*?```','',p.read_text(),flags=re.S)
 for label,target in re.findall(r'\[([^\]]+)\]\(([^)]+)\)',text):
  if re.match(r'\w+://',target):continue
  target=target.strip('<>');path,_,anchor=target.partition('#');dest=(p.parent/path).resolve() if path else p
  link_count+=1
  if not dest.exists():errors.append(f'broken link {p.name}: {target}');continue
  if anchor and dest.is_file():
   content=dest.read_text();anchors=set(re.findall(r'<a id="([^"]+)"',content))
   for h in re.findall(r'^#{1,6}\s+(.+)',content,re.M):anchors.add(re.sub(r'[^\w\- ]','',h.lower()).replace(' ','-'))
   if anchor not in anchors:errors.append(f'broken anchor {p.name}: {target}')
# Source fingerprint and section completeness, using source headings rather than catalog totals.
base=(out/'01_BASELINE_DAN_SUMBER.md').read_text()
source_sections=set()
for p in (root/'project_doc').glob('*.md'):
 check('source hash '+p.name,hashlib.sha256(p.read_bytes()).hexdigest() in base)
 in_code=False
 for line in p.read_text().splitlines():
  if line.startswith('```'):in_code=not in_code;continue
  if not in_code:
   m=re.match(r'##\s+(\d+[A-Z]?(?:\.\d+)*)(?:\.|\s)\s*(.*)',line)
   if m:source_sections.add((p.name,m[1]))
coverage=json.loads((out/'coverage.json').read_text())
check('all source sections mapped',source_sections=={(r['source'],r['section']) for r in coverage['sections']})
check('source section owners exist',all(r['owners'] and set(r['owners'])<=ids for r in coverage['sections']))
# canonical route inventory: independently scan authoritative consolidated route catalog.
api=(root/'project_doc/12_API_Contract.md').read_text()
canonical=set(re.findall(r'^\s*(GET|POST|PUT|PATCH|DELETE)\s+(/[^\s\n]+)',api,re.M))
routes={(r['method'],r['path']) for r in coverage['routes']}
check('every canonical method/path inventoried',canonical==routes)
check('every route owner exists',all(all(k in bykey for k in r['owners']) for r in coverage['routes']))
# granular names and constraints are preserved in source-derived contract catalogues.
schema=(root/'project_doc/11_ERD_Database_Schema.md').read_text();schema_doc=(out/'08_SCHEMA_DAN_CONSTRAINT.md').read_text()
columns=set(re.findall(r'^\| `([^`]+)` \|',schema,re.M))
check('all ERD named table-column rows preserved',all('`'+c+'`' in schema_doc for c in columns))
field_source=(root/'project_doc/06_Validation_Rules.md').read_text();fields_doc=(out/'09_FIELD_DAN_VALIDASI.md').read_text()
check('business SLA/KPI/Performance preserved',all(k in fields_doc for k in ['Specific Requirements (SLA)','Target KPI','Performance Information']))
seed=(out/'10_AUDIT_QUEUE_SEED.md').read_text()
check('all20 deterministic demo IDs',all(f'DEMO-{family}-{n:03d}' in seed for family in ['ACT','CHG'] for n in range(1,11)))
fe=(out/'05_INTEGRASI_FE.md').read_text()
check('every FE01..57 has explicit ownership row',all(re.search(r'^\| FE-'+f'{n:02d}'+r' \|',fe,re.M) for n in range(1,58)))
trace=(out/'03_TRACEABILITY.md').read_text()
trace_ids={line.split('|')[1].strip() for line in trace.splitlines() if line.startswith('|')}
check('every56 MVP items mapped',all(f'MVP-{n:02d}' in trace_ids for n in range(1,57)))
reqs=set(re.findall(r'\*\*((?:FR-[A-Z]+|NFR)-\d+)',(root/'project_doc/01_PRD.md').read_text()))
check('every FR/NFR mapped',reqs<=trace_ids)
# Worktree scope: tracked changes and nonignored new files must all remain documents in microtask_be.
tracked=subprocess.check_output(['git','diff','--name-only'],text=True).splitlines()
staged=subprocess.check_output(['git','diff','--cached','--name-only'],text=True).splitlines()
new=subprocess.check_output(['git','ls-files','--others','--exclude-standard'],text=True).splitlines()
check('only microtask_be document changes',all(p.startswith('microtask_be/') and Path(p).suffix in ['.md','.json'] for p in tracked+staged+new))
check('authority/application tracked files unchanged',not tracked and not staged)
summary={'status':'PASS' if not errors else 'FAIL','tasks':len(tasks),'official_units':len(required),'phases':13,'source_sections':len(source_sections),'routes':len(routes),'ERD_named_rows':len(columns),'MVP_items':56,'FR_NFR':len(reqs),'FE_ids':57,'local_links_checked':link_count,'checks':len(checks),'errors':errors}
print(json.dumps(summary,ensure_ascii=False,indent=2))
raise SystemExit(bool(errors))
````

## Pemeriksaan akhir

Pemeriksaan lokal pada 22 September 2026, branch `docs/backend-microtasks`, base `8f365a8`. Seluruh perubahan paket masih belum dikomit. Hasil ini berlaku untuk penyusunan dokumen, bukan penyelesaian implementasi backlog.

| Pemeriksaan                          | Hasil aktual                                                                                |
| ------------------------------------ | ------------------------------------------------------------------------------------------- |
| Python pemeriksa di atas             | PASS, exit 0; 1.048 pemeriksaan, tanpa error                                                |
| ID, phase, parent, dependency        | 149 task; 13 phase; 113 parent/subtask/gate resmi; tidak ada ID putus atau dependency cycle |
| Traceability sumber                  | 1.731 bagian bernomor dari 25 dokumen; 56 item MVP dan 31 FR/NFR terpetakan                 |
| Kontrak dan konsumen                 | 66 method/path; 179 nama baris ERD; 57 ID FE; 20 skenario demo tercatat                     |
| Tautan lokal                         | 8.663 tautan diperiksa; tidak ada target/anchor putus                                       |
| Konsistensi acceptance               | AC dalam 149 dokumen cocok dengan `catalog.json`                                            |
| Reproduksi Python                    | Potongan kode dari dokumen dikompilasi dan dijalankan; hasil PASS                           |
| Prettier seluruh Markdown/JSON paket | PASS; empty ignore file dipakai karena aturan proyek mengecualikan Markdown                 |
| `git diff --check` dan scope         | PASS; tracked/staged files tidak berubah, hanya `microtask_be/` untracked                   |
| Pengujian aplikasi/infrastruktur/CI  | NOT RUN; tidak berlaku untuk perubahan dokumen ini menurut 16 §92                           |
| Human implementation/security review | NOT RUN; tetap gate pelaksanaan task mendatang                                              |

Perintah formatting yang telah diperiksa dari root repository:

```bash
touch /private/tmp/alya-empty-prettierignore
./node_modules/.bin/prettier --ignore-path /private/tmp/alya-empty-prettierignore --check 'microtask_be/**/*.{md,json}'
git diff --check
git status --short --branch
```

Temuan review dokumentasi yang sudah ditangani:

- Bukti server Pest dibedakan dari integrasi Chromium yang memakai route/response nyata. Setiap konsumen FE memiliki pemilik binding dan gate bukti; auth/admin dapat diverifikasi pada Phase 2 tanpa menunggu settings Phase 9.
- Draft dan Change Results memiliki pekerjaan transport JSON, pelestarian input, error 422/409, versi authoritative dan larangan replay otomatis. Change Results memiliki target Chromium tersendiri.
- Kredensial sekali tampil memiliki pembuktian server no-store/non-persistence serta pembuktian browser refresh/back/history yang terpisah; guard database dan storage browser mendahului journey mutation.
- Audit minimum, transaksi/rollback/version, deferred foreign key serta promosi CLEAN setelah pemeriksaan ulang state/permission/slot mendapat acceptance eksplisit sejak kapabilitas yang membutuhkannya.
- Koreksi header memiliki gate keputusan dan pekerjaan implementasi berbeda. Workbook/renderer/signing/20 MB/rate/timeout serta kontrak yang belum final tetap tercatat OPEN dengan pemilik dan bukti penutupan.
- Checkpoint Docker memakai kontrak bisnis yang sama setelah fondasi native stabil; server nyata dan bukti staging baru diperlukan untuk klaim release yang bersangkutan.

Pemeriksaan otomatis membuktikan kelengkapan pemetaan dan konsistensi struktur; review terhadap sumber menjelaskan isi dan batas scope. Keduanya tidak membuktikan perilaku aplikasi, tidak menutup keputusan produk, dan tidak menggantikan review manusia yang diwajibkan saat implementasi. Seluruh BE tetap **PLANNED / NOT RUN**.
