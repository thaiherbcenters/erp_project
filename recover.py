import json
import os

log_file = r'C:\Users\thaih\.gemini\antigravity\brain\3d240156-231c-4c52-9eae-f02c8afeb6fa\.system_generated\logs\transcript_full.jsonl'

last_content = None

with open(log_file, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            if 'tool_calls' in data and data['tool_calls']:
                for tc in data['tool_calls']:
                    if tc.get('name') == 'default_api:write_to_file':
                        args = tc.get('arguments', {})
                        if 'RnD.jsx' in args.get('TargetFile', ''):
                            last_content = args.get('CodeContent')
            if 'content' in data:
                # check if there is a diff block we can parse
                pass
        except Exception as e:
            pass

if last_content:
    with open('RnD_recovered.jsx', 'w', encoding='utf-8') as out:
        out.write(last_content)
    print("Recovered from write_to_file")
else:
    print("No write_to_file for RnD.jsx found in transcript.")
