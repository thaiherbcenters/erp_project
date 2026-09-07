import React, { useEffect, useRef } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import { Extension } from '@tiptap/core';
import Underline from '@tiptap/extension-underline';
import Color from '@tiptap/extension-color';
import { AlignLeft, AlignCenter, AlignRight, Type, Eraser } from 'lucide-react';

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
                        parseHTML: element => element.style.fontSize?.replace(/['"]+/g, ''),
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
            setFontSize: fontSize => ({ chain }) => chain().setMark('textStyle', { fontSize }).run(),
            unsetFontSize: () => ({ chain }) => chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
        };
    },
});

export const TipTapCell = ({ value, onChange, readOnly, style, placeholder }) => {
    // Track the last value WE sent out via onChange, so we don't fight ourselves
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
    // (e.g. loading from DB, switching documents, language toggle)
    // NOT when our own onChange triggered the parent re-render
    useEffect(() => {
        if (!editor) return;
        if (value === lastEmittedHTML.current) return; // This is our own echo, skip
        // External change — update editor content
        lastEmittedHTML.current = value || '';
        editor.commands.setContent(value || '', false);
    }, [value, editor]);

    if (!editor) return null;

    const FONT_SIZES = ['10px', '12px', '14px', '16px', '18px', '20px', '11pt', '12pt', '14pt'];

    return (
        <div style={{ ...style, display: 'flex', flexDirection: 'column', flex: 1, position: 'relative' }}>
            {editor && !readOnly && (
                <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
                    <div style={{ background: '#333', padding: '6px', borderRadius: '8px', display: 'flex', gap: '6px', alignItems: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                        <select 
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val) {
                                    editor.chain().focus().setFontSize(val).run();
                                } else {
                                    editor.chain().focus().unsetFontSize().run();
                                }
                            }}
                            style={{ background: '#555', color: '#fff', border: 'none', borderRadius: '4px', padding: '2px 4px', fontSize: '12px', outline: 'none', flexShrink: 0, width: '75px' }}
                            value={editor.getAttributes('textStyle').fontSize || ''}
                        >
                            <option value="">ขนาด</option>
                            {FONT_SIZES.map(size => (
                                <option key={size} value={size}>{size}</option>
                            ))}
                        </select>
                        
                        <div style={{ position: 'relative', width: '24px', height: '24px', minWidth: '24px', flexShrink: 0, borderRadius: '4px', overflow: 'hidden', border: '1px solid #666' }}>
                            <input 
                                type="color" 
                                onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
                                value={editor.getAttributes('textStyle').color || '#000000'}
                                style={{ position: 'absolute', top: '-5px', left: '-5px', width: '34px', height: '34px', padding: '0', border: 'none', cursor: 'pointer' }}
                                title="สีข้อความ"
                            />
                        </div>

                        <div style={{ width: '1px', height: '16px', background: '#555', margin: '0 2px' }}></div>
                        <button
                            type="button"
                            onClick={() => editor.chain().focus().toggleBold().run()}
                            style={{ background: editor.isActive('bold') ? '#555' : 'transparent', color: '#fff', border: 'none', padding: '4px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', display: 'flex', alignItems: 'center' }}
                            title="ตัวหนา"
                        >B</button>
                        <button
                            type="button"
                            onClick={() => editor.chain().focus().toggleItalic().run()}
                            style={{ background: editor.isActive('italic') ? '#555' : 'transparent', color: '#fff', border: 'none', padding: '4px', borderRadius: '4px', cursor: 'pointer', fontStyle: 'italic', fontWeight: 'bold', fontSize: '12px', display: 'flex', alignItems: 'center' }}
                            title="ตัวเอียง"
                        >I</button>
                        <button
                            type="button"
                            onClick={() => editor.chain().focus().toggleUnderline().run()}
                            style={{ background: editor.isActive('underline') ? '#555' : 'transparent', color: '#fff', border: 'none', padding: '4px', borderRadius: '4px', cursor: 'pointer', textDecoration: 'underline', fontWeight: 'bold', fontSize: '12px', display: 'flex', alignItems: 'center' }}
                            title="ขีดเส้นใต้"
                        >U</button>
                        <button
                            type="button"
                            onClick={() => editor.chain().focus().toggleStrike().run()}
                            style={{ background: editor.isActive('strike') ? '#555' : 'transparent', color: '#fff', border: 'none', padding: '4px', borderRadius: '4px', cursor: 'pointer', textDecoration: 'line-through', fontWeight: 'bold', fontSize: '12px', display: 'flex', alignItems: 'center' }}
                            title="ขีดทับ"
                        >S</button>
                        <div style={{ width: '1px', height: '16px', background: '#555', margin: '0 2px' }}></div>
                        <button
                            type="button"
                            onClick={() => editor.chain().focus().setTextAlign('left').run()}
                            style={{ background: editor.isActive({ textAlign: 'left' }) ? '#555' : 'transparent', color: '#fff', border: 'none', padding: '4px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        ><AlignLeft size={14} /></button>
                        <button
                            type="button"
                            onClick={() => editor.chain().focus().setTextAlign('center').run()}
                            style={{ background: editor.isActive({ textAlign: 'center' }) ? '#555' : 'transparent', color: '#fff', border: 'none', padding: '4px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        ><AlignCenter size={14} /></button>
                        <button
                            type="button"
                            onClick={() => editor.chain().focus().setTextAlign('right').run()}
                            style={{ background: editor.isActive({ textAlign: 'right' }) ? '#555' : 'transparent', color: '#fff', border: 'none', padding: '4px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        ><AlignRight size={14} /></button>
                        <div style={{ width: '1px', height: '16px', background: '#555', margin: '0 2px' }}></div>
                        <button
                            type="button"
                            onClick={() => { editor.commands.unsetAllMarks(); editor.commands.clearNodes(); }}
                            style={{ background: 'transparent', color: '#fca5a5', border: 'none', padding: '4px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            title="ล้างรูปแบบทั้งหมด"
                        ><Eraser size={14} /></button>
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
