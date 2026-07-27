/**
 * Script to download product images from Google Drive and save locally
 * Run: node scripts/download-product-images.js
 */
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PRODUCTS_DIR = path.join(__dirname, '..', 'public', 'images', 'products');
const SIGNATURES_DIR = path.join(__dirname, '..', 'public', 'images', 'signatures');

// Product images mapping from bill.html
const PRODUCT_IMAGES = {
    'yadom-samunprai': 'https://lh3.googleusercontent.com/d/1L4eDRr-T2tzYldYMLy1yiiY5cS_dpv1g',
    'yadom-samunprai-jumbo': 'https://lh3.googleusercontent.com/d/1VTE7WnI7Khg6kaSFPcgXBRboTTKjT_Nj',
    'ya-mong': 'https://lh3.googleusercontent.com/d/1bETh16T7sIhUBwKpNsKq1iPP7FXz3ea2',
    'ya-namman-10ml': 'https://lh3.googleusercontent.com/d/1es32ZYzwH6km7MQHRwQY1rqxw0R4PPeV',
    'ya-namman-sutra-yen': 'https://lh3.googleusercontent.com/d/1T_X6Yp3Mt01kARl2RaAKyrgck4kCVWsO',
    'ya-namman-sutra-ron': 'https://lh3.googleusercontent.com/d/1PIiNOAqC8MI3C-2F5OjNFu1rGuyEiJDO',
    'ya-spray-kraduk-kai-dam': 'https://lh3.googleusercontent.com/d/1UWui-uj4zTdBUQ82-drLhw2e5JM40jrJ',
    'capsule-kamin-chan': 'https://lh3.googleusercontent.com/d/1zoqAYUgZjfIyE11mNNbaV_1B5xTZGfir',
    'capsule-fa-talai-jorn': 'https://lh3.googleusercontent.com/d/19yy_4o7UersECH2Ccp3ggbY-bmiHNXXI',
    'capsule-khing': 'https://lh3.googleusercontent.com/d/1Yob2ixLyTYQ7qLo7VyDb4ioI0EJ_MvGv',
    'capsule-makham-khaek': 'https://lh3.googleusercontent.com/d/1SagCoYqVCNNr7LEQDNyksBYCQ2bFiaAg',
    'capsule-rang-juet': 'https://lh3.googleusercontent.com/d/1EB9jTZjw9GKk_tVhCg5fpNjTbfWH7dfG',
    'capsule-mara-khi-nok': 'https://lh3.googleusercontent.com/d/1Z_Aoq0aqqONBpBYlecqGHv_Br0mk97nJ',
    'capsule-tri-phala': 'https://lh3.googleusercontent.com/d/1CzHDRbZQ-6h4In0cht9_4nIVCOS3QrPh',
    'capsule-phet-sang-khat': 'https://lh3.googleusercontent.com/d/1Yewpmd2WdjPsfoOkIJLbzkqH8mFBzted',
    'capsule-prasa-jet-phang-khi': 'https://lh3.googleusercontent.com/d/120CP0rN-N5r3TY_DftwIdacO_Zj-mhaV',
    'capsule-sahat-thara': 'https://lh3.googleusercontent.com/d/1e5EgfkhubAiyx7pKzy2wNDakUy7kxsMR',
    'capsule-prasa-mawaeng': 'https://lh3.googleusercontent.com/d/1c7wzoKoykF1V8FuMJ5zf5VJeLXblCF60',
    'capsule-prap-chomphu-thawip': 'https://lh3.googleusercontent.com/d/1qkb10_SFxnbmdI5naXqJ1utfUOR5kmq2',
    'luk-prakop': 'https://lh3.googleusercontent.com/d/1cCE2ljnZcch2ps_CdjTNX77DbpupqFbD',
    'cha-assam-box': 'https://lh3.googleusercontent.com/d/1W_mT8LTDNCEpVLQPgT-l_njbnOpe4C5X',
    'cha-assam-sachet': 'https://lh3.googleusercontent.com/d/16X-FO1yfEvBeuKJ9rvs8q2522UQZjWWa',
    'cha-cannabis-ginseng': 'https://lh3.googleusercontent.com/d/19eJRgV9bxufoyLuvwreH9H6c2eWaEbPb',
    'cha-cannabis': 'https://lh3.googleusercontent.com/d/1lVFnyNMFC0wIUi8FgCelSd_vB1iHj9fy',
    'namphung': 'https://lh3.googleusercontent.com/d/1dAnBm7bW8Gu7_bIi2_5CbdwNll4WZMug',
    'candle-rose': 'https://lh3.googleusercontent.com/d/1hB0_mBAqRZFuR8juJ1SvRp2FFz3CdDsI',
    'candle-morning': 'https://lh3.googleusercontent.com/d/15zfkOqwBXUM1B_dhnLhotlvrTJfhLMRs',
    'candle-thai': 'https://lh3.googleusercontent.com/d/1ROMRZHWmZG07yY4_o2kk6rXY8UjlC3Ir',
    'essential-oil-rose': 'https://lh3.googleusercontent.com/d/11b4qVF29RUPG7BKJ-7IcHC6qaN0Vmve7',
    'essential-oil-morning': 'https://lh3.googleusercontent.com/d/1_HvVGPl8IIznaHC3KVR_SVIBuTcqpopN',
    'essential-oil-thai': 'https://lh3.googleusercontent.com/d/1Yv6ExSNdT9PJtOyOnAFFqF-h0ESqtQDf',
};

