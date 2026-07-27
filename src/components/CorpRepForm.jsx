import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import API_BASE from '../config';
import './PowerOfAttorneyForm.css';
import IdCardInput from './IdCardInput';
import NameInputWithTitle from './NameInputWithTitle';
import CustomDatePicker from './CustomDatePicker';
import CustomSelect from './CustomSelect';

/**
 * CorpRepForm.jsx
 * ฟอร์ม: หนังสือแต่งตั้งผู้แทนนิติบุคคล
 */
const CorpRepForm = forwardRef(({ customerData, contractData, initialData = null, documentId = null, contractId = null, embedded = false, sharedFormData = {}, onSharedDataChange }, ref) => {
    const [currentDocId, setCurrentDocId] = useState(documentId);
    const [form, setForm] = useState({
        // ส่วนหัว
        writtenAt: '',
        documentDate: new Date().toISOString().split('T')[0],
        // ข้อ 1: ข้อมูลนิติบุคคล
        juristicName: '',
        juristicRegNo: '',
        juristicRegDate: '',
        // ที่อยู่สำนักงานใหญ่
        officeAddrNo: '',
        officeBuilding: '',
        officeMoo: '',
        officeSoi: '',
        officeRoad: '',
        officeSubDistrict: '',
        officeDistrict: '',
        officeProvince: '',
        officeZip: '',
        officePhone: '',
        officeFax: '',
        officeEmail: '',
        // ผู้มีอำนาจลงชื่อ
        signatoryCount: 1,
        signatory1Prefix: '',
        signatory1Name: '',
        signatory1IdCard: '',
        signatory1CardExpiry: '',
        signatory2Prefix: '',
        signatory2Name: '',
        signatory2IdCard: '',
        signatory2CardExpiry: '',
        signatory3Prefix: '',
        signatory3Name: '',
        signatory3IdCard: '',
        signatory3CardExpiry: '',
        // ข้อ 2: ประเภทคำขอ
        reqTypeTorBor1: false,
        reqTypeJorRor1: false,
        reqTypeJorJor1: false,
        reqTypeTorOr: false,
        productName: '',
        receiptNo: '',
        // ข้อ 3: ผู้แทนที่แต่งตั้ง
        repPrefix: '',
        repName: '',
        repIdCard: '',
        repCardExpiry: '',
        repAddrNo: '',
        repBuilding: '',
        repMoo: '',
        repSoi: '',
        repRoad: '',
        repSubDistrict: '',
        repDistrict: '',
        repProvince: '',
        repZip: '',
        repPhone: '',
        repEmail: '',
        effectiveDate: new Date().toISOString().split('T')[0],
    });

    // Fetch saved data when editing
    useEffect(() => {
        if (!documentId) return;
        setCurrentDocId(documentId);
        const fetchData = async () => {
            try {
                const res = await fetch(`${API_BASE}/corp-rep-documents/${documentId}`);
                const json = await res.json();
                const d = json.data || json;
                if (d) {
                    setForm(prev => ({
                        ...prev,
                        writtenAt: d.WrittenAt || prev.writtenAt,
                        documentDate: d.DocumentDate ? new Date(d.DocumentDate).toISOString().split('T')[0] : prev.documentDate,
                        juristicName: d.JuristicName || prev.juristicName,
                        juristicRegNo: d.JuristicRegNo || prev.juristicRegNo,
                        juristicRegDate: d.JuristicRegDate ? new Date(d.JuristicRegDate).toISOString().split('T')[0] : prev.juristicRegDate,
                        officeAddrNo: d.OfficeAddrNo || prev.officeAddrNo,
                        officeBuilding: d.OfficeBuilding || prev.officeBuilding,
                        officeMoo: d.OfficeMoo || prev.officeMoo,
                        officeSoi: d.OfficeSoi || prev.officeSoi,
                        officeRoad: d.OfficeRoad || prev.officeRoad,
                        officeSubDistrict: d.OfficeSubDistrict || prev.officeSubDistrict,
                        officeDistrict: d.OfficeDistrict || prev.officeDistrict,
                        officeProvince: d.OfficeProvince || prev.officeProvince,
                        officeZip: d.OfficeZip || prev.officeZip,
                        officePhone: d.OfficePhone || prev.officePhone,
                        officeFax: d.OfficeFax || prev.officeFax,
                        officeEmail: d.OfficeEmail || prev.officeEmail,
                        signatoryCount: d.SignatoryCount !== undefined && d.SignatoryCount !== null ? d.SignatoryCount : prev.signatoryCount,
                        signatory1Prefix: d.Signatory1Prefix || prev.signatory1Prefix,
                        signatory1Name: d.Signatory1Name || prev.signatory1Name,
                        signatory1IdCard: d.Signatory1IdCard || prev.signatory1IdCard,
                        signatory1CardExpiry: d.Signatory1CardExpiry ? new Date(d.Signatory1CardExpiry).toISOString().split('T')[0] : prev.signatory1CardExpiry,
                        signatory2Prefix: d.Signatory2Prefix || prev.signatory2Prefix,
                        signatory2Name: d.Signatory2Name || prev.signatory2Name,
                        signatory2IdCard: d.Signatory2IdCard || prev.signatory2IdCard,
                        signatory2CardExpiry: d.Signatory2CardExpiry ? new Date(d.Signatory2CardExpiry).toISOString().split('T')[0] : prev.signatory2CardExpiry,
                        signatory3Prefix: d.Signatory3Prefix || prev.signatory3Prefix,
                        signatory3Name: d.Signatory3Name || prev.signatory3Name,
                        signatory3IdCard: d.Signatory3IdCard || prev.signatory3IdCard,
                        signatory3CardExpiry: d.Signatory3CardExpiry ? new Date(d.Signatory3CardExpiry).toISOString().split('T')[0] : prev.signatory3CardExpiry,
                        reqTypeTorBor1: d.ReqTypeTorBor1 !== undefined && d.ReqTypeTorBor1 !== null ? Boolean(d.ReqTypeTorBor1) : prev.reqTypeTorBor1,
                        reqTypeJorRor1: d.ReqTypeJorRor1 !== undefined && d.ReqTypeJorRor1 !== null ? Boolean(d.ReqTypeJorRor1) : prev.reqTypeJorRor1,
                        reqTypeJorJor1: d.ReqTypeJorJor1 !== undefined && d.ReqTypeJorJor1 !== null ? Boolean(d.ReqTypeJorJor1) : prev.reqTypeJorJor1,
                        reqTypeTorOr: d.ReqTypeTorOr !== undefined && d.ReqTypeTorOr !== null ? Boolean(d.ReqTypeTorOr) : prev.reqTypeTorOr,
                        productName: d.ProductName || prev.productName,
                        receiptNo: d.ReceiptNo || prev.receiptNo,
                        repPrefix: d.RepPrefix || prev.repPrefix,
                        repName: d.RepName || prev.repName,
                        repIdCard: d.RepIdCard || prev.repIdCard,
                        repCardExpiry: d.RepCardExpiry ? new Date(d.RepCardExpiry).toISOString().split('T')[0] : prev.repCardExpiry,
                        repAddrNo: d.RepAddrNo || prev.repAddrNo,
                        repBuilding: d.RepBuilding || prev.repBuilding,
                        repMoo: d.RepMoo || prev.repMoo,
                        repSoi: d.RepSoi || prev.repSoi,
                        repRoad: d.RepRoad || prev.repRoad,
                        repSubDistrict: d.RepSubDistrict || prev.repSubDistrict,
                        repDistrict: d.RepDistrict || prev.repDistrict,
                        repProvince: d.RepProvince || prev.repProvince,
                        repZip: d.RepZip || prev.repZip,
                        repPhone: d.RepPhone || prev.repPhone,
                        repEmail: d.RepEmail || prev.repEmail,
                        effectiveDate: d.EffectiveDate ? new Date(d.EffectiveDate).toISOString().split('T')[0] : prev.effectiveDate,
                    }));
                }
            } catch (err) {
                console.error('Error fetching data:', err);
            }
        };
        fetchData();
    }, [documentId]);

    // Auto-fill from customer data
    useEffect(() => {
        if (customerData && !currentDocId) {
            const customerAddress = customerData.Address || '';
            const parseAddress = (addr) => {
                if (!addr) return { no: '', moo: '', soi: '', road: '', subDistrict: '', district: '', province: '', zip: '' };
                let remaining = addr.trim();
                let no = '', moo = '', soi = '', road = '', subDistrict = '', district = '', province = '', zip = '';

                const zipMatch = remaining.match(/\s?(\d{5})$/);
                if (zipMatch) { zip = zipMatch[1]; remaining = remaining.replace(/\s?\d{5}$/, '').trim(); }

                const provMatch = remaining.match(/(?:จ\.|จังหวัด)\s*([^\s]+)/);
                if (provMatch) { province = provMatch[1]; remaining = remaining.replace(/(?:จ\.|จังหวัด)\s*[^\s]+/, '').trim(); }

                const distMatch = remaining.match(/(?:อ\.|อำเภอ|เขต)\s*([^\s]+)/);
                if (distMatch) { district = distMatch[1]; remaining = remaining.replace(/(?:อ\.|อำเภอ|เขต)\s*[^\s]+/, '').trim(); }

                const subMatch = remaining.match(/(?:ต\.|ตำบล|แขวง)\s*([^\s]+)/);
                if (subMatch) { subDistrict = subMatch[1]; remaining = remaining.replace(/(?:ต\.|ตำบล|แขวง)\s*[^\s]+/, '').trim(); }

                const roadMatch = remaining.match(/(?:ถ\.|ถนน)\s*([^\s]+)/);
                if (roadMatch) { road = roadMatch[1]; remaining = remaining.replace(/(?:ถ\.|ถนน)\s*[^\s]+/, '').trim(); }

                const soiMatch = remaining.match(/(?:ซ\.|ซอย)\s*([^\s]+)/);
                if (soiMatch) { soi = soiMatch[1]; remaining = remaining.replace(/(?:ซ\.|ซอย)\s*[^\s]+/, '').trim(); }

                const mooMatch = remaining.match(/(?:ม\.|หมู่|หมู่ที่)\s*([0-9]+)/);
                if (mooMatch) { moo = mooMatch[1]; remaining = remaining.replace(/(?:ม\.|หมู่|หมู่ที่)\s*[0-9]+/, '').trim(); }

                remaining = remaining.replace(/เลขที่\s*/, '').trim();
                no = remaining || '';
                
                return { no, moo, soi, road, subDistrict, district, province, zip };
            };
            const addr = parseAddress(customerAddress);

            setForm(prev => ({
                ...prev,
                juristicName: customerData.CompanyName || customerData.CustomerName || prev.juristicName,
                officeAddrNo: addr.no,
                officeMoo: addr.moo,
                officeSoi: addr.soi,
                officeRoad: addr.road,
                officeSubDistrict: addr.subDistrict,
                officeDistrict: addr.district,
                officeProvince: addr.province,
                officeZip: addr.zip,
                officePhone: customerData.Phone || prev.officePhone,
                officeEmail: customerData.Email || prev.officeEmail,
            }));
        }
    }, [customerData, currentDocId]);

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

    return (
        <div className="poa-form-wrapper">
            {!embedded && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h3 className="poa-section-title" style={{ margin: 0 }}>หนังสือแต่งตั้งผู้แทนนิติบุคคล</h3>
                </div>
            )}

            {/* ส่วนหัว: เขียนที่ + วันที่ */}
            <div className="poa-info-box gray" style={{ marginBottom: '20px' }}>
                <div className="poa-section-subtitle" style={{ marginTop: 0 }}>ข้อมูลทั่วไป</div>
                <div className="poa-row">
                    <div className="poa-field">
                        <label>เขียนที่</label>
                        <input type="text" name="writtenAt" value={form.writtenAt} onChange={handleChange} />
                    </div>
                    <div className="poa-field medium">
                        <label>วันที่</label>
                        <CustomDatePicker name="documentDate" value={form.documentDate} onChange={handleChange} />
                    </div>
                </div>
            </div>

            {/* ข้อ 1: ข้อมูลนิติบุคคล */}
            <div className="poa-info-box" style={{ background: '#f0fdf4', borderColor: '#bbf7d0', marginBottom: '20px' }}>
                <div className="poa-section-subtitle" style={{ color: '#15803d', marginTop: 0 }}>ข้อ ๑. ข้อมูลนิติบุคคล</div>
                <div className="poa-row">
                    <div className="poa-field full">
                        <label>ชื่อนิติบุคคล (ข้าพเจ้า...)</label>
                        <input type="text" name="juristicName" value={form.juristicName} onChange={handleChange} placeholder="เช่น บริษัท ไทยเฮิร์บ จำกัด" />
                    </div>
                </div>
                <div className="poa-row">
                    <div className="poa-field">
                        <label>ทะเบียนนิติบุคคล เลขที่</label>
                        <IdCardInput value={form.juristicRegNo} onChange={(val) => setForm(prev => ({ ...prev, juristicRegNo: val }))} />
                    </div>
                    <div className="poa-field">
                        <label>เมื่อวันที่ (จดทะเบียน)</label>
                        <CustomDatePicker name="juristicRegDate" value={form.juristicRegDate} onChange={handleChange} />
                    </div>
                </div>

                <div className="poa-row">
                    <div className="poa-field full">
                        <label>ที่อยู่สำนักงานใหญ่</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                            <input type="text" name="officeAddrNo" placeholder="เลขที่" value={form.officeAddrNo} onChange={handleChange} />
                            <input type="text" name="officeBuilding" placeholder="อาคาร" value={form.officeBuilding} onChange={handleChange} />
                            <input type="text" name="officeMoo" placeholder="หมู่ที่" value={form.officeMoo} onChange={handleChange} />
                            <input type="text" name="officeSoi" placeholder="ตรอก/ซอย" value={form.officeSoi} onChange={handleChange} />
                            <input type="text" name="officeRoad" placeholder="ถนน" value={form.officeRoad} onChange={handleChange} />
                            <input type="text" name="officeSubDistrict" placeholder="ตำบล/แขวง" value={form.officeSubDistrict} onChange={handleChange} />
                            <input type="text" name="officeDistrict" placeholder="อำเภอ/เขต" value={form.officeDistrict} onChange={handleChange} />
                            <input type="text" name="officeProvince" placeholder="จังหวัด" value={form.officeProvince} onChange={handleChange} />
                            <input type="text" name="officeZip" placeholder="รหัสไปรษณีย์" value={form.officeZip} onChange={handleChange} />
                        </div>
                    </div>
                </div>
                
                <div className="poa-row">
                    <div className="poa-field">
                        <label>โทรศัพท์</label>
                        <input type="text" name="officePhone" value={form.officePhone} onChange={handleChange} />
                    </div>
                    <div className="poa-field">
                        <label>โทรสาร</label>
                        <input type="text" name="officeFax" value={form.officeFax} onChange={handleChange} />
                    </div>
                    <div className="poa-field">
                        <label>E-mail</label>
                        <input type="text" name="officeEmail" value={form.officeEmail} onChange={handleChange} />
                    </div>
                </div>
            </div>

            {/* ผู้มีอำนาจลงชื่อ */}
            <div className="poa-info-box" style={{ background: '#f0fdf4', borderColor: '#bbf7d0', marginBottom: '20px' }}>
                <div className="poa-section-subtitle" style={{ color: '#15803d', marginTop: 0 }}>ผู้มีอำนาจลงชื่อแทนนิติบุคคล</div>
                <div className="poa-row">
                    <div className="poa-field medium">
                        <label>จำนวนผู้มีอำนาจ</label>
                        <CustomSelect name="signatoryCount" value={form.signatoryCount} onChange={handleChange} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                            <option value={1}>1 คน</option>
                            <option value={2}>2 คน</option>
                            <option value={3}>3 คน</option>
                        </CustomSelect>
                    </div>
                </div>

                {[1, 2, 3].filter(i => i <= form.signatoryCount).map(i => (
                    <div key={i} style={{ padding: '16px', background: '#fff', borderRadius: '8px', marginBottom: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#15803d', marginBottom: '12px' }}>คนที่ {i}</div>
                        <div className="poa-row">
                            <div className="poa-field">
                                <label>ชื่อ-นามสกุล</label>
                                <NameInputWithTitle
                                    value={form[`signatory${i}Name`]}
                                    onChange={(val) => handleChange({ target: { name: `signatory${i}Name`, value: val } })}
                                    placeholder="ชื่อ-นามสกุล..."
                                />
                                <input type="hidden" name={`signatory${i}Prefix`} value={form[`signatory${i}Prefix`]} />
                            </div>
                            <div className="poa-field">
                                <label>เลขประจำตัวประชาชน</label>
                                <div style={{ height: '2px' }}></div>
                                <IdCardInput value={form[`signatory${i}IdCard`]} onChange={(val) => setForm(prev => ({ ...prev, [`signatory${i}IdCard`]: val }))} />
                            </div>
                        </div>
                        <div className="poa-row">
                            <div className="poa-field medium">
                                <label>วันที่บัตรหมดอายุ</label>
                                <CustomDatePicker name={`signatory${i}CardExpiry`} value={form[`signatory${i}CardExpiry`]} onChange={handleChange} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ข้อ 2: ประเภทคำขอ */}
            <div className="poa-info-box" style={{ background: '#fff', borderColor: '#e2e8f0', marginBottom: '20px' }}>
                <div className="poa-section-subtitle" style={{ marginTop: 0 }}>ข้อ ๒. ประเภทคำขออนุญาต</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '16px', padding: '0 8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                        <input type="checkbox" name="reqTypeTorBor1" checked={form.reqTypeTorBor1} onChange={handleChange} />
                        คำขอขึ้นทะเบียนตำรับฯ (ทบ.๑)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                        <input type="checkbox" name="reqTypeJorRor1" checked={form.reqTypeJorRor1} onChange={handleChange} />
                        คำขอแจ้งรายละเอียดฯ (จร.๑)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                        <input type="checkbox" name="reqTypeJorJor1" checked={form.reqTypeJorJor1} onChange={handleChange} />
                        คำของจดแจ้งฯ (จจ.๑)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                        <input type="checkbox" name="reqTypeTorOr" checked={form.reqTypeTorOr} onChange={handleChange} />
                        คำขอต่ออายุ (ตอ.)
                    </label>
                </div>
                <div className="poa-row">
                    <div className="poa-field">
                        <label>ผลิตภัณฑ์ชื่อ</label>
                        <input type="text" name="productName" value={form.productName} onChange={handleChange} placeholder="ชื่อผลิตภัณฑ์สมุนไพร" />
                    </div>
                    <div className="poa-field">
                        <label>เลขรับที่</label>
                        <input type="text" name="receiptNo" value={form.receiptNo} onChange={handleChange} placeholder="เลขรับที่" />
                    </div>
                </div>
            </div>

            {/* ข้อ 3: ผู้แทนนิติบุคคล */}
            <div className="poa-info-box" style={{ background: '#f0f9ff', borderColor: '#bae6fd', marginBottom: '20px' }}>
                <div className="poa-section-subtitle" style={{ color: '#0369a1', marginTop: 0 }}>ข้อ ๓. ผู้แทนนิติบุคคลที่แต่งตั้ง</div>
                <div className="poa-row">
                    <div className="poa-field">
                        <label>ชื่อ-นามสกุล</label>
                        <NameInputWithTitle
                            value={form.repName}
                            onChange={(val) => handleChange({ target: { name: `repName`, value: val } })}
                            placeholder="ชื่อ-นามสกุล..."
                        />
                        <input type="hidden" name="repPrefix" value={form.repPrefix} />
                    </div>
                    <div className="poa-field">
                        <label>เลขประจำตัวประชาชน</label>
                        <div style={{ height: '2px' }}></div>
                        <IdCardInput value={form.repIdCard} onChange={(val) => setForm(prev => ({ ...prev, repIdCard: val }))} />
                    </div>
                </div>
                <div className="poa-row">
                    <div className="poa-field medium">
                        <label>วันที่บัตรหมดอายุ</label>
                        <CustomDatePicker name="repCardExpiry" value={form.repCardExpiry} onChange={handleChange} />
                    </div>
                </div>

                <div className="poa-row">
                    <div className="poa-field full">
                        <label>ที่อยู่ผู้แทน</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                            <input type="text" name="repAddrNo" placeholder="บ้านเลขที่" value={form.repAddrNo} onChange={handleChange} />
                            <input type="text" name="repBuilding" placeholder="หมู่บ้าน/อาคาร" value={form.repBuilding} onChange={handleChange} />
                            <input type="text" name="repMoo" placeholder="หมู่ที่" value={form.repMoo} onChange={handleChange} />
                            <input type="text" name="repSoi" placeholder="ตรอก/ซอย" value={form.repSoi} onChange={handleChange} />
                            <input type="text" name="repRoad" placeholder="ถนน" value={form.repRoad} onChange={handleChange} />
                            <input type="text" name="repSubDistrict" placeholder="ตำบล/แขวง" value={form.repSubDistrict} onChange={handleChange} />
                            <input type="text" name="repDistrict" placeholder="อำเภอ/เขต" value={form.repDistrict} onChange={handleChange} />
                            <input type="text" name="repProvince" placeholder="จังหวัด" value={form.repProvince} onChange={handleChange} />
                            <input type="text" name="repZip" placeholder="รหัสไปรษณีย์" value={form.repZip} onChange={handleChange} />
                        </div>
                    </div>
                </div>
                <div className="poa-row">
                    <div className="poa-field">
                        <label>โทรศัพท์</label>
                        <input type="text" name="repPhone" value={form.repPhone} onChange={handleChange} />
                    </div>
                    <div className="poa-field">
                        <label>ไปรษณีย์อิเล็กทรอนิกส์ (E-mail)</label>
                        <input type="text" name="repEmail" value={form.repEmail} onChange={handleChange} />
                    </div>
                </div>
                
                <div className="poa-row">
                    <div className="poa-field medium">
                        <label>ทั้งนี้นับตั้งแต่วันที่</label>
                        <CustomDatePicker name="effectiveDate" value={form.effectiveDate} onChange={handleChange} />
                    </div>
                </div>
            </div>
        </div>
    );
});

export default CorpRepForm;


