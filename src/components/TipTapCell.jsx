import React, { useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import { Extension } from '@tiptap/core';
import Underline from '@tiptap/extension-underline';
import Color from '@tiptap/extension-color';
import { AlignLeft, AlignCenter, AlignRight, Eraser, Minus } from 'lucide-react';

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
    const lastEmittedHTML = useRef(value || '');
    const savedSelection = useRef(null);

    const editor = useEditor({
        extensions: [
            StarterKit,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            TextStyle,
            FontSize,
            Underline,
            Color,
        ],
        parseOptions: {
            preserveWhitespace: 'full',
        },
        content: value || '',
        editable: !readOnly,
        onUpdate: ({ editor }) => {
            const html = editor.getHTML();
            lastEmittedHTML.current = html;
            onChange(html);
        },
    });

    useEffect(() => {
        if (!editor) return;
        if (value === lastEmittedHTML.current) return;
        lastEmittedHTML.current = value || '';
        editor.commands.setContent(value || '', false, { preserveWhitespace: 'full' });
    }, [value, editor]);

    const saveSelection = useCallback(() => {
        if (editor) {
            savedSelection.current = {
                from: editor.state.selection.from,
                to: editor.state.selection.to,
            };
        }
    }, [editor]);

    // Build a chain that restores selection first, then appends extra commands
    const chainWithSelection = useCallback(() => {
        const sel = savedSelection.current;
        const c = editor.chain().focus();
        if (sel && sel.from !== sel.to) {
            return c.setTextSelection({ from: sel.from, to: sel.to });
        }
        return c;
    }, [editor]);

    if (!editor) return null;

    const FONT_SIZES = ['10', '12', '14', '16', '18', '20', '24'];

    const handleFontSizeChange = (e) => {
        const val = e.target.value;
        if (val) {
            chainWithSelection().setFontSize(val + 'px').run();
        } else {
            chainWithSelection().unsetFontSize().run();
        }
    };

    const handleColorChange = (e) => {
        chainWithSelection().setColor(e.target.value).run();
    };

    const tbtn = (fn) => (e) => {
        e.preventDefault();
        saveSelection();
        fn();
    };

    const currentFontSize = (editor.getAttributes('textStyle').fontSize || '').replace('px', '');

    return (
        <div style={{ ...style, display: 'flex', flexDirection: 'column', flex: 1, position: 'relative' }}>
            {editor && !readOnly && (
                <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
                    <div style={{ background: '#333', padding: '6px', borderRadius: '8px', display: 'flex', gap: '4px', alignItems: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', flexWrap: 'nowrap' }}>
                        <select 
                            onMouseDown={saveSelection}
                            onChange={handleFontSizeChange}
                            style={{ background: '#555', color: '#fff', border: 'none', borderRadius: '4px', padding: '2px 4px', fontSize: '11px', outline: 'none', flexShrink: 0, width: '55px', cursor: 'pointer' }}
                            value={currentFontSize}
                        >
                            <option value="">ขนาด</option>
                            {FONT_SIZES.map(size => (
                                <option key={size} value={size}>{size}</option>
                            ))}
                        </select>
                        
                        <div style={{ position: 'relative', width: '22px', height: '22px', minWidth: '22px', flexShrink: 0, borderRadius: '4px', overflow: 'hidden', border: '1px solid #666' }}>
                            <input type="color"
                                onMouseDown={(e) => { e.stopPropagation(); saveSelection(); }}
                                onChange={handleColorChange}
                                value={editor.getAttributes('textStyle').color || '#000000'}
                                style={{ position: 'absolute', top: '-4px', left: '-4px', width: '30px', height: '30px', padding: '0', border: 'none', cursor: 'pointer' }}
                                title="สีข้อความ"
                            />
                        </div>

                        <div style={{ width: '1px', height: '16px', background: '#555', margin: '0 1px' }}></div>
                        <button type="button" onMouseDown={tbtn(() => chainWithSelection().toggleBold().run())}
                            style={{ background: editor.isActive('bold') ? '#555' : 'transparent', color: '#fff', border: 'none', padding: '3px 5px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', display: 'flex', alignItems: 'center' }}
                        >B</button>
                        <button type="button" onMouseDown={tbtn(() => chainWithSelection().toggleItalic().run())}
                            style={{ background: editor.isActive('italic') ? '#555' : 'transparent', color: '#fff', border: 'none', padding: '3px 5px', borderRadius: '4px', cursor: 'pointer', fontStyle: 'italic', fontWeight: 'bold', fontSize: '12px', display: 'flex', alignItems: 'center' }}
                        >I</button>
                        <button type="button" onMouseDown={tbtn(() => chainWithSelection().toggleUnderline().run())}
                            style={{ background: editor.isActive('underline') ? '#555' : 'transparent', color: '#fff', border: 'none', padding: '3px 5px', borderRadius: '4px', cursor: 'pointer', textDecoration: 'underline', fontWeight: 'bold', fontSize: '12px', display: 'flex', alignItems: 'center' }}
                        >U</button>
                        <button type="button" onMouseDown={tbtn(() => chainWithSelection().toggleStrike().run())}
                            style={{ background: editor.isActive('strike') ? '#555' : 'transparent', color: '#fff', border: 'none', padding: '3px 5px', borderRadius: '4px', cursor: 'pointer', textDecoration: 'line-through', fontWeight: 'bold', fontSize: '12px', display: 'flex', alignItems: 'center' }}
                        >S</button>
                        <div style={{ width: '1px', height: '16px', background: '#555', margin: '0 1px' }}></div>
                        <button type="button" onMouseDown={tbtn(() => chainWithSelection().setTextAlign('left').run())}
                            style={{ background: editor.isActive({ textAlign: 'left' }) ? '#555' : 'transparent', color: '#fff', border: 'none', padding: '3px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        ><AlignLeft size={13} /></button>
                        <button type="button" onMouseDown={tbtn(() => chainWithSelection().setTextAlign('center').run())}
                            style={{ background: editor.isActive({ textAlign: 'center' }) ? '#555' : 'transparent', color: '#fff', border: 'none', padding: '3px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        ><AlignCenter size={13} /></button>
                        <button type="button" onMouseDown={tbtn(() => chainWithSelection().setTextAlign('right').run())}
                            style={{ background: editor.isActive({ textAlign: 'right' }) ? '#555' : 'transparent', color: '#fff', border: 'none', padding: '3px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        ><AlignRight size={13} /></button>
                        <button type="button" onMouseDown={tbtn(() => {
                            chainWithSelection().setHorizontalRule().run();
                            editor.commands.insertContent('<p></p>');
                        })}
                            style={{ background: 'transparent', color: '#fff', border: 'none', padding: '3px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            title="เพิ่มเส้นคั่น"
                        ><Minus size={13} /></button>
                        <div style={{ width: '1px', height: '16px', background: '#555', margin: '0 1px' }}></div>
                        <button type="button" onMouseDown={tbtn(() => { editor.commands.unsetAllMarks(); editor.commands.clearNodes(); })}
                            style={{ background: 'transparent', color: '#fca5a5', border: 'none', padding: '3px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        ><Eraser size={13} /></button>
                    </div>
                </BubbleMenu>
            )}
            <EditorContent editor={editor} style={{ flex: 1 }} className="tiptap-cell-editor" />
            {!editor.getText() && placeholder && !readOnly && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', color: '#9ca3af', pointerEvents: 'none', fontSize: '14px' }}>
                    {placeholder}
                </div>
            )}
        </div>
    );
};