// Signature images
const SIGNATURE_IMAGES = {
    'sign-watcharapong': 'https://lh3.googleusercontent.com/d/1ps5SyMaGMCwKLGFonra1eOKUK-I5cCrL',
    'sign-apiwat': 'https://lh3.googleusercontent.com/d/1wR8tGS--15mm-tkoP1dUH0FWIE2ZvtKZ',
};

// Other images (logos, bank QR etc. that might be missing)
const OTHER_IMAGES = {
    'logos/logo-fda-thc': 'https://lh3.googleusercontent.com/d/1FPtYXftp6xTLvFYz2rvM_iQeh4EEkzj8',
    'banks/bank-kbank-qr': 'https://lh3.googleusercontent.com/d/1GNinU6QiQbvKMnb07_Le0tW6LNL_Nf_h',
    'banks/bank-ktb-qr': 'https://lh3.googleusercontent.com/d/1whvhHEM2J53JvI5Irg-bMec-LoPXVEaZ',
    'logos/logo-psf-alt': 'https://lh3.googleusercontent.com/d/11-qyC7VD7yoIc8MDL0s8JF5ZREKloMGH',
};

function downloadFile(url, destPath) {
    return new Promise((resolve, reject) => {
        const makeRequest = (currentUrl, redirectCount = 0) => {
            if (redirectCount > 5) {
                reject(new Error('Too many redirects'));
                return;
            }

            const protocol = currentUrl.startsWith('https') ? https : http;
            protocol.get(currentUrl, (response) => {
                // Handle redirects
                if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                    makeRequest(response.headers.location, redirectCount + 1);
                    return;
                }

                if (response.statusCode !== 200) {
                    reject(new Error(`HTTP ${response.statusCode} for ${url}`));
                    return;
                }

                const fileStream = fs.createWriteStream(destPath);
                response.pipe(fileStream);
                fileStream.on('finish', () => {
                    fileStream.close();
                    resolve();
                });
                fileStream.on('error', reject);
            }).on('error', reject);
        };

        makeRequest(url);
    });
}

