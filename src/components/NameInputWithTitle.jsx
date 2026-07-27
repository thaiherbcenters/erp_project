import React from 'react';

const NameInputWithTitle = ({ value, onChange, placeholder }) => {
    const titles = ['นาย', 'นางสาว', 'นาง'];
    
    const getParsed = (val) => {
        if (!val) return { title: '', name: '' };
        for (let t of titles) {
            if (val.startsWith(t)) {
                return { title: t, name: val.substring(t.length).trim() };
            }
        }
        return { title: '', name: val };
    };

    const parsed = getParsed(value);

    const handleTitleChange = (e) => {
        const newTitle = e.target.value;
        onChange(newTitle + parsed.name);
    };

    const handleNameChange = (e) => {
        onChange(parsed.title + e.target.value);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', fontSize: '14px', color: '#334155' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: 'normal', margin: 0 }}>
                    <input type="radio" value="นาย" checked={parsed.title === 'นาย'} onChange={handleTitleChange} /> นาย
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: 'normal', margin: 0 }}>
                    <input type="radio" value="นาง" checked={parsed.title === 'นาง'} onChange={handleTitleChange} /> นาง
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: 'normal', margin: 0 }}>
                    <input type="radio" value="นางสาว" checked={parsed.title === 'นางสาว'} onChange={handleTitleChange} /> นางสาว
                </label>
            </div>
            <input 
                type="text" 
                value={value || ''} 
                onChange={handleNameChange} 
                placeholder={placeholder} 
                style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
            />
        </div>
    );
};

export default NameInputWithTitle;
