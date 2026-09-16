/**
 * Auto-crops transparent (or near-transparent/white) pixels from a signature image.
 * Returns a new File object with the cropped image.
 */
export const autoCropSignature = (file) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        
        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            let minX = canvas.width;
            let minY = canvas.height;
            let maxX = 0;
            let maxY = 0;

            let isTransparent = true;

            for (let y = 0; y < canvas.height; y++) {
                for (let x = 0; x < canvas.width; x++) {
                    const index = (y * canvas.width + x) * 4;
                    const r = data[index];
                    const g = data[index + 1];
                    const b = data[index + 2];
                    let a = data[index + 3];

                    // --- 1. Auto Remove Background (White/Gray Paper) ---
                    // Calculate relative luminance
                    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
                    
                    if (luminance > 200) {
                        // Soft edge transition: 
                        // luminance 200 -> alpha 100% of original
                        // luminance 240+ -> alpha 0% (transparent)
                        let opacityFactor = (240 - luminance) / 40;
                        if (opacityFactor < 0) opacityFactor = 0;
                        if (opacityFactor > 1) opacityFactor = 1;
                        
                        a = Math.floor(a * opacityFactor);
                        data[index + 3] = a; // update alpha channel in image data
                    }

                    // --- 2. Find Bounding Box for Cropping ---
                    const isVisible = a > 20;

                    if (isVisible) {
                        isTransparent = false;
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                    }
                }
            }

            // Put the modified (background removed) pixels back to the original canvas
            ctx.putImageData(imageData, 0, 0);

            if (isTransparent) {
                resolve(file);
                return;
            }

            const padding = 10;
            minX = Math.max(0, minX - padding);
            minY = Math.max(0, minY - padding);
            maxX = Math.min(canvas.width, maxX + padding);
            maxY = Math.min(canvas.height, maxY + padding);

            const cropWidth = maxX - minX;
            const cropHeight = maxY - minY;

            const cropCanvas = document.createElement('canvas');
            cropCanvas.width = cropWidth;
            cropCanvas.height = cropHeight;
            const cropCtx = cropCanvas.getContext('2d');
            
            cropCtx.drawImage(canvas, minX, minY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

            cropCanvas.toBlob((blob) => {
                if (!blob) {
                    resolve(file);
                    return;
                }
                const croppedFile = new File([blob], file.name, {
                    type: file.type || 'image/png',
                    lastModified: Date.now(),
                });
                resolve(croppedFile);
            }, file.type || 'image/png');
        };

        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(file); 
        };

        img.src = objectUrl;
    });
};
