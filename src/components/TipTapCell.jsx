import React, { useEffect } from 'react';
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
            onChange(editor.getHTML());
        },
    });

    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value || '');
        }
    }, [value, editor]);

    if (!editor) return null;

    const FONT_SIZES = ['10px', '12px', '14px', '16px', '18px', '20px'];
    const COLORS = ['#000000', '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

    return (
        <div style={{ ...style, display: 'flex', flexDirection: 'column', flex: 1, position: 'relative' }}>
            {editor && !readOnly && (
                <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
                    <div style={{ background: '#333', padding: '6px', borderRadius: '8px', display: 'flex', gap: '6px', alignItems: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                        <select 
                            onChange={(e) => editor.chain().focus().setFontSize(e.target.value).run()} 
                            style={{ background: '#555', color: '#fff', border: 'none', borderRadius: '4px', padding: '2px 4px', fontSize: '12px', outline: 'none' }}
                            value={editor.getAttributes('textStyle').fontSize || '14px'}
                        >
                            <option value="">ขนาด</option>
                            {FONT_SIZES.map(size => (
                                <option key={size} value={size}>{size.replace('px', '')}</option>
                            ))}
                        </select>
                        
                        <input 
                            type="color" 
                            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
                            value={editor.getAttributes('textStyle').color || '#000000'}
                            style={{ width: '24px', height: '24px', padding: '0', border: 'none', background: 'transparent', cursor: 'pointer' }}
                            title="สีข้อความ"
                        />

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
                <div style={{ position: 'absolute', top: '8px', left: '12px', color: '#9ca3af', pointerEvents: 'none', fontSize: '13px' }}>
                    {placeholder}
                </div>
            )}
        </div>
    );
};
