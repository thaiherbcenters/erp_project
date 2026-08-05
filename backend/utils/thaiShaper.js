/**
 * Custom Thai Text Renderer for pdf-lib
 * Uses pdf-lib's native drawing for standard text chunks to preserve kerning,
 * but intercepts specific problematic clusters (Sara Am, Tall Consonants, Tone Overlaps)
 * and manually adjusts their diacritic positions.
 */

function drawThaiText(pdfPage, text, x, y, size, font, color, italic = false) {
    if (!text) return;
    
    let currentX = x;
    const startY = y;
    
    const baseOpts = { size, font, color };
    if (italic) {
        baseOpts.ySkew = { type: 'degrees', angle: 15 };
    }
    
    // 1. Sara Am with Tone: นำ้ or น้ ำ
    // 2. Tall Consonant with Tone or Upper Vowel: ฟ้, ปิ, ฟิ้
    // 3. Normal Consonant with Upper Vowel and Tone: ลื่
    const problemRegex = /([ก-ฮฤฦ][ัิ-ู]?[\u0E48-\u0E4C]\u0E33)|([ก-ฮฤฦ][ัิ-ู]?\u0E33[\u0E48-\u0E4C])|([ปฝฟฬ][ัิีึื]?[\u0E48-\u0E4C])|([ปฝฟฬ][ัิีึื])|([ก-ฮฤฦ][ัิีึื][\u0E48-\u0E4C])/g;
    
    let lastIndex = 0;
    let match;
    
    while ((match = problemRegex.exec(text)) !== null) {
        // Draw preceding safe text
        const beforeStr = text.substring(lastIndex, match.index);
        if (beforeStr) {
            pdfPage.drawText(beforeStr, { ...baseOpts, x: currentX, y: startY });
            currentX += font.widthOfTextAtSize(beforeStr, size);
        }
        
        const cluster = match[0];
        
        // Handle specific problem cases
        if (cluster.includes('\u0E33')) { // Sara Am
            const baseMatch = cluster.match(/([ก-ฮฤฦ][ัิ-ู]?)/);
            const toneMatch = cluster.match(/([\u0E48-\u0E4C])/);
            const base = baseMatch ? baseMatch[1] : '';
            const tone = toneMatch ? toneMatch[1] : '';
            
            const baseAm = base + '\u0E33';
            pdfPage.drawText(baseAm, { ...baseOpts, x: currentX, y: startY });
            
            if (tone) {
                let toneX = currentX + font.widthOfTextAtSize(base, size);
                if (['ป','ฝ','ฟ','ฬ'].includes(base[0])) toneX -= size * 0.15;
                const toneY = startY + (size * 0.25);
                pdfPage.drawText(tone, { ...baseOpts, x: toneX, y: toneY });
            }
            
            currentX += font.widthOfTextAtSize(baseAm, size);
        } 
        else if (['ป','ฝ','ฟ','ฬ'].includes(cluster[0])) { // Tall consonant
            const base = cluster[0];
            const upperVowelMatch = cluster.match(/([ัิีึื])/);
            const toneMatch = cluster.match(/([\u0E48-\u0E4C])/);
            const upperVowel = upperVowelMatch ? upperVowelMatch[1] : '';
            const tone = toneMatch ? toneMatch[1] : '';
            
            pdfPage.drawText(base, { ...baseOpts, x: currentX, y: startY });
            let markX = currentX + font.widthOfTextAtSize(base, size) - (size * 0.15);
            
            if (upperVowel) {
                pdfPage.drawText(upperVowel, { ...baseOpts, x: markX, y: startY });
            }
            
            if (tone) {
                const toneY = upperVowel ? startY + (size * 0.25) : startY;
                pdfPage.drawText(tone, { ...baseOpts, x: markX, y: toneY });
            }
            
            currentX += font.widthOfTextAtSize(base, size); // Vowels/Tones are zero-width
        }
        else { // Normal consonant + Upper vowel + Tone (e.g., ลื่)
            const baseMatch = cluster.match(/([ก-ฮฤฦ])/);
            const upperVowelMatch = cluster.match(/([ัิีึื])/);
            const toneMatch = cluster.match(/([\u0E48-\u0E4C])/);
            const base = baseMatch ? baseMatch[1] : '';
            const upperVowel = upperVowelMatch ? upperVowelMatch[1] : '';
            const tone = toneMatch ? toneMatch[1] : '';
            
            pdfPage.drawText(base + upperVowel, { ...baseOpts, x: currentX, y: startY });
            
            const toneX = currentX + font.widthOfTextAtSize(base, size);
            const toneY = startY + (size * 0.25); // Shift tone UP
            pdfPage.drawText(tone, { ...baseOpts, x: toneX, y: toneY });
            
            currentX += font.widthOfTextAtSize(base + upperVowel, size);
        }
        
        lastIndex = problemRegex.lastIndex;
    }
    
    // Draw remaining safe text
    const remaining = text.substring(lastIndex);
    if (remaining) {
        pdfPage.drawText(remaining, { ...baseOpts, x: currentX, y: startY });
    }
}

