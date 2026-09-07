import React, { useEffect, useRef } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import { Extension } from '@tiptap/core';
import Underline from '@tiptap/extension-underline';
import Color from '@tiptap/extension-color';
import { AlignLeft, AlignCenter, AlignRight, Eraser } from 'lucide-react';

// FontSize extension — uses `commands` (not `chain`) so it integrates
// properly with the editor command pipeline without short-circuiting.
const FontSize = Extension.create({
    name: 'fontSize',
    addOptions() {
        return { types: ['textStyle'] };
    },
    addGlobalAttributes() {
        return [
            {
                types: this.options.types,
                attributes: {
                    fontSize: {
                        default: null,
                        parseHTML: element => element.style.fontSize || null,
                        renderHTML: attributes => {
                            if (!attributes.fontSize) return {};
                            return { style: `font-size: ${attributes.fontSize}` };
                        },
                    },
                },
            },
        ];
    },
    addCommands() {
        return {
            setFontSize: (fontSize) => ({ commands }) => {
                return commands.setMark('textStyle', { fontSize });
            },
            unsetFontSize: () => ({ commands }) => {
                return commands.setMark('textStyle', { fontSize: null });
            },
        };
    },
});

export const TipTapCell = ({ value, onChange, readOnly, style, placeholder }) => {
    // Track the last HTML we emitted so useEffect doesn't fight our own changes
    const lastEmittedHTML = useRef(value || '');

    const editor = useEditor({
        extensions: [
            StarterKit,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            TextStyle,
            FontSize,
            Underline,
            Color,
        ],
        content: value || '',
        editable: !readOnly,
        onUpdate: ({ editor }) => {
            const html = editor.getHTML();
            lastEmittedHTML.current = html;
            onChange(html);
        },
    });

    // Only sync from parent when value changes from an EXTERNAL source
    // (loading from DB, switching documents, language toggle — NOT our own onChange echo)
    useEffect(() => {
        if (!editor) return;
        if (value === lastEmittedHTML.current) return;
        lastEmittedHTML.current = value || '';
        editor.commands.setContent(value || '', false);
    }, [value, editor]);

    if (!editor) return null;

    const FONT_SIZES = ['10px', '12px', '14px', '16px', '18px', '20px', '24px'];

    const handleFontSizeChange = (e) => {
        const val = e.target.value;
        if (val) {
            editor.chain().focus().setFontSize(val).run();
        } else {
            editor.chain().focus().unsetFontSize().run();
        }
    };

    const handleColorChange = (e) => {
        editor.chain().focus().setColor(e.target.value).run();
    };

    return (
        <div style={{ ...style, display: 'flex', flexDirection: 'column', flex: 1, position: 'relative' }}>
            {editor && !readOnly && (
                <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
                    <div style={{ background: '#333', padding: '6px', borderRadius: '8px', display: 'flex', gap: '4px', alignItems: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', flexWrap: 'nowrap' }}>
                        {/* Font Size */}
                        <select 
                            onChange={handleFontSizeChange}
                            onMouseDown={(e) => e.preventDefault()}
                            style={{ background: '#555', color: '#fff', border: 'none', borderRadius: '4px', padding: '2px 4px', fontSize: '11px', outline: 'none', flexShrink: 0, width: '62px', cursor: 'pointer' }}
                            value={editor.getAttributes('textStyle').fontSize || ''}
                        >
                            <option value="">ขนาด</option>
                            {FONT_SIZES.map(size => (
                                <option key={size} value={size}>{size.replace('px', '')}</option>
                            ))}
                        </select>
                        
                        {/* Color Picker */}
                        <div style={{ position: 'relative', width: '22px', height: '22px', minWidth: '22px', flexShrink: 0, borderRadius: '4px', overflow: 'hidden', border: '1px solid #666' }}>
                            <input 
                                type="color" 
                                onMouseDown={(e) => e.stopPropagation()}
                                onChange={handleColorChange}
                                value={editor.getAttributes('textStyle').color || '#000000'}
                                style={{ position: 'absolute', top: '-4px', left: '-4px', width: '30px', height: '30px', padding: '0', border: 'none', cursor: 'pointer' }}
                                title="สีข้อความ"
                            />
                        </div>

                        <div style={{ width: '1px', height: '16px', background: '#555', margin: '0 1px' }}></div>
                        
                        {/* Bold */}
                        <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}
                            style={{ background: editor.isActive('bold') ? '#555' : 'transparent', color: '#fff', border: 'none', padding: '3px 5px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', display: 'flex', alignItems: 'center' }}
                            title="ตัวหนา"
                        >B</button>
                        
                        {/* Italic */}
                        <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}
                            style={{ background: editor.isActive('italic') ? '#555' : 'transparent', color: '#fff', border: 'none', padding: '3px 5px', borderRadius: '4px', cursor: 'pointer', fontStyle: 'italic', fontWeight: 'bold', fontSize: '12px', display: 'flex', alignItems: 'center' }}
                            title="ตัวเอียง"
                        >I</button>
                        
                        {/* Underline */}
                        <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleUnderline().run(); }}
                            style={{ background: editor.isActive('underline') ? '#555' : 'transparent', color: '#fff', border: 'none', padding: '3px 5px', borderRadius: '4px', cursor: 'pointer', textDecoration: 'underline', fontWeight: 'bold', fontSize: '12px', display: 'flex', alignItems: 'center' }}
                            title="ขีดเส้นใต้"
                        >U</button>
                        
                        {/* Strikethrough */}
                        <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleStrike().run(); }}
                            style={{ background: editor.isActive('strike') ? '#555' : 'transparent', color: '#fff', border: 'none', padding: '3px 5px', borderRadius: '4px', cursor: 'pointer', textDecoration: 'line-through', fontWeight: 'bold', fontSize: '12px', display: 'flex', alignItems: 'center' }}
                            title="ขีดทับ"
                        >S</button>
                        
                        <div style={{ width: '1px', height: '16px', background: '#555', margin: '0 1px' }}></div>
                        
                        {/* Align Left */}
                        <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().setTextAlign('left').run(); }}
                            style={{ background: editor.isActive({ textAlign: 'left' }) ? '#555' : 'transparent', color: '#fff', border: 'none', padding: '3px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        ><AlignLeft size={13} /></button>
                        
                        {/* Align Center */}
                        <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().setTextAlign('center').run(); }}
                            style={{ background: editor.isActive({ textAlign: 'center' }) ? '#555' : 'transparent', color: '#fff', border: 'none', padding: '3px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        ><AlignCenter size={13} /></button>
                        
                        {/* Align Right */}
                        <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().setTextAlign('right').run(); }}
                            style={{ background: editor.isActive({ textAlign: 'right' }) ? '#555' : 'transparent', color: '#fff', border: 'none', padding: '3px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        ><AlignRight size={13} /></button>
                        
                        <div style={{ width: '1px', height: '16px', background: '#555', margin: '0 1px' }}></div>
                        
                        {/* Clear Formatting */}
                        <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.commands.unsetAllMarks(); editor.commands.clearNodes(); }}
                            style={{ background: 'transparent', color: '#fca5a5', border: 'none', padding: '3px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            title="ล้างรูปแบบทั้งหมด"
                        ><Eraser size={13} /></button>
                    </div>
                </BubbleMenu>
            )}
            <EditorContent 
                editor={editor} 
                style={{ flex: 1 }} 
                className="tiptap-cell-editor" 
            />
            {!editor.getText() && placeholder && !readOnly && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', color: '#9ca3af', pointerEvents: 'none', fontSize: '14px' }}>
                    {placeholder}
                </div>
            )}
        </div>
    );
};
