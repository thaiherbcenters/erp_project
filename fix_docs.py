import sys

with open('src/pages/documents/DocumentList.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('const { currentUser } = useAuth();', 'const { currentUser, canCreate, canDelete } = useAuth();')

upload_btn = '''                        <button
                            className="doc-upload-btn"
                            onClick={() => {
                                setShowUploadModal(true);
                                setUploadResult(null);
                            }}
                            title="อัปโหลดเอกสาร"
                        >
                            <UploadCloud size={17} />
                            <span>อัปโหลดเอกสาร</span>
                        </button>'''

upload_replacement = '''                        {canCreate('document_list') && (
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
                        )}'''

content = content.replace(upload_btn, upload_replacement)

delete_btn = '''                                            <button
                                                className="doc-action-btn doc-action-btn-danger"
                                                title="ลบเอกสาร"
                                                onClick={async () => {
                                                    const ok = await showConfirm('ยืนยันการลบ', `ต้องการลบเอกสาร "${doc.id} - ${doc.name}" หรือไม่?\\n\\nการลบจะลบทั้งข้อมูลในระบบและไฟล์เอกสารจริง`, 'warning');
                                                    if (!ok) return;
                                                    try {
                                                        const res = await fetch(`${API_BASE}/documents/${doc.id}?user=${currentUser?.username || 'Unknown'}`, { method: 'DELETE' });
                                                        const data = await res.json();
                                                        if (!res.ok) throw new Error(data.message || 'ลบไม่สำเร็จ');
                                                        showAlert('สำเร็จ', 'ลบเอกสารสำเร็จ', 'success');
                                                        window.location.reload();
                                                    } catch (err) {
                                                        showAlert('เกิดข้อผิดพลาด', `เกิดข้อผิดพลาด: ${err.message}`, 'error');
                                                    }
                                                }}
                                            >
                                                <Trash2 size={15} />
                                            </button>'''

delete_replacement = '''                                            {canDelete('document_list') && (
                                                <button
                                                    className="doc-action-btn doc-action-btn-danger"
                                                    title="ลบเอกสาร"
                                                    onClick={async () => {
                                                        const ok = await showConfirm('ยืนยันการลบ', `ต้องการลบเอกสาร "${doc.id} - ${doc.name}" หรือไม่?\\n\\nการลบจะลบทั้งข้อมูลในระบบและไฟล์เอกสารจริง`, 'warning');
                                                        if (!ok) return;
                                                        try {
                                                            const res = await fetch(`${API_BASE}/documents/${doc.id}?user=${currentUser?.username || 'Unknown'}`, { method: 'DELETE' });
                                                            const data = await res.json();
                                                            if (!res.ok) throw new Error(data.message || 'ลบไม่สำเร็จ');
                                                            showAlert('สำเร็จ', 'ลบเอกสารสำเร็จ', 'success');
                                                            window.location.reload();
                                                        } catch (err) {
                                                            showAlert('เกิดข้อผิดพลาด', `เกิดข้อผิดพลาด: ${err.message}`, 'error');
                                                        }
                                                    }}
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            )}'''

content = content.replace(delete_btn, delete_replacement)

with open('src/pages/documents/DocumentList.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('done')