async function downloadAll() {
    // Create directories
    [PRODUCTS_DIR, SIGNATURES_DIR].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });

    // Check/create other dirs
    const otherBasePath = path.join(__dirname, '..', 'public', 'images');
    ['logos', 'banks'].forEach(sub => {
        const subDir = path.join(otherBasePath, sub);
        if (!fs.existsSync(subDir)) {
            fs.mkdirSync(subDir, { recursive: true });
        }
    });

    console.log('📦 Downloading product images...');
    let count = 0;
    const total = Object.keys(PRODUCT_IMAGES).length + Object.keys(SIGNATURE_IMAGES).length + Object.keys(OTHER_IMAGES).length;

    for (const [name, url] of Object.entries(PRODUCT_IMAGES)) {
        const dest = path.join(PRODUCTS_DIR, `${name}.png`);
        if (fs.existsSync(dest)) {
            console.log(`  ⏭️  ${name}.png already exists, skipping`);
            count++;
            continue;
        }
        try {
            await downloadFile(url, dest);
            count++;
            console.log(`  ✅ [${count}/${total}] ${name}.png`);
        } catch (err) {
            console.log(`  ❌ [${count}/${total}] ${name}.png - ${err.message}`);
            count++;
        }
    }

    console.log('\n📝 Downloading signature images...');
    for (const [name, url] of Object.entries(SIGNATURE_IMAGES)) {
        const dest = path.join(SIGNATURES_DIR, `${name}.png`);
        if (fs.existsSync(dest)) {
            console.log(`  ⏭️  ${name}.png already exists, skipping`);
            count++;
            continue;
        }
        try {
            await downloadFile(url, dest);
            count++;
            console.log(`  ✅ [${count}/${total}] ${name}.png`);
        } catch (err) {
            console.log(`  ❌ [${count}/${total}] ${name}.png - ${err.message}`);
            count++;
        }
    }

    console.log('\n🏦 Downloading other images (logos, bank QR)...');
    for (const [name, url] of Object.entries(OTHER_IMAGES)) {
        const dest = path.join(otherBasePath, `${name}.png`);
        if (fs.existsSync(dest)) {
            console.log(`  ⏭️  ${name}.png already exists, skipping`);
            count++;
            continue;
        }
        try {
            await downloadFile(url, dest);
            count++;
            console.log(`  ✅ [${count}/${total}] ${name}.png`);
        } catch (err) {
            console.log(`  ❌ [${count}/${total}] ${name}.png - ${err.message}`);
            count++;
        }
    }

    console.log(`\n🎉 Done! Downloaded ${count} images total.`);
    
    // Print the product name mapping for reference
    console.log('\n📋 Thai name → file mapping:');
    const THAI_NAMES = {
        'ยาดมสมุนไพร': 'yadom-samunprai',
        'ยาดมสมุนไพร จัมโบ้': 'yadom-samunprai-jumbo',
        'ยาหม่อง': 'ya-mong',
        'ยาน้ำมัน ขนาด 10 มล.': 'ya-namman-10ml',
        'ยาน้ำมัน ขนาด 5 มล.': 'ya-namman-10ml',
        'ยาน้ำมันสมุนไพร สูตรเย็น': 'ya-namman-sutra-yen',
        'ยาน้ำมันสมุนไพร สูตรร้อน': 'ya-namman-sutra-ron',
        'ยาสเปรย์ผสมกระดูกไก่ดำ': 'ya-spray-kraduk-kai-dam',
        'แคปซูลขมิ้นชัน': 'capsule-kamin-chan',
        'แคปซูลฟ้าทะลายโจร': 'capsule-fa-talai-jorn',
        'แคปซูลขิง': 'capsule-khing',
        'แคปซูลมะขามแขก': 'capsule-makham-khaek',
        'แคปซูลรางจืด': 'capsule-rang-juet',
        'แคปซูลมะระขี้นก': 'capsule-mara-khi-nok',
        'แคปซูลตรีผลา': 'capsule-tri-phala',
        'แคปซูลเพชรสังฆาต': 'capsule-phet-sang-khat',
        'แคปซูลประสะเจตพังคี': 'capsule-prasa-jet-phang-khi',
        'แคปซูลสหัศธารา': 'capsule-sahat-thara',
        'แคปซูลประสะมะแว้ง': 'capsule-prasa-mawaeng',
        'แคปซูลปราบชมพูทวีป': 'capsule-prap-chomphu-thawip',
        'ลูกประคบ': 'luk-prakop',
        'ชาอัสสัม กล่อง': 'cha-assam-box',
        'ชาอัสสัม ซอง': 'cha-assam-sachet',
        'ชากัญชาโสมขาว': 'cha-cannabis-ginseng',
        'ชากัญชา': 'cha-cannabis',
        'น้ำผึ้ง': 'namphung',
        'เทียนหอม Aromatic กลิ่น Rose': 'candle-rose',
        'เทียนหอม Aromatic กลิ่น Morning': 'candle-morning',
        'เทียนหอม Aromatic กลิ่น Thai': 'candle-thai',
        'น้ำมันหอมระเหย กลิ่น Rose': 'essential-oil-rose',
        'น้ำมันหอมระเหย กลิ่น Morning': 'essential-oil-morning',
        'น้ำมันหอมระเหย กลิ่น Thai': 'essential-oil-thai',
    };
    for (const [thai, en] of Object.entries(THAI_NAMES)) {
        console.log(`  ${thai} → /images/products/${en}.png`);
    }
}

downloadAll().catch(console.error);
