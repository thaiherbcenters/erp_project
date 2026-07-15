import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef as useRefLocal } from 'react';
import '../pages/PageCommon.css';

/**
 * IdCardInput — ช่องกรอกเลขบัตรประชาชน 13 ช่องแยกกัน (สี่เหลี่ยมบล็อก)
 */
const IdCardInput = ({ value = '', onChange, name, digitCount = 13 }) => {
    const inputRefs = Array.from({ length: digitCount }, () => useRefLocal(null));
    const digits = (value || '').padEnd(digitCount, '').split('').slice(0, digitCount);

    const handleDigitChange = (index, e) => {
        const val = e.target.value.replace(/\D/g, '');
        if (!val && e.nativeEvent.inputType === 'deleteContentBackward') {
            // Backspace: clear current and move to previous
            const newDigits = [...digits];
            newDigits[index] = '';
            onChange(newDigits.join('').replace(/\s+$/g, ''));
            if (index > 0) inputRefs[index - 1].current?.focus();
            return;
        }
        if (!val) return;
        
        const newDigits = [...digits];
        // If pasting multiple digits
        if (val.length > 1) {
            const pastedChars = val.split('');
            for (let i = 0; i < pastedChars.length && (index + i) < digitCount; i++) {
                newDigits[index + i] = pastedChars[i];
            }
            const focusIdx = Math.min(index + val.length, digitCount - 1);
            inputRefs[focusIdx].current?.focus();
        } else {
            newDigits[index] = val[0];
            if (index < digitCount - 1) inputRefs[index + 1].current?.focus();
        }
        onChange(newDigits.join('').replace(/\s+$/g, ''));
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !digits[index]?.trim() && index > 0) {
            inputRefs[index - 1].current?.focus();
        } else if (e.key === 'ArrowLeft' && index > 0) {
            inputRefs[index - 1].current?.focus();
        } else if (e.key === 'ArrowRight' && index < digitCount - 1) {
            inputRefs[index + 1].current?.focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, digitCount);
        onChange(pasted);
        const focusIdx = Math.min(pasted.length, digitCount - 1);
        setTimeout(() => inputRefs[focusIdx].current?.focus(), 50);
    };

    // กลุ่มเลขตามรูปแบบ 1-4-5-2-1
    const groups = [1, 4, 5, 2, 1];
    let globalIdx = 0;

    const boxStyle = {
        width: '24px', height: '32px',
        textAlign: 'center', fontSize: '14px', fontWeight: '600',
        border: '2px solid #cbd5e1', borderRadius: '4px',
        outline: 'none', padding: 0,
        color: '#1e293b', background: '#fff',
        transition: 'border-color 0.15s',
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexWrap: 'nowrap' }}>
            {groups.map((count, gIdx) => {
                const groupBoxes = [];
                for (let i = 0; i < count; i++) {
                    const idx = globalIdx;
                    groupBoxes.push(
                        <input
                            key={idx}
                            ref={inputRefs[idx]}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digits[idx]?.trim() || ''}
                            onChange={(e) => handleDigitChange(idx, e)}
                            onKeyDown={(e) => handleKeyDown(idx, e)}
                            onPaste={handlePaste}
                            onFocus={(e) => { e.target.select(); e.target.style.borderColor = '#3b82f6'; }}
                            onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; }}
                            style={boxStyle}
                        />
                    );
                    globalIdx++;
                }
                return (
                    <React.Fragment key={gIdx}>
                        {groupBoxes}
                        {gIdx < groups.length - 1 && (
                            <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '700', margin: '0' }}>-</span>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

/**
 * CorpRepForm.jsx
 * ฟอร์ม: หนังสือแต่งตั้งผู้แทนนิติบุคคล
 */
const CorpRepForm = forwardRef(({ customerData, contractData, initialData = null, documentId = null, contractId = null, embedded = false, sharedFormData = {}, onSharedDataChange }, ref) => {
    const [currentDocId, setCurrentDocId] = useState(documentId);
    const [form, setForm] = useState({
        // ส่วนหัว
        writtenAt: 'บริษัท ไทยเฮิร์บ จำกัด',
        documentDate: new Date().toISOString().split('T')[0],
        // ข้อ 1: ข้อมูลนิติบุคคล
        juristicName: 'วิสาหกิจชุมชนไทยเฮิร์บเซ็นเตอร์',
        juristicRegNo: '0105555555555',
        juristicRegDate: '2020-01-01',
        // ที่อยู่สำนักงานใหญ่
        officeAddrNo: '6/10',
        officeBuilding: 'อาคารไทยเฮิร์บ',
        officeMoo: '2',
        officeSoi: 'ซอยสมุนไพร',
        officeRoad: 'ถนนสมุนไพร',
        officeSubDistrict: 'ไทรม้า',
        officeDistrict: 'เมืองนนทบุรี',
        officeProvince: 'นนทบุรี',
        officeZip: '11000',
        officePhone: '02-123-4567',
        officeFax: '02-123-4568',
        officeEmail: 'info@thaiherb.com',
        // ผู้มีอำนาจลงชื่อ
        signatoryCount: 1,
        signatory1Prefix: 'นาย',
        signatory1Name: 'สมชาย รักษาดี',
        signatory1IdCard: '1100000000000',
        signatory1CardExpiry: '2030-12-31',
        signatory2Prefix: '',
        signatory2Name: '',
        signatory2IdCard: '',
        signatory2CardExpiry: '',
        signatory3Prefix: '',
        signatory3Name: '',
        signatory3IdCard: '',
        signatory3CardExpiry: '',
        // ข้อ 2: ประเภทคำขอ
        reqTypeTorBor1: true,
        reqTypeJorRor1: false,
        reqTypeJorJor1: false,
        reqTypeTorOr: false,
        productName: 'ยาดมสมุนไพรตราไทยเฮิร์บ',
        receiptNo: '12345/2567',
        // ข้อ 3: ผู้แทนที่แต่งตั้ง
        repPrefix: 'นาย',
        repName: 'ธวัช จรุงพิรวงศ์',
        repIdCard: '3259900200422',
        repCardExpiry: '2028-05-15',
        repAddrNo: '99/9',
        repBuilding: 'หมู่บ้านพฤกษา',
        repMoo: '5',
        repSoi: 'ซอยพัฒนา',
        repRoad: 'ถนนพัฒนาการ',
        repSubDistrict: 'สวนหลวง',
        repDistrict: 'สวนหลวง',
        repProvince: 'กรุงเทพมหานคร',
        repZip: '10250',
        repPhone: '081-234-5678',
        repEmail: 'thawatch@example.com',
        effectiveDate: new Date().toISOString().split('T')[0],
    });

    // Auto-fill from customer data
    useEffect(() => {
        if (customerData) {
            setForm(prev => ({
                ...prev,
                juristicName: customerData.CompanyName || customerData.CustomerName || prev.juristicName,
                officeAddrNo: customerData.AddressNo || prev.officeAddrNo,
                officeMoo: customerData.Moo || prev.officeMoo,
                officeSoi: customerData.Soi || prev.officeSoi,
                officeRoad: customerData.Road || prev.officeRoad,
                officeSubDistrict: customerData.SubDistrict || prev.officeSubDistrict,
                officeDistrict: customerData.District || prev.officeDistrict,
                officeProvince: customerData.Province || prev.officeProvince,
                officeZip: customerData.ZipCode || prev.officeZip,
                officePhone: customerData.Phone || prev.officePhone,
                officeEmail: customerData.Email || prev.officeEmail,
            }));
        }
    }, [customerData]);

    // Load existing data
    useEffect(() => {
        if (initialData) {
            setForm(prev => ({
                ...prev,
                ...Object.fromEntries(
                    Object.entries(initialData).map(([k, v]) => [
                        k.charAt(0).toLowerCase() + k.slice(1),
                        v instanceof Date ? v.toISOString().split('T')[0] :
                        (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) ? v.split('T')[0] :
                        v ?? prev[k.charAt(0).toLowerCase() + k.slice(1)]
                    ])
                )
            }));
            if (initialData.documentId) setCurrentDocId(initialData.documentId);
        }
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (type === 'checkbox') {
            setForm(prev => ({ ...prev, [name]: checked }));
        } else if (type === 'number') {
            setForm(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
        } else {
            setForm(prev => ({ ...prev, [name]: value }));
        }
    };

    // Expose data to parent
    useImperativeHandle(ref, () => ({
        getFormData: () => ({
            type: 'corp_rep',
            data: {
                ...form,
                documentId: currentDocId,
                contractId: contractId || null
            }
        }),
        setCurrentDocId: (id) => setCurrentDocId(id)
    }));

    const sectionTitleStyle = {
        fontSize: '16px', fontWeight: '700', color: '#1e293b',
        borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '20px',
        display: 'flex', alignItems: 'center', gap: '8px'
    };
    const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' };
    const inputStyle = { width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' };
    const gridTwo = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' };
    const gridThree = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' };
    const gridFour = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px', marginBottom: '16px' };
    const cardStyle = { padding: '24px', background: '#fff', marginBottom: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' };

    return (
        <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '12px' }}>
            {!embedded && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>หนังสือแต่งตั้งผู้แทนนิติบุคคล</h3>
                </div>
            )}

            {/* ส่วนหัว: เขียนที่ + วันที่ */}
            <div className="card" style={cardStyle}>
                <h4 style={sectionTitleStyle}><span style={{fontSize: '18px'}}>📄</span> ข้อมูลทั่วไป</h4>
                <div style={gridTwo}>
                    <div>
                        <label style={labelStyle}>เขียนที่</label>
                        <input type="text" name="writtenAt" value={form.writtenAt} onChange={handleChange} style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>วันที่</label>
                        <input type="date" name="documentDate" value={form.documentDate} onChange={handleChange} style={inputStyle} />
                    </div>
                </div>
            </div>

            {/* ข้อ 1: ข้อมูลนิติบุคคล */}
            <div className="card" style={cardStyle}>
                <h4 style={sectionTitleStyle}><span style={{fontSize: '18px'}}>🏢</span> ข้อ ๑. ข้อมูลนิติบุคคล</h4>
                <div style={{ marginBottom: '16px' }}>
                    <label style={labelStyle}>ชื่อนิติบุคคล (ข้าพเจ้า...)</label>
                    <input type="text" name="juristicName" value={form.juristicName} onChange={handleChange} placeholder="เช่น บริษัท ไทยเฮิร์บ จำกัด" style={inputStyle} />
                </div>
                <div style={gridTwo}>
                    <div>
                        <label style={labelStyle}>ทะเบียนนิติบุคคล เลขที่</label>
                        <IdCardInput value={form.juristicRegNo} onChange={(val) => setForm(prev => ({ ...prev, juristicRegNo: val }))} />
                    </div>
                    <div>
                        <label style={labelStyle}>เมื่อวันที่ (จดทะเบียน)</label>
                        <input type="date" name="juristicRegDate" value={form.juristicRegDate} onChange={handleChange} style={inputStyle} />
                    </div>
                </div>

                <h5 style={{ fontSize: '14px', fontWeight: '600', color: '#334155', marginTop: '20px', marginBottom: '12px', paddingTop: '12px', borderTop: '1px dashed #e2e8f0' }}>📍 ที่อยู่สำนักงานใหญ่</h5>
                <div style={gridFour}>
                    <div>
                        <label style={labelStyle}>เลขที่</label>
                        <input type="text" name="officeAddrNo" value={form.officeAddrNo} onChange={handleChange} style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>อาคาร</label>
                        <input type="text" name="officeBuilding" value={form.officeBuilding} onChange={handleChange} style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>หมู่ที่</label>
                        <input type="text" name="officeMoo" value={form.officeMoo} onChange={handleChange} style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>ตรอก/ซอย</label>
                        <input type="text" name="officeSoi" value={form.officeSoi} onChange={handleChange} style={inputStyle} />
                    </div>
                </div>
                <div style={gridFour}>
                    <div>
                        <label style={labelStyle}>ถนน</label>
                        <input type="text" name="officeRoad" value={form.officeRoad} onChange={handleChange} style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>ตำบล/แขวง</label>
                        <input type="text" name="officeSubDistrict" value={form.officeSubDistrict} onChange={handleChange} style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>อำเภอ/เขต</label>
                        <input type="text" name="officeDistrict" value={form.officeDistrict} onChange={handleChange} style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>จังหวัด</label>
                        <input type="text" name="officeProvince" value={form.officeProvince} onChange={handleChange} style={inputStyle} />
                    </div>
                </div>
                <div style={gridFour}>
                    <div>
                        <label style={labelStyle}>รหัสไปรษณีย์</label>
                        <input type="text" name="officeZip" value={form.officeZip} onChange={handleChange} style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>โทรศัพท์</label>
                        <input type="text" name="officePhone" value={form.officePhone} onChange={handleChange} style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>โทรสาร</label>
                        <input type="text" name="officeFax" value={form.officeFax} onChange={handleChange} style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>E-mail</label>
                        <input type="text" name="officeEmail" value={form.officeEmail} onChange={handleChange} style={inputStyle} />
                    </div>
                </div>
            </div>

            {/* ผู้มีอำนาจลงชื่อ */}
            <div className="card" style={cardStyle}>
                <h4 style={sectionTitleStyle}><span style={{fontSize: '18px'}}>✍️</span> ผู้มีอำนาจลงชื่อแทนนิติบุคคล</h4>
                <div style={{ marginBottom: '16px' }}>
                    <label style={labelStyle}>จำนวนผู้มีอำนาจ</label>
                    <select name="signatoryCount" value={form.signatoryCount} onChange={handleChange} style={{ ...inputStyle, width: '120px' }}>
                        <option value={1}>1 คน</option>
                        <option value={2}>2 คน</option>
                        <option value={3}>3 คน</option>
                    </select>
                </div>

                {[1, 2, 3].filter(i => i <= form.signatoryCount).map(i => (
                    <div key={i} style={{ padding: '16px', background: '#f1f5f9', borderRadius: '8px', marginBottom: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', marginBottom: '12px' }}>👤 คนที่ {i}</div>
                        <div style={gridTwo}>
                            {/* คำนำหน้า และ ชื่อ-นามสกุล */}
                            <div>
                                <label style={labelStyle}>ชื่อ-นามสกุล</label>
                                <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', alignItems: 'center' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', cursor: 'pointer' }}>
                                        <input type="radio" name={`signatory${i}Prefix`} value="นาย" checked={form[`signatory${i}Prefix`] === 'นาย'} onChange={handleChange} /> นาย
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', cursor: 'pointer' }}>
                                        <input type="radio" name={`signatory${i}Prefix`} value="นาง" checked={form[`signatory${i}Prefix`] === 'นาง'} onChange={handleChange} /> นาง
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', cursor: 'pointer' }}>
                                        <input type="radio" name={`signatory${i}Prefix`} value="นางสาว" checked={form[`signatory${i}Prefix`] === 'นางสาว'} onChange={handleChange} /> นางสาว
                                    </label>
                                </div>
                                <input type="text" name={`signatory${i}Name`} value={form[`signatory${i}Name`]} onChange={handleChange} placeholder="สมชาย รักษาดี" style={inputStyle} />
                            </div>

                            {/* เลขบัตร */}
                            <div>
                                <label style={labelStyle}>เลขประจำตัวประชาชน</label>
                                <div style={{ height: '34px' }}></div> {/* Spacer to align with text input below radios */}
                                <IdCardInput value={form[`signatory${i}IdCard`]} onChange={(val) => setForm(prev => ({ ...prev, [`signatory${i}IdCard`]: val }))} />
                            </div>
                        </div>

                        <div style={gridTwo}>
                            {/* วันหมดอายุ */}
                            <div>
                                <label style={labelStyle}>วันที่บัตรหมดอายุ</label>
                                <input type="date" name={`signatory${i}CardExpiry`} value={form[`signatory${i}CardExpiry`]} onChange={handleChange} style={inputStyle} />
                            </div>
                            <div></div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ข้อ 2: ประเภทคำขอ */}
            <div className="card" style={cardStyle}>
                <h4 style={sectionTitleStyle}><span style={{fontSize: '18px'}}>📝</span> ข้อ ๒. ประเภทคำขออนุญาต</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                        <input type="checkbox" name="reqTypeTorBor1" checked={form.reqTypeTorBor1} onChange={handleChange} style={{ transform: 'scale(1.2)' }} />
                        คำขอขึ้นทะเบียนตำรับฯ (ทบ.๑)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                        <input type="checkbox" name="reqTypeJorRor1" checked={form.reqTypeJorRor1} onChange={handleChange} style={{ transform: 'scale(1.2)' }} />
                        คำขอแจ้งรายละเอียดฯ (จร.๑)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                        <input type="checkbox" name="reqTypeJorJor1" checked={form.reqTypeJorJor1} onChange={handleChange} style={{ transform: 'scale(1.2)' }} />
                        คำของจดแจ้งฯ (จจ.๑)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                        <input type="checkbox" name="reqTypeTorOr" checked={form.reqTypeTorOr} onChange={handleChange} style={{ transform: 'scale(1.2)' }} />
                        คำขอต่ออายุ (ตอ.)
                    </label>
                </div>
                <div style={gridTwo}>
                    <div>
                        <label style={labelStyle}>ผลิตภัณฑ์ชื่อ</label>
                        <input type="text" name="productName" value={form.productName} onChange={handleChange} placeholder="ชื่อผลิตภัณฑ์สมุนไพร" style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>เลขรับที่</label>
                        <input type="text" name="receiptNo" value={form.receiptNo} onChange={handleChange} placeholder="เลขรับที่" style={inputStyle} />
                    </div>
                </div>
            </div>

            {/* ข้อ 3: ผู้แทนนิติบุคคล */}
            <div className="card" style={cardStyle}>
                <h4 style={sectionTitleStyle}><span style={{fontSize: '18px'}}>🤵</span> ข้อ ๓. ผู้แทนนิติบุคคลที่แต่งตั้ง</h4>
                <div style={gridTwo}>
                    <div>
                        <label style={labelStyle}>ชื่อ-นามสกุล</label>
                        <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', alignItems: 'center' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', cursor: 'pointer' }}>
                                <input type="radio" name="repPrefix" value="นาย" checked={form.repPrefix === 'นาย'} onChange={handleChange} /> นาย
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', cursor: 'pointer' }}>
                                <input type="radio" name="repPrefix" value="นาง" checked={form.repPrefix === 'นาง'} onChange={handleChange} /> นาง
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', cursor: 'pointer' }}>
                                <input type="radio" name="repPrefix" value="นางสาว" checked={form.repPrefix === 'นางสาว'} onChange={handleChange} /> นางสาว
                            </label>
                        </div>
                        <input type="text" name="repName" value={form.repName} onChange={handleChange} placeholder="ธวัช จรุงพิรวงศ์" style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>เลขประจำตัวประชาชน</label>
                        <div style={{ height: '34px' }}></div> {/* Spacer to align with text input */}
                        <IdCardInput value={form.repIdCard} onChange={(val) => setForm(prev => ({ ...prev, repIdCard: val }))} />
                    </div>
                </div>

                <div style={gridTwo}>
                    <div>
                        <label style={labelStyle}>วันที่บัตรหมดอายุ</label>
                        <input type="date" name="repCardExpiry" value={form.repCardExpiry} onChange={handleChange} style={inputStyle} />
                    </div>
                    <div></div>
                </div>

                <h5 style={{ fontSize: '14px', fontWeight: '600', color: '#334155', marginTop: '20px', marginBottom: '12px', paddingTop: '12px', borderTop: '1px dashed #e2e8f0' }}>📍 ที่อยู่ผู้แทน</h5>
                <div style={gridFour}>
                    <div>
                        <label style={labelStyle}>บ้านเลขที่</label>
                        <input type="text" name="repAddrNo" value={form.repAddrNo} onChange={handleChange} style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>หมู่บ้าน/อาคาร</label>
                        <input type="text" name="repBuilding" value={form.repBuilding} onChange={handleChange} style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>หมู่ที่</label>
                        <input type="text" name="repMoo" value={form.repMoo} onChange={handleChange} style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>ตรอก/ซอย</label>
                        <input type="text" name="repSoi" value={form.repSoi} onChange={handleChange} style={inputStyle} />
                    </div>
                </div>
                <div style={gridFour}>
                    <div>
                        <label style={labelStyle}>ถนน</label>
                        <input type="text" name="repRoad" value={form.repRoad} onChange={handleChange} style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>ตำบล/แขวง</label>
                        <input type="text" name="repSubDistrict" value={form.repSubDistrict} onChange={handleChange} style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>อำเภอ/เขต</label>
                        <input type="text" name="repDistrict" value={form.repDistrict} onChange={handleChange} style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>จังหวัด</label>
                        <input type="text" name="repProvince" value={form.repProvince} onChange={handleChange} style={inputStyle} />
                    </div>
                </div>
                <div style={gridFour}>
                    <div>
                        <label style={labelStyle}>รหัสไปรษณีย์</label>
                        <input type="text" name="repZip" value={form.repZip} onChange={handleChange} style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>โทรศัพท์</label>
                        <input type="text" name="repPhone" value={form.repPhone} onChange={handleChange} style={inputStyle} />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                        <label style={labelStyle}>ไปรษณีย์อิเล็กทรอนิกส์ (E-mail)</label>
                        <input type="text" name="repEmail" value={form.repEmail} onChange={handleChange} style={inputStyle} />
                    </div>
                </div>
                
                <h5 style={{ fontSize: '14px', fontWeight: '600', color: '#334155', marginTop: '20px', marginBottom: '12px', paddingTop: '12px', borderTop: '1px dashed #e2e8f0' }}>📅 วันที่มีผลผูกพัน</h5>
                <div>
                    <label style={labelStyle}>ทั้งนี้นับตั้งแต่วันที่</label>
                    <input type="date" name="effectiveDate" value={form.effectiveDate} onChange={handleChange} style={{ ...inputStyle, maxWidth: '250px' }} />
                </div>
            </div>
        </div>
    );
});

export default CorpRepForm;
