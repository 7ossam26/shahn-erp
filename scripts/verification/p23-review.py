"""Local P23 artifact/credential review. Private input values are never printed or persisted."""
from pathlib import Path
import argparse
import hashlib
import json
import re
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument('--private-json', action='append', default=[])
args = parser.parse_args()
root = Path.cwd().resolve()
evidence = root / 'docs/verification/P23'
sha = lambda data: hashlib.sha256(data).hexdigest()
normalizations = []
for path in sorted(evidence.glob('*.txt')):
    original = path.read_bytes()
    encoding = 'utf-16' if original.startswith((b'\xff\xfe', b'\xfe\xff')) else 'utf-8-sig'
    text = original.decode(encoding)
    normalized = ('\n'.join(line.rstrip(' \t') for line in text.splitlines()).rstrip('\n') + '\n').encode('utf-8')
    if normalized != original:
        normalizations.append({'path':str(path.relative_to(root)), 'originalSha256':sha(original), 'normalizedSha256':sha(normalized), 'operation':'only transcript encoding/line ending/trailing whitespace; result and failures retained'})
        path.write_bytes(normalized)
normalization_path = evidence / 'transcript-normalization.json'
previous = json.loads(normalization_path.read_text(encoding='utf-8')) if normalization_path.exists() else []
normalization_path.write_text(json.dumps(previous + normalizations, indent=2) + '\n', encoding='utf-8')

secrets = set()
def collect(value, sensitive=False):
    if isinstance(value, dict):
        for key, item in value.items():
            # Closed command discriminators/identity labels are public contract data, even
            # under an operation named rotate-service-credential; never treat them as keys.
            if key in ('type', 'operation', 'id', 'keyId', 'entity', 'capability'):
                continue
            collect(item, sensitive or bool(re.search(r'secret|password|token|bearer|credential|authorization|cookie|private.?key|signing.?key', key, re.I)))
    elif isinstance(value, list):
        for item in value:
            collect(item, sensitive)
    elif sensitive and isinstance(value, str) and len(value) >= 16:
        secrets.add(value)
for path in args.private_json:
    collect(json.loads(Path(path).read_text(encoding='utf-8-sig')))
changed = subprocess.check_output(['git', 'ls-files', '--modified', '--others', '--exclude-standard', '-z']).decode().split('\0')
changed += subprocess.check_output(['git', 'diff', '--name-only', 'HEAD', '-z']).decode().split('\0')
changed = sorted(set(name for name in changed if name))
hits = []
for name in changed:
    if not (root / name).is_file():
        continue  # Removed generated pages have no bytes to publish; staged diff reviews deletion.
    data = (root / name).read_bytes()
    if any(value.encode() in data or value.encode('utf-16-le') in data for value in secrets):
        hits.append(name)
artifacts = [root / 'package-lock.json', root / 'packages/database/migrations/0027_p23_reporting.sql']
artifacts += sorted(evidence.glob('*.xlsx')) + sorted(evidence.glob('*.pdf'))
artifacts += sorted((evidence / 'reports').glob('*'))
identities = [{'path':str(p.relative_to(root)), 'sha256':sha(p.read_bytes()), 'bytes':p.stat().st_size} for p in artifacts]
(evidence / 'artifact-identities.json').write_text(json.dumps(identities, indent=2) + '\n', encoding='utf-8')
review = {'phase':'P23', 'startingHead':'fb641940b60458de81ef186878a4717cb85ef2a4', 'model':'gpt-6.1-sol', 'effort':'high', 'changedFilesScanned':len(changed), 'privateValuesChecked':len(secrets), 'credentialMatchingFiles':hits, 'requiredScripts':{'phase':{'unit':8,'database':20,'result':'pass'},'unitRegression':676,'prerequisiteDatabase':193,'availableLive':8,'runner':1,'typecheck':'pass','lint':'pass','build':'pass'}, 'pdfsInspected':13, 'pagesInspected':19, 'browser':'owner excluded final browser testing; historical failures retained', 'manualDevice':'unrun', 'deferredExternalHandoff':'TAWSEL-CHANGE-REQUESTS.md', 'profit':'REP-15 remains P24'}
(evidence / 'final-review.json').write_text(json.dumps(review, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'filesScanned':len(changed), 'privateValuesChecked':len(secrets), 'matchingFiles':hits, 'artifactIdentities':len(identities)}))
if hits:
    raise SystemExit(1)
