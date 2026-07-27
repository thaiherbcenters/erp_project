const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../../src/pages/Sales.jsx');
let content = fs.readFileSync(file, 'utf8');

const uiBlock = `
            {/* -------------------- INVOICE / DELIVERY ORDER -------------------- */}
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ margin: 0, fontSize: '24px', color: '#1e293b' }}>จัดการใบแจ้งหนี้/ใบส่งสินค้า</h2>
                            {hasSectionPermission('sales_tax_invoice_table') && (
                                <button className="btn-primary" onClick={() => { setEditTaxInvoiceId(null); setShowTaxInvoiceForm(true); }}>
                                    <Plus size={18} style={{ marginRight: '8px' }} /> สร้างเอกสารใหม่
                                </button>
                            )}
                        </div>

                        {hasSectionPermission('sales_tax_invoice_search') && (
                            <div className="search-bar-container" style={{ marginBottom: '24px' }}>
                                <div className="search-input-wrapper" style={{ maxWidth: '400px' }}>
                                    <Search size={18} className="search-icon" />
                                    <input
                                        type="text"
                                        placeholder="ค้นหาเลขที่เอกสาร หรือ ชื่อลูกค้า..."
                                        className="search-input"
                                        value={taxInvoiceSearch}
                                        onChange={(e) => {
                                            setTaxInvoiceSearch(e.target.value);
                                            setTaxInvoicePagination(p => ({ ...p, page: 1 }));
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {hasSectionPermission('sales_tax_invoice_table') && (
                            <div className="table-responsive" style={{ backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>เลขที่เอกสาร</th>
                                            <th>ชื่อลูกค้า</th>
                                            <th>วันที่ออกเอกสาร</th>
                                            <th>ยอดรวม</th>
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
                                                    <span className={\`status-badge \${doc.Status === 'อนุมัติแล้ว' ? 'completed' : doc.Status === 'รออนุมัติ' ? 'progress' : doc.Status === 'ยกเลิก' ? 'cancelled' : 'pending'}\`}>
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
            )}
`;

if (!content.includes('INVOICE / DELIVERY ORDER')) {
    content = content.replace(
        "{/* -------------------- SALES ORDER -------------------- */}",
        uiBlock + "\n            {/* -------------------- SALES ORDER -------------------- */}"
    );
    fs.writeFileSync(file, content, 'utf8');
    console.log('Inserted UI block successfully');
} else {
    console.log('UI block already exists');
}
