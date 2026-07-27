const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../../src/pages/Sales.jsx');
let content = fs.readFileSync(file, 'utf8');

const newUIBlock = `
            {/* ── Tab: INVOICE / DELIVERY ORDER ── */}
            {(activeTab === 'sales_tax_invoice' && hasSubPermission('sales_tax_invoice')) && (
                showTaxInvoiceForm ? (
                    <TaxInvoiceForm
                        editId={editTaxInvoiceId}
                        onBack={() => {
                            setShowTaxInvoiceForm(false);
                            fetchTaxInvoices();
                        }}
                    />
                ) : (
                    <div className="subpage-content" key="sales_tax_invoice">
                        <div className="contract-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <div>
                                <h1 className="contract-title" style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>
                                    <Receipt size={24} color="#1e40af" />
                                    ใบแจ้งหนี้/ใบส่งสินค้า (Invoice/Delivery Order)
                                </h1>
                                <p className="contract-subtitle" style={{ margin: '0', color: '#64748b', fontSize: '14px' }}>สร้างและจัดการข้อมูลเอกสารใบแจ้งหนี้และใบส่งสินค้า</p>
                            </div>
                        </div>

                        {hasSectionPermission('sales_tax_invoice_search') && (
                            <div className="toolbar" style={{ justifyContent: 'space-between' }}>
                                <div className="search-group">
                                    <div className="search-input-wrap">
                                        <Search size={18} />
                                        <input
                                            type="text"
                                            placeholder="พิมพ์เลขที่เอกสาร หรือชื่อลูกค้า..."
                                            value={taxInvoiceSearch}
                                            onChange={(e) => setTaxInvoiceSearch(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    setTaxInvoicePagination(p => ({ ...p, page: 1 }));
                                                }
                                            }}
                                        />
                                    </div>
                                    <button className="search-btn" onClick={() => {
                                        setTaxInvoicePagination(p => ({ ...p, page: 1 }));
                                    }}>ค้นหา</button>
                                </div>
                                {hasSectionPermission('sales_tax_invoice_table') && (
                                    <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => {
                                        setEditTaxInvoiceId(null);
                                        setShowTaxInvoiceForm(true);
                                    }}>
                                        <Plus size={16} /> สร้างใบแจ้งหนี้/ใบส่งสินค้า
                                    </button>
                                )}
                            </div>
                        )}

                        {hasSectionPermission('sales_tax_invoice_table') && (
                            <div className="table-card card">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>เลขที่เอกสาร</th>
                                            <th>ชื่อลูกค้า</th>
                                            <th>วันที่ออกเอกสาร</th>
                                            <th>ยอดรวม (บาท)</th>
                                            <th>สถานะ</th>
                                            <th style={{ textAlign: 'center' }}>จัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {taxInvoices.length > 0 ? taxInvoices.map(doc => (
                                            <tr key={doc.TaxInvoiceID}>
                                                <td><span className="fw-500">{doc.TaxInvoiceNo}</span></td>
                                                <td>{doc.CustomerName}</td>
                                                <td>{new Date(doc.BillDate).toLocaleDateString('th-TH')}</td>
                                                <td>{doc.GrandTotal ? doc.GrandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</td>
                                                <td>
                                                    <span className={\`badge \${getBillingInvoiceStatusClass(doc.Status)}\`}>
                                                        {doc.Status}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <div className="action-buttons" style={{ justifyContent: 'center' }}>
                                                        <button className="btn-icon" onClick={() => setPreviewDocModal({ type: 'TaxInvoice', id: doc.TaxInvoiceID })} title="พรีวิวเอกสาร">
                                                            <Eye size={18} />
                                                        </button>
                                                        <button className="btn-icon" onClick={() => { setEditTaxInvoiceId(doc.TaxInvoiceID); setShowTaxInvoiceForm(true); }} title="แก้ไข">
                                                            <Edit size={18} />
                                                        </button>
                                                        <button className="btn-icon" style={{ color: '#ef4444' }} onClick={() => handleDeleteTaxInvoice(doc.TaxInvoiceID)} title="ลบ">
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                                                    ไม่พบข้อมูลเอกสาร
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )
            )}`;

// Find the existing block and replace it
const blockRegex = /\{\/\* ── Tab: INVOICE \/ DELIVERY ORDER ── \*\/\}[\s\S]*?(?=\{\/\* ── Tab: Sales Order ── \*\/\}|\{\/\* -------------------- SALES ORDER -------------------- \*\/\}|export default function)/m;

if (blockRegex.test(content)) {
    content = content.replace(blockRegex, newUIBlock + '\n            ');
    fs.writeFileSync(file, content, 'utf8');
    console.log('Successfully updated the UI layout to match Billing Invoice');
} else {
    console.log('Could not find the UI block using regex.');
}