function wrapThaiText(text, maxWidth, size, font) {
    if (!text) return [];
    
    // Split explicitly by newline first
    const lines = text.split(/\r?\n/);
    const wrappedLines = [];
    
    let segmenter;
    try {
        segmenter = new Intl.Segmenter('th', { granularity: 'word' });
    } catch (e) {
        segmenter = null;
    }
    
    for (const line of lines) {
        if (!line) {
            wrappedLines.push('');
            continue;
        }
        
        if (maxWidth <= 0) {
            wrappedLines.push(line);
            continue;
        }

        if (!segmenter) {
            wrappedLines.push(line); // Fallback
            continue;
        }
        
        let currentLine = '';
        const segments = Array.from(segmenter.segment(line)).map(s => s.segment);
        
        for (const word of segments) {
            const testLine = currentLine + word;
            const testWidth = font.widthOfTextAtSize(testLine, size);
            
            if (testWidth > maxWidth && currentLine.length > 0) {
                wrappedLines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) {
            wrappedLines.push(currentLine);
        }
    }
    
    return wrappedLines;
}

function parseHTMLToParagraphs(html) {
    if (!html) return [{ align: 'left', chunks: [] }];

    // Match paragraph blocks or similar block elements
    const pRegex = /<p([^>]*)>(.*?)<\/p>/gi;
    const paragraphs = [];
    let pMatch;
    let hasParagraphs = false;

    while ((pMatch = pRegex.exec(html)) !== null) {
        hasParagraphs = true;
        const pAttrs = pMatch[1];
        const pContent = pMatch[2];
        
        let align = 'left';
        if (pAttrs.includes('text-align: center')) align = 'center';
        else if (pAttrs.includes('text-align: right')) align = 'right';
        else if (pAttrs.includes('text-align: justify')) align = 'justify';
        
        paragraphs.push({ align, content: pContent });
    }

    if (!hasParagraphs) {
        paragraphs.push({ align: 'left', content: html });
    }

    const parsedParagraphs = [];

    for (const p of paragraphs) {
        const segments = [];
        let isBold = false;
        let isItalic = false;
        let fontSize = null;

        let content = p.content.replace(/<(?!strong\b|\/strong\b|b\b|\/b\b|em\b|\/em\b|i\b|\/i\b|span\b|\/span\b)[^>]+>/gi, '');
        const tagRegex = /<(strong|b|em|i|\/strong|\/b|\/em|\/i|\/span|span[^>]*)>/gi;
        let lastIndex = 0;
        let match;

        while ((match = tagRegex.exec(content)) !== null) {
            if (match.index > lastIndex) {
                segments.push({ 
                    text: content.substring(lastIndex, match.index), 
                    bold: isBold, 
                    italic: isItalic,
                    size: fontSize
                });
            }
            
            const tag = match[1];
            const lowerTag = tag.toLowerCase();
            
            if (lowerTag === 'strong' || lowerTag === 'b') isBold = true;
            else if (lowerTag === '/strong' || lowerTag === '/b') isBold = false;
            else if (lowerTag === 'em' || lowerTag === 'i') isItalic = true;
            else if (lowerTag === '/em' || lowerTag === '/i') isItalic = false;
            else if (lowerTag.startsWith('span')) {
                const sizeMatch = lowerTag.match(/font-size:\s*(\d+)px/);
                if (sizeMatch) {
                    fontSize = parseInt(sizeMatch[1], 10);
                }
            }
            else if (lowerTag === '/span') {
                fontSize = null; 
            }
            
            lastIndex = tagRegex.lastIndex;
        }

        if (lastIndex < content.length) {
            segments.push({ 
                text: content.substring(lastIndex), 
                bold: isBold, 
                italic: isItalic,
                size: fontSize
            });
        }

        const validSegments = segments.filter(s => s.text.length > 0).map(s => {
            s.text = s.text.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
            return s;
        });

        if (validSegments.length > 0) {
            parsedParagraphs.push({ align: p.align, chunks: validSegments });
        } else {
            parsedParagraphs.push({ align: p.align, chunks: [{ text: '', bold: false, italic: false, size: null }] });
        }
    }

    return parsedParagraphs;
}

function wrapThaiTextRich(html, maxWidth, defaultSize, font, boldFont) {
    if (!html) return [];
    if (!boldFont) boldFont = font;
    
    const paragraphs = parseHTMLToParagraphs(html);
    const wrappedLines = [];
    
    let segmenter;
    try {
        segmenter = new Intl.Segmenter('th', { granularity: 'word' });
    } catch (e) {
        segmenter = null;
    }
    
    for (const p of paragraphs) {
        const paragraphChunks = p.chunks;
        if (paragraphChunks.length === 0 || (paragraphChunks.length === 1 && paragraphChunks[0].text.trim() === '')) {
            // Empty paragraph = blank line from Enter key. Push a space so PDF renders it as a real line.
            wrappedLines.push({ align: p.align, chunks: [{ text: ' ', bold: false, italic: false, size: null }] });
            continue;
        }
        
        if (maxWidth <= 0 || !segmenter) {
            wrappedLines.push({ align: p.align, chunks: paragraphChunks });
            continue;
        }
        
        let currentLineChunks = [];
        let currentLineWidth = 0;
        
        for (const chunk of paragraphChunks) {
            const activeFont = chunk.bold ? boldFont : font;
            const size = chunk.size || defaultSize;
            const words = Array.from(segmenter.segment(chunk.text)).map(s => s.segment);
            
            for (const word of words) {
                const wordWidth = activeFont.widthOfTextAtSize(word, size);
                
                if (currentLineWidth + wordWidth > maxWidth && currentLineWidth > 0) {
                    wrappedLines.push({ align: p.align, chunks: currentLineChunks });
                    currentLineChunks = [{ text: word, bold: chunk.bold, italic: chunk.italic, size }];
                    currentLineWidth = wordWidth;
                } else {
                    if (currentLineChunks.length > 0 && 
                        currentLineChunks[currentLineChunks.length - 1].bold === chunk.bold &&
                        currentLineChunks[currentLineChunks.length - 1].italic === chunk.italic &&
                        currentLineChunks[currentLineChunks.length - 1].size === size) {
                        currentLineChunks[currentLineChunks.length - 1].text += word;
                    } else {
                        currentLineChunks.push({ text: word, bold: chunk.bold, italic: chunk.italic, size });
                    }
                    currentLineWidth += wordWidth;
                }
            }
        }
        if (currentLineChunks.length > 0) {
            wrappedLines.push({ align: p.align, chunks: currentLineChunks });
        }
    }
    
    return wrappedLines;
}

module.exports = { drawThaiText, wrapThaiText, wrapThaiTextRich };
