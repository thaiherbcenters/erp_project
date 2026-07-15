import React, { useState, useEffect } from 'react';
import { Upload, FileText, FileJson, CheckCircle, AlertCircle, Plus, Trash2, Check, RefreshCw, GripVertical, X } from 'lucide-react';
import API_BASE from '../config';
import { DOC_TYPES } from '../constants';
import './TemplateUploader.css';

export default function TemplateUploader() {
    const [documentType, setDocumentType] = useState('poa');
    const [pages, setPages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [status, setStatus] = useState(null);

    // ── Drag and Drop State ──
    const [draggedItemIndex, setDraggedItemIndex] = useState(null);
    const [dragOverItemIndex, setDragOverItemIndex] = useState(null);

    const handleDragStart = (e, index) => {
        setDraggedItemIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnter = (e, index) => {
        setDragOverItemIndex(index);
    };

    const handleDragEnd = () => {
        setDraggedItemIndex(null);
        setDragOverItemIndex(null);
    };

    const handleDragOver = (e) => {
        e.preventDefault(); // Necessary to allow dropping
    };

    const handleDrop = (e, index) => {
        e.preventDefault();
        if (draggedItemIndex === null || draggedItemIndex === index) return;
        
        const newPages = [...pages];
        const draggedItem = newPages[draggedItemIndex];
        newPages.splice(draggedItemIndex, 1);
        newPages.splice(index, 0, draggedItem);
        
        setPages(newPages);
        setDraggedItemIndex(null);
        setDragOverItemIndex(null);
    };

    // Fetch existing templates when documentType changes
    useEffect(() => {
        const fetchTemplates = async () => {
            setIsLoading(true);
            setStatus(null);
            try {
                const response = await fetch(`${API_BASE}/templates/list/${documentType}`);
                const data = await response.json();
                
                if (data.success && data.pages.length > 0) {
                    const existingPages = data.pages.map((p, index) => ({
                        id: `existing_${index}`,
                        isExisting: true,
                        existingPdf: true,
                        existingJson: true,
                        originalIndex: p.originalIndex,
                        basePdfName: p.basePdfName,
                        configJsonName: p.configJsonName,
                        basePdf: null,
                        configJson: null
                    }));
                    setPages(existingPages);
                } else {
                    // Start with one blank page
                    setPages([{ id: Date.now(), isExisting: false, basePdf: null, configJson: null }]);
                }
            } catch (error) {
                console.error("Error fetching templates:", error);
                setStatus({ type: 'error', message: 'ไม่สามารถโหลดข้อมูลเทมเพลตเดิมได้' });
                setPages([{ id: Date.now(), isExisting: false, basePdf: null, configJson: null }]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTemplates();
    }, [documentType]);

    const handleAddPage = () => {
        setPages([...pages, { id: Date.now(), isExisting: false, basePdf: null, configJson: null }]);
    };

    const handleRemovePage = (id) => {
        setPages(pages.filter(p => p.id !== id));
    };

    const handleRemoveExistingFile = (id, type) => {
        setPages(pages.map(p => {
            if (p.id === id) {
                if (type === 'pdf') return { ...p, existingPdf: false };
                if (type === 'json') return { ...p, existingJson: false };
            }
            return p;
        }));
    };

    const handleFileChange = (id, field, file) => {
        setPages(pages.map(p => p.id === id ? { ...p, [field]: file } : p));
    };

    const handleUpload = async () => {
        // Validate
        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            if (!page.isExisting) {
                if (!page.basePdf || !page.configJson) {
                    setStatus({ type: 'error', message: `กรุณาเลือกไฟล์ให้ครบทั้ง PDF และ JSON ในหน้าที่ ${i + 1}` });
                    return;
                }
            } else {
                if (!page.existingPdf && !page.basePdf) {
                    setStatus({ type: 'error', message: `กรุณาเลือกไฟล์ PDF ใหม่สำหรับหน้าที่ ${i + 1}` });
                    return;
                }
                if (!page.existingJson && !page.configJson) {
                    setStatus({ type: 'error', message: `กรุณาเลือกไฟล์ JSON ใหม่สำหรับหน้าที่ ${i + 1}` });
                    return;
                }
            }
        }

        if (pages.length === 0) {
            setStatus({ type: 'error', message: 'กรุณาเพิ่มหน้าเอกสารอย่างน้อย 1 หน้า' });
            return;
        }

        setIsUploading(true);
        setStatus(null);

        const formData = new FormData();
        formData.append('documentType', documentType);
        
        const layout = [];
        
        pages.forEach((page, index) => {
            if (page.isExisting) {
                if (page.existingPdf && page.existingJson) {
                    layout.push({ type: 'existing', originalIndex: page.originalIndex });
                } else {
                    layout.push({ type: 'mixed', originalIndex: page.originalIndex, fileIndex: index });
                    if (!page.existingPdf && page.basePdf) formData.append(`basePdf_${index}`, page.basePdf);
                    if (!page.existingJson && page.configJson) formData.append(`configJson_${index}`, page.configJson);
                }
            } else {
                layout.push({ type: 'new', fileIndex: index });
                formData.append(`basePdf_${index}`, page.basePdf);
                formData.append(`configJson_${index}`, page.configJson);
            }
        });
        
        formData.append('layout', JSON.stringify(layout));

        try {
            const response = await fetch(`${API_BASE}/templates/upload`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (response.ok && result.success) {
                setStatus({ type: 'success', message: 'อัปโหลดเทมเพลตสำเร็จ! ข้อมูลถูกอัปเดตเรียบร้อย' });
                
                // Clear all file inputs visually
                document.querySelectorAll('input[type="file"]').forEach(el => el.value = '');
                
                // Re-fetch existing templates
                setTimeout(() => {
                    setDocumentType(prev => prev); // triggers useEffect
                }, 500);
                
            } else {
                setStatus({ type: 'error', message: result.message || 'เกิดข้อผิดพลาดในการอัปโหลด' });
            }
        } catch (error) {
            console.error('Upload error:', error);
            setStatus({ type: 'error', message: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้' });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="template-uploader-container">
            <h2 className="template-uploader-title">
                <FileText size={24} />
                อัปโหลดเทมเพลต PDF (หลายหน้า)
            </h2>
            <p className="template-uploader-subtitle">
                อัปเดตไฟล์แบบฟอร์มเอกสารเปล่า (.pdf) และไฟล์ตั้งค่าตำแหน่ง (.json) จาก PDF Workstation ระบบรองรับการเพิ่มหลายหน้าและจำไฟล์เดิมได้
            </p>

            <div className="template-uploader-card">
                <div className="template-uploader-group">
                    <label className="template-uploader-label">
                        รหัสประเภทเอกสาร (Document Type)
                    </label>
                    <div className="flex items-center">
                        <select
                            value={documentType}
                            onChange={(e) => setDocumentType(e.target.value)}
                            className="template-uploader-select flex-1"
                        >
                            {DOC_TYPES.map(type => (
                                <option key={type.id} value={type.id}>{type.name} ({type.id})</option>
                            ))}
                            <option value="certificate" disabled>ใบรับรอง (กำลังพัฒนา)</option>
                            <option value="receipt" disabled>ใบเสร็จรับเงิน (กำลังพัฒนา)</option>
                        </select>
                        {isLoading && (
                            <div className="ml-3 text-blue-500">
                                <RefreshCw className="animate-spin" size={20} />
                            </div>
                        )}
                    </div>
                </div>

                <div className="template-uploader-pages">
                    {pages.map((page, index) => (
                        <div 
                            key={page.id} 
                            className={`template-uploader-page-block ${draggedItemIndex === index ? 'dragging' : ''} ${dragOverItemIndex === index ? 'drag-over' : ''}`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragEnter={(e) => handleDragEnter(e, index)}
                            onDragEnd={handleDragEnd}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, index)}
                        >
                            <div className="template-uploader-page-header">
                                <div className="flex items-center gap-2">
                                    <div className="cursor-move text-gray-400 hover:text-gray-600 transition-colors p-1" title="ลากเพื่อสลับตำแหน่ง">
                                        <GripVertical size={20} />
                                    </div>
                                    <h3>หน้าที่ {index + 1} {page.isExisting && <span className="text-sm font-normal text-green-600 bg-green-50 px-2 py-1 rounded ml-2">ใช้ไฟล์เดิม</span>}</h3>
                                </div>
                                <button 
                                    onClick={() => handleRemovePage(page.id)}
                                    className="template-uploader-btn-remove"
                                    title="ลบหน้านี้"
                                >
                                    <Trash2 size={16} /> ลบหน้า
                                </button>
                            </div>
                            
                            <div className="template-uploader-grid">
                                {/* PDF File */}
                                {page.isExisting && page.existingPdf ? (
                                    <div className="template-uploader-dropzone pdf bg-green-50 border-green-200 cursor-default hover:bg-green-50 hover:border-green-200 hover:transform-none relative group" style={{ position: 'relative' }}>
                                        <button 
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); handleRemoveExistingFile(page.id, 'pdf'); }}
                                            className="template-uploader-btn-delete-item absolute top-2 right-2 text-gray-400 hover:text-red-500 transition-colors p-1 z-10"
                                            title="ลบไฟล์เดิมเพื่ออัปโหลดใหม่"
                                            style={{ position: 'absolute', top: '12px', right: '12px', background: 'transparent', border: 'none', boxShadow: 'none' }}
                                        >
                                            <X style={{ width: '16px', height: '16px', margin: 0 }} />
                                        </button>
                                        <Check className="text-green-500 mb-2" size={40} />
                                        <span className="template-uploader-dropzone-title text-green-700">
                                            ไฟล์ PDF เดิม
                                        </span>
                                        <span className="template-uploader-dropzone-desc text-green-600">
                                            {page.basePdfName}
                                        </span>
                                    </div>
                                ) : (
                                    <label className="template-uploader-dropzone pdf">
                                        <FileText size={40} />
                                        <span className="template-uploader-dropzone-title">
                                            ไฟล์ PDF เปล่า (Base)
                                        </span>
                                        <span className="template-uploader-dropzone-desc">
                                            {page.basePdf ? page.basePdf.name : `คลิกเพื่อเลือกไฟล์สำหรับหน้า ${index + 1}`}
                                        </span>
                                        {page.basePdf && <span className="template-uploader-file-selected">✓ เลือกไฟล์แล้ว</span>}
                                        <input
                                            type="file"
                                            accept=".pdf"
                                            onChange={(e) => handleFileChange(page.id, 'basePdf', e.target.files[0])}
                                            className="template-uploader-input-hidden"
                                        />
                                    </label>
                                )}

                                {/* JSON File */}
                                {page.isExisting && page.existingJson ? (
                                    <div className="template-uploader-dropzone json bg-green-50 border-green-200 cursor-default hover:bg-green-50 hover:border-green-200 hover:transform-none relative group" style={{ position: 'relative' }}>
                                        <button 
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); handleRemoveExistingFile(page.id, 'json'); }}
                                            className="template-uploader-btn-delete-item absolute top-2 right-2 text-gray-400 hover:text-red-500 transition-colors p-1 z-10"
                                            title="ลบไฟล์เดิมเพื่ออัปโหลดใหม่"
                                            style={{ position: 'absolute', top: '12px', right: '12px', background: 'transparent', border: 'none', boxShadow: 'none' }}
                                        >
                                            <X style={{ width: '16px', height: '16px', margin: 0 }} />
                                        </button>
                                        <Check className="text-green-500 mb-2" size={40} />
                                        <span className="template-uploader-dropzone-title text-green-700">
                                            ไฟล์ตั้งค่าเดิม
                                        </span>
                                        <span className="template-uploader-dropzone-desc text-green-600">
                                            {page.configJsonName}
                                        </span>
                                    </div>
                                ) : (
                                    <label className="template-uploader-dropzone json">
                                        <FileJson size={40} />
                                        <span className="template-uploader-dropzone-title">
                                            ไฟล์ตั้งค่าตําแหน่ง (Config)
                                        </span>
                                        <span className="template-uploader-dropzone-desc">
                                            {page.configJson ? page.configJson.name : `คลิกเพื่อเลือกไฟล์สำหรับหน้า ${index + 1}`}
                                        </span>
                                        {page.configJson && <span className="template-uploader-file-selected">✓ เลือกไฟล์แล้ว</span>}
                                        <input
                                            type="file"
                                            accept=".json"
                                            onChange={(e) => handleFileChange(page.id, 'configJson', e.target.files[0])}
                                            className="template-uploader-input-hidden"
                                        />
                                    </label>
                                )}
                            </div>
                        </div>
                    ))}
                    
                    {pages.length === 0 && (
                        <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                            ยังไม่มีหน้าเอกสาร กรุณากดเพิ่มหน้าเอกสาร
                        </div>
                    )}
                </div>

                <button 
                    onClick={handleAddPage}
                    className="template-uploader-btn-add"
                >
                    <Plus size={18} /> เพิ่มหน้าเอกสาร (ไฟล์ใหม่)
                </button>

                {status && (
                    <div className={`template-uploader-status ${status.type}`}>
                        {status.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                        <span>{status.message}</span>
                    </div>
                )}

                <button
                    onClick={handleUpload}
                    disabled={isUploading || isLoading}
                    className="template-uploader-button"
                >
                    {isUploading ? (
                        <div className="template-uploader-spinner"></div>
                    ) : (
                        <Upload size={20} />
                    )}
                    {isUploading ? 'กำลังบันทึกข้อมูล...' : 'อัปโหลดและบันทึกข้อมูลทั้งหมด'}
                </button>
            </div>
        </div>
    );
}
