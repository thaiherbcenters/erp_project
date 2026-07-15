# Agent Rules for ERP ThaiHerb Project

## PDF Generation and Thai Text Formatting (pdf-lib)
When working on PDF generation features, printing, or adding new document types that generate PDFs using `pdf-lib`:
- **ALWAYS** use the `backend/utils/thaiShaper.js` utility (`drawThaiText` function) to draw text fields onto the PDF instead of using `pdfPage.drawText()` directly.
- **Why?**: `pdf-lib` and Google Fonts versions of Thai fonts (like Sarabun) lack full GSUB/GPOS support for Thai Complex Text Layout (สระลอย, วรรณยุกต์จม) and lack PUA glyph mappings. 
- The `drawThaiText` utility solves this by surgically intercepting specific problematic clusters (e.g. Sara Am with Tone (`น้ำ`), Tall Consonants (`ฟ้`, `ปิ`), overlapping upper vowels) and manually calculating exact X/Y offsets, while using native rendering for the rest of the text to preserve perfect kerning and spacing.

**Usage in backend routes:**
```javascript
const { drawThaiText } = require('../utils/thaiShaper');

// Instead of standard rendering:
// pdfPage.drawText(value, { x, y, size, font, color });

// ALWAYS USE:
drawThaiText(pdfPage, value, x, y, size, font, color);
```

## Multiline vs Single-line Text in PDF Forms
When rendering text fields in PDFs, respect the frontend configuration and implement specific formatting:
- **Rely on Explicit Types**: Do not auto-detect multiline fields based on bounding box height. Only treat a field as multiline if explicitly configured in the JSON template (e.g., `field.type === 'multi-line'` or `field.multiline === true`).
- **Single-line Fields**: Replace any explicit newlines (`\n`) with spaces. Auto-shrink the font size horizontally if the text exceeds the box width. Use the default bottom-aligned baseline for rendering.
- **Multi-line Fields**: Use the `wrapThaiText` utility (from `thaiShaper.js`) to intelligently word-wrap Thai text (using `Intl.Segmenter`). Render lines starting from the **top** of the bounding box downwards (`adjustedY + boxHeight - lineHeight`). If the total height of the wrapped text exceeds the box height, dynamically auto-shrink the font size and re-wrap until it fits.

## Text Alignment (Y-Offset) in PDF Forms
- **Y-Offset +1**: When calculating the `y` coordinate for drawing text fields on a PDF page, **use an offset of exactly `y + 1`** (`const adjustedY = y + 1;`).
- **Alignment Rationale**: The offset of +1 lifts the text just slightly above the absolute bottom coordinate of the user-defined bounding box (`y = height - ((field.yPercent / 100) * height)`). This strikes the perfect balance so that text doesn't look too low or perfectly flush with dotted lines, while still allowing natural descenders (like ป, ฐ, สระอุ, สระอู) to not dip too deep.

## Bold Font Support in PDF Generation
- The PDF generation system has been upgraded to support bold text rendering.
- It determines if a field should be bold by checking `field.fontWeight === 'bold'`, `field.fontWeight === '700'`, `field.isBold === true`, or inheriting `templateConfig.defaultFontWeight === 'bold'`.
- When bold text is required, it dynamically selects and loads the `-Bold.ttf` version of the font (e.g. `Sarabun-Bold.ttf`) from `fontUrls` and maps it to `activeFont`. Ensure that `fontUrls` maintains the `{ regular: '...', bold: '...' }` object structure for font families.
