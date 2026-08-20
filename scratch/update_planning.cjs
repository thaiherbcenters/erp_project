const fs = require('fs');

const file = 'c:\\Users\\thaih\\OneDrive\\เอกสาร\\GitHub\\erp_project\\src\\pages\\Planning.jsx';
let content = fs.readFileSync(file, 'utf8');

// Replace in Dashboard view (jobs.slice(0,3))
content = content.replace(
    '<td>{job.formulaName}</td>',
    `<td>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{job.productName && job.productName !== job.formulaName ? job.productName : job.formulaName}</div>
        {job.productName && job.productName !== job.formulaName && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{job.formulaName}</div>}
    </td>`
);

// Replace in Main list view
content = content.replace(
    /<div style=\{\{\s*fontSize:\s*13,\s*fontWeight:\s*500,\s*color:\s*'var\(--text\)',\s*whiteSpace:\s*'nowrap',\s*overflow:\s*'hidden',\s*textOverflow:\s*'ellipsis'\s*\}\}\s*title=\{job\.formulaName\}>\s*\{job\.formulaName\}\s*<\/div>/g,
    `<div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={job.productName || job.formulaName}>
        {job.productName && job.productName !== job.formulaName ? job.productName : job.formulaName}
    </div>
    {job.productName && job.productName !== job.formulaName && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {job.formulaName}
        </div>
    )}`
);

fs.writeFileSync(file, content, 'utf8');
console.log('Updated Planning.jsx successfully.');
