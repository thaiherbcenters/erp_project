import json
import os

log_file = r'C:\Users\thaih\.gemini\antigravity\brain\3d240156-231c-4c52-9eae-f02c8afeb6fa\.system_generated\logs\transcript_full.jsonl'
file_path = r'C:\Users\thaih\OneDrive\เอกสาร\GitHub\erp_project\src\pages\RnD.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# We will collect all edits and apply them in chronological order.
edits = []

with open(log_file, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            if 'tool_calls' in data and data['tool_calls']:
                for tc in data['tool_calls']:
                    name = tc.get('name')
                    if name in ['default_api:replace_file_content', 'default_api:multi_replace_file_content']:
                        args = tc.get('arguments', {})
                        if 'RnD.jsx' in args.get('TargetFile', ''):
                            edits.append((name, args))
        except Exception as e:
            pass

print(f"Found {len(edits)} edits to RnD.jsx")

for name, args in edits:
    try:
        if name == 'default_api:replace_file_content':
            target = args['TargetContent']
            replacement = args['ReplacementContent']
            if target in content:
                content = content.replace(target, replacement)
                print("Applied replace")
            else:
                print("Failed to apply replace: Target not found")
        elif name == 'default_api:multi_replace_file_content':
            chunks = args.get('ReplacementChunks', [])
            success = 0
            for chunk in chunks:
                target = chunk['TargetContent']
                replacement = chunk['ReplacementContent']
                if target in content:
                    content = content.replace(target, replacement)
                    success += 1
            print(f"Applied {success}/{len(chunks)} multi-replace chunks")
    except Exception as e:
        print(f"Error applying edit: {e}")

with open('RnD_restored.jsx', 'w', encoding='utf-8') as out:
    out.write(content)
print("Finished replaying edits to RnD_restored.jsx")
