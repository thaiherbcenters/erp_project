import os, re
valid_ids = set()
with open('src/data/mockData.js', 'r', encoding='utf-8') as f:
    content = f.read()
    matches = re.findall(r'id:\s*[\'"]([a-z_0-9]+)[\'"]', content)
    for m in matches:
        valid_ids.add(m)

invalid_found = False
for root, _, files in os.walk('src/pages'):
    for file in files:
        if file.endswith('.jsx'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                text = f.read()
                checks = re.findall(r'(?:canCreate|canUpdate|canDelete|hasSubPermission|hasSectionPermission)\([\'"]([a-z_0-9]+)[\'"]\)', text)
                for c in checks:
                    if c not in valid_ids:
                        print(f'{file}: Invalid ID \"{c}\"')
                        invalid_found = True

if not invalid_found:
    print('All permission IDs are valid!')
