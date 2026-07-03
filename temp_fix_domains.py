from pathlib import Path
import re

root = Path('.')
files = [p for p in root.rglob('*') if p.is_file() and '.git' not in p.parts and 'node_modules' not in p.parts]

pattern_http = re.compile(r'https://preploom\.com\.ng')
pattern_http2 = re.compile(r'http://preploom\.com\.ng')
pattern_domain = re.compile(r'(?<!@)preploom\.com\.ng(?![A-Za-z0-9._%+-])')
pattern_typo = re.compile(r'(?<!@)preploom\.ng(?![A-Za-z0-9._%+-])')

changed = []
for p in files:
    try:
        text = p.read_text(encoding='utf-8', errors='ignore')
    except Exception:
        continue
    new_text = pattern_http.sub('https://www.preploom.com.ng', text)
    new_text = pattern_http2.sub('http://www.preploom.com.ng', new_text)
    new_text = pattern_domain.sub('www.preploom.com.ng', new_text)
    new_text = pattern_typo.sub('preploom.com.ng', new_text)
    if new_text != text:
        p.write_text(new_text, encoding='utf-8')
        changed.append(str(p))

print('changed_files', len(changed))
for item in changed[:100]:
    print(item)
