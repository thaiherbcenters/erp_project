import React, { useEffect, useRef } from 'react';
import { printTemplateHTML } from './billingPrintTemplates';

const BillingPrintContainer = ({ formData }) => {
    const containerRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current || !formData) return;
        const root = containerRef.current;

        // Helper to set text content
        const setText = (id, text) => {
            const el = root.querySelector('#' + id);
            if (el) el.textContent = text || '-';
        };
        // Helper to set html
        const setHtml = (id, html) => {
            const el = root.querySelector('#' + id);
            if (el) el.innerHTML = html || '&nbsp;';
        };

        const docType = formData.docType || 'quotation_thc';
        const isFullTaxInvoice = docType.includes('full_tax_invoice');
        const isSleekLayout = !isFullTaxInvoice && (docType.includes('receipt') || docType.includes('tax_invoice'));
        const isFDA = docType.includes('quotation_fda');

        // Toggle visibility of the right container
        const pContainer = root.querySelector('#printContainer');
        const pReceipt = root.querySelector('#printContainerReceipt');
        const pFullTax = root.querySelector('#printContainerFullTaxInvoice');
        const pFDA = root.querySelector('#printContainerFdaQuotation');

        if (pContainer) pContainer.classList.toggle('active-print', !isSleekLayout && !isFullTaxInvoice && !isFDA);
        if (pReceipt) pReceipt.classList.toggle('active-print', isSleekLayout);
        if (pFullTax) pFullTax.classList.toggle('active-print', isFullTaxInvoice);
        if (pFDA) pFDA.classList.toggle('active-print', isFDA);

        // Date formatting helper
        const formatDate = (dateStr) => {
            if (!dateStr) return '-';
            try {
                const d = new Date(dateStr);
                const day = String(d.getDate()).padStart(2, '0');
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const year = d.getFullYear() + 543;
                return `${day}/${month}/${year}`;
            } catch (e) {
                return dateStr;
            }
        };
        const fDate = formatDate(formData.billDate);

        // Thai Baht formatter (simplified version, should be replaced with real ThaiBaht function)
        const formatThaiBaht = (amount) => {
             // In a real app we would use a full th-baht-text library.
             // For now we just return a placeholder or use the raw number.
             return "บาทถ้วน"; 
        };

        const totalAmt = parseFloat(formData.totalAmount) || 0;
        const subAmt = parseFloat(formData.subTotal) || 0;
        const vatAmt = parseFloat(formData.vatAmount) || 0;
        const discountAmt = parseFloat(formData.discount) || 0;
        const shippingAmt = parseFloat(formData.shippingCost) || 0;
        const designAmt = parseFloat(formData.designFee) || 0;

        const subStr = subAmt.toLocaleString('th-TH', { minimumFractionDigits: 2 });
        const discStr = discountAmt.toLocaleString('th-TH', { minimumFractionDigits: 2 });
        const vatStr = vatAmt.toLocaleString('th-TH', { minimumFractionDigits: 2 });
        const grandStr = totalAmt.toLocaleString('th-TH', { minimumFractionDigits: 2 });
        const shippingStr = shippingAmt.toLocaleString('th-TH', { minimumFractionDigits: 2 });
        const designStr = designAmt.toLocaleString('th-TH', { minimumFractionDigits: 2 });

        if (isFDA) {
            setText('fdaPrintBillNo', formData.billNo);
            setText('fdaPrintDate', fDate);
            setText('fdaPrintCustomerName', formData.customerName);
            setText('fdaPrintPhone', formData.phone);
            setText('fdaPrintCustomerAddress', formData.address);
            setText('fdaPrintCustomerTaxId', formData.taxId);
            
            setHtml('fdaPrintRemarksContainer', formData.notes);
            
            setText('fdaPrintSubTotal', subStr);
            setText('fdaPrintVat', vatStr);
            setText('fdaPrintGrandTotal', grandStr);
            
            // Build FDA Products/Services
            const serviceBody = root.querySelector('#fdaPrintServiceBody');
            const productBody = root.querySelector('#fdaPrintProductBody');
            if(serviceBody) serviceBody.innerHTML = '';
            if(productBody) productBody.innerHTML = '';
            
            const numProducts = formData.products.length > 0 ? formData.products.length : 1;
            let stepIndex = 1;
            if (formData.fdaServiceRegister && serviceBody) {
                const price = parseFloat(formData.fdaServiceRegisterPrice) || 0;
                serviceBody.innerHTML += `
                    <tr>
                        <td style="width: 10%; border: 1px solid black; padding: 4px 8px; text-align: center;">${stepIndex++}</td>
                        <td style="width: 50%; border: 1px solid black; padding: 4px 8px;" colspan="2">ค่าดำเนินการขึ้นทะเบียนผลิตภัณฑ์</td>
                        <td style="width: 25%; border: 1px solid black; padding: 4px 8px; text-align: center;">${numProducts}</td>
                        <td style="width: 15%; border: 1px solid black; padding: 4px 8px; text-align: right;">${(price * numProducts).toLocaleString('th-TH', {minimumFractionDigits: 2})}</td>
                    </tr>
                `;
            }
            if (formData.products && productBody) {
                formData.products.forEach((p, idx) => {
                    const picHtml = p.pic ? `<img src="${p.pic}" style="max-width: 55px; max-height: 55px; vertical-align: middle;">` : '';
                    productBody.innerHTML += `
                        <tr>
                            <td style="width: 10%; border: 1px solid black; padding: 4px 8px; text-align: center;">${idx+1}</td>
                            <td style="width: 50%; border: 1px solid black; padding: 4px 8px; text-align: center;" colspan="2"><span style="font-weight: bold;">${p.name}</span></td>
                            <td style="width: 40%; border: 1px solid black; padding: 4px 8px; text-align: center;" colspan="2">${picHtml}</td>
                        </tr>
                    `;
                });
            }
            
        } else if (isFullTaxInvoice) {
            // Fill Full Tax Invoice
            setText('fullTaxPrintBillNo', formData.billNo);
            setText('fullTaxPrintDate', fDate);
            setText('fullTaxPrintCustomerName', formData.customerName);
            setText('fullTaxPrintCustomerAddress', formData.address);
            setText('fullTaxPrintCustomerTaxId', formData.taxId);
            setText('fullTaxPrintCustomerPhone', formData.phone);
            
            setText('fullTaxPrintSubTotal', subStr);
            setText('fullTaxPrintGrandTotal', grandStr);
            
            const tbody = root.querySelector('#fullTaxPrintItemsBody');
            if (tbody) {
                tbody.innerHTML = '';
                formData.products.forEach((p, i) => {
                    tbody.innerHTML += `
                        <tr>
                            <td style="padding: 8px 5px; text-align: center;">${i+1}</td>
                            <td style="padding: 8px 5px; text-align: left;">${p.name}</td>
                            <td style="padding: 8px 5px; text-align: center;">${p.quantity} ${p.unit}</td>
                            <td style="padding: 8px 5px; text-align: right;">${parseFloat(p.unitPrice).toLocaleString('th-TH', {minimumFractionDigits: 2})}</td>
                            <td style="padding: 8px 5px; text-align: right;">-</td>
                            <td style="padding: 8px 5px; text-align: right;">${parseFloat(p.amount).toLocaleString('th-TH', {minimumFractionDigits: 2})}</td>
                        </tr>
                    `;
                });
            }
        } else if (isSleekLayout) {
            setText('rcptPrintBillNo', formData.billNo);
            setText('rcptPrintBillDate', fDate);
            setText('rcptPrintCustomerName', formData.customerName);
            setText('rcptPrintAddress', formData.address);
            setText('rcptPrintPhone', formData.phone);
            setText('rcptPrintTaxId', formData.taxId);
            
            setText('rcptPrintSubTotal', subStr);
            setText('rcptPrintVat', vatStr);
            setText('rcptPrintGrandTotal', grandStr);
            
            setHtml('rcptPrintRemarksContainer', formData.notes);

            const tbody = root.querySelector('#rcptPrintProductsBody');
            if (tbody) {
                tbody.innerHTML = '';
                formData.products.forEach((p, i) => {
                    const picHtml = p.pic ? `<img src="${p.pic}" style="max-width: 100%; max-height: 40px; object-fit: contain; padding: 5px;">` : '';
                    tbody.innerHTML += `
                        <tr>
                            <td style="border-right: 1px solid #1a7a3a; border-bottom: 1px solid #1a7a3a; text-align: center;">${i+1}</td>
                            <td style="border-right: 1px solid #1a7a3a; border-bottom: 1px solid #1a7a3a; text-align: left;">${p.name}</td>
                            <td style="border-right: 1px solid #1a7a3a; border-bottom: 1px solid #1a7a3a; text-align: center;">${p.quantity} ${p.unit}</td>
                            <td style="border-right: 1px solid #1a7a3a; border-bottom: 1px solid #1a7a3a; text-align: right;">${parseFloat(p.unitPrice).toLocaleString('th-TH', {minimumFractionDigits: 2})}</td>
                            <td style="border-right: 1px solid #1a7a3a; border-bottom: 1px solid #1a7a3a; text-align: center;">-</td>
                            <td style="border-bottom: 1px solid #1a7a3a; text-align: right;">${parseFloat(p.amount).toLocaleString('th-TH', {minimumFractionDigits: 2})}</td>
                        </tr>
                    `;
                });
            }
        } else {
            // Default Quotation/Billing Note
            setText('printBillNo', formData.billNo);
            setText('printBillDate', fDate);
            setText('printCustomerName', formData.customerName);
            setText('printAddress', formData.address);
            setText('printPhone', formData.phone);
            setText('printTaxId', formData.taxId);
            
            setText('printSubTotal', subStr);
            setText('printDiscount', discStr);
            setText('printVat', vatStr);
            setText('printShippingCost', shippingStr);
            setText('printDesignFee', designStr);
            setText('printGrandTotal', grandStr);

            setHtml('printRemarksContainer', formData.notes);

            // visibility toggles based on form flags
            const pDiscountRow = root.querySelector('#printDiscountRow');
            const pPostDiscountRow = root.querySelector('#printPostDiscountRow');
            const pVatRow = root.querySelector('#printVatRow');
            const pShippingRow = root.querySelector('#printShippingRow');
            const pDesignFeeRow = root.querySelector('#printDesignFeeRow');
            
            if (pDiscountRow) pDiscountRow.style.display = formData.showDiscountInPrint ? '' : 'none';
            if (pPostDiscountRow) pPostDiscountRow.style.display = formData.showDiscountInPrint ? '' : 'none';
            if (pVatRow) pVatRow.style.display = formData.showVatInPrint ? '' : 'none';
            if (pShippingRow) pShippingRow.style.display = formData.showShippingInPrint ? '' : 'none';
            if (pDesignFeeRow) pDesignFeeRow.style.display = formData.showDesignFeeInPrint ? '' : 'none';

            const tbody = root.querySelector('#printProductsBody');
            if (tbody) {
                tbody.innerHTML = '';
                formData.products.forEach((p, i) => {
                    const picHtml = p.pic ? `<img src="${p.pic}" style="max-width: 55px; max-height: 55px; object-fit: contain; padding: 5px;">` : '';
                    tbody.innerHTML += `
                        <tr>
                            <td>${i+1}</td>
                            <td style="text-align: center; vertical-align: middle;">${picHtml}</td>
                            <td class="desc-col">${p.name}</td>
                            <td>${p.quantity} ${p.unit}</td>
                            <td class="amount-col">${parseFloat(p.unitPrice).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                            <td class="amount-col">${parseFloat(p.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                        </tr>
                    `;
                });
            }
        }
    }, [formData]);

    return (
        <div className="billing-print-area">
            <style>{`
                @media screen {
                    .billing-print-area {
                        display: none !important;
                    }
                }
                @media print {
                    body * { visibility: hidden; }
                    .billing-print-area, .billing-print-area * { visibility: visible; }
                    .billing-print-area { position: absolute; left: 0; top: 0; width: 100%; }
                }
            `}</style>
            <div ref={containerRef} dangerouslySetInnerHTML={{ __html: printTemplateHTML }} />
        </div>
    );
};

export default BillingPrintContainer;
