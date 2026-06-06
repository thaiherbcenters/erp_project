export const printTemplateHTML = `<div id="printContainer">
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

    
`;
