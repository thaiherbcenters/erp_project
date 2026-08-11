import os

file_path = r'C:\Users\thaih\OneDrive\เอกสาร\GitHub\erp_project\src\pages\RnD.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add getCategoryStyle below getStatusColor
func_to_add = """    const getCategoryStyle = (category) => {
        if (!category) return { background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '500', display: 'inline-block' };
        const cat = category.toLowerCase();
        if (cat.includes('ยาดม')) return { background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '500', display: 'inline-block' };
        if (cat.includes('ยาหม่อง')) return { background: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '500', display: 'inline-block' };
        if (cat.includes('ยาน้ำ') || cat.includes('น้ำมัน')) return { background: '#fce7f3', color: '#be185d', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '500', display: 'inline-block' };
        if (cat.includes('ลูกประคบ')) return { background: '#fef3c7', color: '#b45309', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '500', display: 'inline-block' };
        return { background: '#e0e7ff', color: '#4338ca', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '500', display: 'inline-block' };
    };
"""
if 'getCategoryStyle' not in content:
    content = content.replace("    const getStatusColor = (status) => {", func_to_add + "\n    const getStatusColor = (status) => {")

# 2. Replace occurrences of badge-info for category
# In formula table:
content = content.replace('<span className="badge badge-info">{formula.category || \'-\'}</span>', '<span style={getCategoryStyle(formula.category)}>{formula.category || \'-\'}</span>')
content = content.replace('<span className="badge badge-info">{formula.category}</span>', '<span style={getCategoryStyle(formula.category)}>{formula.category}</span>')
# In projects table:
content = content.replace('<span className="badge badge-info">{project.category}</span>', '<span style={getCategoryStyle(project.category)}>{project.category}</span>')
# In dashboard:
content = content.replace('<span className="badge badge-info">{f.category}</span>', '<span style={getCategoryStyle(f.category)}>{f.category}</span>')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated category styles successfully.")
