</script>
    <script type="text/javascript" src="https://earthchie.github.io/jquery.Thailand.js/jquery.Thailand.js/dependencies/JQL.min.js"></script>
    <script type="text/javascript" src="https://earthchie.github.io/jquery.Thailand.js/jquery.Thailand.js/dependencies/typeahead.bundle.js"></script>
    <link rel="stylesheet" href="https://earthchie.github.io/jquery.Thailand.js/jquery.Thailand.js/dist/jquery.Thailand.min.css">
    <script type="text/javascript" src="https://earthchie.github.io/jquery.Thailand.js/jquery.Thailand.js/dist/jquery.Thailand.min.js"></script>

    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Sarabun', sans-serif;
            background: linear-gradient(135deg, #f37335 0%, #fdc830 100%);
            min-height: 100vh;
            padding: 15px;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            padding: 30px;
            width: 100%;
            max-width: 700px;
            animation: slideUp 0.5s ease-out;
        }

        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }

            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .header {
            text-align: center;
            margin-bottom: 30px;
        }

        .header h1 {
            color: #d35400;
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
        }

        .header p {
            color: #666;
            font-size: 16px;
        }

        .back-btn {
            background: #e0e0e0;
            color: #333;
            padding: 12px 25px;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 500;
            font-family: 'Sarabun', sans-serif;
            cursor: pointer;
            margin-bottom: 20px;
            transition: all 0.3s ease;
        }

        .back-btn:hover {
            background: #ccc;
        }

        /* Form Styles */
        .form-group {
            margin-bottom: 18px;
        }

        .form-group label {
            display: block;
            color: #333;
            font-weight: 600;
            margin-bottom: 8px;
            font-size: 16px;
        }

        .form-group label .required {
            color: #e74c3c;
            margin-left: 3px;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
            width: 100%;
            padding: 14px 16px;
            border: 2px solid #e0e0e0;
            border-radius: 12px;
            font-size: 16px;
            font-family: 'Sarabun', sans-serif;
            transition: all 0.3s ease;
            background: #fafafa;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: #f37335;
            background: white;
            box-shadow: 0 0 0 4px rgba(243, 115, 53, 0.1);
        }

        .form-group select {
            cursor: pointer;
            appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 12 12'%3E%3Cpath fill='%23333' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 16px center;
            background-color: #fafafa;
        }

        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }

        /* Custom Dropdown Styles */
        .custom-dropdown {
            position: relative;
            width: 100%;
        }

        .custom-dropdown-input {
            width: 100%;
            padding: 14px 16px;
            border: 2px solid #e0e0e0;
            border-radius: 12px;
            font-size: 16px;
            font-family: 'Sarabun', sans-serif;
            background: #fafafa;
            transition: all 0.3s ease;
            cursor: pointer;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 12 12'%3E%3Cpath fill='%23333' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 16px center;
        }

        .custom-dropdown-input:focus {
            outline: none;
            border-color: #f37335;
            background: white;
            box-shadow: 0 0 0 4px rgba(243, 115, 53, 0.1);
        }

        .custom-dropdown-list {
            display: none;
            position: absolute;
            top: 100%;
            left: 0;
            width: 100%;
            max-height: 250px;
            overflow-y: auto;
            background: white;
            border: 2px solid #f37335;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            z-index: 1000;
            margin-top: 5px;
        }

        .custom-dropdown-list.show {
            display: block;
        }

        .custom-dropdown-item {
            padding: 12px 16px;
            cursor: pointer;
            font-size: 16px;
            border-bottom: 1px solid #f0f0f0;
            transition: background 0.2s;
        }

        .custom-dropdown-item:last-child {
            border-bottom: none;
        }

        .custom-dropdown-item:hover {
            background-color: #fff3e0;
            color: #d35400;
        }

        /* Form Styles */
        .products-container {
            margin-bottom: 20px;
        }

        .product-item {
            background: #f8f9fa;
            border: 2px solid #e0e0e0;
            border-radius: 12px;
            padding: 15px;
            margin-bottom: 12px;
            transition: all 0.3s ease;
        }

        .product-item:hover {
            border-color: #f37335;
            box-shadow: 0 2px 8px rgba(243, 115, 53, 0.1);
        }

        .product-row {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            flex-wrap: wrap;
        }

        .product-input {
            flex: 1;
            min-width: 200px;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
        }

        .product-pic {
            flex: 0 0 120px;
        }

        .row-amount {
            flex: 1;
            min-width: 100px;
            text-align: right;
            font-weight: bold;
            color: #d35400;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            font-size: 16px;
            min-height: 56px;
        }

        .qty-group {
            display: flex;
            align-items: center;
            gap: 4px;
            background: white;
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            padding: 4px 8px 4px 4px;
            flex: 1.2;
            min-width: 160px;
        }

        .price-group {
            display: flex;
            align-items: center;
            gap: 8px;
            background: white;
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            padding: 4px 12px 4px 4px;
            flex: 1;
            min-width: 140px;
        }

        .product-qty,
        .product-price {
            flex: 1;
            min-width: 50px;
            width: 100%;
            padding: 10px 8px;
            border: none !important;
            border-radius: 8px;
            font-size: 16px;
            font-family: 'Sarabun', sans-serif;
            text-align: right;
            background: transparent !important;
        }

        .product-qty:focus,
        .product-price:focus {
            outline: none;
            box-shadow: none !important;
        }

        /* Remove spinner arrows from number inputs to save space */
        .product-qty::-webkit-inner-spin-button,
        .product-qty::-webkit-outer-spin-button,
        .product-price::-webkit-inner-spin-button,
        .product-price::-webkit-outer-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }

        .product-qty,
        .product-price {
            -moz-appearance: textfield;
        }

        .qty-label {
            color: #666;
            font-size: 14px;
            white-space: nowrap;
        }

        .remove-product-btn {
            width: 36px;
            height: 36px;
            border: none;
            background: #ff6b6b;
            color: white;
            border-radius: 50%;
            font-size: 20px;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            margin-top: 10px;
        }

        .remove-product-btn:hover {
            background: #ee5a5a;
            transform: scale(1.1);
        }

        .add-product-btn {
            width: 100%;
            padding: 12px;
            background: transparent;
            color: #f37335;
            border: 2px dashed #f37335;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 600;
            font-family: 'Sarabun', sans-serif;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            margin-bottom: 20px;
        }

        .add-product-btn:hover {
            background: rgba(243, 115, 53, 0.1);
        }

        @media (max-width: 600px) {
            .product-row {
                flex-direction: column;
                align-items: stretch;
            }

            .remove-product-btn {
                align-self: flex-end;
            }
        }

        /* Payment Summary */
        .payment-summary {
            background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
            border-radius: 15px;
            padding: 20px;
            margin: 20px 0;
        }

        .payment-summary h3 {
            color: #e65100;
            margin-bottom: 15px;
            font-size: 18px;
        }

        .payment-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px dashed #ffb74d;
        }

        .payment-row:last-child {
            border-bottom: none;
            font-weight: 700;
            font-size: 20px;
            color: #d35400;
            margin-top: 5px;
        }

        .payment-row .label {
            color: #e65100;
        }

        .payment-row .value {
            font-weight: 600;
        }

        .submit-btn {
            width: 100%;
            padding: 16px;
            background: linear-gradient(135deg, #f37335 0%, #fdc830 100%);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 20px;
            font-weight: 600;
            font-family: 'Sarabun', sans-serif;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-top: 10px;
        }

        .submit-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(243, 115, 53, 0.4);
        }

        .submit-btn:disabled {
            opacity: 0.7;
            cursor: not-allowed;
            transform: none;
        }

        .loading {
            display: none;
            text-align: center;
            padding: 25px;
        }

        .loading.show {
            display: block;
        }

        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #f37335;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
            margin: 0 auto 15px;
        }

        @keyframes spin {
            0% {
                transform: rotate(0deg);
            }

            100% {
                transform: rotate(360deg);
            }
        }

        .message {
            padding: 18px 22px;
            border-radius: 12px;
            margin-top: 20px;
            text-align: center;
            font-weight: 500;
            font-size: 16px;
            display: none;
        }

        .message.success {
            display: block;
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }

        .message.error {
            display: block;
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }

        /* Page Loading Overlay */
        .page-loading-overlay {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(243, 115, 53, 0.95);
            z-index: 9999;
            justify-content: center;
            align-items: center;
            flex-direction: column;
        }

        .page-loading-overlay.show {
            display: flex;
        }

        .page-loading-overlay .spinner {
            border: 5px solid rgba(255, 255, 255, 0.3);
            border-top: 5px solid white;
            border-radius: 50%;
            width: 60px;
            height: 60px;
            animation: spin 1s linear infinite;
            margin-bottom: 20px;
        }

        .page-loading-overlay p {
            color: white;
            font-size: 18px;
            font-weight: 500;
        }

        /* Print Styles */
        @media print {
            * {
                box-sizing: border-box;
            }

            @page {
                size: A4;
                margin: 5mm;
            }

            body {
                background: white !important;
                background-color: white !important;
                background-image: none !important;
                padding: 0;
                margin: 0;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                display: block !important;
            }

            .container,
            #pageLoadingOverlay {
                display: none !important;
            }

            #printContainer,
            #printContainerReceipt,
            #printContainerReceiptCopy,
            #printContainerFullTaxInvoice,
            #printContainerFdaQuotation {
                display: none;
                width: 100%;
                font-family: 'Sarabun', sans-serif;
                color: black;
                font-size: 11pt;
                page-break-inside: avoid;
                page-break-after: avoid;
            }

            #printContainer.active-print,
            #printContainerReceipt.active-print,
            #printContainerReceiptCopy.active-print,
            #printContainerFullTaxInvoice.active-print,
            #printContainerFdaQuotation.active-print {
                display: block !important;
            }

            .print-table {
                width: 100%;
                border-collapse: collapse;
            }

            .print-header-table {
                margin-bottom: 0px;
                width: 100%;
                border-collapse: collapse;
                border: none;
            }

            .print-header-table td {
                border: none;
            }

            .print-info-table {
                width: 100%;
                border-collapse: collapse;
                border: 1px solid black;
                border-top: none;
                margin-bottom: 0;
                table-layout: fixed;
            }

            .print-info-table td {
                border-bottom: none;
                padding: 4px 8px;
                padding: 2px 4px;
                word-wrap: break-word;
                font-weight: 300;
                font-size: 10pt;
            }

            .print-products-table {
                width: 100%;
                border-collapse: collapse;
                border: 1px solid black;
                border-top: none;
                table-layout: fixed;
            }

            .print-products-table th {
                border: 1px solid black;
                text-align: center;
                padding: 4px 2px;
                font-size: 10pt;
            }

            .print-products-table td {
                border: 1px solid black;
                text-align: center;
                padding: 1px 2px;
                /* Reduced from 4px */
                font-size: 9pt;
                font-weight: 300;
                word-wrap: break-word;
            }

            .print-products-table .desc-col {
                text-align: left;
            }

            .print-products-table .amount-col {
                text-align: right;
                padding-right: 8px;
            }

            .print-footer-table {
                width: 100%;
                border-collapse: collapse;
                border: 1px solid black;
                border-top: none;
                table-layout: fixed;
            }

            .print-footer-table td {
                padding: 2px 4px;
                font-size: 10pt;
            }

            .print-signature-table {
                width: 100%;
                border-collapse: collapse;
                border: 1px solid black;
                border-top: none;
            }

            .print-info-table td {
                padding: 2px 8px !important;
                height: auto !important;
            }

            .bg-grey {
                background-color: #e0e0e0 !important;
            }
        }

        .is-fda-doc .qty-group,
        .is-fda-doc .price-group,
        .is-fda-doc .row-amount,
        .is-fda-doc [id^="promoContainer_"] {
            display: none !important;
        }

        @media screen {

            #printContainer,
            #printContainerReceipt,
            #printContainerReceiptCopy,
            #printContainerFullTaxInvoice,
            #printContainerFdaQuotation {
                display: none !important;
            }
        }
    </style>
</head>

