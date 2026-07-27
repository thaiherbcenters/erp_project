const fs = require('fs');
let content = fs.readFileSync('src/pages/Sales.jsx', 'utf-8');

const titleBlockOld = `                                 previewDocModal.type === 'SalesOrder' ? 'พรีวิวใบสั่งขาย' : 
                                 'พรีวิวใบแจ้งหนี้/ใบส่งสินค้า'}
                            </h3>`;

const titleBlockNew = `                                 previewDocModal.type === 'SalesOrder' ? 'พรีวิวใบสั่งขาย' : 
                                 previewDocModal.type === 'DeliveryOrder' ? 'พรีวิวใบส่งสินค้า' :
                                 'พรีวิวใบแจ้งหนี้/ใบส่งสินค้า'}
                            </h3>`;

content = content.replace(titleBlockOld, titleBlockNew);

const renderBlockOld = `                            {previewDocModal.type === 'SalesOrder' && (
                                <SalesOrderForm
                                    editId={previewDocModal.id}
                                    viewOnly={true}
                                    isHistory={previewDocModal.isHistory || false}
                                    onBack={() => setPreviewDocModal(null)}
                                    onSave={() => setPreviewDocModal(null)}
                                />
                            )}
                        </div>`;

const renderBlockNew = `                            {previewDocModal.type === 'SalesOrder' && (
                                <SalesOrderForm
                                    editId={previewDocModal.id}
                                    viewOnly={true}
                                    isHistory={previewDocModal.isHistory || false}
                                    onBack={() => setPreviewDocModal(null)}
                                    onSave={() => setPreviewDocModal(null)}
                                />
                            )}
                            {previewDocModal.type === 'DeliveryOrder' && (
                                <DeliveryOrderForm
                                    editId={previewDocModal.id}
                                    viewOnly={true}
                                    onBack={() => setPreviewDocModal(null)}
                                />
                            )}
                        </div>`;

content = content.replace(renderBlockOld, renderBlockNew);
fs.writeFileSync('src/pages/Sales.jsx', content, 'utf-8');
console.log('Fixed PreviewDocModal for Delivery Order!');
