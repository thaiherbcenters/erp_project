const fs = require('fs');

let content = fs.readFileSync('src/pages/documents/DocumentList.jsx', 'utf8');

content = content.replace(
    'const { currentUser } = useAuth();',
    'const { currentUser, canCreate, canDelete } = useAuth();'
);

const uploadBtn = `                        <button
                            className="doc-upload-btn"
                            onClick={() => {
                                setShowUploadModal(true);
                                setUploadResult(null);
                            }}
                            title="อัปโหลดเอกสาร"
                        >
                            <UploadCloud size={17} />
                            <span>อัปโหลดเอกสาร</span>
                        </button>`;

const uploadReplacement = `                        {canCreate('document_list') && (
                            <button
                                className="doc-upload-btn"
                                onClick={() => {
                                    setShowUploadModal(true);
                                    setUploadResult(null);
                                }}
                                title="อัปโหลดเอกสาร"
                            >
                                <UploadCloud size={17} />
                                <span>อัปโหลดเอกสาร</span>
                            </button>
                        )}`;

content = content.replace(uploadBtn, uploadReplacement);


const deleteBtn = `                                            <button
                                                className="doc-action-btn doc-action-btn-danger"
                                                title="ลบเอกสาร"
                                                onClick={async () => {
                                                    const ok = await showConfirm('ยืนยันการลบ', \`ต้องการลบเอกสาร "\${doc.id} - \${doc.name}" หรือไม่?\\n\\nการลบจะลบทั้งข้อมูลในระบบและไฟล์เอกสารจริง\`, 'warning');
                                                    if (!ok) return;
                                                    try {
                                                        const res = await fetch(\`\${API_BASE}/documents/\${doc.id}?user=\${currentUser?.username || 'Unknown'}\`, { method: 'DELETE' });
                                                        const data = await res.json();
                                                        if (!res.ok) throw new Error(data.message || 'ลบไม่สำเร็จ');
                                                        showAlert('สำเร็จ', 'ลบเอกสารสำเร็จ', 'success');
                                                        window.location.reload();
                                                    } catch (err) {
                                                        showAlert('เกิดข้อผิดพลาด', \`เกิดข้อผิดพลาด: \${err.message}\`, 'error');
                                                    }
                                                }}
                                            >
                                                <Trash2 size={15} />
                                            </button>`;

const deleteReplacement = `                                            {canDelete('document_list') && (
                                                <button
                                                    className="doc-action-btn doc-action-btn-danger"
                                                    title="ลบเอกสาร"
                                                    onClick={async () => {
                                                        const ok = await showConfirm('ยืนยันการลบ', \`ต้องการลบเอกสาร "\${doc.id} - \${doc.name}" หรือไม่?\\n\\nการลบจะลบทั้งข้อมูลในระบบและไฟล์เอกสารจริง\`, 'warning');
                                                        if (!ok) return;
                                                        try {
                                                            const res = await fetch(\`\${API_BASE}/documents/\${doc.id}?user=\${currentUser?.username || 'Unknown'}\`, { method: 'DELETE' });
                                                            const data = await res.json();
                                                            if (!res.ok) throw new Error(data.message || 'ลบไม่สำเร็จ');
                                                            showAlert('สำเร็จ', 'ลบเอกสารสำเร็จ', 'success');
                                                            window.location.reload();
                                                        } catch (err) {
                                                            showAlert('เกิดข้อผิดพลาด', \`เกิดข้อผิดพลาด: \${err.message}\`, 'error');
                                                        }
                                                    }}
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            )}`;

content = content.replace(deleteBtn, deleteReplacement);

fs.writeFileSync('src/pages/documents/DocumentList.jsx', content, 'utf8');
console.log('done');