<body>
    <!-- Page Loading Overlay -->
    <div class="page-loading-overlay" id="pageLoadingOverlay">
        <div class="spinner"></div>
        <p>กำลังกลับหน้าหลัก...</p>
    </div>

    <div class="container">
        <div style="margin-bottom: 20px;">
            <button class="back-btn" style="margin-bottom: 0;" onclick="goToHome()">← กลับหน้าหลัก</button>
        </div>
        <div class="header">
            <h1>🧾 ฟอร์มออกบิล</h1>
            <p>กรุณากรอกข้อมูลให้ครบถ้วนเพื่อออกบิลใหม่</p>
        </div>

        <form id="billForm">
            <div class="form-row"
                style="background-color: #fce4ec; padding: 15px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #f8bbd0;">
                <div class="form-group" style="flex: 1; margin-bottom: 0;">
                    <label>ประเภทเอกสาร <span class="required">*</span></label>
                    <select id="docType" required>
                        <option value="quotation_thc">ใบเสนอราคา (Quotation) - THC</option>
                        <option value="billing_thc">ใบวางบิล (Billing Note) - THC</option>
                        <option value="invoice_thc">ใบวางบิล/ใบแจ้งหนี้ (Billing/Invoice) - THC</option>
                        <option value="tax_invoice_thc">ใบแจ้งหนี้/ใบส่งสินค้า (Invoice/Delivery Order) - THC</option>
                        <option value="receipt_thc">ใบเสร็จรับเงิน (Receipt) - THC</option>
                        <option value="quotation_psf">ใบเสนอราคา (Quotation) - PSF</option>
                        <option value="quotation_fda_psf">ใบเสนอราคา อย. (FDA Quotation) - PSF</option>
                        <option value="billing_psf">ใบวางบิล (Billing Note) - PSF</option>
                        <option value="invoice_psf">ใบวางบิล/ใบแจ้งหนี้ (Billing/Invoice) - PSF</option>
                        <option value="tax_invoice_psf">ใบแจ้งหนี้/ใบส่งสินค้า (Invoice/Delivery Order) - PSF</option>
                        <option value="receipt_psf">ใบเสร็จรับเงิน (Receipt) - PSF</option>
                        <option value="quotation_elt">ใบเสนอราคา (Quotation) - ELT</option>
                        <option value="billing_elt">ใบวางบิล (Billing Note) - ELT</option>
                        <option value="invoice_elt">ใบวางบิล/ใบแจ้งหนี้ (Billing/Invoice) - ELT</option>
                        <option value="tax_invoice_elt">ใบแจ้งหนี้/ใบส่งสินค้า (Invoice/Delivery Order) - ELT</option>
                        <option value="receipt_elt">ใบเสร็จรับเงิน (Receipt) - ELT</option>
                    </select>
                </div>
                <div class="form-group" style="flex: 1; margin-bottom: 0;">
                    <label>บัญชีธนาคาร (บริษัทรับเงิน) <span class="required">*</span></label>
                    <select id="billStatus" required>
                        <option value="ktb">ธนาคารกรุงไทย (016-074423-7)</option>
                        <option value="scb">ธนาคารไทยพาณิชย์ (3652680393)</option>
                    </select>
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label>เลขที่ / No. <span class="required">*</span></label>
                    <input type="text" id="billNo" placeholder="เช่น QU-2026-001" required>
                </div>
                <div class="form-group">
                    <label>วันที่ / Date <span class="required">*</span></label>
                    <input type="date" id="billDate" required>
                </div>
            </div>



            <div class="form-group">
                <label>ชื่อลูกค้า / บริษัท <span class="required">*</span></label>
                <input type="text" id="customerName" placeholder="กรอกชื่อลูกค้าหรือบริษัท" required>
            </div>

            <div class="form-group">
                <label>ที่อยู่ <span class="required">*</span></label>
                <div class="form-row" style="margin-bottom: 15px; grid-template-columns: 1fr 1fr 1fr;">
                    <div class="form-group" style="margin-bottom: 0;">
                        <input type="text" id="addr_no" placeholder="บ้านเลขที่, อาคาร, หมู่" oninput="updateMainAddress()" required>
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                        <input type="text" id="addr_soi" placeholder="ซอย (ถ้ามี)" oninput="updateMainAddress()">
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                        <input type="text" id="addr_road" placeholder="ถนน (ถ้ามี)" oninput="updateMainAddress()">
                    </div>
                </div>
                <div class="form-row" style="margin-bottom: 15px;">
                    <div class="form-group" style="margin-bottom: 0;">
                        <input type="text" id="addr_subdistrict" placeholder="ตำบล/แขวง" oninput="updateMainAddress()" required>
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                        <input type="text" id="addr_district" placeholder="อำเภอ/เขต" oninput="updateMainAddress()" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group" style="margin-bottom: 0;">
                        <input type="text" id="addr_province" placeholder="จังหวัด" oninput="updateMainAddress()" required>
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                        <input type="text" id="addr_zip" placeholder="รหัสไปรษณีย์" oninput="updateMainAddress()" required>
                    </div>
                </div>
                <!-- Hidden textarea to maintain compatibility with existing logic -->
                <textarea id="address" style="display: none;" required></textarea>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label>เบอร์โทร <span class="required">*</span></label>
                    <input type="tel" id="phone" placeholder="กรอกเบอร์โทร" required>
                </div>
                <div class="form-group">
                    <label>เลขประจำตัวผู้เสียภาษี <span class="required">*</span></label>
                    <input type="text" id="taxId" placeholder="เลข 13 หลัก (ถ้ามี)" required>
                </div>
            </div>

            <!-- Receipt Extra Fields -->
            <div id="receiptExtraFields"
                style="display: none; background-color: #e8f5e9; padding: 15px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #c8e6c9;">
                <h4 id="receiptExtraFieldsTitle"
                    style="color: #2e7d32; margin-bottom: 15px; border-bottom: 1px solid #c8e6c9; padding-bottom: 5px;">
                    ข้อมูลทางการเงินเฉพาะใบเสร็จรับเงิน</h4>

                <div class="form-row">
                    <div class="form-group" id="deliverToGroup">
                        <label>สถานที่ส่ง (Deliver To)</label>
                        <input type="text" id="deliverTo" placeholder="ถ้ามี">
                    </div>
                    <div class="form-group" id="customerOrderGroup" style="display: none;">
                        <label>เลขที่ลูกค้าสั่งซื้อ (Customer Order)</label>
                        <input type="text" id="customerOrder" placeholder="ถ้ามี">
                    </div>
                    <div class="form-group">
                        <label>ติดต่อ (Contact)</label>
                        <input type="text" id="contactPerson" placeholder="ถ้ามี">
                    </div>
                </div>

                <div class="form-row" id="emailExtraRow" style="display: none;">
                    <div class="form-group">
                        <label>อีเมลลูกค้า (Customer Email)</label>
                        <input type="email" id="customerEmail" placeholder="ถ้ามี">
                    </div>
                    <div class="form-group">
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>เลขที่ใบสั่งซื้อ (Purchase No.)</label>
                        <input type="text" id="purchaseNo" placeholder="ถ้ามี">
                    </div>
                    <div class="form-group">
                        <label>พนักงานขาย (Salesperson)</label>
                        <input type="text" id="salesperson" placeholder="ถ้ามี">
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>เงื่อนไขการชำระเงิน</label>
                        <select id="termOfPayment">
                            <option value="">- เลือก -</option>
                            <option value="เงินสด">เงินสด (Cash)</option>
                            <option value="7 วัน">เครดิต 7 วัน</option>
                            <option value="15 วัน">เครดิต 15 วัน</option>
                            <option value="30 วัน" selected>เครดิต 30 วัน</option>
                            <option value="45 วัน">เครดิต 45 วัน</option>
                            <option value="60 วัน">เครดิต 60 วัน</option>
                            <option value="90 วัน">เครดิต 90 วัน</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>วันครบกำหนดชำระ</label>
                        <input type="date" id="dueDate">
                    </div>
                </div>

                <div class="form-group" style="margin-bottom: 10px;" id="paymentMethodGroup">
                    <label>ช่องทางที่ลูกค้าชำระเงินเข้ามา</label>
                    <select id="paymentMethod">
                        <option value="cash">เงินสด (Cash)</option>
                        <option value="transfer">โอนเงิน (Bank Transfer)</option>
                        <option value="cheque">เช็ค (Cheque)</option>
                    </select>
                </div>

                <div class="form-row" id="paymentDetailsRow" style="align-items: flex-end; gap: 15px;">
                    <div class="form-group" style="flex: 1;">
                        <label>ธนาคารลูกค้า (Bank)</label>
                        <input type="text" id="customerBank" placeholder="ระบุธนาคาร">
                    </div>
                    <div class="form-group" style="flex: 1;">
                        <label>สาขา (Branch)</label>
                        <input type="text" id="customerBranch" placeholder="สาขา">
                    </div>
                    <div class="form-group" style="flex: 1;">
                        <label>เลขที่เช็ค (Cheque No.)</label>
                        <input type="text" id="chequeNo" placeholder="เลขเช็ค (ถ้ามี)">
                    </div>
                    <div class="form-group" style="flex: 1;">
                        <label>วันที่สั่งจ่ายเช็ค</label>
                        <input type="date" id="chequeDate">
                    </div>
                </div>
            </div>

            <!-- FDA Quotation Extra Fields -->
            <div id="fdaExtraFields"
                style="display: none; background-color: #e8f5e9; padding: 15px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #c8e6c9;">
                <h4 style="color: #2e7d32; margin-bottom: 15px; border-bottom: 1px solid #c8e6c9; padding-bottom: 5px;">
                    ข้อมูลเฉพาะใบเสนอราคา อย. (FDA)</h4>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>รหัสลูกค้า (Customer Code)</label>
                        <input type="text" id="fdaCustomerCode" placeholder="ถ้ามี">
                    </div>
                    <div class="form-group">
                        <label>อีเมลลูกค้า (E-mail)</label>
                        <input type="email" id="fdaEmail" placeholder="ถ้ามี">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>โครงการ (Project)</label>
                        <input type="text" id="fdaProjectName" value="ขึ้นทะเบียนตำรับยา (G)" placeholder="ชื่อโครงการ">
                    </div>
                    <div class="form-group">
                        <label>กำหนดชำระเครดิต (Credit Terms)</label>
                        <input type="text" id="fdaCreditTerms" value="ชำระเต็มจำนวน" placeholder="เช่น ชำระเต็มจำนวน">
                    </div>
                </div>

                <div class="form-group" style="margin-top: 10px;">
                    <label style="font-weight: bold;">ประเภทบริการ (เลือกได้มากกว่า 1)</label>
                    <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 8px;">
                        <div style="display: flex; align-items: center; gap: 10px; background: #fff; padding: 10px; border-radius: 8px; border: 1px solid #c8e6c9;">
                            <input type="checkbox" id="fdaServiceRegister" checked onchange="handleFdaServiceChange()" style="width: 18px; height: 18px; cursor: pointer;">
                            <span style="flex: 1;">ค่าดำเนินการขึ้นทะเบียนผลิตภัณฑ์</span>
                            <input type="number" id="fdaServiceRegisterPrice" value="30000" min="0" style="width: 100px; text-align: right; padding: 6px; border: 1px solid #ccc; border-radius: 5px;" oninput="calculateTotal()">
                            <span>บาท</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px; background: #fff; padding: 10px; border-radius: 8px; border: 1px solid #c8e6c9;">
                            <input type="checkbox" id="fdaServiceTrademark" onchange="handleFdaServiceChange()" style="width: 18px; height: 18px; cursor: pointer;">
                            <span style="flex: 1;">ค่าดำเนินการยื่นจดเครื่องหมายการค้า</span>
                            <input type="number" id="fdaServiceTrademarkPrice" value="5000" min="0" style="width: 100px; text-align: right; padding: 6px; border: 1px solid #ccc; border-radius: 5px;" oninput="calculateTotal()">
                            <span>บาท</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Products Section -->
            <div class="form-group" style="margin-top: 10px;">
                <label id="productsSectionLabel">รายการสินค้า <span class="required">*</span></label>
            </div>

            <!-- Product Suggestions Array (Replaces Datalist) -->
            <script>
                const PRODUCT_LIST = [
                    "ยาดมสมุนไพร", "ยาดมสมุนไพร จัมโบ้", "ยาหม่อง", "ยาน้ำมัน ขนาด 10 มล.", "ยาน้ำมัน ขนาด 5 มล.",
                    "ยาน้ำมันสมุนไพร สูตรเย็น", "ยาน้ำมันสมุนไพร สูตรร้อน", "ยาสเปรย์ผสมกระดูกไก่ดำ", "แคปซูลขมิ้นชัน",
                    "แคปซูลฟ้าทะลายโจร", "แคปซูลขิง", "แคปซูลมะขามแขก", "แคปซูลรางจืด", "แคปซูลมะระขี้นก",
                    "แคปซูลตรีผลา", "แคปซูลเพชรสังฆาต", "แคปซูลประสะเจตพังคี", "แคปซูลสหัศธารา", "แคปซูลประสะมะแว้ง",
                    "แคปซูลปราบชมพูทวีป", "ลูกประคบ", "ชาอัสสัม กล่อง", "ชาอัสสัม ซอง", "ชากัญชาโสมขาว", "ชากัญชา",
                    "น้ำผึ้ง เล็ก", "น้ำผึ้ง ใหญ่", "เทียนหอม Aromatic กลิ่น Rose", "เทียนหอม Aromatic กลิ่น Morning",
                    "เทียนหอม Aromatic กลิ่น Thai", "น้ำมันหอมระเหย กลิ่น Rose", "น้ำมันหอมระเหย กลิ่น Morning",
                    "น้ำมันหอมระเหย กลิ่น Thai"
                ];

                const PRODUCT_PRICES = {
                    "ยาดมสมุนไพร": 79,
                    "ยาดมสมุนไพร จัมโบ้": 490,
                    "ยาหม่อง": 59,
                    "ยาน้ำมัน ขนาด 10 มล.": 129,
                    "ยาน้ำมัน ขนาด 5 มล.": 69,
                    "ยาน้ำมันสมุนไพร สูตรเย็น": 199,
                    "ยาน้ำมันสมุนไพร สูตรร้อน": 199,
                    "ยาสเปรย์ผสมกระดูกไก่ดำ": 199,
                    "แคปซูลขมิ้นชัน": 129,
                    "แคปซูลฟ้าทะลายโจร": 159,
                    "แคปซูลขิง": 129,
                    "แคปซูลมะขามแขก": 129,
                    "แคปซูลรางจืด": 129,
                    "แคปซูลมะระขี้นก": 129,
                    "แคปซูลตรีผลา": 129,
                    "แคปซูลเพชรสังฆาต": 129,
                    "แคปซูลประสะเจตพังคี": 129,
                    "แคปซูลสหัศธารา": 129,
                    "แคปซูลประสะมะแว้ง": 129,
                    "แคปซูลปราบชมพูทวีป": 129,
                    "ลูกประคบ": 159,
                    "ชาอัสสัม ซอง": 95,
                    "ชากัญชาโสมขาว": 95,
                    "ชากัญชา": 95,
                    "เทียนหอม Aromatic กลิ่น Rose": 290,
                    "เทียนหอม Aromatic กลิ่น Morning": 290,
                    "เทียนหอม Aromatic กลิ่น Thai": 290,
                    "น้ำมันหอมระเหย กลิ่น Rose": 490,
                    "น้ำมันหอมระเหย กลิ่น Morning": 490,
                    "น้ำมันหอมระเหย กลิ่น Thai": 490
                };

                const PRODUCT_IMAGES = {
                    'ยาดมสมุนไพร': 'https://lh3.googleusercontent.com/d/1L4eDRr-T2tzYldYMLy1yiiY5cS_dpv1g',
                    'ยาดมสมุนไพร จัมโบ้': 'https://lh3.googleusercontent.com/d/1VTE7WnI7Khg6kaSFPcgXBRboTTKjT_Nj',
                    'ยาหม่อง': 'https://lh3.googleusercontent.com/d/1bETh16T7sIhUBwKpNsKq1iPP7FXz3ea2',
                    'ยาน้ำมัน ขนาด 10 มล.': 'https://lh3.googleusercontent.com/d/1es32ZYzwH6km7MQHRwQY1rqxw0R4PPeV',
                    'ยาน้ำมัน ขนาด 5 มล.': 'https://lh3.googleusercontent.com/d/1es32ZYzwH6km7MQHRwQY1rqxw0R4PPeV',
                    'ยาน้ำมันสมุนไพร สูตรเย็น': 'https://lh3.googleusercontent.com/d/1T_X6Yp3Mt01kARl2RaAKyrgck4kCVWsO',
                    'ยาน้ำมันสมุนไพร สูตรร้อน': 'https://lh3.googleusercontent.com/d/1PIiNOAqC8MI3C-2F5OjNFu1rGuyEiJDO',
                    'ยาสเปรย์ผสมกระดูกไก่ดำ': 'https://lh3.googleusercontent.com/d/1UWui-uj4zTdBUQ82-drLhw2e5JM40jrJ',
                    'แคปซูลขมิ้นชัน': 'https://lh3.googleusercontent.com/d/1zoqAYUgZjfIyE11mNNbaV_1B5xTZGfir',
                    'แคปซูลฟ้าทะลายโจร': 'https://lh3.googleusercontent.com/d/19yy_4o7UersECH2Ccp3ggbY-bmiHNXXI',
                    'แคปซูลขิง': 'https://lh3.googleusercontent.com/d/1Yob2ixLyTYQ7qLo7VyDb4ioI0EJ_MvGv',
                    'แคปซูลมะขามแขก': 'https://lh3.googleusercontent.com/d/1SagCoYqVCNNr7LEQDNyksBYCQ2bFiaAg',
                    'แคปซูลรางจืด': 'https://lh3.googleusercontent.com/d/1EB9jTZjw9GKk_tVhCg5fpNjTbfWH7dfG',
                    'แคปซูลมะระขี้นก': 'https://lh3.googleusercontent.com/d/1Z_Aoq0aqqONBpBYlecqGHv_Br0mk97nJ',
                    'แคปซูลตรีผลา': 'https://lh3.googleusercontent.com/d/1CzHDRbZQ-6h4In0cht9_4nIVCOS3QrPh',
                    'แคปซูลเพชรสังฆาต': 'https://lh3.googleusercontent.com/d/1Yewpmd2WdjPsfoOkIJLbzkqH8mFBzted'
                };
            </script>

            <div class="products-container" id="productsContainer">
                <div class="product-item" id="productItem_1">
                    <div class="product-row">
                        <div class="form-group product-pic"
                            style="margin-bottom: 0; position: relative; display: flex; align-items: center; gap: 10px;">
                            <label for="productPic_1"
                                style="flex: 1; border: 1px dashed #4a90e2; border-radius: 8px; padding: 8px; text-align: center; cursor: pointer; background: #f0f8ff; transition: 0.3s; margin: 0; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 13px; color: #4a90e2; font-weight: bold;"
                                onmouseover="this.style.background='#e6f2ff'"
                                onmouseout="this.style.background='#f0f8ff'">
                                📷 อัพโหลดรูป
                            </label>
                            <input type="file" id="productPic_1" accept="image/*" class="product-pic-input"
                                onchange="handleImageSelect(event, 1)" style="display: none;">
                            <img id="productPicPreview_1" src=""
                                style="display: none; width: 40px; height: 40px; object-fit: cover; border-radius: 5px; border: 1px solid #ccc;">
                            <input type="hidden" id="productPicBase64_1" value="">
                        </div>
                        <div class="form-group product-input"
                            style="margin-bottom: 0; display: flex; flex-direction: column;">
                            <div class="custom-dropdown" id="dropdownContainer_1">
                                <input type="text" id="productName_1" class="custom-dropdown-input"
                                    placeholder="คลิกหรือพิมพ์เพื่อเลือกสินค้า" required
                                    oninput="filterDropdown(1); checkPromo(1)" onclick="toggleDropdown(1)"
                                    autocomplete="off">
                                <div class="custom-dropdown-list" id="dropdownList_1"></div>
                            </div>
                            <!-- Added fixed height or absolute positioning to promoContainer if needed, but flex-direction: column on parent should fix it -->
                            <div id="promoContainer_1" style="display: none; margin-top: 8px;">
                                <label
                                    style="display: flex; align-items: center; gap: 8px; font-size: 14px; color: #d35400; cursor: pointer;">
                                    <input type="checkbox" id="promoCheckbox_1" onchange="togglePromo(1)"
                                        style="width: 16px; height: 16px; cursor: pointer; padding: 0;">
                                    จัดโปรโมชั่น 1000 บาท
                                    <select id="promoMultiplier_1" onchange="togglePromo(1); calculateRowAndTotal(1)"
                                        style="display: none; padding: 2px 5px; border-radius: 4px; border: 1px solid #ffb74d;">
                                        <option value="1">1 โปร</option>
                                        <option value="2">2 โปร</option>
                                        <option value="3">3 โปร</option>
                                        <option value="4">4 โปร</option>
                                        <option value="5">5 โปร</option>
                                        <option value="6">6 โปร</option>
                                        <option value="7">7 โปร</option>
                                        <option value="8">8 โปร</option>
                                        <option value="9">9 โปร</option>
                                        <option value="10">10 โปร</option>
                                    </select>
                                </label>
                            </div>
                        </div>

                        <!-- Line break to force next elements to new row -->
                        <div style="flex-basis: 100%; height: 0; margin: 0;"></div>

                        <div class="qty-group">
                            <input type="number" class="product-qty" id="qty_1" placeholder="0" min="1" required
                                oninput="calculateRowAndTotal(1)">
                            <select id="unit_1" class="qty-label"
                                style="border: none; background: transparent; cursor: pointer; appearance: auto; -webkit-appearance: auto; padding: 0 5px; outline: none; font-size: inherit; font-family: inherit; color: inherit;">
                                <option value="ชิ้น">ชิ้น</option>
                                <option value="กิโลกรัม">กิโลกรัม</option>
                                <option value="กรัม">กรัม</option>
                                <option value="กระปุก">กระปุก</option>
                                <option value="ขวด">ขวด</option>
                                <option value="ถุง">ถุง</option>
                                <option value="kg.">kg.</option>
                                <option value="ชุด">ชุด</option>
                                <option value="ลิตร">ลิตร</option>
                            </select>
                        </div>
                        <div class="price-group">
                            <input type="number" class="product-price" id="price_1" placeholder="0.00" min="0"
                                step="0.01" required oninput="calculateRowAndTotal(1)">
                            <span class="qty-label">บาท</span>
                        </div>
                        <div class="row-amount">
                            <span id="rowAmount_1">0.00</span>&nbsp;บาท
                        </div>
                        <button type="button" class="remove-product-btn" onclick="removeProduct(1)"
                            title="ลบรายการนี้">×</button>
                    </div>
                </div>
            </div>

            <button type="button" class="add-product-btn" onclick="addProduct()">
                ➕ เพิ่มรายการ
            </button>


            <!-- Payment Summary -->
            <div class="payment-summary" id="paymentSummary">
                <h3>💰 สรุปยอดเงิน</h3>
                <div class="payment-row">
                    <span class="label">รวมราคา / Sub Total</span>
                    <span class="value" id="displaySubTotal">0.00 บาท</span>
                </div>
                <div class="payment-row" style="align-items: center; border-bottom: none; padding-bottom: 0;">
                    <span class="label" style="display:flex; align-items:center;">
                        ส่วนลด / Discount &nbsp;
                    </span>
                    <span class="value" style="display:flex; align-items:center;">
                        <select id="discountPercent"
                            style="width: 70px; text-align: right; border: 1px solid #ccc; border-radius: 5px; padding: 4px;"
                            onchange="calculateTotal()">
                            <option value="0">0</option>
                            <!-- Script will populate 1-100 -->
                        </select> <span style="margin: 0 10px 0 5px;">%</span>
                        <span id="discountValueDisplay" style="width: 80px; text-align: right; color: #d32f2f;">0.00
                            บาท</span>
                        <input type="hidden" id="discount" value="0">
                    </span>
                </div>

                <div
                    style="display: flex; justify-content: flex-end; padding-bottom: 10px; font-size: 14px; border-bottom: 1px dashed #ffb74d;">
                    <label style="cursor: pointer; display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" id="showDiscountInPrint"
                            style="width: 16px; height: 16px; cursor: pointer;" onchange="calculateTotal()">
                        พิมพ์ยอดส่วนลดลงในเอกสาร
                    </label>
                </div>

                <div class="payment-row">
                    <span class="label">คงเหลือ / Balance</span>
                    <span class="value" id="displayBalance">0.00 บาท</span>
                </div>
                <div class="payment-row" style="align-items: center; border-bottom: none; padding-bottom: 0;">
                    <span class="label" style="display:flex; align-items:center;">
                        ภาษีมูลค่าเพิ่ม (VAT) &nbsp;
                        <select id="vatType" style="padding: 4px; width: 80px; font-size: 14px; margin-left:10px;"
                            onchange="calculateTotal()">
                            <option value="0" selected>0%</option>
                            <option value="7">7%</option>
                        </select>
                    </span>
                    <span class="value" id="displayVat">0.00 บาท</span>
                </div>
                <div
                    style="display: flex; justify-content: flex-end; padding-bottom: 10px; font-size: 14px; border-bottom: 1px dashed #ffb74d;">
                    <label style="cursor: pointer; display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" id="showVatInPrint" style="width: 16px; height: 16px; cursor: pointer;"
                            onchange="calculateTotal()">
                        แสดงภาษีมูลค่าเพิ่มลงในเอกสาร
                    </label>
                </div>
                <div class="payment-row" style="align-items: center; border-bottom: none; padding-bottom: 0;">
                    <span class="label" style="display:flex; align-items:center;">
                        ค่าจัดส่ง / Shipping Cost &nbsp;
                    </span>
                    <span class="value" style="display:flex; align-items:center;">
                        <input type="number" id="shippingCost"
                            style="width: 80px; text-align: right; border: 1px solid #ccc; border-radius: 5px; padding: 4px;"
                            value="0" min="0" oninput="calculateTotal()">
                        <span style="margin-left: 5px;">บาท</span>
                    </span>
                </div>
                <div
                    style="display: flex; justify-content: flex-end; padding-bottom: 10px; font-size: 14px; border-bottom: 1px dashed #ffb74d;">
                    <label style="cursor: pointer; display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" id="showShippingInPrint"
                            style="width: 16px; height: 16px; cursor: pointer;" onchange="calculateTotal()">
                        แสดงค่าจัดส่งลงในเอกสาร
                    </label>
                </div>
                <div class="payment-row" style="align-items: center; border-bottom: none; padding-bottom: 0;">
                    <span class="label" style="display:flex; align-items:center;">
                        ค่าออกแบบ / Design Fee &nbsp;
                    </span>
                    <span class="value" style="display:flex; align-items:center;">
                        <input type="number" id="designFee"
                            style="width: 80px; text-align: right; border: 1px solid #ccc; border-radius: 5px; padding: 4px;"
                            value="500" min="0" oninput="calculateTotal()">
                        <span style="margin-left: 5px;">บาท</span>
                    </span>
                </div>
                <div
                    style="display: flex; justify-content: flex-end; padding-bottom: 10px; font-size: 14px; border-bottom: 1px dashed #ffb74d;">
                    <label style="cursor: pointer; display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" id="showDesignFeeInPrint"
                            style="width: 16px; height: 16px; cursor: pointer;" onchange="calculateTotal()">
                        แสดงค่าออกแบบลงในเอกสาร
                    </label>
                </div>
                <div class="payment-row" id="grandTotalRow"
                    style="border-bottom: none; font-weight: 700; font-size: 20px; color: #d35400; margin-top: 5px;">
                    <span class="label">ยอดเงินสุทธิ / Grand Total</span>
                    <span class="value" id="displayTotalAmount">0.00 บาท</span>
                </div>
                <div class="payment-row" id="summaryDepositRow"
                    style="display: none; border-top: 1px dashed #ffb74d; margin-top: 5px; padding-top: 10px; font-weight: 600; font-size: 16px; color: #333;">
                    <span class="label">ยอดชำระมัดจำ <span id="summaryDepositPercentInfo"></span></span>
                    <span class="value" id="displayDepositAmount" style="color: #e65100;">0.00 บาท</span>
                </div>
                <div class="payment-row" id="summaryRemainingRow"
                    style="display: none; font-weight: 600; font-size: 16px; color: #333; border-bottom: none;">
                    <span class="label">ยอดคงเหลือ</span>
                    <span class="value" id="displayRemainingAmount" style="color: #27ae60;">0.00 บาท</span>
                </div>
            </div>



            <div class="form-row" id="signerAndDepositRow">
                <div class="form-group" style="flex: 1;">
                    <label>ผู้เสนอราคา / ผู้วางบิล (ลายเซ็น)</label>
                    <select id="signerSelect">
                        <option value="">-- ไม่ระบุ (เว้นว่าง) --</option>
                        <option value="jutharat" selected>จุฑารัตน์ วงค์คำเหลา</option>
                    </select>
                </div>
                <!-- Deposit Selection -->
                <div class="form-group" style="flex: 1;">
                    <label style="display: flex; justify-content: space-between; align-items: center;">
                        <span>เงื่อนไขการหักมัดจำ</span>
                        <label
                            style="cursor: pointer; display: flex; align-items: center; gap: 5px; font-size: 13px; font-weight: normal; color: #666; margin: 0;">
                            <input type="checkbox" id="showDepositInPrint"
                                style="width: 14px; height: 14px; margin: 0; cursor: pointer;"
                                onchange="calculateTotal()">
                            แสดงในพิมพ์
                        </label>
                    </label>
                    <div style="display: flex; gap: 10px;">
                        <select id="depositCondition" onchange="handleDepositConditionChange()"
                            style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px;">
                            <option value="0">-- ไม่มีมัดจำ (ชำระเต็มจำนวน) --</option>
                            <option value="30">มัดจำ 30%</option>
                            <option value="40">มัดจำ 40%</option>
                            <option value="50">มัดจำ 50%</option>
                            <option value="custom">ระบุจำนวนเงินมัดจำเอง</option>
                        </select>
                        <input type="number" id="customDepositAmount" placeholder="ระบุจำนวนเงิน"
                            style="display: none; flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px;"
                            oninput="calculateTotal()" min="0">
                    </div>
                </div>
            </div>

            <div class="form-group">
                <label>หมายเหตุ (ข้อความนี้จะแสดงท้ายบิล สามารถแก้ไข/ลบข้อความได้เลย)</label>
                <div id="editableNotes" contenteditable="true"
                    style="border: 1px solid #ccc; border-radius: 5px; padding: 10px; min-height: 100px; background: #fff; font-size: 14px;">
                    <div style="font-weight:bold;">หมายเหตุ:
                        <br>
                        <span style="color:red; font-size: 11pt;">ชำระมัดจำ 50 % ณ วันที่สั่งซื้อ หรือสั่งผลิต
                            ชำระส่วนที่เหลือ
                            วันที่รับสินค้า</span>
                        <br>
                        <span style="color:red;">ห้ามวางจำหน่ายตามร้านค้าทั่วไป!</span>
                    </div>
                    <div style="color:red; margin-left: 20px;">- สินค้าไม่ผ่านกระบวนการทาง อย.</div>
                    <div style="color:red; margin-left: 20px;">- สินค้าสามารถขายได้เฉพาะงานมงคล งานบุญ งานขาวดำ</div>
                    <div style="color:red; margin-left: 30px;">ใช้เป็นของชำร่วย ,ของฝาก,ของขวัญ</div>
                    <div style="color:red; margin-left: 20px;">- สินค้าขายเฉพาะกลุ่ม</div>
                    <div style="color:red; margin-left: 30px;">(ราคารวมฉลากและรูปแบบโลโก้ชื่อแบรนด์)</div>
                    <div style="color:red; text-align: center; font-weight: bold;">**ราคานี้ยังไม่รวมค่าจัดส่ง**</div>
                </div>
                <!-- Hidden input to still support form submission to code.gs -->
                <input type="hidden" id="notes" value="">
            </div>

            <div style="display: flex; gap: 15px; margin-top: 15px;">
                <button class="print-btn" type="button" onclick="prepareAndPrint()"
                    style="background: #4a90e2; color: white; padding: 16px; border: none; border-radius: 12px; font-size: 20px; font-weight: 600; font-family: 'Sarabun', sans-serif; cursor: pointer; transition: all 0.3s ease; flex: 1;">
                    🖨️ พิมพ์บิล
                </button>
                <button type="submit" class="submit-btn" id="submitBtn" style="flex: 2; margin-top: 0;">
                    ✅ บันทึกบิล
                </button>
            </div>
        </form>

        <div class="loading" id="loading">
            <div class="spinner"></div>
            <p>กำลังบันทึกบิล...</p>
        </div>

        <div class="message" id="message"></div>
        <div id="successActions" style="display: none; text-align: center; margin-top: 15px;">
            <button type="button" onclick="prepareAndPrint()" class="print-btn"
                style="background: #4a90e2; color: white; padding: 12px 25px; border: none; border-radius: 10px; font-size: 16px; font-weight: 500; font-family: 'Sarabun', sans-serif; cursor: pointer; margin-right: 10px;">🖨️
                พิมพ์บิลนี้</button>
            <button type="button" onclick="resetFormForNewBill()"
                style="background: #e0e0e0; color: #333; padding: 12px 25px; border: none; border-radius: 10px; font-size: 16px; font-weight: 500; font-family: 'Sarabun', sans-serif; cursor: pointer;">➕
                ออกบิลใหม่</button>
        </div>
    </div>

    <!-- Print Container (Hidden on screen) -->
    <div id="printContainer">
        <table class="print-header-table"
            style="width: 100%; border-collapse: collapse; border: none; margin-bottom: 0;">
            <tr>
                <td style="width: 30%; text-align: center; vertical-align: middle; border: none; padding: 2px;">
                    <div style="font-weight: bold; text-align: center; line-height: 1.1;">
                        <div style="margin-bottom: 2px;">
                            <img id="printLogo"
                                src="https://lh3.googleusercontent.com/d/10lptwep_aBvzXnQUHFAyS8cou2nrYyKK"
                                style="max-width: 140px; max-height: 140px; object-fit: contain;" alt="Logo">
                        </div>
                    </div>
                </td>
                <td style="width: 75%; padding: 2px 8px; vertical-align: top;">
                    <table style="width: 100%; border: none; border-collapse: collapse;">
                        <tr>
                            <td colspan="2"
                                style="text-align: center; border: none; padding: 5px; position: relative; right: 60px;">
                                <div id="printCompanyNameTH"
                                    style="color: #27ae60; font-weight: bold; font-size: 16pt;">
                                    วิสาหกิจชุมชนไทยเฮิร์บเซ็นเตอร์ (สำนักงานใหญ่)</div>
                                <div id="printCompanyNameEN" style="font-size: 11pt; margin-top:3px;">Thai Herb
                                    Centers(THC)Community Enterprise
                                    (HEAD OFFICE)</div>
                                <div id="printAddress1" style="font-size: 11pt; margin-top:3px;">6/10 หมู่ที่ 2 ต.ไทรม้า
                                    อ.เมืองนนทบุรี
                                    จ.นนทบุรี 11000</div>
                                <div id="printAddress2" style="font-size: 10pt;">6/10 Moo 2 Sai Ma subdistrict,Mueang
                                    Nonthaburi
                                    District,Nonthabui Province,Thailand 11000</div>
                                <div id="printTaxInfo" style="font-size: 11pt; margin-top:3px;">โทร:083-9799389 /
                                    เลขประจำตัวผู้เสียภาษี
                                    099-200438186-0</div>
                            </td>
                        </tr>
                        <tr>
                            <td style="width: 50%; border: none;"></td>
                            <td style="width: 50%; text-align: right; border: none; vertical-align: bottom;">
                                <div id="printDocTitleTH" style="font-size: 16pt; font-weight: bold;">ใบเสนอราคา</div>
                                <div id="printDocTitleEN" style="font-size: 14pt; font-weight: bold;">Quotation</div>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>

        <!-- Customer Info -->
        <table class="print-info-table"
            style="width: 100%; border-collapse: collapse; border: 1px solid black; border-top: 1px solid black; margin-bottom: 0;">
            <tr>
                <td style="width: 25%; border-right: 1px solid black; padding: 5px 8px; vertical-align: top;">
                    <span style="font-weight:bold;">ชื่อลูกค้า :</span>
                </td>
                <td style="width: 35%; border-right: 1px solid black; padding: 5px 8px; vertical-align: top;">
                    <span id="printCustomerName" style="font-weight: normal;"></span>
                </td>
                <td style="width: 40%; padding: 5px 8px; vertical-align: top;">
                    <span style="font-weight:bold;">เลขที่/No.</span> <span id="printBillNo"
                        style="margin-left: 5px; font-weight: normal;"></span>
                </td>
            </tr>
            <tr>
                <td
                    style="border-right: 1px solid black; border-top: none; padding: 5px 8px; vertical-align: top; height: 35px;">
                    <span style="font-weight:bold;">ที่อยู่ :</span>
                </td>
                <td style="border-right: 1px solid black; border-top: none; padding: 5px 8px; vertical-align: top;">
                    <span id="printAddress" style="font-weight: normal;"></span>
                </td>
                <td style="border-top: none; padding: 5px 8px; vertical-align: top;">
                    <span style="font-weight:bold;">วันที่/Date :</span> <span id="printBillDate"
                        style="margin-left: 5px; font-weight: normal;"></span>
                </td>
            </tr>
            <tr>
                <td
                    style="border-right: 1px solid black; border-top: none; padding: 5px 8px; vertical-align: top; height: 25px;">
                    <span style="font-weight:bold;">โทร :</span>
                </td>
                <td style="border-right: 1px solid black; border-top: none; padding: 5px 8px; vertical-align: top;">
                    <span id="printPhone" style="font-weight: normal;"></span>
                </td>
                <td style="border-top: none; padding: 5px 8px; vertical-align: top;">
                    <!-- Blank area under date -->
                </td>
            </tr>
            <tr>
                <td
                    style="border-right: 1px solid black; border-top: none; padding: 5px 8px; vertical-align: top; height: 25px;">
                    <span style="font-weight:bold;">เลขประจำตัวผู้เสียภาษี :</span>
                </td>
                <td style="border-right: 1px solid black; border-top: none; padding: 5px 8px; vertical-align: top;">
                    <span id="printTaxId" style="font-weight: normal;"></span>
                </td>
                <td style="border-top: none; padding: 5px 8px; vertical-align: top;">
                    <!-- Blank area -->
                </td>
            </tr>
        </table>

        <!-- Products -->
        <table class="print-products-table"
            style="width: 100%; border-collapse: collapse; border: 1px solid black; border-top: none;">
            <thead>
                <tr>
                    <th style="width: 10%; border: 1px solid black;">ลำดับ<br>No</th>
                    <th style="width: 15%; border: 1px solid black;">รูปสินค้า<br>Picture</th>
                    <th style="width: 35%; border: 1px solid black;">รายละเอียด<br>Description</th>
                    <th style="width: 12%; border: 1px solid black;">จำนวน<br>Quantity</th>
                    <th style="width: 14%; border: 1px solid black;">ราคา / ชิ้น<br>Price</th>
                    <th style="width: 14%; border: 1px solid black;">จำนวนเงิน<br>Amount</th>
                </tr>
            </thead>
            <tbody id="printProductsBody">
                <!-- Javascript will populate this -->
            </tbody>
        </table>

        <!-- Footer / Calculation -->
        <table class="print-footer-table">
            <tr>
                <td rowspan="3" id="printBankInfoCell"
                    style="width: 60%; vertical-align: top; padding: 5px; border-right: 1px solid black; border-bottom: 1px solid black; position: relative;">
                    <div style="color:red; font-size:10pt; font-weight:bold;">ช่องทางการชำระเงิน :</div>
                    <div
                        style="border: 2px dashed black; border-radius: 10px; padding: 20px 10px; width: 90%; margin: 15px auto; display: flex; align-items: center; justify-content: center; gap: 20px;">
                        <img id="printBankLogo"
                            src="https://lh3.googleusercontent.com/d/11-qyC7VD7yoIc8MDL0s8JF5ZREKloMGH"
                            style="width: 75px; max-height: 75px; object-fit: contain; flex-shrink: 0;">
                        <div style="text-align: left; font-weight: bold; line-height: 1.1;">
                            <span style="font-size:16pt;" id="printBankName">ธนาคารกรุงไทย</span><br>
                            <span style="font-size:12pt;"
                                id="printBankAccName">วิสาหกิจชุมชนไทยเฮิร์บเซ็นเตอร์</span><br>
                            <span style="font-size:20pt; color: #2980b9;" id="printBankNo">016-074423-7</span><br>

                        </div>
                    </div>
                </td>
                <td
                    style="width: 26%; font-weight: bold; text-align: right; padding-right: 10px; border-bottom: 1px solid black; border-right: 1px solid black;">
                    รวมเป็นเงิน<br><span style="font-size: 10pt; font-weight: normal;">TOTAL</span></td>
                <td style="width: 14%; text-align: right; padding-right: 10px; border-bottom: 1px solid black;"><span
                        id="printSubTotal" style="font-weight: normal;"></span></td>
            </tr>
            <tr id="printDiscountRow">
                <td style="font-weight: bold; text-align: right; padding-right: 10px; border-bottom: 1px solid black; border-right: 1px solid black; color: red;"
                    id="printDiscountLabelCell">
                    <span id="printDiscountLabelText">หักส่วนลด<br><span
                            style="font-size: 10pt; font-weight: normal;">DISCOUNT</span></span>
                </td>
                <td style="text-align: right; padding-right: 10px; border-bottom: 1px solid black; color: red;"
                    id="printDiscountValueCell"><span id="printDiscount" style="font-weight: normal;"></span></td>
            </tr>
            <tr id="printPostDiscountRow" style="display: none;">
                <td
                    style="font-weight: bold; text-align: right; padding-right: 10px; border-bottom: 1px solid black; border-right: 1px solid black;">
                    จำนวนเงินหลังหักส่วนลด<br><span style="font-size: 10pt; font-weight: normal;">AFTER DISCOUNT</span>
                </td>
                <td style="text-align: right; padding-right: 10px; border-bottom: 1px solid black;">
                    <span id="printPostDiscount" style="font-weight: normal;"></span>
                </td>
            </tr>
            <tr id="printVatRow" style="display: none;">
                <td
                    style="font-weight: bold; text-align: right; padding-right: 10px; border-bottom: 1px solid black; border-right: 1px solid black;">
                    <span id="printVatLabel">ภาษีมูลค่าเพิ่ม 7%<br><span
                            style="font-size: 10pt; font-weight: normal;">VAT</span></span>
                </td>
                <td style="text-align: right; padding-right: 10px; border-bottom: 1px solid black;"><span id="printVat"
                        style="font-weight: normal;"></span></td>
            </tr>
            <tr id="printShippingRow" style="display: none;">
                <td
                    style="font-weight: bold; text-align: right; padding-right: 10px; border-bottom: 1px solid black; border-right: 1px solid black;">
                    ค่าจัดส่ง<br><span style="font-size: 10pt; font-weight: normal;">SHIPPING COST</span>
                </td>
                <td style="text-align: right; padding-right: 10px; border-bottom: 1px solid black;"><span
                        id="printShippingCost" style="font-weight: normal;">0.00</span></td>
            </tr>
            <tr id="printDesignFeeRow" style="display: none;">
                <td
                    style="font-weight: bold; text-align: right; padding-right: 10px; border-bottom: 1px solid black; border-right: 1px solid black;">
                    ค่าออกแบบ<br><span style="font-size: 10pt; font-weight: normal;">DESIGN FEE</span>
                </td>
                <td style="text-align: right; padding-right: 10px; border-bottom: 1px solid black;"><span
                        id="printDesignFee" style="font-weight: normal;">0.00</span></td>
            </tr>
            <tr id="printDepositRow" style="display: none; color: red;">
                <td
                    style="width: 26%; font-weight: bold; text-align: right; padding-right: 10px; border-right: 1px solid black; border-bottom: 1px solid black; padding: 5px; padding-right: 10px;">
                    ยอดชำระมัดจำ <span id="printDepositPercentInfo"></span><br><span
                        style="font-size: 10pt; font-weight: normal;">DEPOSIT</span>
                </td>
                <td
                    style="width: 14%; text-align: right; font-weight: bold; border-bottom: 1px solid black; padding: 5px; padding-right: 10px;">
                    <span id="printDepositValue"></span>
                </td>
            </tr>
            <tr id="printRemainingRow" style="display: none; color: red;">
                <td
                    style="width: 26%; font-weight: bold; text-align: right; padding-right: 10px; border-right: 1px solid black; border-bottom: 1px solid black; padding: 5px; padding-right: 10px;">
                    ยอดคงเหลือที่ต้องชำระ<br><span style="font-size: 10pt; font-weight: normal;">REMAINING
                        BALANCE</span>
                </td>
                <td
                    style="width: 14%; text-align: right; font-weight: bold; border-bottom: 1px solid black; padding: 5px; padding-right: 10px;">
                    <span id="printRemainingValue"></span>
                </td>
            </tr>
            <tr>
                <td id="printThaiBahtCell"
                    style="width: 60%; text-align: center; font-weight: bold; font-size: 13pt; background-color: #e6e6e6; border-right: 1px solid black; padding: 5px;">
                    <span id="printThaiBahtText"></span>
                </td>
                <td id="printGrandTotalLabelCell"
                    style="width: 26%; font-weight: bold; text-align: right; padding-right: 10px; border-right: 1px solid black; background-color: #e6e6e6; padding: 5px; padding-right: 10px;">
                    จำนวนเงินรวมทั้งสิ้น<br><span style="font-size: 10pt; font-weight: normal;">GRAND TOTAL</span></td>
                <td id="printGrandTotalValueCell"
                    style="width: 14%; text-align: right; font-weight: bold; text-decoration: underline; background-color: #e6e6e6; padding: 5px; padding-right: 10px;">
                    <span id="printGrandTotal"></span>
                </td>
            </tr>
        </table>

        <!-- Remarks -->
        <table class="print-signature-table">
            <tr>
                <td id="printRemarksContainer"
                    style="width: 100%; vertical-align: top; padding: 2px 4px; font-size: 9pt;">
                </td>
            </tr>
        </table>

        <!-- Signatures -->
        <div style="display: flex; justify-content: space-around; margin-top: 15px;">
            <div style="text-align: center; font-size: 10pt;">
                <div style="height: 30px;"></div> <!-- Spacer for signature -->
                <div>(..................................................)</div>
                <div id="printReceiverSign" style="margin-top: 2px;">ผู้รับเสนอราคา</div>
            </div>
            <div style="text-align: center; font-size: 10pt;">
                <div style="height: 30px; position: relative;">
                    <img id="printSenderSignatureImg" src=""
                        style="max-height: 40px; display: none; position: absolute; bottom: -10px; left: 50%; transform: translateX(-50%);">
                </div>
                <div>(<span id="printSenderNameText">..................................................</span>)</div>
                <div id="printSenderSign" style="margin-top: 2px;">ผู้เสนอราคา</div>
            </div>
        </div>
    </div>

    <!-- Receipt Print Container (Hidden on screen) -->
    <div id="printContainerReceipt">
        <!-- Header -->
        <table style="width: 100%; border-collapse: collapse; border: none; margin-bottom: 0;">
            <tr>
                <td style="width: 12%; text-align: center; vertical-align: middle; border: none; padding: 2px;">
                    <img id="rcptPrintLogo" src="https://lh3.googleusercontent.com/d/10lptwep_aBvzXnQUHFAyS8cou2nrYyKK"
                        style="max-width: 100px; max-height: 100px; object-fit: contain;" alt="Logo">
                </td>
                <td style="width: 55%; padding: 2px 8px; vertical-align: middle; border: none;">
                    <div id="rcptPrintCompanyNameTH"
                        style="color: #1a7a3a; font-weight: bold; font-size: 13.5pt; line-height: 1.2; white-space: nowrap;">
                        วิสาหกิจชุมชนไทยเฮิร์บเซ็นเตอร์ (สำนักงานใหญ่)</div>
                    <div id="rcptPrintCompanyNameEN" style="font-size: 9pt; margin-top: 1px; white-space: nowrap;">Thai
                        Herb
                        Centers(THC)Community Enterprise (HEAD OFFICE)</div>
                    <div id="rcptPrintAddress1" style="font-size: 9pt; margin-top: 1px;">6/10 หมู่ที่ 2 ต.ไทรม้า
                        อ.เมืองนนทบุรี จ.นนทบุรี 11000</div>
                    <div id="rcptPrintAddress2" style="font-size: 8pt;">6/10 Moo 2 Sai Ma subdistrict,Mueang
                        Nonthaburi District,Nonthabui Province,Thailand 11000</div>
                    <div id="rcptPrintTaxInfo" style="font-size: 9pt; margin-top: 1px;">โทร:083-9799389 /
                        เลขประจำตัวผู้เสียภาษี 099-200438186-0</div>
                </td>
                <td style="width: 35%; text-align: center; vertical-align: middle; border: none; padding: 8px;">
                    <div
                        style="background-color: #2ecc71; color: white; border-radius: 25px; padding: 8px 5px; position: relative;">
                        <div id="rcptPrintDocTitleTH" style="font-size: 15pt; font-weight: bold; white-space: nowrap;">
                            ใบเสร็จรับเงิน (ต้นฉบับ)</div>
                        <div id="rcptPrintDocTitleEN" style="font-size: 12pt; font-weight: bold; margin-top: 2px;">
                            RECEIPT (ORIGINAL)</div>
                    </div>
                    <div style="font-size: 8pt; color: #145a24; margin-top: 6px; font-weight: bold; line-height: 1.4;">
                        <span id="rcptPrintCopyRef">สำหรับลูกค้า (เอกสารออกเป็นชุด)</span><br>
                        <span style="font-weight: normal;" id="rcptPrintTaxBranchOptions">ออกใบกำกับภาษี ☐ สำนักงานใหญ่
                            ☐ สาขา</span>
                    </div>
                </td>
            </tr>
        </table>

        <!-- Customer Info -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <!-- Left: Customer Info Box -->
            <div
                style="width: 65%; border: 1.5px solid #1a7a3a; border-radius: 8px; padding: 6px 12px; box-sizing: border-box;">
                <table style="width: 100%; border: none; font-size: 10pt; border-collapse: collapse;">
                    <tr>
                        <td style="width: 30%; font-weight: bold; padding: 2px 0; vertical-align: top;">
                            ชื่อลูกค้า :<br><span style="font-weight: normal; font-size: 8pt; color: #555;">Customer
                                Name</span>
                        </td>
                        <td style="width: 70%; padding: 2px 0; vertical-align: top;" id="rcptPrintCustomerName"></td>
                    </tr>
                    <tr>
                        <td style="font-weight: bold; padding: 2px 0; vertical-align: top;">
                            ที่อยู่ :<br><span style="font-weight: normal; font-size: 8pt; color: #555;">Address</span>
                        </td>
                        <td style="padding: 2px 0; vertical-align: top; height: 35px;" id="rcptPrintAddress"></td>
                    </tr>
                    <tr>
                        <td style="font-weight: bold; padding: 2px 0; vertical-align: top;">
                            โทรศัพท์ :<br><span style="font-weight: normal; font-size: 8pt; color: #555;">Tel.
                                No.</span>
                        </td>
                        <td style="padding: 2px 0; vertical-align: top;" id="rcptPrintPhone"></td>
                    </tr>
                    <tr>
                        <td style="font-weight: bold; padding: 2px 0; vertical-align: middle; white-space: nowrap;">
                            เลขประจำตัวผู้เสียภาษี :<br><span
                                style="font-weight: normal; font-size: 8pt; color: #555;">TAX ID</span>
                        </td>
                        <td style="padding: 2px 0; vertical-align: middle;">
                            <div
                                style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                                <span id="rcptPrintTaxId"></span>
                                <div id="rcptPrintTaxBranchOptionsLeft"
                                    style="font-size: 7.5pt; margin-left: auto; display: flex; gap: 15px; text-align: left;">
                                    <div>
                                        ☐ สำนักงานใหญ่<br>
                                        <span style="color: #555; margin-left: 12px;">Head Office</span>
                                    </div>
                                    <div>
                                        ☐ สาขาที่ ..........................<br>
                                        <span style="color: #555; margin-left: 12px;">Branch No.</span>
                                    </div>
                                </div>
                            </div>
                        </td>
                    </tr>
                </table>
            </div>

            <!-- Right: Doc Info Box -->
            <div
                style="width: 33%; border: 1.5px solid #1a7a3a; border-radius: 8px; overflow: hidden; box-sizing: border-box;">
                <table style="width: 100%; border-collapse: collapse; font-size: 10pt;">
                    <tr style="background-color: #d5f5e3;">
                        <td style="width: 40%; font-weight: bold; padding: 4px 8px; border-bottom: 1px solid #1a7a3a;">
                            เลขที่ :<br><span style="font-weight: normal; font-size: 8pt; color: #555;">No.</span>
                        </td>
                        <td style="width: 60%; padding: 4px 8px; border-bottom: 1px solid #1a7a3a; font-weight: bold;"
                            id="rcptPrintBillNo"></td>
                    </tr>
                    <tr>
                        <td style="font-weight: bold; padding: 4px 8px; border-bottom: 1px solid #1a7a3a;">
                            วันที่ :<br><span style="font-weight: normal; font-size: 8pt; color: #555;">Date</span>
                        </td>
                        <td style="padding: 4px 8px; border-bottom: 1px solid #1a7a3a;" id="rcptPrintBillDate"></td>
                    </tr>
                    <tr id="rcptRightDeliverToRow">
                        <td style="font-weight: bold; padding: 4px 8px; border-bottom: 1px solid #1a7a3a;">
                            สถานที่ส่ง :<br><span style="font-weight: normal; font-size: 8pt; color: #555;">Deliver
                                To</span>
                        </td>
                        <td style="padding: 4px 8px; border-bottom: 1px solid #1a7a3a;" id="rcptPrintDeliverTo">-</td>
                    </tr>
                    <tr id="rcptRightContactRow">
                        <td style="font-weight: bold; padding: 4px 8px;">
                            ติดต่อ :<br><span style="font-weight: normal; font-size: 8pt; color: #555;">Contact</span>
                        </td>
                        <td style="padding: 4px 8px;" id="rcptPrintContact">-</td>
                    </tr>
                    <tr id="rcptRightSalespersonRow" style="display: none;">
                        <td style="font-weight: bold; padding: 4px 8px;">
                            พนักงานขาย :<br><span
                                style="font-weight: normal; font-size: 8pt; color: #555;">Salesman</span>
                        </td>
                        <td style="padding: 4px 8px;" id="rcptPrintSalespersonRight">-</td>
                    </tr>
                </table>
            </div>
        </div>

        <!-- Purchase Info Row -->
        <div style="border: 1.5px solid #1a7a3a; border-radius: 8px; margin-bottom: 8px; overflow: hidden;">
            <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 9pt;">
                <tr style="background-color: #d5f5e3;" id="rcptDocInfoHeaders">
                    <td id="rcptDocInfoHdr1"
                        style="width: 25%; font-weight: bold; padding: 4px; border-right: 1px solid #1a7a3a; border-bottom: 1px solid #1a7a3a;">
                        เลขที่ใบสั่งซื้อ<br><span style="font-weight: normal; font-size: 8pt;">Purchase No.</span>
                    </td>
                    <td id="rcptDocInfoHdr2"
                        style="width: 25%; font-weight: bold; padding: 4px; border-right: 1px solid #1a7a3a; border-bottom: 1px solid #1a7a3a;">
                        เงื่อนไขการชำระเงิน<br><span style="font-weight: normal; font-size: 8pt;">Term Of Payment</span>
                    </td>
                    <td id="rcptDocInfoHdr3"
                        style="width: 25%; font-weight: bold; padding: 4px; border-right: 1px solid #1a7a3a; border-bottom: 1px solid #1a7a3a;">
                        วันครบกำหนดชำระ<br><span style="font-weight: normal; font-size: 8pt;">Due Date</span>
                    </td>
                    <td id="rcptDocInfoHdr4"
                        style="width: 25%; font-weight: bold; padding: 4px; border-bottom: 1px solid #1a7a3a;">
                        พนักงานขาย<br><span style="font-weight: normal; font-size: 8pt;">Salesperson</span>
                    </td>
                </tr>
                <tr id="rcptDocInfoValues">
                    <td id="rcptPrintPurchaseNo" style="padding: 6px; border-right: 1px solid #1a7a3a;">&nbsp;</td>
                    <td id="rcptPrintTermOfPayment" style="padding: 6px; border-right: 1px solid #1a7a3a;">&nbsp;</td>
                    <td id="rcptPrintDueDate" style="padding: 6px; border-right: 1px solid #1a7a3a;">&nbsp;</td>
                    <td id="rcptPrintSalesperson" style="padding: 6px;">&nbsp;</td>
                </tr>
            </table>
        </div>

        <!-- Products Table -->
        <div style="border: 1.5px solid #1a7a3a; border-radius: 8px; overflow: hidden; margin-bottom: 8px;">
            <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
                <thead>
                    <tr style="background-color: #d5f5e3;">
                        <th
                            style="width: 7%; border-right: 1px solid #1a7a3a; border-bottom: 1px solid #1a7a3a; padding: 4px 2px; font-size: 9pt;">
                            ลำดับ<br><span style="font-weight: normal; font-size: 8pt;">Item</span></th>
                        <th id="rcptPrintPicHeader"
                            style="width: 12%; border-right: 1px solid #1a7a3a; border-bottom: 1px solid #1a7a3a; padding: 4px 2px; font-size: 9pt;">
                            รูปสินค้า<br><span style="font-weight: normal; font-size: 8pt;">Picture</span></th>
                        <th id="rcptPrintDescHeader"
                            style="width: 35%; border-right: 1px solid #1a7a3a; border-bottom: 1px solid #1a7a3a; padding: 4px 2px; font-size: 9pt;">
                            รายการสินค้า<br><span style="font-weight: normal; font-size: 8pt;">Description</span></th>
                        <th
                            style="width: 10%; border-right: 1px solid #1a7a3a; border-bottom: 1px solid #1a7a3a; padding: 4px 2px; font-size: 9pt;">
                            จำนวน<br><span style="font-weight: normal; font-size: 8pt;">Quantity</span></th>
                        <th
                            style="width: 13%; border-right: 1px solid #1a7a3a; border-bottom: 1px solid #1a7a3a; padding: 4px 2px; font-size: 9pt;">
                            ราคาต่อหน่วย<br><span style="font-weight: normal; font-size: 8pt;">Unit Price</span></th>
                        <th
                            style="width: 10%; border-right: 1px solid #1a7a3a; border-bottom: 1px solid #1a7a3a; padding: 4px 2px; font-size: 9pt;">
                            ส่วนลด<br><span style="font-weight: normal; font-size: 8pt;">Discount</span></th>
                        <th style="width: 13%; border-bottom: 1px solid #1a7a3a; padding: 4px 2px; font-size: 9pt;">
                            จำนวนเงิน<br><span style="font-weight: normal; font-size: 8pt;">Amount</span></th>
                    </tr>
                </thead>
                <tbody id="rcptPrintProductsBody">
                    <!-- Products injected here -->
                </tbody>
            </table>

            <!-- Footer enclosed within the same rounded box -->
            <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
                <tr>
                    <td rowspan="4" id="rcptFooterLeftCell"
                        style="width: 54%; vertical-align: top; padding: 5px 12px; border-right: 1px solid #1a7a3a; border-top: 1px solid #1a7a3a;">
                        <div id="rcptPrintRemarksContainer" style="font-size: 9pt; min-height: 15px;"></div>
                        <div id="rcptPaymentInfoSection" style="margin-top: 8px; padding: 5px 0;">
                            <div style="font-weight: bold; margin-bottom: 6px; font-size: 10pt; color: #1a7a3a;">
                                ช่องทางชำระเงิน :</div>
                            <div style="display: flex; gap: 20px; align-items: center; font-size: 10pt;">
                                <label><span id="rcptPrintCbCash">☐</span> เงินสด (Cash)</label>
                                <label><span id="rcptPrintCbTransfer">☐</span> โอนเงิน (Bank Transfer)</label>
                                <label><span id="rcptPrintCbCheque">☐</span> เช็ค (Cheque)</label>
                            </div>
                            <div style="margin-top: 6px; font-size: 9pt; line-height: 1.7;">
                                ธนาคาร (Bank) <span
                                    id="rcptPrintCustomerBank">...........................................</span> สาขา
                                (Branch) <span
                                    id="rcptPrintCustomerBranch">...........................................</span><br>
                                เลขที่เช็ค (Cheque No.) <span
                                    id="rcptPrintChequeNo">...........................................</span> วันที่
                                <span id="rcptPrintChequeDate">...........................................</span>
                            </div>
                        </div>
                    </td>
                    <td
                        style="width: 33%; font-weight: bold; text-align: right; padding: 4px 10px; border-bottom: 1px solid #ccc; border-right: 1px solid #1a7a3a; border-top: 1px solid #1a7a3a; font-size: 10pt;">
                        ยอดรวม<br><span style="font-size: 9pt; font-weight: normal;">TOTAL</span>
                    </td>
                    <td
                        style="width: 13%; text-align: right; padding: 4px 10px; border-bottom: 1px solid #ccc; border-top: 1px solid #1a7a3a; font-size: 10pt;">
                        <span id="rcptPrintSubTotal" style="font-weight: normal;"></span>
                    </td>
                </tr>
                <tr id="rcptPrintDiscountRow" style="display: none;">
                    <td
                        style="font-weight: bold; text-align: right; padding: 4px 10px; border-bottom: 1px solid #ccc; border-right: 1px solid #1a7a3a; color: red; font-size: 10pt;">
                        <span id="rcptPrintDiscountLabelText">หักส่วนลด<br><span
                                style="font-size: 9pt; font-weight: normal;">DISCOUNT</span></span>
                    </td>
                    <td
                        style="text-align: right; padding: 4px 10px; border-bottom: 1px solid #ccc; color: red; font-size: 10pt;">
                        <span id="rcptPrintDiscount" style="font-weight: normal;"></span>
                    </td>
                </tr>
                <tr id="rcptPrintVatRow" style="display: none;">
                    <td
                        style="font-weight: bold; text-align: right; padding: 4px 10px; border-bottom: 1px solid #ccc; border-right: 1px solid #1a7a3a; font-size: 10pt;">
                        <span id="rcptPrintVatLabel">ภาษีมูลค่าเพิ่ม<br><span
                                style="font-size: 9pt; font-weight: normal;">VAT</span></span>
                    </td>
                    <td style="text-align: right; padding: 4px 10px; border-bottom: 1px solid #ccc; font-size: 10pt;">
                        <span id="rcptPrintVat" style="font-weight: normal;"></span>
                    </td>
                </tr>
                <tr id="rcptPrintDesignFeeRow" style="display: none;">
                    <td
                        style="font-weight: bold; text-align: right; padding: 4px 10px; border-bottom: 1px solid #ccc; border-right: 1px solid #1a7a3a; font-size: 10pt;">
                        ค่าออกแบบ<br><span style="font-size: 9pt; font-weight: normal;">DESIGN FEE</span>
                    </td>
                    <td style="text-align: right; padding: 4px 10px; border-bottom: 1px solid #ccc; font-size: 10pt;">
                        <span id="rcptPrintDesignFee" style="font-weight: normal;"></span>
                    </td>
                </tr>
                <tr>
                    <td id="rcptPrintThaiBahtCell"
                        style="width: 54%; text-align: center; font-weight: bold; font-size: 12pt; background-color: #d5f5e3; border-right: 1px solid #1a7a3a; border-top: 1px solid #1a7a3a; padding: 5px;">
                        <span id="rcptPrintThaiBahtText"></span>
                    </td>
                    <td
                        style="width: 33%; font-weight: bold; text-align: right; padding: 4px 10px; border-right: 1px solid #1a7a3a; background-color: #d5f5e3; font-size: 10pt;">
                        รวมเงินทั้งสิ้น<br><span style="font-size: 9pt; font-weight: normal;">GRAND TOTAL</span>
                    </td>
                    <td
                        style="width: 13%; text-align: right; font-weight: bold; text-decoration: underline; background-color: #d5f5e3; padding: 5px 10px; font-size: 11pt;">
                        <span id="rcptPrintGrandTotal"></span>
                    </td>
                </tr>
            </table>
        </div>

        <!-- Signatures for Receipt (3 separated boxes) -->
        <div id="rcptFooterReceipt" style="display: flex; justify-content: space-between; margin-top: 15px; gap: 15px;">
            <div
                style="flex: 1; border: 1.5px solid #1a7a3a; border-radius: 8px; text-align: center; font-size: 10pt; padding: 15px 10px 10px 10px;">
                <div style="height: 35px;"></div>
                <div>(.......................................................)</div>
                <div style="margin-top: 4px; font-size: 9pt;">ผู้รับเงิน / Collector By</div>
                <div style="margin-top: 4px; font-size: 8pt; color: #555;">วันที่ / Date ......./......./.......</div>
            </div>

            <div
                style="flex: 1; border: 1.5px solid #1a7a3a; border-radius: 8px; text-align: center; font-size: 10pt; padding: 15px 10px 10px 10px;">
                <div style="height: 35px;"></div>
                <div>(.......................................................)</div>
                <div style="margin-top: 4px; font-size: 9pt;">ผู้รับสินค้า / Received By</div>
                <div style="margin-top: 4px; font-size: 8pt; color: #555;">วันที่ / Date ......./......./.......</div>
            </div>

            <div
                style="flex: 1; border: 1.5px solid #1a7a3a; border-radius: 8px; text-align: center; font-size: 10pt; padding: 15px 10px 10px 10px; position: relative;">
                <div style="height: 35px; position: relative;">
                    <img id="rcptPrintSignatureImg" src=""
                        style="max-height: 40px; display: none; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);">
                </div>
                <div>(<span id="rcptPrintSignerName"
                        style="display:inline-block; min-width:140px; margin:0 5px;"></span>)</div>
                <div id="rcptPrintAuthorizedLabel" style="margin-top: 4px; font-size: 9pt;">ผู้มีอำนาจลงนาม / Authorized
                    Signature</div>
                <div style="margin-top: 4px; font-size: 8pt; color: #555;">วันที่ / Date ......./......./.......</div>
            </div>
        </div>

        <!-- Signatures for Tax Invoice (2 separated boxes) -->
        <div id="rcptFooterTaxInvoice"
            style="display: none; justify-content: space-between; margin-top: 15px; gap: 15px;">
            <div
                style="flex: 6; border: 1.5px solid #1a7a3a; border-radius: 8px; font-size: 10pt; padding: 10px 15px; position: relative;">
                <div style="color: #1a7a3a; font-size: 9pt; margin-bottom: 25px; font-weight: bold;">
                    ได้รับสินค้าตามรายการถูกต้องเรียบร้อยแล้ว <span
                        style="font-size: 8pt; color: #555; font-weight: normal;">Receipt the above goods in good
                        condition</span></div>

                <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                    <div style="line-height: 1.2;">
                        <span style="font-size: 9pt; font-weight: bold;">ผู้รับสินค้า</span><br><span
                            style="font-size: 8pt; color: #555;">Received by</span>
                    </div>
                    <div
                        style="flex: 1; border-bottom: 1px dotted #999; margin: 0 10px; position: relative; top: -5px;">
                    </div>
                    <div style="width: 150px; display: flex;">
                        <div style="line-height: 1.2; margin-right: 10px;">
                            <span style="font-size: 9pt; font-weight: bold;">วันที่</span><br><span
                                style="font-size: 8pt; color: #555;">Date</span>
                        </div>
                        <div style="flex: 1; border-bottom: 1px dotted #999; position: relative; top: -5px;"></div>
                    </div>
                </div>

                <div style="display: flex; justify-content: space-between;">
                    <div style="line-height: 1.2;">
                        <span style="font-size: 9pt; font-weight: bold;">ผู้ส่งสินค้า</span><br><span
                            style="font-size: 8pt; color: #555;">Delivery by</span>
                    </div>
                    <div
                        style="flex: 1; border-bottom: 1px dotted #999; margin: 0 10px; position: relative; top: -5px;">
                    </div>
                    <div style="width: 150px; display: flex;">
                        <div style="line-height: 1.2; margin-right: 10px;">
                            <span style="font-size: 9pt; font-weight: bold;">วันที่</span><br><span
                                style="font-size: 8pt; color: #555;">Date</span>
                        </div>
                        <div style="flex: 1; border-bottom: 1px dotted #999; position: relative; top: -5px;"></div>
                    </div>
                </div>
            </div>

            <div
                style="flex: 4; border: 1.5px solid #1a7a3a; border-radius: 8px; text-align: center; font-size: 10pt; padding: 10px 15px; position: relative;">
                <div id="rcptPrintTaxInvAuthCompanyTH" style="font-size: 9pt; font-weight: bold; margin-bottom: 2px;">
                    ในนาม วิสาหกิจชุมชนไทยเฮิร์บเซ็นเตอร์ (สำนักงานใหญ่)</div>
                <div id="rcptPrintTaxInvAuthCompanyEN" style="font-size: 8pt; color: #555; margin-bottom: 25px;">For
                    Thai Herb Centers(THC)Community Enterprise (HEAD OFFICE)</div>

                <div style="height: 35px; position: relative;">
                    <img id="rcptPrintTaxInvSignatureImg" src=""
                        style="max-height: 40px; display: none; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);">
                </div>
                <div style="border-bottom: 1px dotted #999; width: 80%; margin: 0 auto 5px auto;"></div>
                <div style="font-size: 9pt; font-weight: bold;">ผู้มีอำนาจลงนาม</div>
                <div style="font-size: 8pt; color: #555;">Authorized Signature</div>
            </div>
        </div>
    </div> <!-- Close printContainerReceipt -->

    <!-- Print Container (Full Tax Invoice - FlowAccount Style) -->
    <div id="printContainerFullTaxInvoice"
        style="display: none; padding: 25px 40px 40px 40px; box-sizing: border-box; background: white; width: 100%; font-family: 'Sarabun', sans-serif; position: relative; color: #333;">
        <div style="min-height: calc(100vh - 80px); display: flex; flex-direction: column;">

            <!-- Header -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr>
                    <!-- Left: Logo & Company -->
                    <td style="width: 55%; vertical-align: top; padding-right: 15px;">
                        <div style="display: flex; align-items: flex-start; margin-bottom: 5px;">
                            <img id="fullTaxPrintLogo" src=""
                                style="max-width: 350px; max-height: 160px; object-fit: contain;" alt="Logo">
                        </div>
                        <div id="fullTaxPrintCompanyName"
                            style="font-weight: bold; font-size: 11pt; margin-bottom: 2px;"></div>
                        <div id="fullTaxPrintAddress" style="font-size: 9.5pt; line-height: 1.4;"></div>
                        <div style="font-size: 9.5pt; margin-top: 3px;">
                            เลขประจำตัวผู้เสียภาษี <span id="fullTaxPrintTaxIdSeller"></span>
                        </div>
                        <div style="font-size: 9.5pt; margin-top: 2px;">
                            โทร. <span id="fullTaxPrintPhoneSeller"></span>
                        </div>

                        <!-- Customer Info Title -->
                        <div style="color: #27ae60; font-size: 10pt; margin-top: 20px; margin-bottom: 4px;">ลูกค้า</div>
                        <div id="fullTaxPrintCustomerName"
                            style="font-weight: bold; font-size: 10.5pt; margin-bottom: 2px;"></div>
                        <div id="fullTaxPrintCustomerAddress"
                            style="font-size: 9.5pt; line-height: 1.4; margin-bottom: 3px;"></div>
                        <div style="font-size: 9.5pt; margin-top: 2px;">
                            เลขประจำตัวผู้เสียภาษี <span id="fullTaxPrintCustomerTaxId"></span>
                        </div>
                    </td>

                    <!-- Right: Title & Doc Info -->
                    <td style="width: 45%; vertical-align: top; padding-top: 5px;">
                        <div
                            style="text-align: right; border-bottom: 1.5px solid #eaeaea; padding-bottom: 8px; margin-bottom: 12px;">
                            <div
                                style="font-size: 22pt; font-weight: normal; color: #27ae60; line-height: 1; margin-top: 0;">
                                ใบกำกับภาษี</div>
                            <div style="font-size: 11pt; color: #666; margin-top: 4px;">ต้นฉบับ</div>
                        </div>
                        <table style="width: 100%; border-collapse: collapse; font-size: 9.5pt;">
                            <tr>
                                <td style="padding: 3px 0; color: #27ae60; width: 35%;">เลขที่</td>
                                <td style="padding: 3px 0; text-align: right;" id="fullTaxPrintBillNo"></td>
                            </tr>
                            <tr>
                                <td style="padding: 3px 0; color: #27ae60;">วันที่</td>
                                <td style="padding: 3px 0; text-align: right;" id="fullTaxPrintDate"></td>
                            </tr>
                            <tr>
                                <td style="padding: 3px 0; color: #27ae60;">เครดิต</td>
                                <td style="padding: 3px 0; text-align: right;" id="fullTaxPrintCredit"></td>
                            </tr>
                            <tr>
                                <td style="padding: 3px 0; color: #27ae60;">ครบกำหนด</td>
                                <td style="padding: 3px 0; text-align: right;" id="fullTaxPrintDueDate"></td>
                            </tr>
                            <tr>
                                <td style="padding: 3px 0; color: #27ae60;">ผู้ขาย</td>
                                <td style="padding: 3px 0; text-align: right;" id="fullTaxPrintSalesperson"></td>
                            </tr>
                            <tr>
                                <td style="padding: 3px 0; color: #27ae60;">อ้างอิง</td>
                                <td style="padding: 3px 0; text-align: right;" id="fullTaxPrintRef"></td>
                            </tr>
                        </table>
                        <!-- Separator Line -->
                        <div style="border-top: 1.5px solid #eaeaea; margin: 8px 0;"></div>
                        <!-- Customer Detail Fields (FlowAccount style) -->
                        <table style="width: 100%; border-collapse: collapse; font-size: 9.5pt;">
                            <tr>
                                <td style="padding: 3px 0; color: #27ae60; width: 35%;">ผู้ติดต่อ</td>
                                <td style="padding: 3px 0; text-align: right;" id="fullTaxPrintContact">-</td>
                            </tr>
                            <tr>
                                <td style="padding: 3px 0; color: #27ae60;">เบอร์โทร</td>
                                <td style="padding: 3px 0; text-align: right;" id="fullTaxPrintCustomerPhone">-</td>
                            </tr>
                            <tr>
                                <td style="padding: 3px 0; color: #27ae60;">อีเมล</td>
                                <td style="padding: 3px 0; text-align: right;" id="fullTaxPrintCustomerEmail">-</td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>

            <!-- Main Items Table -->
            <table style="width: 100%; border-collapse: collapse; font-size: 9.5pt; margin-bottom: 20px;">
                <thead style="border-top: 1px solid #ccc; border-bottom: 1px solid #ccc;">
                    <tr>
                        <th style="padding: 8px 5px; text-align: center; width: 5%; font-weight: normal;">#</th>
                        <th style="padding: 8px 5px; text-align: left; width: 45%; font-weight: normal;">รายละเอียด</th>
                        <th style="padding: 8px 5px; text-align: center; width: 10%; font-weight: normal;">จำนวน</th>
                        <th style="padding: 8px 5px; text-align: right; width: 15%; font-weight: normal;">ราคาต่อหน่วย
                        </th>
                        <th style="padding: 8px 5px; text-align: right; width: 10%; font-weight: normal;">ส่วนลด</th>
                        <th style="padding: 8px 5px; text-align: right; width: 15%; font-weight: normal;">มูลค่า</th>
                    </tr>
                </thead>
                <tbody id="fullTaxPrintItemsBody">
                    <!-- dynamic rows -->
                </tbody>
            </table>

            <!-- Totals Section -->
            <table style="width: 100%; border-collapse: collapse; font-size: 9.5pt; margin-bottom: 40px;">
                <tr>
                    <td style="width: 55%; vertical-align: bottom; padding-bottom: 10px;">
                        <span id="fullTaxPrintThaiBahtText" style="font-size: 10pt;"></span>
                    </td>
                    <td style="width: 45%; padding: 0;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 4px 10px; text-align: right; color: #27ae60;">รวมเป็นเงิน</td>
                                <td style="padding: 4px 10px; text-align: right; width: 40%;" id="fullTaxPrintSubTotal">
                                </td>
                            </tr>
                            <tr id="fullTaxPrintDiscountRowContainer" style="display: none;">
                                <td style="padding: 4px 10px; text-align: right; color: #27ae60;">ส่วนลด</td>
                                <td style="padding: 4px 10px; text-align: right;" id="fullTaxPrintDiscount"></td>
                            </tr>
                            <tr id="fullTaxPrintAfterDiscountRowContainer" style="display: none;">
                                <td style="padding: 4px 10px; text-align: right; color: #27ae60;">จำนวนเงินหลังหักส่วนลด
                                </td>
                                <td style="padding: 4px 10px; text-align: right;" id="fullTaxPrintAfterDiscount"></td>
                            </tr>
                            <tr id="fullTaxPrintDesignFeeRowContainer" style="display: none;">
                                <td style="padding: 4px 10px; text-align: right; color: #27ae60;">ค่าออกแบบ</td>
                                <td style="padding: 4px 10px; text-align: right;" id="fullTaxPrintDesignFee"></td>
                            </tr>
                            <tr id="fullTaxPrintVatRowContainer" style="display: none;">
                                <td style="padding: 4px 10px; text-align: right; color: #27ae60;"
                                    id="fullTaxPrintVatLabelText">ภาษีมูลค่าเพิ่ม 7%</td>
                                <td style="padding: 4px 10px; text-align: right;" id="fullTaxPrintVat"></td>
                            </tr>
                            <tr id="fullTaxPrintBeforeVatRowContainer" style="display: none;">
                                <td style="padding: 4px 10px; text-align: right; color: #27ae60;">
                                    ราคาไม่รวมภาษีมูลค่าเพิ่ม</td>
                                <td style="padding: 4px 10px; text-align: right;" id="fullTaxPrintBeforeVat"></td>
                            </tr>
                            <tr style="border-top: 1px solid #27ae60; border-bottom: 2px solid #27ae60;">
                                <td style="padding: 8px 10px; text-align: right; color: #27ae60;">จำนวนเงินรวมทั้งสิ้น
                                </td>
                                <td style="padding: 8px 10px; text-align: right;" id="fullTaxPrintGrandTotal"></td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>

            <!-- Footer Signatures -->
            <div style="margin-top: auto;">
                <table style="width: 100%; border-collapse: collapse; font-size: 9.5pt;">
                    <tr>
                        <td style="width: 35%; text-align: center; vertical-align: bottom;">
                            <div style="margin-bottom: 40px; font-size: 9pt;">ในนาม <span
                                    id="fullTaxPrintCustomerFooterName"></span></div>
                            <div style="display: flex; justify-content: space-between; width: 90%; margin: 0 auto;">
                                <div style="width: 60%;">
                                    <div style="border-bottom: 1px solid #aaa; margin-bottom: 5px;"></div>
                                    <div style="font-size: 9pt;">ผู้รับสินค้า / บริการ</div>
                                </div>
                                <div style="width: 35%;">
                                    <div style="border-bottom: 1px solid #aaa; margin-bottom: 5px;"></div>
                                    <div style="font-size: 9pt;">วันที่</div>
                                </div>
                            </div>
                        </td>
                        <td style="width: 30%; text-align: center; vertical-align: bottom; padding-bottom: 15px;">
                            <!-- Circular Seal Area -->
                            <div
                                style="width: 100px; height: 100px; border-radius: 50%; border: 1px dashed #ccc; margin: 0 auto; display: flex; align-items: center; justify-content: center; color: #ccc; font-size: 9pt;">
                            </div>
                        </td>
                        <td style="width: 35%; text-align: center; vertical-align: bottom;">
                            <div style="margin-bottom: 40px; font-size: 9pt;">ในนาม <span
                                    id="fullTaxPrintSellerFooterName"></span></div>
                            <div style="display: flex; justify-content: space-between; width: 90%; margin: 0 auto;">
                                <div style="width: 60%;">
                                    <div style="border-bottom: 1px solid #aaa; margin-bottom: 5px;"></div>
                                    <div style="font-size: 9pt;">ผู้อนุมัติ</div>
                                </div>
                                <div style="width: 35%;">
                                    <div style="border-bottom: 1px solid #aaa; margin-bottom: 5px;"></div>
                                    <div style="font-size: 9pt;">วันที่</div>
                                </div>
                            </div>
                        </td>
                    </tr>
                </table>
            </div>
        </div>
    </div>

    <!-- FDA Quotation Print Container -->
    <div id="printContainerFdaQuotation">
        <div style="padding: 20px; font-family: 'Sarabun', sans-serif;">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <div style="width: 25%;">
                    <img id="fdaPrintLogo" src="https://lh3.googleusercontent.com/d/1FPtYXftp6xTLvFYz2rvM_iQeh4EEkzj8" style="max-width: 180px; max-height: 120px;">
                </div>
                <div style="width: 75%; text-align: center;">
                    <div id="fdaPrintCompanyName" style="font-size: 16pt; font-weight: bold; color: #1a7a3a;">บริษัท พรีเมียร์ สมาร์ท ฟาร์ม จำกัด (สำนักงานใหญ่)</div>
                    <div id="fdaPrintAddress" style="font-size: 10pt; margin-top: 5px;">ที่อยู่ เลขที่ 2/2 ซอยนนทบุรี 38 ต.ท่าทราย อ.เมืองนนทบุรี จ.นนทบุรี 11000</div>
                    <div style="font-size: 10pt;">เลขประจำตัวผู้เสียภาษี <span id="fdaPrintTaxIdSeller">0125566026612</span> โทร: 087-590-8888 E-mail : ponpriherb@gmail.com</div>
                </div>
            </div>

            <!-- Title & Info Table -->
            <table style="width: 100%; border-collapse: collapse; border: 1px solid black; font-size: 11pt; margin-bottom: -1px;">
                <tr>
                    <td rowspan="4" style="width: 60%; text-align: center; font-weight: bold; font-size: 16pt; border: 1px solid black; background-color: #ffffff; vertical-align: middle;">ใบเสนอราคา/ใบสั่งซื้อ</td>
                    <td style="width: 40%; border: 1px solid black; padding: 4px 8px; white-space: nowrap;">หมายเลขเอกสาร: <span id="fdaPrintBillNo"></span></td>
                </tr>
                <tr>
                    <td style="border: 1px solid black; padding: 4px 8px; white-space: nowrap;">รหัสลูกค้า: <span id="fdaPrintCustomerCode"></span></td>
                </tr>
                <tr>
                    <td style="border: 1px solid black; padding: 4px 8px; white-space: nowrap;">วันที่: <span id="fdaPrintDate"></span></td>
                </tr>
                <tr>
                    <td style="border: 1px solid black; padding: 4px 8px; white-space: nowrap;">กำหนดชำระเครดิต/ Credit: <span style="font-size: 9pt; color: red;" id="fdaPrintCreditTerm">ชำระเต็มจำนวน</span></td>
                </tr>
            </table>

            <!-- Customer Info Table -->
            <table style="width: 100%; border-collapse: collapse; border: 1px solid black; font-size: 11pt; margin-bottom: -1px;">
                <tr>
                    <td style="width: 60%; border: 1px solid black; padding: 4px 8px; border-bottom: none;">
                        <span style="font-weight: bold;">ชื่อบริษัท/ลูกค้า :</span> <span id="fdaPrintCustomerName"></span>
                    </td>
                    <td style="width: 40%; border: 1px solid black; padding: 4px 8px;">
                        <span style="font-weight: bold;">โทรศัพท์ :</span> <span id="fdaPrintPhone"></span>
                    </td>
                </tr>
                <tr>
                    <td style="border: 1px solid black; padding: 4px 8px; border-top: none; border-bottom: none;">
                        <span style="font-weight: bold;">ที่อยู่ติดต่อ :</span> <span id="fdaPrintCustomerAddress"></span>
                    </td>
                    <td style="border: 1px solid black; padding: 4px 8px;">
                        <span style="font-weight: bold;">E-mail :</span> <span id="fdaPrintCustomerEmail"></span>
                    </td>
                </tr>
                <tr>
                    <td style="border: 1px solid black; padding: 4px 8px; border-top: none;">
                        <span style="font-weight: bold;">TAX ID :</span> <span id="fdaPrintCustomerTaxId"></span>
                    </td>
                    <td style="border: 1px solid black; padding: 4px 8px;">
                        <span style="font-weight: bold;">โครงการ :</span> <span id="fdaPrintProjectName" style="font-weight: bold; margin-left: 10px;">ขึ้นทะเบียนตำรับยา (G)</span>
                    </td>
                </tr>
            </table>

            <!-- Items Table -->
            <table style="width: 100%; border-collapse: collapse; border: 1px solid black; font-size: 11pt; margin-bottom: -1px;">
                <thead>
                    <tr style="background-color: #e0e0e0;">
                        <th id="fdaPrintStepsHeader" colspan="5" style="border: 1px solid black; padding: 8px; text-align: center;">ขั้นตอนการดำเนินงานขึ้นทะเบียนตำรับ อย.(G)ในการสั่งผลิต 1 ผลิตภัณฑ์</th>
                    </tr>
                </thead>
                <tbody id="fdaPrintServiceBody">
                    <!-- Service fee rows will be injected here -->
                </tbody>
                <tbody id="fdaPrintStepsBody">
                    <!-- Steps will be injected here -->
                </tbody>
                <tbody>
                    <tr style="background-color: #e0e0e0;">
                        <td colspan="5" style="border: 1px solid black; padding: 4px 8px; font-weight: bold; text-align: center;">ผลิตภัณฑ์</td>
                    </tr>
                </tbody>
                <tbody id="fdaPrintProductBody">
                    <!-- Product will be injected here -->
                </tbody>
            </table>

            <!-- Footer Table: Bank Info (left) + Totals (right) -->
            <table style="width: 100%; border-collapse: collapse; border: 1px solid black; font-size: 10pt;">
                <tr>
                    <td rowspan="3" style="width: 60%; border: 1px solid black; padding: 8px; vertical-align: top;">
                        <div style="color: red; font-size: 10pt; font-weight: bold;">ช่องทางการชำระเงิน :</div>
                        <div style="border: 2px dashed black; border-radius: 10px; padding: 15px 10px; width: 90%; margin: 10px auto; display: flex; align-items: center; justify-content: center; gap: 15px;">
                            <img id="fdaPrintBankLogo" src="https://lh3.googleusercontent.com/d/1GNinU6QiQbvKMnb07_Le0tW6LNL_Nf_h"
                                style="width: 65px; max-height: 65px; object-fit: contain; flex-shrink: 0;">
                            <div style="text-align: left; font-weight: bold; line-height: 1.2;">
                                <span style="font-size: 14pt;" id="fdaPrintBankName">ธนาคารกสิกรไทย</span><br>
                                <span style="font-size: 11pt;" id="fdaPrintBankAccName">บริษัท พรีเมียร์ สมาร์ท ฟาร์ม จำกัด</span><br>
                                <span style="font-size: 18pt; color: #138f2d;" id="fdaPrintBankNo">201-3-35956-6</span>
                            </div>
                        </div>
                    </td>
                    <td style="width: 25%; border: 1px solid black; padding: 4px 8px; font-weight: bold;">ราคารวม</td>
                    <td style="width: 15%; border: 1px solid black; padding: 4px 8px; text-align: right; font-weight: bold;" id="fdaPrintSubTotal">0.00</td>
                </tr>
                <tr>
                    <td style="border: 1px solid black; padding: 4px 8px; font-weight: bold;">ภาษีมูลค่าเพิ่ม/Vat 7%</td>
                    <td style="border: 1px solid black; padding: 4px 8px; text-align: right; font-weight: bold;" id="fdaPrintVat">0.00</td>
                </tr>
                <tr>
                    <td style="border: 1px solid black; padding: 4px 8px; font-weight: bold; background-color: #e6e6e6;">ราคารวมทั้งหมด<br><span style="font-size: 9pt; font-weight: normal;">GRAND TOTAL</span></td>
                    <td style="border: 1px solid black; padding: 4px 8px; text-align: right; font-weight: bold; background-color: #e6e6e6; text-decoration: underline;" id="fdaPrintGrandTotal">0.00</td>
                </tr>
            </table>

            <!-- เงื่อนไข + หมายเหตุ (อ่านจากช่องหมายเหตุในฟอร์ม) -->
            <table style="width: 100%; border-collapse: collapse; font-size: 10pt; margin-top: -1px;">
                <tr>
                    <td id="fdaPrintRemarksContainer" style="border: 1px solid black; padding: 8px; vertical-align: top;">
                        <!-- จะถูก inject จาก editableNotes ในฟอร์ม -->
                    </td>
                </tr>
            </table>

            <!-- Signatures -->
            <table style="width: 100%; border-collapse: collapse; font-size: 10pt; margin-top: -1px;">
                <tr>
                    <td colspan="3" style="border: 1px solid black; padding: 10px 5px;">
                        <div style="display: flex; justify-content: space-around; align-items: flex-end; margin-top: 15px; margin-bottom: 5px; padding: 0 5px;">
                            <div style="display: flex; gap: 10px; align-items: flex-end;">
                                <div style="text-align: center;">
                                    <div style="height: 50px;"></div>
                                    <div>_________________</div>
                                    <div style="margin-top: 3px; font-weight: bold; font-size: 9pt;">ผู้สั่งซื้อสินค้า</div>
                                </div>
                                <div style="text-align: center;">
                                    <div style="height: 50px;"></div>
                                    <div>___________</div>
                                    <div style="margin-top: 3px; font-weight: bold; font-size: 9pt;">ว/ด/ป</div>
                                </div>
                            </div>
                            <div style="text-align: center;">
                                <div style="height: 50px; position: relative;">
                                    <img id="fdaPrintSignature1" src="https://lh3.googleusercontent.com/d/1ps5SyMaGMCwKLGFonra1eOKUK-I5cCrL" style="max-height: 50px; display: none; position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%); z-index: 1;">
                                </div>
                                <div style="position: relative; z-index: 0;">_______________</div>
                                <div style="margin-top: 3px; font-weight: bold; font-size: 9pt;">ผู้เสนอราคา</div>
                            </div>
                            <div style="text-align: center;">
                                <div style="height: 50px; position: relative;">
                                    <img id="fdaPrintSignature2" src="https://lh3.googleusercontent.com/d/1wR8tGS--15mm-tkoP1dUH0FWIE2ZvtKZ" style="max-height: 50px; display: none; position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%); z-index: 1;">
                                </div>
                                <div style="position: relative; z-index: 0;">_______________</div>
                                <div style="margin-top: 3px; font-weight: bold; font-size: 9pt;">ผู้อนุมัติเสนอราคา</div>
                            </div>
                        </div>
                    </td>
                </tr>
            </table>
        </div>
    </div>

    <script>
        const DEFAULT_NOTE_OTHER = `
                    <div style="font-weight:bold;">หมายเหตุ:
                        <br>
                        <span style="color:red; font-size: 11pt;">ชำระมัดจำ 50 % ณ วันที่สั่งซื้อ หรือสั่งผลิต ชำระส่วนที่เหลือ วันที่รับสินค้า</span>
                        <br>
                        <span style="color:red;">ห้ามวางจำหน่ายตามร้านค้าทั่วไป!</span>
                    </div>
                    <div style="color:red; margin-left: 20px;">- สินค้าไม่ผ่านกระบวนการทาง อย.</div>
                    <div style="color:red; margin-left: 20px;">- สินค้าสามารถขายได้เฉพาะงานมงคล งานบุญ งานขาวดำ</div>
                    <div style="color:red; margin-left: 30px;">ใช้เป็นของชำร่วย ,ของฝาก,ของขวัญ</div>
                    <div style="color:red; margin-left: 20px;">- สินค้าขายเฉพาะกลุ่ม</div>
                    <div style="color:red; margin-left: 30px;">(ราคารวมฉลากและรูปแบบโลโก้ชื่อแบรนด์)</div>
                    <div style="color:red; text-align: center; font-weight: bold;">**ราคานี้ยังไม่รวมค่าจัดส่ง**</div>
        `;

        const DEFAULT_NOTE_RECEIPT = `
                    <div><span style="font-weight:bold;">หมายเหตุ: </span>ใบเสร็จรับเงินฉบับนี้จะถือว่าถูกต้องเเละสมบูรณ์ต่อเมื่อมีลายเซ็นของผู้มีอำนาจเเละเมื่อเรียกเก็บเงินตามบิลได้เรียบร้อย</div>
        `;

        const DEFAULT_NOTE_FDA = `
                    <div style="padding-bottom:8px; margin-bottom:8px; border-bottom:1px solid #333;">
                        <span style="font-weight:bold; color:#000;">เงื่อนไข :</span>
                        <span style="color:red;"> กรณีที่ลูกค้าตกลงโอนชำระเงินรายการตามใบเสนอราคาเรียบร้อยแล้ว</span><br>
                        <span style="color:red; margin-left:65px;">ทางบริษัท(โรงงาน)ขอสงวนสิทธิ์ในการคืนเงินทุกกรณี</span><br>
                        <span style="color:red; margin-left:65px; font-weight:bold;">**หากมีการเปลี่ยนแปลงอันที่จะเกิดขึ้นทาง บริษัทขอพิจารณาไม่เกิน 15% ของจำนวนทั้งหมด**</span>
                    </div>
                    <div>
                        <span style="font-weight:bold; color:#000;">หมายเหตุ :</span>
                        <span style="color:red; font-weight:bold;"> **ค่าดำเนินการขึ้นทะเบียนและค่าธรรมเนียมชำระเพียงครั้งเดียว 100% ในครั้งแรกที่ยื่นคำขอ**</span>
                    </div>
        `;

        const DEFAULT_NOTE_TAX_INVOICE = `
                    <div style="font-weight:bold; font-size: 9pt;">เงื่อนไข &amp; ข้อตกลง :</div>
                    <div style="font-size: 8.5pt; margin-left: 10px; line-height: 1.5;">
                        1. สินค้าที่ผลิตไม่สามารถเปลี่ยนแปลง ยกเลิก หรือคืนในกรณีการสั่งผลิตสินค้า ยกเว้นสินค้ามีปัญหาจากกระบวนการผลิต<br>
                        2. การตรวจรับสินค้าให้ตรวจสอบหลังรับสินค้า ต้องรายงานภายในวันเท่านั้น มิฉะนั้นถือว่ายอมรับสินค้าที่ส่งมอบ<br>
                        3. สินค้าที่มอบแล้วจะไม่สามารถเปลี่ยนแปลงใดๆ ขอสงวนสิทธิ์เรียกชำระเงินตามมูลค่าสินค้าที่ส่งมอบ
                    </div>
        `;


        let currentNoteType = 'other';

        // Handle image selection and resize for Base64 storage
        function handleImageSelect(event, itemId) {
            const file = event.target.files[0];
            const hiddenInput = document.getElementById('productPicBase64_' + itemId);
            if (!file) {
                hiddenInput.value = '';
                return;
            }
            const reader = new FileReader();
            reader.onload = function (e) {
                const img = new Image();
                img.onload = function () {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1200;
                    const MAX_HEIGHT = 1200;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height = Math.round(height * MAX_WIDTH / width);
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width = Math.round(width * MAX_HEIGHT / height);
                            height = MAX_HEIGHT;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Preserve PNG format to keep transparency, compress others as JPEG
                    const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
                    const quality = file.type === 'image/png' ? undefined : 0.9;
                    const base64Data = canvas.toDataURL(mimeType, quality);

                    hiddenInput.value = base64Data;

                    const previewImg = document.getElementById('productPicPreview_' + itemId);
                    if (previewImg) {
                        previewImg.src = base64Data;
                        previewImg.style.display = 'block';
                    }
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }

        // Set default date
        document.getElementById('billDate').valueAsDate = new Date();

        // Populate discount dropdown 1 to 100
        const discSelect = document.getElementById('discountPercent');
        if (discSelect) {
            for (let i = 1; i <= 100; i++) {
                const opt = document.createElement('option');
                opt.value = i;
                opt.text = i;
                discSelect.appendChild(opt);
            }
        }

        // --- Custom Dropdown Logic ---
        function setupCustomDropdown(itemId) {
            const listContainer = document.getElementById('dropdownList_' + itemId);
            if (!listContainer) return;

            listContainer.innerHTML = '';
            PRODUCT_LIST.forEach(product => {
                const item = document.createElement('div');
                item.className = 'custom-dropdown-item';
                item.textContent = product;
                item.onclick = function () {
                    const input = document.getElementById('productName_' + itemId);
                    input.value = product;
                    listContainer.classList.remove('show');

                    // Auto-fill price if available
                    if (PRODUCT_PRICES[product] !== undefined) {
                        const priceInput = document.getElementById('price_' + itemId);
                        if (priceInput) {
                            priceInput.value = PRODUCT_PRICES[product];
                            // default qty to 1 if empty, to calculate total easily
                            const qtyInput = document.getElementById('qty_' + itemId);
                            if (qtyInput && !qtyInput.value) {
                                qtyInput.value = 1;
                            }
                            calculateRowAndTotal(itemId);
                        }
                    }

                    // Auto-fill image if available
                    if (typeof PRODUCT_IMAGES !== 'undefined' && PRODUCT_IMAGES[product] !== undefined) {
                        const hiddenInput = document.getElementById('productPicBase64_' + itemId);
                        const previewImg = document.getElementById('productPicPreview_' + itemId);
                        if (hiddenInput && previewImg) {
                            hiddenInput.value = PRODUCT_IMAGES[product];
                            previewImg.src = PRODUCT_IMAGES[product];
                            previewImg.style.display = 'block';
                        }
                    }

                    checkPromo(itemId);
                };
                listContainer.appendChild(item);
            });
        }

        function toggleDropdown(itemId) {
            const listContainer = document.getElementById('dropdownList_' + itemId);
            if (listContainer) {
                // Close all other open dropdowns first
                document.querySelectorAll('.custom-dropdown-list').forEach(list => {
                    if (list.id !== 'dropdownList_' + itemId) list.classList.remove('show');
                });

                listContainer.classList.toggle('show');

                // Show all items when dropdown is clicked (ignore filter temporarily)
                if (listContainer.classList.contains('show')) {
                    const items = listContainer.getElementsByClassName('custom-dropdown-item');
                    for (let i = 0; i < items.length; i++) {
                        items[i].style.display = "";
                    }
                }
            }
        }

        function filterDropdown(itemId) {
            const input = document.getElementById('productName_' + itemId);
            const filter = input.value.toLowerCase();
            const listContainer = document.getElementById('dropdownList_' + itemId);
            if (!listContainer) return;

            listContainer.classList.add('show');
            const items = listContainer.getElementsByClassName('custom-dropdown-item');

            for (let i = 0; i < items.length; i++) {
                const textValue = items[i].textContent || items[i].innerText;
                if (textValue.toLowerCase().indexOf(filter) > -1) {
                    items[i].style.display = "";
                } else {
                    items[i].style.display = "none";
                }
            }
        }

        // Close dropdowns when clicking outside
        document.addEventListener('click', function (event) {
            if (!event.target.matches('.custom-dropdown-input')) {
                document.querySelectorAll('.custom-dropdown-list.show').forEach(list => {
                    list.classList.remove('show');
                });
            }
        });

        // Initialize the first dropdown on page load
        document.addEventListener('DOMContentLoaded', function () {
            setupCustomDropdown(1);
        });

        // --- End Custom Dropdown Logic ---

        // Promo Items Config
        const PROMO_ITEMS = {
            "ยาดมสมุนไพร": { qty: 50, price: 20 },
            "ยาหม่อง": { qty: 40, price: 25 },
            "ยาดมสมุนไพร จัมโบ้": { qty: 5, price: 200 },
            "ยาน้ำมัน ขนาด 10 มล.": { qty: 17, price: 59 },
            "ยาน้ำมัน ขนาด 5 มล.": { qty: 25, price: 40 },
            "ยาน้ำมันสมุนไพร สูตรเย็น": { qty: 14, price: 71 },
            "ยาน้ำมันสมุนไพร สูตรร้อน": { qty: 14, price: 71 },
            "ยาสเปรย์ผสมกระดูกไก่ดำ": { qty: 14, price: 71 }
        };

        // Check if item is promo
        function checkPromo(itemId) {
            const nameInput = document.getElementById('productName_' + itemId);
            const promoContainer = document.getElementById('promoContainer_' + itemId);
            const promoCheckbox = document.getElementById('promoCheckbox_' + itemId);

            if (nameInput && promoContainer) {
                const productName = nameInput.value.trim();
                // If it is a promotional product
                if (PROMO_ITEMS[productName]) {
                    promoContainer.style.display = 'block';
                    if (promoCheckbox) promoCheckbox.dataset.activePromoName = productName;
                    // If checkbox is already checked (changed from one promo to another), update the values
                    if (promoCheckbox && promoCheckbox.checked) {
                        togglePromo(itemId);
                    }
                } else {
                    // If it is not a promotional product
                    if (promoCheckbox && promoCheckbox.checked) {
                        // User is editing the name of an already selected promo. Keep it active.
                        // Do nothing here, allow them to keep the promo properties.
                    } else {
                        // If not checked, hide checkbox and clear promo details
                        promoContainer.style.display = 'none';
                        if (promoCheckbox) promoCheckbox.removeAttribute('data-active-promo-name');

                        // Clear the values if changing from a previously locked state
                        const qtyInput = document.getElementById('qty_' + itemId);
                        const priceInput = document.getElementById('price_' + itemId);
                        if (qtyInput && qtyInput.readOnly) {
                            qtyInput.value = '';
                            priceInput.value = '';
                            qtyInput.readOnly = false;
                            priceInput.readOnly = false;
                            qtyInput.style.backgroundColor = 'transparent';
                            priceInput.style.backgroundColor = 'transparent';
                            calculateRowAndTotal(itemId);
                        }
                    }
                }
            }
        }

        // Apply promo rules
        function togglePromo(itemId) {
            const promoCheckbox = document.getElementById('promoCheckbox_' + itemId);
            const promoMultiplier = document.getElementById('promoMultiplier_' + itemId);
            const nameInput = document.getElementById('productName_' + itemId);
            const qtyInput = document.getElementById('qty_' + itemId);
            const priceInput = document.getElementById('price_' + itemId);

            if (!promoCheckbox || !nameInput || !qtyInput || !priceInput) return;

            const isPromo = promoCheckbox.checked;

            // Use the saved active promo name if available, otherwise fallback to current input value
            const productName = (promoCheckbox.dataset.activePromoName) ? promoCheckbox.dataset.activePromoName : nameInput.value.trim();
            const promoData = PROMO_ITEMS[productName];

            if (isPromo && promoData) {
                if (promoMultiplier) promoMultiplier.style.display = 'inline-block';
                const multiplier = promoMultiplier ? (parseInt(promoMultiplier.value) || 1) : 1;
                qtyInput.value = promoData.qty * multiplier;
                priceInput.value = promoData.price;
                qtyInput.readOnly = true;
                priceInput.readOnly = true;
                qtyInput.style.backgroundColor = '#e0e0e0';
                priceInput.style.backgroundColor = '#e0e0e0';

                // Save active promo name if not already saved
                if (!promoCheckbox.dataset.activePromoName) {
                    promoCheckbox.dataset.activePromoName = productName;
                }
            } else {
                if (promoMultiplier) {
                    promoMultiplier.style.display = 'none';
                    promoMultiplier.value = '1';
                }
                qtyInput.readOnly = false;
                priceInput.readOnly = false;
                qtyInput.style.backgroundColor = 'transparent';
                priceInput.style.backgroundColor = 'transparent';

                // Clear the values when unchecking
                qtyInput.value = '';
                priceInput.value = '';

                promoCheckbox.removeAttribute('data-active-promo-name');

                // If the current name is not a promo item anymore, hide the promo container
                const currentName = nameInput.value.trim();
                const promoContainer = document.getElementById('promoContainer_' + itemId);
                if (!PROMO_ITEMS[currentName] && promoContainer) {
                    promoContainer.style.display = 'none';
                }
            }

            calculateRowAndTotal(itemId);
        }

        // Product Counter
        let productCounter = 1;

        // Add new product item
        function addProduct() {
            productCounter++;
            const container = document.getElementById('productsContainer');

            const newItem = document.createElement('div');
            newItem.className = 'product-item';
            newItem.id = 'productItem_' + productCounter;
            newItem.innerHTML = `
                <div class="product-row">
                    <div class="form-group product-pic" style="margin-bottom: 0; position: relative; display: flex; align-items: center; gap: 10px;">
                        <label for="productPic_${productCounter}" style="flex: 1; border: 1px dashed #4a90e2; border-radius: 8px; padding: 8px; text-align: center; cursor: pointer; background: #f0f8ff; transition: 0.3s; margin: 0; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 13px; color: #4a90e2; font-weight: bold;" onmouseover="this.style.background='#e6f2ff'" onmouseout="this.style.background='#f0f8ff'">
                            📷 อัพโหลดรูป
                        </label>
                        <input type="file" id="productPic_${productCounter}" accept="image/*" class="product-pic-input" onchange="handleImageSelect(event, ${productCounter})" style="display: none;">
                        <img id="productPicPreview_${productCounter}" src="" style="display: none; width: 40px; height: 40px; object-fit: cover; border-radius: 5px; border: 1px solid #ccc;">
                        <input type="hidden" id="productPicBase64_${productCounter}" value="">
                    </div>
                    <div class="form-group product-input" style="margin-bottom: 0; display: flex; flex-direction: column;">
                        <div class="custom-dropdown" id="dropdownContainer_${productCounter}">
                            <input type="text" id="productName_${productCounter}" class="custom-dropdown-input" placeholder="คลิกหรือพิมพ์เพื่อเลือกสินค้า" required oninput="filterDropdown(${productCounter}); checkPromo(${productCounter})" onclick="toggleDropdown(${productCounter})" autocomplete="off">
                            <div class="custom-dropdown-list" id="dropdownList_${productCounter}"></div>
                        </div>
                        <!-- Added fixed height or absolute positioning to promoContainer if needed, but flex-direction: column on parent should fix it -->
                        <div id="promoContainer_${productCounter}" style="display: none; margin-top: 8px;">
                            <label style="display: flex; align-items: center; gap: 8px; font-size: 14px; color: #d35400; cursor: pointer;">
                                <input type="checkbox" id="promoCheckbox_${productCounter}" onchange="togglePromo(${productCounter})" style="width: 16px; height: 16px; cursor: pointer; padding: 0;">
                                จัดโปรโมชั่น 1000 บาท
                                <select id="promoMultiplier_${productCounter}" onchange="togglePromo(${productCounter}); calculateRowAndTotal(${productCounter})" style="display: none; padding: 2px 5px; border-radius: 4px; border: 1px solid #ffb74d;">
                                    <option value="1">1 โปร</option>
                                    <option value="2">2 โปร</option>
                                    <option value="3">3 โปร</option>
                                    <option value="4">4 โปร</option>
                                    <option value="5">5 โปร</option>
                                    <option value="6">6 โปร</option>
                                    <option value="7">7 โปร</option>
                                    <option value="8">8 โปร</option>
                                    <option value="9">9 โปร</option>
                                    <option value="10">10 โปร</option>
                                </select>
                            </label>
                        </div>
                    </div>
                    
                    <!-- Line break to force next elements to new row -->
                    <div style="flex-basis: 100%; height: 0; margin: 0;"></div>
                    
                    <div class="qty-group">
                        <input type="number" class="product-qty" id="qty_${productCounter}" placeholder="0" min="1" required oninput="calculateRowAndTotal(${productCounter})">
                        <select id="unit_${productCounter}" class="qty-label" style="border: none; background: transparent; cursor: pointer; appearance: auto; -webkit-appearance: auto; padding: 0 5px; outline: none; font-size: inherit; font-family: inherit; color: inherit;">
                            <option value="ชิ้น">ชิ้น</option>
                            <option value="กิโลกรัม">กิโลกรัม</option>
                            <option value="กรัม">กรัม</option>
                            <option value="กระปุก">กระปุก</option>
                            <option value="ขวด">ขวด</option>
                            <option value="ถุง">ถุง</option>
                            <option value="kg.">kg.</option>
                            <option value="ชุด">ชุด</option>
                            <option value="ลิตร">ลิตร</option>
                        </select>
                    </div>
                    <div class="price-group">
                        <input type="number" class="product-price" id="price_${productCounter}" placeholder="0.00" min="0" step="0.01" required oninput="calculateRowAndTotal(${productCounter})">
                        <span class="qty-label">บาท</span>
                    </div>
                    <div class="row-amount">
                        <span id="rowAmount_${productCounter}">0.00</span>&nbsp;บาท
                    </div>
                    <button type="button" class="remove-product-btn" onclick="removeProduct(${productCounter})" title="ลบรายการนี้">×</button>
                </div>
            `;

            container.appendChild(newItem);

            // Setup custom dropdown for the new item
            setupCustomDropdown(productCounter);

            // Handle FDA mode required attributes
            if (document.body.classList.contains('is-fda-doc')) {
                const newQty = document.getElementById('qty_' + productCounter);
                const newPrice = document.getElementById('price_' + productCounter);
                if(newQty) { newQty.removeAttribute('required'); newQty.value = 1; }
                if(newPrice) { newPrice.removeAttribute('required'); newPrice.value = 0; }
            }

            // Animate
            newItem.style.opacity = '0';
            newItem.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                newItem.style.transition = 'all 0.3s ease';
                newItem.style.opacity = '1';
                newItem.style.transform = 'translateY(0)';
            }, 10);
        }

        // Remove product item
        function removeProduct(itemId) {
            const item = document.getElementById('productItem_' + itemId);
            if (item) {
                const allItems = document.querySelectorAll('.product-item');
                if (allItems.length <= 1) {
                    alert('ต้องมีรายการสินค้าอย่างน้อย 1 รายการ');
                    return;
                }

                // Animate removal
                item.style.transition = 'all 0.3s ease';
                item.style.opacity = '0';
                item.style.transform = 'translateX(20px)';
                setTimeout(() => {
                    item.remove();
                    calculateTotal();
                }, 300);
            }
        }

        function calculateRowAndTotal(itemId) {
            const promoCheckbox = document.getElementById('promoCheckbox_' + itemId);
            const promoMultiplier = document.getElementById('promoMultiplier_' + itemId);
            const isPromo = promoCheckbox && promoCheckbox.checked;

            const qty = parseFloat(document.getElementById('qty_' + itemId).value) || 0;
            const price = parseFloat(document.getElementById('price_' + itemId).value) || 0;

            let rowAmount = qty * price;
            if (isPromo) {
                const multiplier = promoMultiplier ? (parseInt(promoMultiplier.value) || 1) : 1;
                rowAmount = 1000 * multiplier;
            }

            const rowTotalElement = document.getElementById('rowAmount_' + itemId);
            if (rowTotalElement) rowTotalElement.textContent = rowAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            calculateTotal();
        }

        function handleDepositConditionChange() {
            const depositCondition = document.getElementById('depositCondition').value;
            const customDepositAmount = document.getElementById('customDepositAmount');
            if (depositCondition === 'custom') {
                customDepositAmount.style.display = 'block';
            } else {
                customDepositAmount.style.display = 'none';
                customDepositAmount.value = '';
            }
            calculateTotal();
        }

        function getValidProductCount() {
            let count = 0;
            const items = document.querySelectorAll('.product-item');
            items.forEach(item => {
                const itemId = item.id.split('_')[1];
                const nameInput = document.getElementById('productName_' + itemId);
                if (nameInput && nameInput.value.trim() !== '') {
                    count++;
                }
            });
            return count > 0 ? count : 1;
        }

        function calculateTotal() {
            let subTotal = 0;
            
            // Add FDA Service Fees
            const docType = document.getElementById('docType') ? document.getElementById('docType').value : 'Q';
            if (docType === 'quotation_fda_psf') {
                const numProducts = getValidProductCount();
                const regCheck = document.getElementById('fdaServiceRegister');
                const tmCheck = document.getElementById('fdaServiceTrademark');
                if (regCheck && regCheck.checked) subTotal += (parseFloat(document.getElementById('fdaServiceRegisterPrice').value) || 0) * numProducts;
                if (tmCheck && tmCheck.checked) subTotal += (parseFloat(document.getElementById('fdaServiceTrademarkPrice').value) || 0) * numProducts;
            }

            const items = document.querySelectorAll('.product-item');

            items.forEach(item => {
                const itemId = item.id.split('_')[1];
                const promoCheckbox = document.getElementById('promoCheckbox_' + itemId);
                const promoMultiplier = document.getElementById('promoMultiplier_' + itemId);
                const isPromo = promoCheckbox && promoCheckbox.checked;

                const qty = parseFloat(document.getElementById('qty_' + itemId).value) || 0;
                const price = parseFloat(document.getElementById('price_' + itemId).value) || 0;

                if (isPromo) {
                    const multiplier = promoMultiplier ? (parseInt(promoMultiplier.value) || 1) : 1;
                    subTotal += 1000 * multiplier;
                } else {
                    subTotal += (qty * price);
                }
            });

            const showDiscount = document.getElementById('showDiscountInPrint');
            const discountPercent = document.getElementById('discountPercent');
            const discountRate = discountPercent ? (parseFloat(discountPercent.value) || 0) : 0;
            const discountFull = subTotal * (discountRate / 100);
            // ส่วนลดจะรวมเข้า Grand Total เฉพาะเมื่อติ๊ก checkbox
            const discountApplied = (showDiscount && showDiscount.checked) ? discountFull : 0;

            const discountInput = document.getElementById('discount');
            if (discountInput) discountInput.value = discountFull;

            const discountDisplayInfo = document.getElementById('discountValueDisplay');
            if (discountDisplayInfo) {
                discountDisplayInfo.textContent = '-' + discountFull.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' บาท';
                discountDisplayInfo.style.color = (showDiscount && showDiscount.checked) ? 'red' : '#999';
                discountDisplayInfo.style.textDecoration = (showDiscount && showDiscount.checked) ? 'none' : 'line-through';
            }

            // Balance = Sub Total - Discount (เฉพาะเมื่อติ๊ก checkbox)
            const balance = Math.max(0, subTotal - discountApplied);

            const showVat = document.getElementById('showVatInPrint');
            const vatRate = document.getElementById('vatType') ? parseFloat(document.getElementById('vatType').value) || 0 : 0;
            const vatFull = balance * (vatRate / 100);
            // VAT จะรวมเข้า Grand Total เฉพาะเมื่อติ๊ก checkbox
            const vatApplied = (showVat && showVat.checked) ? vatFull : 0;

            const showShipping = document.getElementById('showShippingInPrint');
            const shippingCostInput = document.getElementById('shippingCost');
            const shippingFull = shippingCostInput ? (parseFloat(shippingCostInput.value) || 0) : 0;
            // ค่าจัดส่งจะรวมเข้า Grand Total เฉพาะเมื่อติ๊ก checkbox
            const shippingApplied = (showShipping && showShipping.checked) ? shippingFull : 0;

            const showDesignFee = document.getElementById('showDesignFeeInPrint');
            const designFeeInput = document.getElementById('designFee');
            const designFeeFull = designFeeInput ? (parseFloat(designFeeInput.value) || 0) : 0;
            // ค่าออกแบบจะรวมเข้า Grand Total เฉพาะเมื่อติ๊ก checkbox
            const designFeeApplied = (showDesignFee && showDesignFee.checked) ? designFeeFull : 0;

            // Grand Total = รวมเฉพาะรายการที่ติ๊ก checkbox แล้ว
            const totalAmount = balance + vatApplied + shippingApplied + designFeeApplied;

            document.getElementById('displaySubTotal').textContent = subTotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' บาท';

            const displayBalance = document.getElementById('displayBalance');
            if (displayBalance) {
                displayBalance.textContent = balance.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' บาท';
                displayBalance.style.color = (showDiscount && showDiscount.checked) ? 'black' : '#999';
            }

            const displayVat = document.getElementById('displayVat');
            displayVat.textContent = vatFull.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' บาท';
            displayVat.style.color = (showVat && showVat.checked) ? 'black' : '#999';
            displayVat.style.textDecoration = (showVat && showVat.checked) ? 'none' : 'line-through';

            document.getElementById('displayTotalAmount').textContent = totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' บาท';

            // Deposit Logic
            const depositCondition = document.getElementById('depositCondition');
            const customDepositAmount = document.getElementById('customDepositAmount');
            const summaryDepositRow = document.getElementById('summaryDepositRow');
            const summaryRemainingRow = document.getElementById('summaryRemainingRow');
            const showDeposit = document.getElementById('showDepositInPrint');

            if (depositCondition && (parseInt(depositCondition.value) > 0 || depositCondition.value === 'custom') && showDeposit && showDeposit.checked) {
                let depAmount = 0;
                let isCustom = depositCondition.value === 'custom';

                if (isCustom) {
                    depAmount = parseFloat(customDepositAmount.value) || 0;
                    document.getElementById('summaryDepositPercentInfo').textContent = '(ระบุเอง)';
                } else {
                    const depPercent = parseInt(depositCondition.value);
                    depAmount = totalAmount * (depPercent / 100);
                    document.getElementById('summaryDepositPercentInfo').textContent = `(${depPercent}%)`;
                }

                // Cap deposit to total amount
                if (depAmount > totalAmount) depAmount = totalAmount;
                const remAmount = totalAmount - depAmount;

                document.getElementById('displayDepositAmount').textContent = depAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' บาท';
                document.getElementById('displayRemainingAmount').textContent = remAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' บาท';

                if (summaryDepositRow) summaryDepositRow.style.display = 'flex';
                if (summaryRemainingRow) summaryRemainingRow.style.display = 'flex';
            } else {
                if (summaryDepositRow) summaryDepositRow.style.display = 'none';
                if (summaryRemainingRow) summaryRemainingRow.style.display = 'none';
            }
        }

        function handleFdaServiceChange() {
            const regCheck = document.getElementById('fdaServiceRegister');
            const tmCheck = document.getElementById('fdaServiceTrademark');
            const projectName = document.getElementById('fdaProjectName');
            
            let projects = [];
            if (regCheck && regCheck.checked) projects.push('ขึ้นทะเบียนตำรับยา (G)');
            if (tmCheck && tmCheck.checked) projects.push('ยื่นจดทะเบียนเครื่องหมายการค้า');
            
            if (projectName) projectName.value = projects.join(' และ ') || '';
            
            calculateTotal();
        }

        // Get all products
        function getProductsData(skipValidation = false, forSheetSubmit = false) {
            const products = [];
            let hasError = false;
            let subTotal = 0;

            const docType = document.getElementById('docType') ? document.getElementById('docType').value : 'Q';
            
            if (docType === 'quotation_fda_psf' && forSheetSubmit) {
                const numProducts = getValidProductCount();
                const regCheck = document.getElementById('fdaServiceRegister');
                const tmCheck = document.getElementById('fdaServiceTrademark');
                
                if (regCheck && regCheck.checked) {
                    const price = parseFloat(document.getElementById('fdaServiceRegisterPrice').value) || 0;
                    const amount = price * numProducts;
                    products.push({ pic: '', name: 'จดแจ้ง อย.', quantity: numProducts, unitPrice: price, amount: amount, unit: 'บริการ' });
                    subTotal += amount;
                }
                
                if (tmCheck && tmCheck.checked) {
                    const price = parseFloat(document.getElementById('fdaServiceTrademarkPrice').value) || 0;
                    const amount = price * numProducts;
                    products.push({ pic: '', name: 'จดแจ้งเครื่องหมายการค้า', quantity: numProducts, unitPrice: price, amount: amount, unit: 'บริการ' });
                    subTotal += amount;
                }
                
                if (!skipValidation) {
                    if (products.length === 0) {
                        return { error: true, message: 'กรุณาเลือกบริการอย่างน้อย 1 รายการ (สำหรับใบเสนอราคา อย.)' };
                    }
                }
                
                return { error: false, products, subTotal };
            }

            const items = document.querySelectorAll('.product-item');

            items.forEach(item => {
                const itemId = item.id.split('_')[1];
                const picInput = document.getElementById('productPicBase64_' + itemId);
                const nameInput = document.getElementById('productName_' + itemId);
                const qtyInput = document.getElementById('qty_' + itemId);
                const priceInput = document.getElementById('price_' + itemId);

                const pic = picInput ? picInput.value.trim() : '';
                const name = nameInput.value.trim();

                // If name is completely empty, we can just skip this row like the standard print does
                if (!name) return;

                const qty = parseFloat(qtyInput.value);
                const price = parseFloat(priceInput.value);

                const promoCheckbox = document.getElementById('promoCheckbox_' + itemId);
                const promoMultiplier = document.getElementById('promoMultiplier_' + itemId);
                const isPromo = promoCheckbox && promoCheckbox.checked;

                if (isNaN(qty) || qty < 1 || isNaN(price) || price < 0) {
                    hasError = true;
                } else {
                    let amount = qty * price;
                    if (isPromo) {
                        const multiplier = promoMultiplier ? (parseInt(promoMultiplier.value) || 1) : 1;
                        amount = 1000 * multiplier;
                    }
                    subTotal += amount;
                    const unitInput = document.getElementById('unit_' + itemId);
                    const unit = unitInput ? unitInput.value : 'ชิ้น';
                    products.push({ pic, name, quantity: qty, unitPrice: price, amount: amount, unit: unit });
                }
            });

            if (!skipValidation) {
                if (hasError) {
                    return { error: true, message: 'กรุณากรอกข้อมูลสินค้าให้ถูกต้องและครบถ้วน' };
                }
                if (products.length === 0) {
                    return { error: true, message: 'กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ' };
                }
            }

            return { error: false, products, subTotal };
        }

        // Submit Form
        document.getElementById('billForm').addEventListener('submit', function (e) {
            e.preventDefault();

            // Guard: ถ้าเลขที่ยังโหลดอยู่ ห้ามบันทึก
            const billNoVal = document.getElementById('billNo').value;
            if (!billNoVal || billNoVal === 'กำลังโหลดเลข...' || document.getElementById('billNo').disabled) {
                alert('⏳ กรุณารอให้ระบบโหลดเลขที่เอกสารให้เสร็จก่อนกดบันทึก');
                return;
            }

            const submitBtn = document.getElementById('submitBtn');
            const loading = document.getElementById('loading');
            const message = document.getElementById('message');
            const form = document.getElementById('billForm');

            const productData = getProductsData(false, true);
            if (productData.error) {
                alert(productData.message);
                return;
            }

            const discount = parseFloat(document.getElementById('discount').value) || 0;
            const balance = Math.max(0, productData.subTotal - discount);

            const vatRate = parseFloat(document.getElementById('vatType').value) || 0;
            const vatAmount = balance * (vatRate / 100);
            const shippingCostInput = document.getElementById('shippingCost');
            const shippingCost = shippingCostInput ? (parseFloat(shippingCostInput.value) || 0) : 0;
            const designFeeInput = document.getElementById('designFee');
            let designFee = designFeeInput ? (parseFloat(designFeeInput.value) || 0) : 0;
            const docTypeForFee = document.getElementById('docType') ? document.getElementById('docType').value : '';
            if (docTypeForFee === 'quotation_fda_psf') {
                designFee = 0;
            }
            const totalAmount = balance + vatAmount + shippingCost + designFee;

            // Sync the visual editable div to the hidden text input before submitting
            // Assuming there's a hidden input with id 'notes' to store the plain text for submission
            // If not, the 'notes' field in formData can directly use document.getElementById('editableNotes').innerText
            const notesForSubmission = document.getElementById('editableNotes').innerText;

            let finalDepositCondition = '0';
            const depCondEl = document.getElementById('depositCondition');
            if (depCondEl) {
                if (depCondEl.value === 'custom') {
                    const customAmt = document.getElementById('customDepositAmount');
                    finalDepositCondition = customAmt && customAmt.value ? (parseFloat(customAmt.value) || 0).toLocaleString('th-TH') + ' บาท' : '0 บาท';
                } else if (depCondEl.value !== '0') {
                    finalDepositCondition = depCondEl.value + '%';
                }
            }

            const formData = {
                billNo: document.getElementById('billNo').value,
                billDate: document.getElementById('billDate').value,
                reference: '-',
                customerName: document.getElementById('customerName').value,
                address: document.getElementById('address').value || '-',
                phone: document.getElementById('phone').value || '-',
                taxId: document.getElementById('taxId').value || '-',
                products: productData.products,
                subTotal: productData.subTotal,
                discount: discount,
                balance: balance,
                vatRate: vatRate,
                vatAmount: vatAmount,
                shippingCost: shippingCost,
                showShippingInPrint: document.getElementById('showShippingInPrint') ? document.getElementById('showShippingInPrint').checked : true,
                designFee: designFee,
                showDesignFeeInPrint: document.getElementById('showDesignFeeInPrint') ? document.getElementById('showDesignFeeInPrint').checked : false,
                totalAmount: totalAmount,
                billStatus: document.getElementById('billStatus').value,
                docType: document.getElementById('docType').value,
                notes: notesForSubmission || '-', // Use the plain text from editableNotes
                depositCondition: finalDepositCondition,
                showDepositInPrint: document.getElementById('showDepositInPrint') ? document.getElementById('showDepositInPrint').checked : true,
                // Additional fields from the instruction, if they are meant to be added to formData
                discountPercent: document.getElementById('discountPercent') ? document.getElementById('discountPercent').value : 0,
                discountValue: discount,
                vatType: document.getElementById('vatType') ? document.getElementById('vatType').value : 0,
                showVatInPrint: document.getElementById('showVatInPrint') ? document.getElementById('showVatInPrint').checked : false,
                totalAmount: totalAmount
            };

            // Show loading
            submitBtn.disabled = true;
            form.style.display = 'none';
            loading.classList.add('show');
            message.className = 'message';

            google.script.run
                .withSuccessHandler(function (response) {
                    loading.classList.remove('show');

                    if (response.success) {
                        message.textContent = '✅ ' + response.message;
                        message.className = 'message success';

                        // Show success message and action buttons
                        document.getElementById('successActions').style.display = 'block';

                    } else {
                        message.textContent = '❌ ' + response.message;
                        message.className = 'message error';
                        form.style.display = 'block';
                        submitBtn.disabled = false;
                    }
                })
                .withFailureHandler(function (error) {
                    loading.classList.remove('show');
                    message.textContent = '❌ เกิดข้อผิดพลาด: ' + error.message;
                    message.className = 'message error';
                    form.style.display = 'block';
                    submitBtn.disabled = false;
                })
                .submitBillForm(formData);
        });

        // Go Home
        function goToHome() {
            document.getElementById('pageLoadingOverlay').classList.add('show');
            setTimeout(function () {
                window.top.location.replace('https://script.google.com/macros/s/AKfycbxQ7Z6lVP_yZxd52xMMKZ67BuDVdmkbiyoSx51b68Bp7JOfTSE4myRuCkUBAdSlU9-K/exec?page=home');
            }, 100);
        }

        // Reset for new bill
        function resetFormForNewBill() {
            const form = document.getElementById('billForm');
            const submitBtn = document.getElementById('submitBtn');
            const message = document.getElementById('message');

            form.reset();
            currentNoteType = ''; // Force note reset
            document.getElementById('billDate').valueAsDate = new Date();
            document.getElementById('docType').dispatchEvent(new Event('change'));
            if (typeof generateAutoBillNo === 'function') generateAutoBillNo();
            // Reset products to 1 item
            document.getElementById('productsContainer').innerHTML = '';
            productCounter = 0;
            addProduct();
            calculateTotal();

            // Reset editable notes content
            document.getElementById('showDiscountInPrint').checked = false;

            const dpCond = document.getElementById('depositCondition');
            if (dpCond) {
                dpCond.value = "0";
                handleDepositConditionChange();
            }

            const spDp = document.getElementById('showDepositInPrint');
            if (spDp) spDp.checked = false;

            const cboxVat = document.getElementById('showVatInPrint');
            if (cboxVat) cboxVat.checked = false;
            const selectVat = document.getElementById('vatType');
            if (selectVat) selectVat.value = "0";

            const cboxShipping = document.getElementById('showShippingInPrint');
            if (cboxShipping) cboxShipping.checked = true;
            const inpShipping = document.getElementById('shippingCost');
            if (inpShipping) inpShipping.value = 0;

            document.getElementById('successActions').style.display = 'none';
            message.style.display = 'none';
            message.className = 'message';

            form.style.display = 'block';
            submitBtn.disabled = false;
        }

        function prepareFdaQuotationPrint() {
            // Set header info
            document.getElementById('fdaPrintBillNo').textContent = document.getElementById('billNo').value || '-';
            
            const d = document.getElementById('billDate').valueAsDate;
            let dateStr = '-';
            if (d) {
                const day = String(d.getDate()).padStart(2, '0');
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const year = d.getFullYear() + 543;
                dateStr = `${day}/${month}/${year}`;
            } else {
                dateStr = document.getElementById('billDate').value;
            }
            document.getElementById('fdaPrintDate').textContent = dateStr;

            document.getElementById('fdaPrintCustomerName').textContent = document.getElementById('customerName').value || '-';
            document.getElementById('fdaPrintPhone').textContent = document.getElementById('phone').value || '-';
            document.getElementById('fdaPrintCustomerAddress').textContent = document.getElementById('address').value || '-';
            
            const emailEl = document.getElementById('fdaEmail');
            document.getElementById('fdaPrintCustomerEmail').textContent = (emailEl && emailEl.value) ? emailEl.value : '-';
            document.getElementById('fdaPrintCustomerTaxId').textContent = document.getElementById('taxId').value || '-';
            
            document.getElementById('fdaPrintCustomerCode').textContent = document.getElementById('fdaCustomerCode').value || '';
            document.getElementById('fdaPrintProjectName').textContent = document.getElementById('fdaProjectName').value || 'ขึ้นทะเบียนตำรับยา (G)';
            document.getElementById('fdaPrintCreditTerm').textContent = document.getElementById('fdaCreditTerms').value || 'ชำระเต็มจำนวน';

            // เงื่อนไข + หมายเหตุ (อ่านจากช่องหมายเหตุในฟอร์ม)
            const fdaRemarksContainer = document.getElementById('fdaPrintRemarksContainer');
            const editableNotesEl = document.getElementById('editableNotes');
            if (fdaRemarksContainer && editableNotesEl) {
                fdaRemarksContainer.innerHTML = editableNotesEl.innerHTML;
            }

            // Signatures
            const signerVal = document.getElementById('signerSelect').value;
            if (signerVal === 'jutharat') {
                document.getElementById('fdaPrintSignature1').style.display = 'block';
                document.getElementById('fdaPrintSignature2').style.display = 'block';
            } else {
                document.getElementById('fdaPrintSignature1').style.display = 'none';
                document.getElementById('fdaPrintSignature2').style.display = 'none';
            }

            // Products
            const stepsBody = document.getElementById('fdaPrintStepsBody');
            const serviceBody = document.getElementById('fdaPrintServiceBody');
            const productBody = document.getElementById('fdaPrintProductBody');
            const stepsHeader = document.getElementById('fdaPrintStepsHeader');
            
            if (stepsBody) stepsBody.innerHTML = '';
            if (serviceBody) serviceBody.innerHTML = '';
            if (productBody) productBody.innerHTML = '';

            const productData = getProductsData(true);
            if (productData.error) {
                alert(productData.message);
                return;
            }
            const itemsList = productData.products;
            const numProducts = itemsList.length > 0 ? itemsList.length : 1;

            // Render Services
            const regCheck = document.getElementById('fdaServiceRegister');
            const tmCheck = document.getElementById('fdaServiceTrademark');
            
            if (stepsHeader) {
                let headerText = 'ขั้นตอนการดำเนินงาน';
                if (regCheck && regCheck.checked && tmCheck && tmCheck.checked) {
                    headerText += 'ขึ้นทะเบียนตำรับ อย.(G) และยื่นจดทะเบียนเครื่องหมายการค้า';
                } else if (regCheck && regCheck.checked) {
                    headerText += 'ขึ้นทะเบียนตำรับ อย.(G)';
                } else if (tmCheck && tmCheck.checked) {
                    headerText += 'ยื่นจดทะเบียนเครื่องหมายการค้า';
                }
                
                headerText += `ในการสั่งผลิต ${numProducts} ผลิตภัณฑ์`;
                stepsHeader.textContent = headerText;
            }

            let stepIndex = 1;
            if (regCheck && regCheck.checked && serviceBody) {
                const price = parseFloat(document.getElementById('fdaServiceRegisterPrice').value) || 0;
                serviceBody.innerHTML += `
                    <tr>
                        <td style="width: 10%; border: 1px solid black; padding: 4px 8px; text-align: center;">${stepIndex++}</td>
                        <td style="width: 50%; border: 1px solid black; padding: 4px 8px;" colspan="2">ค่าดำเนินการขึ้นทะเบียนผลิตภัณฑ์</td>
                        <td style="width: 25%; border: 1px solid black; padding: 4px 8px; text-align: center;">${numProducts}</td>
                        <td style="width: 15%; border: 1px solid black; padding: 4px 8px; text-align: right;">${(price * numProducts).toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    </tr>
                `;
            }
            if (tmCheck && tmCheck.checked && serviceBody) {
                const price = parseFloat(document.getElementById('fdaServiceTrademarkPrice').value) || 0;
                serviceBody.innerHTML += `
                    <tr>
                        <td style="width: 10%; border: 1px solid black; padding: 4px 8px; text-align: center;">${stepIndex++}</td>
                        <td style="width: 50%; border: 1px solid black; padding: 4px 8px;" colspan="2">ค่าดำเนินการยื่นจดเครื่องหมายการค้า</td>
                        <td style="width: 25%; border: 1px solid black; padding: 4px 8px; text-align: center;">${numProducts}</td>
                        <td style="width: 15%; border: 1px solid black; padding: 4px 8px; text-align: right;">${(price * numProducts).toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    </tr>
                `;
            }

            if (itemsList.length > 0) {
                let productIndex = 1;
                
                // Determine image size and padding based on number of products to prevent overflow
                let imgSize = '80px';
                let cellPadding = '4px 8px';
                if (itemsList.length >= 4) {
                    imgSize = '45px';
                    cellPadding = '2px 4px';
                } else if (itemsList.length === 3) {
                    imgSize = '55px';
                    cellPadding = '3px 6px';
                } else if (itemsList.length === 2) {
                    imgSize = '65px';
                }

                // Render All Products
                itemsList.forEach((productItem) => {
                    const prodRow = document.createElement('tr');
                    let picHtml = productItem.pic ? `<img src="${productItem.pic}" style="max-width: ${imgSize}; max-height: ${imgSize}; vertical-align: middle;">` : '';
                    prodRow.innerHTML = `
                        <td style="width: 10%; border: 1px solid black; padding: ${cellPadding}; text-align: center;">${productIndex++}</td>
                        <td style="width: 50%; border: 1px solid black; padding: ${cellPadding}; text-align: center;" colspan="2">
                            <span style="font-weight: bold; font-size: ${itemsList.length >= 4 ? '10pt' : 'inherit'};">${productItem.name}</span>
                        </td>
                        <td style="width: 40%; border: 1px solid black; padding: ${cellPadding}; text-align: center;" colspan="2">
                            ${picHtml}
                        </td>
                    `;
                    productBody.appendChild(prodRow);
                });
            }

            // Totals
            const subStr = document.getElementById('displaySubTotal').textContent.replace(' บาท', '');
            const vatStr = document.getElementById('displayVat').textContent.replace(' บาท', '');
            const grandStr = document.getElementById('displayTotalAmount').textContent.replace(' บาท', '');
            
            document.getElementById('fdaPrintSubTotal').textContent = subStr;
            document.getElementById('fdaPrintVat').textContent = vatStr;
            document.getElementById('fdaPrintGrandTotal').textContent = grandStr;
            
            // Allow DOM to update before triggering print dialog
            setTimeout(() => {
                scalePrintToFit();
                window.print();
            }, 100);
        }

        // Auto-scale print container to fit one A4 page
        function scalePrintToFit() {
            const activeContainer = document.querySelector('.active-print');
            if (!activeContainer) return;
            
            // Reset any previous scale
            activeContainer.style.transform = '';
            activeContainer.style.transformOrigin = 'top left';
            
            // A4 height ~297mm, minus 10mm margins top/bottom = ~277mm ≈ 1046px at 96dpi
            // We use a very conservative max (960) to ensure the content doesn't overflow,
            // especially when the user checks 'Headers and footers' in Chrome 'Save as PDF'.
            const maxHeight = 960;
            const actualHeight = activeContainer.scrollHeight;
            
            if (actualHeight > maxHeight) {
                const scale = maxHeight / actualHeight;
                activeContainer.style.transform = `scale(${scale})`;
                activeContainer.style.transformOrigin = 'top left';
                activeContainer.style.width = `${100 / scale}%`;
            }
        }

        // Reset scale after print
        window.addEventListener('afterprint', function() {
            const activeContainer = document.querySelector('.active-print');
            if (activeContainer) {
                activeContainer.style.transform = '';
                activeContainer.style.width = '100%';
            }
        });

        // Prepare and Print custom layout
        