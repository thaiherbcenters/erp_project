import React, { useEffect, useRef, useState } from 'react';
import { Download, Plus, Layout, Type, MousePointer2, ScanSearch, Loader2, FilePlus, ChevronRight } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface MappedField {
  id: string;
  name: string;
  type?: 'text' | 'checkbox' | 'comb';
  query?: string;
  label?: string;
  inputType?: 'text' | 'date' | 'number' | 'email' | 'tel';
  section?: string;
  pageIndex: number; // New: Page number for the field
  xPercent: number; // Stored as 0-100 ratio
  yPercent: number; // Stored as 0-100 ratio
  widthPct: number; // Added for bounding box width
  heightPct: number; // Added for bounding box height
  charSpacingEm?: number; // Added for stretching characters like ID cards
  combCount?: number;     // Added for exact box split
  combBoxes?: { xPercent: number; widthPct: number }[]; // Array of exact sub-box absolute coordinates!
  combFormat?: string; // e.g. '1-4-5-2-1'
}

interface PDFEditorProps {
  file: File;
  fields: MappedField[];
  onAddField: (field: MappedField) => void;
  onSetFields: (fields: MappedField[]) => void;
  onUpdateField: (id: string, updates: Partial<MappedField>) => void;
  onRemoveField: (id: string) => void;
  onUpdateFile: (file: File) => void;
  activeFieldId: string | null;
  setActiveFieldId: (id: string | null) => void;
}

