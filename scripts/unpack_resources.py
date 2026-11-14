#!/usr/bin/env python3
"""Restore the bundled offline SGF game records and pre-generated Mandarin audio.
No network access or third-party packages are needed.
"""
from pathlib import Path
import hashlib,json,tarfile,io,sys
ROOT=Path(__file__).resolve().parents[1]
config=json.loads((ROOT/'resources'/'manifest.json').read_text(encoding='utf-8'))
parts=[]
for entry in config['parts']:
    p=ROOT/'resources'/entry['file']
    if not p.is_file(): sys.exit(f'Missing: {p.name}')
    data=p.read_bytes()
    if hashlib.sha256(data).hexdigest()!=entry['sha256']:sys.exit(f'Part checksum mismatch: {p.name}')
    parts.append(data)
archive=b''.join(parts)
if hashlib.sha256(archive).hexdigest()!=config['sha256']:sys.exit('Bundle checksum mismatch')
with tarfile.open(fileobj=io.BytesIO(archive),mode='r:gz') as tf:
    for m in tf.getmembers():
        relative=Path(m.name)
        if not m.isfile() or not relative.parts or relative.parts[0]!='assets' or len(relative.parts)<3 or relative.parts[1] not in ('audio','sgf') or '..' in relative.parts:sys.exit(f'Invalid archive entry: {m.name}')
        target=ROOT/relative
        target.parent.mkdir(parents=True,exist_ok=True)
        with tf.extractfile(m) as src:target.write_bytes(src.read())
print(f"Restored {config['content']['audio_files']} audio files and {config['content']['sgf']} SGF records. Offline resources are ready.")
