/**
 * Custom Thai Text Renderer for pdf-lib
 * Uses pdf-lib's native drawing for standard text chunks to preserve kerning,
 * but intercepts specific problematic clusters (Sara Am, Tall Consonants, Tone Overlaps)
 * and manually adjusts their diacritic positions.
 */

function drawThaiText(pdfPage, text, startX, startY, size, font, color) {
    if (!text) return;
    
    let currentX = startX;
    
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
            pdfPage.drawText(beforeStr, { x: currentX, y: startY, size, font, color });
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
            pdfPage.drawText(baseAm, { x: currentX, y: startY, size, font, color });
            
            if (tone) {
                let toneX = currentX + font.widthOfTextAtSize(base, size);
                if (['ป','ฝ','ฟ','ฬ'].includes(base[0])) toneX -= size * 0.15;
                const toneY = startY + (size * 0.25);
                pdfPage.drawText(tone, { x: toneX, y: toneY, size, font, color });
            }
            
            currentX += font.widthOfTextAtSize(baseAm, size);
        } 
        else if (['ป','ฝ','ฟ','ฬ'].includes(cluster[0])) { // Tall consonant
            const base = cluster[0];
            const upperVowelMatch = cluster.match(/([ัิีึื])/);
            const toneMatch = cluster.match(/([\u0E48-\u0E4C])/);
            const upperVowel = upperVowelMatch ? upperVowelMatch[1] : '';
            const tone = toneMatch ? toneMatch[1] : '';
            
            pdfPage.drawText(base, { x: currentX, y: startY, size, font, color });
            let markX = currentX + font.widthOfTextAtSize(base, size) - (size * 0.15);
            
            if (upperVowel) {
                pdfPage.drawText(upperVowel, { x: markX, y: startY, size, font, color });
            }
            
            if (tone) {
                const toneY = upperVowel ? startY + (size * 0.25) : startY;
                pdfPage.drawText(tone, { x: markX, y: toneY, size, font, color });
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
            
            pdfPage.drawText(base + upperVowel, { x: currentX, y: startY, size, font, color });
            
            const toneX = currentX + font.widthOfTextAtSize(base, size);
            const toneY = startY + (size * 0.25); // Shift tone UP
            pdfPage.drawText(tone, { x: toneX, y: toneY, size, font, color });
            
            currentX += font.widthOfTextAtSize(base + upperVowel, size);
        }
        
        lastIndex = problemRegex.lastIndex;
    }
    
    // Draw remaining safe text
    const remaining = text.substring(lastIndex);
    if (remaining) {
        pdfPage.drawText(remaining, { x: currentX, y: startY, size, font, color });
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
    if (!html) return [[]];
    
    // Clean and normalize HTML tags from React Quill
    let text = html
        .replace(/<p><br><\/p>/gi, '\n')
        .replace(/<\/p>\s*<p>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<p>/gi, '');
        
    // Strip everything except <strong> and <b>
    text = text.replace(/<(?!strong\b|\/strong\b|b\b|\/b\b)[^>]+>/gi, '').trim();
    
    const lines = text.split(/\r?\n/);
    const paragraphs = [];
    const regex = /<(strong|b)>(.*?)<\/\1>/gis;
    
    for (const line of lines) {
        if (!line) {
            paragraphs.push([]);
            continue;
        }
        
        const segments = [];
        let lastIndex = 0;
        let match;
        
        regex.lastIndex = 0;
        while ((match = regex.exec(line)) !== null) {
            if (match.index > lastIndex) {
                segments.push({ text: line.substring(lastIndex, match.index), bold: false });
            }
            segments.push({ text: match[2], bold: true });
            lastIndex = regex.lastIndex;
        }
        
        if (lastIndex < line.length) {
            segments.push({ text: line.substring(lastIndex), bold: false });
        }
        
        if (segments.length === 0 && line.length > 0) {
            segments.push({ text: line, bold: false });
        }
        
        paragraphs.push(segments);
    }
    
    return paragraphs;
}

function wrapThaiTextRich(html, maxWidth, size, font, boldFont) {
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
    
    for (const paragraph of paragraphs) {
        if (paragraph.length === 0) {
            wrappedLines.push([]);
            continue;
        }
        
        if (maxWidth <= 0 || !segmenter) {
            wrappedLines.push(paragraph);
            continue;
        }
        
        let currentLineChunks = [];
        let currentLineWidth = 0;
        
        for (const chunk of paragraph) {
            const activeFont = chunk.bold ? boldFont : font;
            const words = Array.from(segmenter.segment(chunk.text)).map(s => s.segment);
            
            for (const word of words) {
                const wordWidth = activeFont.widthOfTextAtSize(word, size);
                
                if (currentLineWidth + wordWidth > maxWidth && currentLineWidth > 0) {
                    wrappedLines.push(currentLineChunks);
                    currentLineChunks = [{ text: word, bold: chunk.bold }];
                    currentLineWidth = wordWidth;
                } else {
                    if (currentLineChunks.length > 0 && currentLineChunks[currentLineChunks.length - 1].bold === chunk.bold) {
                        currentLineChunks[currentLineChunks.length - 1].text += word;
                    } else {
                        currentLineChunks.push({ text: word, bold: chunk.bold });
                    }
                    currentLineWidth += wordWidth;
                }
            }
        }
        if (currentLineChunks.length > 0) {
            wrappedLines.push(currentLineChunks);
        }
    }
    
    return wrappedLines;
}

module.exports = { drawThaiText, wrapThaiText, wrapThaiTextRich };