const AutoFormPreview: React.FC<{ fields: MappedField[], formData: Record<string, any>, onFormChange: (name: string, val: any) => void, onPreviewToggle: () => void, isPreviewMode: boolean, onUpdateField?: (id: string, updates: Partial<MappedField>) => void, onRemoveField?: (id: string) => void }> = ({ fields, formData, onFormChange, onPreviewToggle, isPreviewMode, onUpdateField, onRemoveField }) => {
  const [editingFieldId, setEditingFieldId] = React.useState<string | null>(null);
  const [editingSec, setEditingSec] = React.useState<string | null>(null);
  const [secVal, setSecVal] = React.useState('');

  if (fields.length === 0) return null;

  const seenNames = new Set<string>();
  const uniqueFieldsList = fields.filter(f => {
     if (seenNames.has(f.name)) return false;
     seenNames.add(f.name);
     return true;
  });

  const sections = uniqueFieldsList.reduce((acc, field) => {
    const sec = field.section || 'ทั่วไป (General)';
    if (!acc[sec]) acc[sec] = [];
    acc[sec].push(field);
    return acc;
  }, {} as Record<string, MappedField[]>);

  const renameSec = (oldN: string, newN: string) => {
    if (!newN.trim() || newN === oldN || !onUpdateField) { setEditingSec(null); return; }
    fields.forEach(f => { if ((f.section || 'ทั่วไป (General)') === oldN) onUpdateField(f.id, { section: newN.trim() }); });
    setEditingSec(null);
  };

  return (
    <div style={{ flex: '1 1 450px', width: '100%', minWidth: '350px', maxWidth: '850px', backgroundColor: 'white', borderRadius: '12px', padding: '2.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', marginBottom: '4rem' }}>
      <div style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
          ✨ แพลตฟอร์มพรีวิว (Auto-Generated Form)
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.5rem', marginBottom: 0 }}>
          ดับเบิ้ลคลิกหัวข้อเพื่อแก้ไข &bull; กด ✏️ เพื่อแก้ไขช่อง
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        {Object.entries(sections).map(([sectionName, sectionFields], secIdx) => (
          <div key={sectionName}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ background: '#4f46e5', color: 'white', minWidth: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9rem' }}>{secIdx + 1}</div>
              {editingSec === sectionName ? (
                <input autoFocus value={secVal} onChange={e => setSecVal(e.target.value)}
                  onBlur={() => renameSec(sectionName, secVal)}
                  onKeyDown={e => { if (e.key === 'Enter') renameSec(sectionName, secVal); if (e.key === 'Escape') setEditingSec(null); }}
                  style={{ fontSize: '1.1rem', fontWeight: 600, color: '#4f46e5', border: '1px solid #4f46e5', borderRadius: '4px', padding: '0.2rem 0.5rem', outline: 'none', flex: 1 }} />
              ) : (
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#4f46e5', margin: 0, cursor: 'pointer' }}
                  onDoubleClick={() => { setEditingSec(sectionName); setSecVal(sectionName); }}
                  title="ดับเบิ้ลคลิกเพื่อแก้ไขชื่อหัวข้อ">{sectionName}</h3>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.75rem 1.5rem' }}>
              {sectionFields.map(field => (
                <div key={field.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {editingFieldId === field.id && onUpdateField && (
                    <div style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.75rem', marginBottom: '0.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '0.7rem', color: '#64748b' }}>Label (ชื่อแสดง)</label>
                          <input value={field.label || ''} onChange={e => onUpdateField(field.id, { label: e.target.value })}
                            style={{ width: '100%', padding: '0.3rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem', boxSizing: 'border-box' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '0.7rem', color: '#64748b' }}>Name (ตัวแปร)</label>
                          <input value={field.name} onChange={e => onUpdateField(field.id, { name: e.target.value })}
                            style={{ width: '100%', padding: '0.3rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem', fontFamily: 'monospace', boxSizing: 'border-box' }} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '0.7rem', color: '#64748b' }}>Input Type</label>
                          <select value={field.inputType || 'text'} onChange={e => onUpdateField(field.id, { inputType: e.target.value as any })}
                            style={{ width: '100%', padding: '0.3rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem', boxSizing: 'border-box' }}>
                            <option value="text">Text</option><option value="date">Date</option><option value="number">Number</option><option value="email">Email</option><option value="tel">Tel</option>
                          </select>
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '0.7rem', color: '#64748b' }}>Section</label>
                          <input value={field.section || ''} onChange={e => onUpdateField(field.id, { section: e.target.value })}
                            style={{ width: '100%', padding: '0.3rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem', boxSizing: 'border-box' }} />
                        </div>
                        {onRemoveField && <button onClick={() => { if(confirm(`ลบช่อง "${field.label || field.name}" ?`)) { onRemoveField(field.id); setEditingFieldId(null); } }}
                          style={{ padding: '0.3rem 0.6rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>🗑️ ลบ</button>}
                      </div>
                      <button onClick={() => setEditingFieldId(null)}
                        style={{ alignSelf: 'flex-end', padding: '0.2rem 0.75rem', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}>✓ เสร็จ</button>
                    </div>
                  )}
                  {field.type !== 'checkbox' ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#475569' }}>
                          {field.label || field.name} <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        {onUpdateField && <button onClick={() => setEditingFieldId(editingFieldId === field.id ? null : field.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: '#94a3b8', padding: '0 4px' }} title="แก้ไขช่อง">✏️</button>}
                      </div>
                      <input type={field.inputType || 'text'} placeholder={`กรอก ${field.label || field.name}`}
                        maxLength={field.type === 'comb' ? (field.combFormat ? field.combFormat.split(/[-_ ,/]+/).map(n=>parseInt(n)).reduce((a,b)=>a+(isNaN(b)?0:b),0) : (field.combCount || 10)) : undefined}
                        style={{ padding: '0.65rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s', width: '100%', boxSizing: 'border-box', letterSpacing: field.type === 'comb' ? '3px' : 'normal', fontFamily: field.type === 'comb' ? 'monospace' : 'inherit' }}
                        value={formData[field.name] || ''} onChange={e => onFormChange(field.name, e.target.value)}
                        onFocus={e => e.target.style.borderColor = '#4f46e5'} onBlur={e => e.target.style.borderColor = '#cbd5e1'} />
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.95rem', color: '#334155', cursor: 'pointer', marginTop: '1.25rem', padding: '0.75rem 1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', transition: 'all 0.2s', flex: 1, boxSizing: 'border-box' }} onMouseOver={e => e.currentTarget.style.borderColor = '#cbd5e1'} onMouseOut={e => e.currentTarget.style.borderColor = '#e2e8f0'}>
                        <input type="checkbox" checked={!!formData[field.name]} onChange={e => onFormChange(field.name, e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#4f46e5', cursor: 'pointer' }} />
                        <span style={{flex: 1}}>{field.label || field.name}</span>
                      </label>
                      {onUpdateField && <button onClick={() => setEditingFieldId(editingFieldId === field.id ? null : field.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: '#94a3b8', padding: '0 4px', marginTop: '1.25rem' }} title="แก้ไขช่อง">✏️</button>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
         <button className="btn-secondary" style={{ padding: '0.6rem 2rem', border: '1px solid #cbd5e1', background: 'white', borderRadius: '6px' }} onClick={() => { if(confirm('ล้างข้อมูลฟอร์มทั้งหมด?')) { fields.forEach(f => onFormChange(f.name, '')); } }}>ล้างข้อมูล</button>
         <button className="btn-primary" style={{ padding: '0.6rem 2rem', background: isPreviewMode ? '#10b981' : '#f59e0b', color: 'white', borderRadius: '6px', border: 'none', fontWeight: 600, display: 'flex', gap: '0.5rem', alignItems: 'center' }} onClick={onPreviewToggle}>
           {isPreviewMode ? '✏️ กลับไปแก้ไขฟอร์ม' : '👁️ พรีวิวบนเอกสาร'}
         </button>
      </div>
    </div>
  );
};


export const PDFEditor: React.FC<PDFEditorProps> = ({ 
  file, 
  fields, 
  onAddField, 
  onSetFields,
  onUpdateField,
  onRemoveField,
  onUpdateFile,
  activeFieldId,
  setActiveFieldId
}) => {
  const [pdfDocument, setPdfDocument] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pdfPage, setPdfPage] = useState<pdfjsLib.PDFPageProxy | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const handleFormChange = (id: string, val: any) => {
    setFormData(prev => ({ ...prev, [id]: val }));
  };
  
  const containerRef = useRef<HTMLDivElement>(null);

  // --- Drag and Resize State Global ---
  const [dragState, setDragState] = useState<{
    id: string;
    type: 'move' | 'resize';
    resizeDir?: 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    initialW: number;
    initialH: number;
  } | null>(null);

  // Effect to load the PDF document when the file changes
  useEffect(() => {
    let isCancelled = false;
    const loadPdf = async () => {
      if (!file) {
        setPdfDocument(null);
        setPdfPage(null);
        setImgUrl(null);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setLoadError(null);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const src = new Uint8Array(arrayBuffer);
        const pdf = await pdfjsLib.getDocument(src).promise;
        if (isCancelled) return;
        setPdfDocument(pdf);
        setCurrentPage(1); // Reset to first page on new file load
      } catch (e: any) {
        setLoadError(e.message);
        if (!isCancelled) setIsLoading(false);
      }
    };
    loadPdf();
    return () => { isCancelled = true; };
  }, [file]);

  // Effect to load and render the current page when pdfDocument or currentPage changes
  useEffect(() => {
    let isCancelled = false;
    const loadPage = async () => {
      if (!pdfDocument) {
        setPdfPage(null);
        setImgUrl(null);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setLoadError(null);
      try {
         const pNum = Math.min(Math.max(1, currentPage), pdfDocument.numPages);
         const page = await pdfDocument.getPage(pNum);
         if (!isCancelled) setPdfPage(page);

         // We render at a higher scale for better quality, then constrain via CSS
         const viewport = page.getViewport({ scale: 2.0 });
         const canvas = document.createElement('canvas');
         const context = canvas.getContext('2d');
         
         if (context) {
           canvas.height = viewport.height;
           canvas.width = viewport.width;
           await page.render({ canvasContext: context, viewport: viewport, canvas: canvas }).promise;
           
           if (!isCancelled) {
             setImgUrl(canvas.toDataURL('image/png'));
             setIsLoading(false);
           }
         }
      } catch (e: any) {
         console.warn("Failed to load page", e);
         setLoadError(e.message);
         if (!isCancelled) setIsLoading(false);
      }
    };
    loadPage();
    return () => { isCancelled = true; };
  }, [pdfDocument, currentPage]);

  // --- Global Drag / Resize Listener ---
  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (e: PointerEvent) => {
      const container = containerRef.current;
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      
      const dxPct = (dx / rect.width) * 100;
      const dyPct = (dy / rect.height) * 100;

      if (dragState.type === 'move') {
        const newX = Math.max(0, Math.min(100 - dragState.initialW, dragState.initialX + dxPct));
        const newY = Math.max(0, Math.min(100 - dragState.initialH, dragState.initialY + dyPct));
        onUpdateField(dragState.id, { xPercent: newX, yPercent: newY });
      } else if (dragState.type === 'resize') {
        const dir = dragState.resizeDir || 'se';
        const updates: Partial<MappedField> = {};
        
        // East (right edge)
        if (dir.includes('e')) {
          updates.widthPct = Math.max(2, Math.min(100 - dragState.initialX, dragState.initialW + dxPct));
        }
        // West (left edge) — move X and shrink width
        if (dir.includes('w')) {
          const newX = Math.max(0, dragState.initialX + dxPct);
          const newW = dragState.initialW - (newX - dragState.initialX);
          if (newW >= 2) {
            updates.xPercent = newX;
            updates.widthPct = newW;
          }
        }
        // South (bottom edge)
        if (dir.includes('s')) {
          updates.heightPct = Math.max(0.5, Math.min(100 - dragState.initialY, dragState.initialH + dyPct));
        }
        // North (top edge) — move Y and shrink height
        if (dir === 'n' || dir === 'nw' || dir === 'ne') {
          const newY = Math.max(0, dragState.initialY + dyPct);
          const newH = dragState.initialH - (newY - dragState.initialY);
          if (newH >= 0.5) {
            updates.yPercent = newY;
            updates.heightPct = newH;
          }
        }
        
        onUpdateField(dragState.id, updates);
      }
    };

    const handlePointerUp = () => setDragState(null);

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragState, onUpdateField]);

  const handleDocumentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.placed-field')) return; 
    setActiveFieldId(null);
  };

  const handleDocumentDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !imgUrl) return;
    if ((e.target as HTMLElement).closest('.placed-field')) return; 

    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // Convert to percentage ratio (0-100)
    const xPercent = (clickX / rect.width) * 100;
    const yPercent = (clickY / rect.height) * 100;
    const widthPct = 15;
    const heightPct = 1.8;

    onAddField({
        id: crypto.randomUUID(),
        name: `Auto Field ${fields.length + 1}`,
        type: 'text',
        pageIndex: currentPage,
        xPercent,
        yPercent,
        widthPct,
        heightPct,
      });
    setActiveFieldId(crypto.randomUUID()); // Set active to the newly added field
  };

  const handleMergePdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const newFile = e.target.files?.[0];
     if (!newFile || !file) return;
     
     setIsMerging(true);
     try {
         const currentArrayBuffer = await file.arrayBuffer();
         const newArrayBuffer = await newFile.arrayBuffer();
         
         const currentDoc = await PDFDocument.load(currentArrayBuffer);
         const newDoc = await PDFDocument.load(newArrayBuffer);
         
         const copiedPages = await currentDoc.copyPages(newDoc, newDoc.getPageIndices());
         copiedPages.forEach((page) => currentDoc.addPage(page));
         
         const mergedBytes = await currentDoc.save();
         const mergedBlob = new Blob([new Uint8Array(mergedBytes)], { type: 'application/pdf' });
         const mergedFile = new File([mergedBlob], file.name, { type: 'application/pdf' });
         
         onUpdateFile(mergedFile); // Propagate up!
     } catch (err) {
         console.error("Failed to merge PDF", err);
         setLoadError('Failed to append PDF document.');
     } finally {
         setIsMerging(false);
         e.target.value = '';
     }
  };

  // --- Handlers for Fields ---
  const handlePointerDownField = (e: React.PointerEvent, field: MappedField) => {
    e.stopPropagation();
    setActiveFieldId(field.id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId); // Ensure smooth tracking
    
    setDragState({
      id: field.id,
      type: 'move',
      startX: e.clientX,
      startY: e.clientY,
      initialX: field.xPercent,
      initialY: field.yPercent,
      initialW: field.widthPct,
      initialH: field.heightPct
    });
  };

  const handlePointerDownResize = (e: React.PointerEvent, field: MappedField, dir: 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' = 'se') => {
    e.stopPropagation();
    setActiveFieldId(field.id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    
    setDragState({
      id: field.id,
      type: 'resize',
      resizeDir: dir,
      startX: e.clientX,
      startY: e.clientY,
      initialX: field.xPercent,
      initialY: field.yPercent,
      initialW: field.widthPct,
      initialH: field.heightPct
    });
  };

  // --- HYBRID SCANNER: Native Precision + AI Naming (ALL PAGES) ---
  const handleAutoDetect = async () => {
    if (!pdfDocument) return;
    setIsScanning(true);

    try {
      const totalPages = pdfDocument.numPages;
      const detectedFields: MappedField[] = [];
      const contextItems: { id: string, context: string, type: 'text' | 'checkbox' }[] = [];

      // --- Loop over ALL pages ---
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const page = await pdfDocument.getPage(pageNum);
        const textContent = await page.getTextContent();
        const viewport = page.getViewport({ scale: 2.0 });

        const lines: Record<string, any[]> = {};
      
        // 1. Group items by Y baseline finding text lines
        textContent.items.forEach((item: any) => {
          if (!item.str || item.str.trim() === '') return;
          const [x, y] = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
          
          let foundY = -1;
          for (const py of Object.keys(lines)) {
             if (Math.abs(Number(py) - y) < 8) {
                foundY = Number(py); break;
             }
          }
          if (foundY === -1) foundY = y;
          
          if (!lines[foundY]) lines[foundY] = [];
          const itemH = item.height || Math.abs(item.transform[3]) || 12;
          
          lines[foundY].push({
             str: item.str,
             x: x,
             width: item.width * 2.0,
             height: itemH * 2.0
          });
        });

        const W = viewport.width;
        const H = viewport.height;

        Object.keys(lines).forEach(yStr => {
          const y = Number(yStr);
          const lineItems = lines[yStr].sort((a: any, b: any) => a.x - b.x);

          let fullTextRaw = '';
          const charMap: { x0: number, x1: number }[] = [];
           
          for (let i = 0; i < lineItems.length; i++) {
             const curr = lineItems[i];
             if (i > 0) {
               const prev = lineItems[i - 1];
               const gap = curr.x - (prev.x + prev.width);
               
               if (gap > 6 && curr.str !== ' ' && prev.str !== ' ') {
                 const spaceCount = Math.min(Math.max(1, Math.round(gap / 8)), 15);
                 const spaceW = gap / spaceCount;
                 for (let s = 0; s < spaceCount; s++) {
                    charMap.push({ x0: prev.x + prev.width + s * spaceW, x1: prev.x + prev.width + (s + 1) * spaceW });
                 }
                 fullTextRaw += ' '.repeat(spaceCount);
               }
             }
             
             const charW = curr.width / Math.max(1, curr.str.length);
             for (let c = 0; c < curr.str.length; c++) {
                charMap.push({ x0: curr.x + c * charW, x1: curr.x + (c + 1) * charW });
             }
             fullTextRaw += curr.str;
          }

          if (fullTextRaw.trim() === '') return;

          // 1. Text Input Matches (Dotted lines / Underscores / MS Word Ellipses)
          const regex = /([._\u2026\xB7]([\s\u200B\u200C\u200D]*[._\u2026\xB7]){2,})/g;
          let match;
           
          while ((match = regex.exec(fullTextRaw)) !== null) {
               const inputMatchText = match[0];
               let x0_in = charMap[match.index].x0;
               let x1_in = charMap[match.index + inputMatchText.length - 1].x1;

               // Active Collision Detection
               for (let j = 0; j < fullTextRaw.length; j++) {
                   if (j >= match.index && j < match.index + inputMatchText.length) continue;
                   const charStr = fullTextRaw[j];
                   if (charStr === ' ' || charStr === '.' || charStr === '_') continue;
                   const cx0 = charMap[j].x0;
                   const cx1 = charMap[j].x1;
                   if (cx1 - cx0 <= 0) continue;
                   if (cx1 > x0_in + 2 && cx0 < x1_in - 2) {
                       const distLeft = cx1 - x0_in;
                       const distRight = x1_in - cx0;
                       if (distLeft < distRight) {
                           x0_in = cx1 + 4;
                       } else {
                           x1_in = cx0 - 4;
                       }
                   }
               }

               if (x1_in - x0_in < 10) continue;

               const xPercent = (x0_in / W) * 100;
               const yPercent = (y / H) * 100; 
               const widthPct = ((x1_in - x0_in) / W) * 100;

               const newId = `nlp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
               
               const startIdx = Math.max(0, match.index - 35);
               const contextRaw = fullTextRaw.substring(startIdx, match.index).trim();
               const cleanContext = contextRaw.replace(/[_.]/g, '').trim() || 'ข้อมูล';

               detectedFields.push({
                  id: newId,
                  name: `Auto Field ${detectedFields.length + 1}`,
                  type: 'text',
                  pageIndex: pageNum,
                  xPercent: xPercent,
                  yPercent: yPercent,
                  widthPct: widthPct,
                  heightPct: 1.8 
               });
               
               contextItems.push({ id: newId, context: `[Page ${pageNum}] ${cleanContext}`, type: 'text' });
          }

          // 2. Checkboxes, Radio Circles, and Comb Boxes
          const cbRegex = /([☐☑\u2610\u2611\u25A1\u25A2\uF0A8\uF0FE\u2713\u2714\u00A8\u00FD\u25CB\u25EF\u2B24\u20DD◯○\uF0A1\uF0A2\uF0B0\uF0B1\uF0C8\uF096\uF111\uF10C]|\[\s*\]|\(\s*\))|(?:^|[\sก-๛])([Oo])(?=[\sก-๛]|$)|(?:^|\s)(๐)(?=[\sก-๛]|$)/g;
          let cbMatch;
          const lineBoxes: any[] = [];
          
          while ((cbMatch = cbRegex.exec(fullTextRaw)) !== null) {
               const matchedSymbol = cbMatch[1] || cbMatch[2] || cbMatch[3];
               if (!matchedSymbol) continue;
               
               let charIndex = cbMatch.index;
               if (cbMatch[0].length > matchedSymbol.length) {
                   charIndex += (cbMatch[0].length - matchedSymbol.length);
               }
               
               let x0_in = charMap[charIndex].x0;
               let x1_in = charMap[charIndex + matchedSymbol.length - 1].x1;

               lineBoxes.push({
                   startIndex: charIndex,
                   endIndex: charIndex + matchedSymbol.length,
                   x0: x0_in,
                   x1: x1_in,
                   symbol: matchedSymbol
               });
          }
          
          // Cluster consecutive boxes
          if (lineBoxes.length > 0) {
              let clusters: any[][] = [];
              let currentCluster = [lineBoxes[0]];
              
              for (let i = 1; i < lineBoxes.length; i++) {
                  const prev = lineBoxes[i - 1];
                  const curr = lineBoxes[i];
                  const gapText = fullTextRaw.substring(prev.endIndex, curr.startIndex).trim();
                  
                  const prevWidth = prev.x1 - prev.x0;
                  const distance = curr.x0 - prev.x1;
                  
                  const isExplicitLink = gapText.includes('-') || gapText.includes('_') || gapText.includes('/');
                  const maxDist = isExplicitLink ? (prevWidth * 3.5) : (prevWidth * 1.8);
                  const isClose = distance < maxDist && distance < (W * 0.05);

                  if ((gapText === '' || /^[-_/\s]+$/.test(gapText)) && isClose) {
                      currentCluster.push(curr);
                  } else {
                      clusters.push(currentCluster);
                      currentCluster = [curr];
                  }
              }
              clusters.push(currentCluster);
              
              for (let c of clusters) {
                  if (c.length === 1) {
                      const box = c[0];
                      let widthBox = ((box.x1 - box.x0) / W) * 100;
                      if (widthBox < 0.5) widthBox = 1.2;
                      
                      const newId = `nlp_cb_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
                      const endIdx = Math.min(fullTextRaw.length, box.endIndex + 45);
                      const contextRaw = fullTextRaw.substring(box.endIndex, endIdx).trim();
                      const cleanContext = contextRaw.replace(/[_.]/g, '').trim() || 'checkbox';
        
                      detectedFields.push({
                         id: newId,
                         name: `Auto Checkbox ${detectedFields.length + 1}`,
                         type: 'checkbox',
                         pageIndex: pageNum,
                         xPercent: (box.x0 / W) * 100,
                         yPercent: (y / H) * 100, 
                         widthPct: widthBox,
                         heightPct: 1.8 
                      });
                      contextItems.push({ id: newId, context: `[Page ${pageNum}] ${cleanContext}`, type: 'checkbox' });
                  } else {
                      const firstBox = c[0];
                      const lastBox = c[c.length - 1];
                      const widthBox = ((lastBox.x1 - firstBox.x0) / W) * 100;
                      
                      const newId = `nlp_comb_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
                      const startIdx = Math.max(0, firstBox.startIndex - 35);
                      const contextRaw = fullTextRaw.substring(startIdx, firstBox.startIndex).trim();
                      const cleanContext = contextRaw.replace(/[_.:]+/g, '').trim() || 'idNumber';

                      detectedFields.push({
                         id: newId,
                         name: `Auto Comb ${detectedFields.length + 1}`,
                         type: 'comb',
                         combCount: c.length,
                         pageIndex: pageNum,
                         xPercent: (firstBox.x0 / W) * 100,
                         yPercent: (y / H) * 100, 
                         widthPct: widthBox,
                         heightPct: 1.8,
                         combBoxes: c.map((box: any) => ({
                             xPercent: (box.x0 / W) * 100,
                             widthPct: ((box.x1 - box.x0) / W) * 100
                         }))
                      });
                      contextItems.push({ id: newId, context: `[Page ${pageNum}] ${cleanContext}`, type: 'text' as any });
                  }
              }
          }
        });
      } // end page loop

      if (detectedFields.length === 0) {
         alert("Could not dynamically detect any fields in this PDF.");
         setIsScanning(false);
         return;
      }

      // 2. AI TEXT-ONLY NAMING (Fast & Smart)
      let apiKey = localStorage.getItem('gemini_api_key');
      if (!apiKey) {
         apiKey = prompt("Fields extracted precisely! To automatically name them (camelCase), please enter a Gemini API Key:");
         if (apiKey) localStorage.setItem('gemini_api_key', apiKey);
      }

      if (apiKey && contextItems.length > 0) {
         try {
            const cleanKey = apiKey.replace(/[^a-zA-Z0-9_-]/g, '');
            const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`);
            if (modelsRes.ok) {
                const modelsData = await modelsRes.json();
                const availableModels = modelsData.models || [];
                const preferred = ['models/gemini-2.5-flash', 'models/gemini-2.0-flash', 'models/gemini-1.5-flash'];
                let targetModel = '';
                
                for (const p of preferred) {
                   if (availableModels.find((m: any) => m.name === p && m.supportedGenerationMethods?.includes('generateContent'))) {
                       targetModel = p.replace('models/', '');
                       break;
                   }
                }
                if (!targetModel) {
                   targetModel = availableModels.find((m: any) => m.name.includes('gemini') && m.supportedGenerationMethods?.includes('generateContent'))?.name.replace('models/', '');
                }

                if (targetModel) {
                    const promptText = `I have extracted ${contextItems.length} input form fields from a Thai/English document.
For each field, I provide the 'context' text located right near the blank space, and its 'type' (text or checkbox).
Generate a concise, programmer-friendly English key (camelCase) for each field (e.g. 'writtenAt', 'date', 'applicantName').
CRITICAL: For 'checkbox' type fields, use boolean naming conventions (e.g., 'is...', 'has...').

*** NEW REQUIREMENT FOR AUTO-FORM GENERATOR ***
Also determine:
1. "label": A clean, user-friendly Thai label for the HTML input (e.g. "วันที่ขอสิทธิ์", "ชื่อ-นามสกุล", "คำขอขึ้นทะเบียน"). Remove redundant trailing dots or spaces.
2. "inputType": The best HTML5 input type based on context (choose from: "text", "date", "number", "email", "tel"). Default to "text".
3. "section": Group the fields into logical sections based on the context flow (e.g. "1. ข้อมูลผู้ใช้งาน", "2. ข้อมูลผลิตภัณฑ์"). Ensure fields in the same section use EXACTLY the same section string. If no section is obvious, use "ทั่วไป (General)".

Input Context JSON:
${JSON.stringify(contextItems)}

Return ONLY a flat JSON array:
[
  { 
    "id": "...", 
    "name": "writtenAt", 
    "label": "วันที่เขียน", 
    "inputType": "date", 
    "section": "ข้อมูลทั่วไป" 
  }, ...
] `;

                    const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${cleanKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          contents: [{ parts: [{ text: promptText }] }],
                          generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
                        })
                    });

                    if (aiRes.ok) {
                        const aiData = await aiRes.json();
                        const responseText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
                        if (responseText) {
                           const cleanStr = responseText.replace(/^[^{[]+/, '').replace(/[^}\]]+$/, '');
                           const parsedNames = JSON.parse(cleanStr);
                           
                           detectedFields.forEach(f => {
                              const m = parsedNames.find((p: any) => p.id === f.id);
                              if (m) {
                                 if (m.name) f.name = m.name;
                                 if (m.label) f.label = m.label;
                                 if (m.inputType) f.inputType = m.inputType as any;
                                 if (m.section) f.section = m.section;
                              }
                           });
                        }
                    }
                }
            }
         } catch(e) {
            console.error("AI Naming failed, using fallback Auto Field names.", e);
         }
      }

      onSetFields(detectedFields);
      alert(`✨ Multi-Page Scan Complete! Scanned ${totalPages} page(s) and extracted ${detectedFields.length} fields.`);
    } catch (e: any) {
      console.error(e);
      alert(`Error scanning document: ${e.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', overflow: 'hidden' }}>
      {/* Left Sidebar Pages Panel */}
      <div className="pages-sidebar" style={{ width: '180px', background: '#f8fafc', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', zIndex: 10 }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white' }}>
          <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>Pages</h3>
          <label className="btn-icon" title="Append Document" style={{ cursor: 'pointer', margin: 0, padding: '0.3rem', background: '#eff6ff', color: '#3b82f6', borderRadius: '4px' }}>
             {isMerging ? <Loader2 size={16} className="spinner" /> : <FilePlus size={16} />}
             <input type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleMergePdf} disabled={isMerging} />
          </label>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
           {Array.from({ length: pdfDocument?.numPages || 0 }).map((_, i) => (
              <div 
                 key={i} 
                 onClick={() => setCurrentPage(i + 1)}
                 style={{ padding: '0.75rem', border: `2px solid ${currentPage === i + 1 ? '#4f46e5' : 'transparent'}`, borderRadius: '0.5rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: currentPage === i + 1 ? '#eff6ff' : 'transparent', transition: 'all 0.2s' }}
              >
                 <div style={{ width: '100%', aspectRatio: '1/1.4', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '1.5rem', color: '#94a3b8', fontWeight: 700 }}>{i + 1}</span>
                 </div>
                 <span style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: currentPage === i + 1 ? '#4f46e5' : '#64748b', fontWeight: currentPage === i + 1 ? 600 : 400 }}>Page {i + 1}</span>
              </div>
           ))}
        </div>
      </div>

      <div className="editor-canvas-area" style={{ flex: 1, overflow: 'auto', position: 'relative', display: 'flex', flexWrap: 'wrap', gap: '3rem', padding: '2rem', justifyContent: 'center', alignItems: 'flex-start' }} onPointerDown={() => setActiveFieldId(null)}>
      {isLoading && (
        <div className="loading-overlay">
          <Loader2 className="spinner" size={48} />
          <p style={{ marginTop: '1rem' }}>Rendering PDF Image...</p>
        </div>
      )}

      {pdfDocument && !isLoading && (
        <div style={{ position: 'absolute', top: '2rem', right: '2rem', zIndex: 100, display: 'flex', gap: '1rem' }}>
          <button 
            onClick={(e) => { e.stopPropagation(); handleAutoDetect(); }}
            className="btn-primary" 
            disabled={isScanning}
            style={{ boxShadow: '0 4px 6px -1px rgba(0,0,0,0.2)' }}
          >
            {isScanning ? <Loader2 className="spinner" size={20} /> : <ScanSearch size={20} />}
            {isScanning ? 'Scanning Advanced AI...' : 'Advanced Scan ✨'}
          </button>
        </div>
      )}

      {imgUrl && !isLoading && (
        <div 
          ref={containerRef}
          className="document-wrapper"
          onPointerDown={handleDocumentClick}
          onDoubleClick={handleDocumentDoubleClick}
        >
          {/* Background Image rendered from PDF */}
          <img 
            src={imgUrl} 
            alt="PDF Page Background" 
            className="document-image"
            draggable={false}
          />

          {/* Render inputs using ratio % mapping */}
          {fields.filter(f => (f.pageIndex || 1) === currentPage).map(field => (
            <div
              key={field.id}
              className={`placed-field ${field.id === activeFieldId && !isPreviewMode ? 'active' : ''}`}
              style={{
                left: `${field.xPercent}%`,
                top: `${field.yPercent}%`,
                width: `${field.widthPct}%`,
                height: `${field.heightPct}%`,
                transform: 'translateY(-100%)', // align baseline
                borderColor: isPreviewMode ? 'transparent' : (activeFieldId === field.id ? '#3b82f6' : (field.type === 'checkbox' ? '#10b981' : (field.type === 'comb' ? '#f59e0b' : '#8b5cf6'))),
                backgroundColor: isPreviewMode ? 'transparent' : (activeFieldId === field.id ? 'rgba(59, 130, 246, 0.3)' : (field.type === 'checkbox' ? 'rgba(16, 185, 129, 0.2)' : (field.type === 'comb' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(139, 92, 246, 0.2)'))),
                borderWidth: isPreviewMode ? '0px' : '2px',
                borderStyle: 'solid',
                padding: isPreviewMode ? '0px' : '0 0.5rem',
                borderRadius: field.type === 'checkbox' ? '4px' : '2px',
                pointerEvents: isPreviewMode ? 'none' : 'auto',
                backdropFilter: isPreviewMode ? 'none' : 'blur(2px)',
                boxShadow: isPreviewMode ? 'none' : '0 0 0 1px rgba(255, 255, 255, 0.5)',
                ['containerType' as any]: 'size',
              }}
              onClick={(e) => {
                if (isPreviewMode) return;
                e.stopPropagation();
                setActiveFieldId(field.id);
              }}
              onPointerDown={(e) => {
                if (isPreviewMode) return;
                handlePointerDownField(e, field);
              }}
              onContextMenu={(e) => {
                if (isPreviewMode) return;
                e.preventDefault();
                e.stopPropagation();
                onRemoveField(field.id);
              }}
              title={field.name}
            >
              {isPreviewMode ? (
                field.type === 'checkbox' ? (
                   formData[field.name] ? <span style={{color: '#000000', fontSize: '90cqh', fontWeight: 'bold', lineHeight: 1}}>✓</span> : null
                ) : field.type === 'comb' ? (
                   field.combBoxes && field.combBoxes.length > 0 ? (
                       <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                         {Array.from({ length: field.combCount || field.combBoxes.length }).map((_, i) => {
                             const box = field.combBoxes![i];
                             if (!box) return null;
                             const relativeLeft = ((box.xPercent - field.xPercent) / field.widthPct) * 100;
                             const relativeWidth = (box.widthPct / field.widthPct) * 100;
                             return (
                               <span key={i} style={{ position: 'absolute', left: `${relativeLeft}%`, width: `${relativeWidth}%`, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000000', fontSize: '75cqh', fontFamily: "'TH Sarabun New', 'TH Sarabun PSK', Sarabun, sans-serif" }}>
                                 {formData[field.name]?.[i] || ''}
                               </span>
                             );
                         })}
                       </div>
                   ) : field.combFormat ? (() => {
                       // Advanced Mathematical Format Slicing
                       const groups = field.combFormat.split(/[-_ ,/]+/).map(n => parseInt(n)).filter(n => !isNaN(n) && n > 0);
                       const N = groups.reduce((a, b) => a + b, 0);
                       const G = Math.max(0, groups.length - 1);
                       if (N === 0) return null;
                       
                       const GAP_RATIO = field.charSpacingEm !== undefined && field.charSpacingEm !== 0 ? field.charSpacingEm : 0.85; 
                       const totalUnits = N + (G * GAP_RATIO);
                       const boxWidth = 100 / totalUnits;
                       
                       const boxes = [];
                       let currentBoxIdx = 0;
                       
                       for (let g = 0; g < groups.length; g++) {
                           for (let k = 0; k < groups[g]; k++) {
                               const posLeft = (currentBoxIdx + (g * GAP_RATIO)) * boxWidth;
                               boxes.push({ left: posLeft, width: boxWidth });
                               currentBoxIdx++;
                           }
                       }
                       
                       return (
                         <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                           {boxes.map((box, i) => (
                             <span key={i} style={{ position: 'absolute', left: `${box.left}%`, width: `${box.width}%`, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(51, 65, 85, 0.95)', fontSize: '75cqh', fontFamily: "'TH Sarabun New', 'TH Sarabun PSK', Sarabun, sans-serif" }}>
                               {formData[field.name]?.[i] || ''}
                             </span>
                           ))}
                         </div>
                       );
                   })() : (
                       <div style={{ display: 'flex', width: '100%', height: '100%' }}>
                         {Array.from({ length: field.combCount || 10 }).map((_, i) => (
                           <span key={i} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(51, 65, 85, 0.95)', fontSize: '75cqh', fontFamily: "'TH Sarabun New', 'TH Sarabun PSK', Sarabun, sans-serif" }}>
                             {formData[field.name]?.[i] || ''}
                           </span>
                         ))}
                       </div>
                   )
                ) : (
                   <span style={{color: 'rgba(51, 65, 85, 0.95)', fontSize: '75cqh', fontFamily: field.charSpacingEm ? 'monospace' : "'TH Sarabun New', 'TH Sarabun PSK', Sarabun, sans-serif", width: '100%', height: '100%', display: 'flex', alignItems: 'center', overflow: 'visible', paddingLeft: '4px', whiteSpace: 'nowrap', letterSpacing: field.charSpacingEm ? `${field.charSpacingEm}em` : 'normal'}}>{formData[field.name] || ''}</span>
                )
              ) : (
                field.type === 'checkbox' ? (
                   <span className="text-emerald-700 text-[10px] sm:text-xs font-bold leading-none flex items-center justify-center w-full h-full">✔</span>
                ) : field.type === 'comb' ? (
                   <span className="text-amber-700 text-[8px] sm:text-[10px] md:text-xs truncate w-full px-1 flex items-center justify-center h-full drop-shadow-sm pointer-events-none" style={{ letterSpacing: '1px' }}>
                      [ {field.combCount || 10} Slots ]
                   </span>
                ) : (
                   <span className="text-blue-700 text-[8px] sm:text-[10px] md:text-xs truncate w-full px-1 flex items-center h-full drop-shadow-sm pointer-events-none">
                      {field.name}
                   </span>
                )
              )}

              {/* 8-Directional Resize Handles */}
              {field.id === activeFieldId && !isPreviewMode && (
                <>
                  {/* Corner handles */}
                  <div style={{ position: 'absolute', top: -4, left: -4, width: 8, height: 8, background: '#4f46e5', borderRadius: '50%', cursor: 'nw-resize', zIndex: 20 }}
                    onPointerDown={(e) => handlePointerDownResize(e, field, 'nw')} />
                  <div style={{ position: 'absolute', top: -4, right: -4, width: 8, height: 8, background: '#4f46e5', borderRadius: '50%', cursor: 'ne-resize', zIndex: 20 }}
                    onPointerDown={(e) => handlePointerDownResize(e, field, 'ne')} />
                  <div style={{ position: 'absolute', bottom: -4, left: -4, width: 8, height: 8, background: '#4f46e5', borderRadius: '50%', cursor: 'sw-resize', zIndex: 20 }}
                    onPointerDown={(e) => handlePointerDownResize(e, field, 'sw')} />
                  <div style={{ position: 'absolute', bottom: -4, right: -4, width: 8, height: 8, background: '#4f46e5', borderRadius: '50%', cursor: 'se-resize', zIndex: 20 }}
                    onPointerDown={(e) => handlePointerDownResize(e, field, 'se')} />
                  {/* Edge handles */}
                  <div style={{ position: 'absolute', top: -3, left: '50%', transform: 'translateX(-50%)', width: 16, height: 6, background: '#4f46e5', borderRadius: 3, cursor: 'n-resize', zIndex: 20 }}
                    onPointerDown={(e) => handlePointerDownResize(e, field, 'n')} />
                  <div style={{ position: 'absolute', bottom: -3, left: '50%', transform: 'translateX(-50%)', width: 16, height: 6, background: '#4f46e5', borderRadius: 3, cursor: 's-resize', zIndex: 20 }}
                    onPointerDown={(e) => handlePointerDownResize(e, field, 's')} />
                  <div style={{ position: 'absolute', left: -3, top: '50%', transform: 'translateY(-50%)', width: 6, height: 16, background: '#4f46e5', borderRadius: 3, cursor: 'w-resize', zIndex: 20 }}
                    onPointerDown={(e) => handlePointerDownResize(e, field, 'w')} />
                  <div style={{ position: 'absolute', right: -3, top: '50%', transform: 'translateY(-50%)', width: 6, height: 16, background: '#4f46e5', borderRadius: 3, cursor: 'e-resize', zIndex: 20 }}
                    onPointerDown={(e) => handlePointerDownResize(e, field, 'e')} />
                </>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Auto Form Real-time Preview */}
      <AutoFormPreview fields={fields} formData={formData} onFormChange={handleFormChange} onPreviewToggle={() => setIsPreviewMode(!isPreviewMode)} isPreviewMode={isPreviewMode} onUpdateField={onUpdateField} onRemoveField={onRemoveField} />
      
      </div>
    </div>
  );
};
