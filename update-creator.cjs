const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/RegistrationDocCreator.jsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add import
if (!content.includes('import SafetyCertForm from')) {
    content = content.replace(
        "import CorpRepForm from './CorpRepForm';",
        "import CorpRepForm from './CorpRepForm';\nimport SafetyCertForm from './SafetyCertForm';"
    );
}

// 2. Add ref
if (!content.includes('const safetyCertFormRef = useRef(null);')) {
    content = content.replace(
        "const corpRepFormRef = useRef(null);",
        "const corpRepFormRef = useRef(null);\n    const safetyCertFormRef = useRef(null);"
    );
}

// 3. Add to handleSave collectedData
if (!content.includes("typeId === 'safety_cert'")) {
    content = content.replace(
        "else if (typeId === 'corp_rep' && corpRepFormRef.current) {\n                collectedData.push(corpRepFormRef.current.getFormData());\n            }",
        "else if (typeId === 'corp_rep' && corpRepFormRef.current) {\n                collectedData.push(corpRepFormRef.current.getFormData());\n            } else if (typeId === 'safety_cert' && safetyCertFormRef.current) {\n                collectedData.push(safetyCertFormRef.current.getFormData());\n            }"
    );
}

// 4. Add to endpoint URLs
if (!content.includes("endpointBase = `${API_BASE}/safety-cert-documents`;")) {
    content = content.replace(
        "else if (type === 'corp_rep') {\n                    endpointBase = `${API_BASE}/corp-rep-documents`;\n                }",
        "else if (type === 'corp_rep') {\n                    endpointBase = `${API_BASE}/corp-rep-documents`;\n                } else if (type === 'safety_cert') {\n                    endpointBase = `${API_BASE}/safety-cert-documents`;\n                }"
    );
}

// 5. Add to setCurrentDocId
if (!content.includes("safetyCertFormRef.current.setCurrentDocId(savedId)")) {
    content = content.replace(
        "if (type === 'corp_rep' && corpRepFormRef.current && corpRepFormRef.current.setCurrentDocId) {\n                        corpRepFormRef.current.setCurrentDocId(savedId);\n                    }",
        "if (type === 'corp_rep' && corpRepFormRef.current && corpRepFormRef.current.setCurrentDocId) {\n                        corpRepFormRef.current.setCurrentDocId(savedId);\n                    }\n                    if (type === 'safety_cert' && safetyCertFormRef.current && safetyCertFormRef.current.setCurrentDocId) {\n                        safetyCertFormRef.current.setCurrentDocId(savedId);\n                    }"
    );
}

// 6. Add color to badgeStyles
if (!content.includes("safety_cert: '#10b981'")) {
    content = content.replace(
        "corp_rep: '#6366f1',",
        "corp_rep: '#6366f1',\n                                safety_cert: '#10b981',"
    );
}

// 7. Add tab rendering
if (!content.includes("activeTabId === 'safety_cert'")) {
    const corpRepHtml = `
                    <div className="doc-tab-content" style={{ display: activeTabId === 'corp_rep' ? 'block' : 'none' }}>
                        {selectedDocTypes.includes('corp_rep') && (
                            <div className="print-page-break" style={{ ...cardStyle, padding: 0, overflow: 'hidden', marginTop: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTop: '4px solid #7c3aed' }}>
                                <div style={{ padding: '0' }}>
                                    <CorpRepForm
                                        ref={corpRepFormRef}
                                        documentId={editingDocType === 'corp_rep' ? editingDocId : null}
                                        customerData={customerData}
                                        contractId={selectedContractId}
                                        embedded={true}
                                        sharedFormData={sharedFormData}
                                        onSharedDataChange={handleSharedDataChange}
                                    />
                                </div>
                            </div>
                        )}
                    </div>`;
                    
    const safetyCertHtml = `
                    <div className="doc-tab-content" style={{ display: activeTabId === 'safety_cert' ? 'block' : 'none' }}>
                        {selectedDocTypes.includes('safety_cert') && (
                            <div className="print-page-break" style={{ ...cardStyle, padding: 0, overflow: 'hidden', marginTop: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTop: '4px solid #10b981' }}>
                                <div style={{ padding: '0' }}>
                                    <SafetyCertForm
                                        ref={safetyCertFormRef}
                                        documentId={editingDocType === 'safety_cert' ? editingDocId : null}
                                        customerData={customerData}
                                        contractId={selectedContractId}
                                        embedded={true}
                                        sharedFormData={sharedFormData}
                                        onSharedDataChange={handleSharedDataChange}
                                    />
                                </div>
                            </div>
                        )}
                    </div>`;
                    
    content = content.replace(corpRepHtml, corpRepHtml + '\n' + safetyCertHtml);
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Successfully updated RegistrationDocCreator.jsx');
