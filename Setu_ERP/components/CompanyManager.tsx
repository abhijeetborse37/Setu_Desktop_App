
import React, { useState } from 'react';
import { Company, BusinessType, Product, Transaction, User, UserRole } from '../types';
import { companyService } from '../services/api';
import { validators } from '../utils';

interface Props {
  companies: Company[];
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  products: Product[];
  transactions: Transaction[];
  currentUser: User;
  onDataChange: () => void;
}

// Map frontend numeric enum to backend string enum names (API uses JsonStringEnumConverter)
const BUSINESS_TYPE_TO_STRING: Record<number, string> = {
  [BusinessType.PRIVATE]: 'PrivateLimited',
  [BusinessType.PUBLIC]: 'PublicLimited',
  [BusinessType.FIRM]: 'Proprietorship',
  [BusinessType.PARTNERSHIP]: 'Partnership',
  [BusinessType.NGO]: 'Ngo'
};

const STRING_TO_BUSINESS_TYPE: Record<string, number> = {
  'PrivateLimited': BusinessType.PRIVATE,
  'PublicLimited': BusinessType.PUBLIC,
  'Proprietorship': BusinessType.FIRM,
  'Partnership': BusinessType.PARTNERSHIP,
  'Ngo': BusinessType.NGO
};

const COUNTRY_DATA: Record<string, { currency: string, symbol: string, taxName: string, phoneHint: string }> = {
  'India': { currency: 'INR', symbol: '₹', taxName: 'GST/PAN', phoneHint: '+91 9876543210' },
  'United States': { currency: 'USD', symbol: '$', taxName: 'EIN', phoneHint: '+1 202-555-0123' },
  'United Kingdom': { currency: 'GBP', symbol: '£', taxName: 'VAT', phoneHint: '+44 7911 123456' },
  'European Union': { currency: 'EUR', symbol: '€', taxName: 'VAT', phoneHint: '+33 1 23 45 67 89' },
  'Other': { currency: 'USD', symbol: '$', taxName: 'Tax ID', phoneHint: '+[Code] [Number]' }
};

const CompanyManager: React.FC<Props> = ({ companies, activeId, setActiveId, products, currentUser, onDataChange }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isAdmin = currentUser.role === UserRole.ADMIN;

  const initialFormState = {
    name: '',
    address: '',
    country: 'India',
    currency: 'INR',
    currencySymbol: '₹',
    contact: '',
    type: BusinessType.PRIVATE,
    taxId: '',
    gstNumber: '',
    licenseNumber: '',
    bankAccount: '',
    ifscCode: '',
    bankName: '',
    branchName: '',
    industry: '',
    employees: 0,
    revenue: 0,
    expenses: 0,
    incorporationDate: new Date().toISOString().split('T')[0],
    website: ''
  };

  const [formData, setFormData] = useState<any>(initialFormState);

  const handleCountryChange = (country: string) => {
    const data = COUNTRY_DATA[country] || COUNTRY_DATA['Other'];
    setFormData({ ...formData, country, currency: data.currency, currencySymbol: data.symbol });
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!validators.name(formData.name, 3)) newErrors.name = 'Valid business name required (min 3 chars).';
    if (!validators.taxId(formData.taxId)) newErrors.taxId = 'Valid Tax/GST/EIN identification number required.';
    else if (!formData.taxId) newErrors.taxId = 'Tax identification number required.';
    
    if (!validators.phone(formData.contact)) newErrors.contact = 'Valid contact number required (10-15 digits).';
    else if (!formData.contact) newErrors.contact = 'Primary contact number required.';
    
    if (formData.bankAccount && !validators.bankAccount(formData.bankAccount)) 
      newErrors.bankAccount = 'Invalid bank account number format (9-18 digits).';
      
    if (formData.ifscCode && !validators.ifsc(formData.ifscCode)) 
      newErrors.ifscCode = 'Invalid IFSC Code format.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEdit = (e: React.MouseEvent, company: Company) => {
    e.stopPropagation(); e.preventDefault();

    // Only Admin can edit any company; Customers can only edit their own
    if (!isAdmin && company.userId !== currentUser.id) {
      alert('Access Denied: You can only edit your own company details.');
      return;
    }

    setEditingCompanyId(company.id);
    // Sanitize the data for form - convert API string type back to numeric enum
    const numericType = typeof company.type === 'string'
      ? (STRING_TO_BUSINESS_TYPE[company.type as string] ?? BusinessType.PRIVATE)
      : company.type;
    setFormData({
      ...company,
      type: numericType,
      incorporationDate: company.incorporationDate ? new Date(company.incorporationDate).toISOString().split('T')[0] : initialFormState.incorporationDate
    });
    setShowForm(true);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); e.preventDefault();

    // Only Admin can delete
    if (!isAdmin) {
      alert('Access Denied: Only super admin can delete companies.');
      return;
    }

    if (products.some(p => p.companyId === id)) {
      alert(`Cannot delete entity: There are ${products.filter(p => p.companyId === id).length} products linked to this business.`);
      return;
    }
    if (window.confirm('Are you sure you want to delete this company?')) {
      try {
        await companyService.delete(id);
        if (activeId === id) setActiveId(null);
        onDataChange();
      } catch (err: any) { alert("Delete failed: " + (err.response?.data || err.message)); }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || isBusy) return;
    setIsBusy(true);

    const processedData = {
      ...formData,
      userId: currentUser.id,
      employees: Number(formData.employees) || 0,
      revenue: Number(formData.revenue) || 0,
      expenses: Number(formData.expenses) || 0,
      type: BUSINESS_TYPE_TO_STRING[Number(formData.type)] || 'PrivateLimited', // Send string for API's JsonStringEnumConverter
      // Remove navigation properties to avoid EF issues
      products: undefined,
      customers: undefined,
      transactions: undefined,
      user: undefined
    };

    try {
      if (editingCompanyId) {
        await companyService.update(editingCompanyId, processedData);
        alert("Company updated successfully!");
      } else {
        const res = await companyService.create(processedData);
        setActiveId(res.data.id);
        alert("Company registered successfully!");
      }
      onDataChange();
      closeForm();
    } catch (err: any) {
      console.error("Save Error Response:", err.response?.data);
      const msg = typeof err.response?.data === 'string'
        ? err.response.data
        : (err.response?.data?.message || JSON.stringify(err.response?.data) || err.message);
      alert("Save Error: " + msg);
    }
    finally { setIsBusy(false); }
  };

  const closeForm = () => {
    setShowForm(false); setEditingCompanyId(null); setErrors({});
    setFormData(initialFormState);
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center px-4 md:px-0">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-1">Business Registry & Profiles</h2>
          <p className="text-sm text-slate-500 font-medium">Manage your multiple business identities, tax registrations, and store profiles</p>
        </div>
        {isAdmin && (
          <button onClick={() => { setFormData(initialFormState); setShowForm(true); }} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center uppercase text-[10px] tracking-[0.2em] active:scale-95">
            <i className="fas fa-plus mr-3 text-sm"></i> Register New Business
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {companies.map(company => (
          <div key={company.id} onClick={() => setActiveId(company.id)} className={`cursor-pointer p-8 rounded-[2.5rem] border-2 transition-all duration-300 group relative overflow-hidden ${activeId === company.id ? 'border-blue-600 bg-white shadow-2xl shadow-blue-500/10 ring-4 ring-blue-50' : 'border-slate-200/60 bg-white hover:border-blue-400 hover:shadow-xl'}`}>
            <div className="flex justify-between items-start mb-8">
              <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center transition-all ${activeId === company.id ? 'bg-blue-600 text-white shadow-lg rotate-3' : 'bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500'}`}>
                <i className="fas fa-building text-2xl"></i>
              </div>
              <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {(isAdmin || company.userId === currentUser.id) && (
                  <button onClick={(e) => handleEdit(e, company)} className="p-2 text-slate-400 hover:text-blue-600 bg-white rounded-xl shadow-sm" title={isAdmin ? "Edit company" : "Edit your company"}>
                    <i className="fas fa-edit text-xs"></i>
                  </button>
                )}
                {isAdmin && (
                  <button onClick={(e) => handleDelete(e, company.id)} className="p-2 text-slate-400 hover:text-red-600 bg-white rounded-xl shadow-sm" title="Delete company">
                    <i className="fas fa-trash text-xs"></i>
                  </button>
                )}
              </div>
            </div>
            <h3 className="text-lg font-black text-slate-900 truncate uppercase tracking-tight mb-2">{company.name}</h3>
            <div className="space-y-2">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center"><i className="fas fa-map-marker-alt mr-2 text-emerald-400 w-4"></i> {company.country}</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center"><i className="fas fa-fingerprint mr-2 text-blue-400 w-4"></i> {company.taxId}</p>
            </div>
            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Industry</p>
                <p className="font-bold text-slate-800 text-xs truncate uppercase tracking-tighter">{company.industry || 'General'}</p>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Valuation</p>
                <p className="font-black text-blue-600 text-sm">{company.currencySymbol}{((company.revenue || 0) / 1000).toFixed(1)}K</p>
              </div>
            </div>
            {activeId === company.id && <div className="absolute bottom-0 left-0 right-0 h-2 bg-blue-600 animate-pulse"></div>}
          </div>
        ))}
        {companies.length === 0 && (
          <div className="col-span-full py-24 bg-white border-2 border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center justify-center text-slate-300">
            <i className="fas fa-building text-5xl mb-4 opacity-10"></i>
            <p className="text-xs font-black uppercase tracking-[0.2em]">No Companies Detected</p>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center p-2 sm:p-4 overflow-y-auto backdrop-blur-sm scroll-smooth">
          <div className="relative bg-white rounded-[2rem] md:rounded-[3rem] w-full max-w-4xl shadow-2xl overflow-hidden my-4 md:my-8 pointer-events-auto ring-1 ring-white/50 animate-in fade-in duration-300 flex flex-col max-h-[90vh]">
            <div className="bg-slate-50 px-6 py-6 md:px-10 md:py-8 border-b border-slate-200 flex justify-between items-center flex-shrink-0">
              <div>
                <h3 className="text-lg md:text-2xl font-black text-slate-800 uppercase tracking-tight">{editingCompanyId ? 'Modify Entity' : 'Register New Entity'}</h3>
                <p className="text-[9px] md:text-[10px] text-slate-400 font-black uppercase tracking-widest md:tracking-[0.2em]">Setu ERP • Cloud Service</p>
              </div>
              <button onClick={closeForm} className="text-slate-400 hover:text-slate-600 p-2"><i className="fas fa-times text-xl md:text-2xl"></i></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 md:p-10 space-y-8 md:space-y-10 overflow-y-auto custom-scrollbar">

              <div className="space-y-6">
                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] border-b border-blue-100 pb-2 flex items-center">
                  <i className="fas fa-info-circle mr-2"></i> Profile & Identity
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2">
                    <label htmlFor="comp-name" className="block text-[10px] font-black text-slate-400 uppercase mb-2.5 ml-1 tracking-widest">Legal Business Name</label>
                    <input id="comp-name" required className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm"
                      value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} />
                  </div>
                  <div>
                    <label htmlFor="comp-type" className="block text-[10px] font-black text-slate-400 uppercase mb-2.5 ml-1 tracking-widest">Entity Structure</label>
                    <select id="comp-type" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:border-blue-500 outline-none"
                      value={formData.type} onChange={e => setFormData(prev => ({ ...prev, type: parseInt(e.target.value) }))}>
                      <option value={BusinessType.PRIVATE}>Private Limited</option>
                      <option value={BusinessType.PUBLIC}>Public Limited</option>
                      <option value={BusinessType.FIRM}>Proprietorship / Firm</option>
                      <option value={BusinessType.PARTNERSHIP}>Partnership / LLP</option>
                      <option value={BusinessType.NGO}>Non-Profit / NGO</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="comp-country" className="block text-[10px] font-black text-slate-400 uppercase mb-2.5 ml-1 tracking-widest">Country</label>
                    <select id="comp-country" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:border-blue-500 outline-none"
                      value={formData.country} onChange={e => handleCountryChange(e.target.value)}>
                      {Object.keys(COUNTRY_DATA).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor="comp-address" className="block text-[10px] font-black text-slate-400 uppercase mb-2.5 ml-1 tracking-widest">Corporate Address</label>
                    <input id="comp-address" required className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:border-blue-500 outline-none shadow-sm"
                      value={formData.address} onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))} />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] border-b border-emerald-100 pb-2 flex items-center">
                  <i className="fas fa-file-contract mr-2"></i> Compliance & Registry
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label htmlFor="comp-taxid" className="block text-[10px] font-black text-slate-400 uppercase mb-2.5 ml-1 tracking-widest">{COUNTRY_DATA[formData.country]?.taxName || 'Tax'} ID</label>
                    <input id="comp-taxid" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-mono font-bold text-slate-900 focus:border-blue-500 outline-none"
                      value={formData.taxId} onChange={e => setFormData(prev => ({ ...prev, taxId: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">GST/VAT (If different)</label>
                    <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-mono focus:border-blue-500 outline-none"
                      placeholder="Optional GST/VAT"
                      value={formData.gstNumber || ''} onChange={e => setFormData({ ...formData, gstNumber: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">License No.</label>
                    <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-mono focus:border-blue-500 outline-none"
                      value={formData.licenseNumber} onChange={e => setFormData({ ...formData, licenseNumber: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="comp-contact" className="block text-[10px] font-black text-slate-400 uppercase mb-2.5 ml-1 tracking-widest">Contact Phone</label>
                    <input id="comp-contact" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-mono font-bold text-slate-900 focus:border-blue-500 outline-none"
                      placeholder={COUNTRY_DATA[formData.country]?.phoneHint}
                      value={formData.contact} onChange={e => setFormData(prev => ({ ...prev, contact: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Website (URL)</label>
                    <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-sm focus:border-blue-500 outline-none"
                      placeholder="https://"
                      value={formData.website} onChange={e => setFormData({ ...formData, website: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Inc. Date</label>
                    <input type="date" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-sm focus:border-blue-500 outline-none"
                      value={formData.incorporationDate} onChange={e => setFormData({ ...formData, incorporationDate: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Industry</label>
                    <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-sm focus:border-blue-500 outline-none"
                      value={formData.industry} onChange={e => setFormData({ ...formData, industry: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] border-b border-amber-100 pb-2 flex items-center">
                  <i className="fas fa-university mr-2"></i> Banking & Financials
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Bank Account No.</label>
                    <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-mono focus:border-blue-500 outline-none"
                      value={formData.bankAccount} onChange={e => setFormData({ ...formData, bankAccount: e.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">IFSC / SWIFT</label>
                    <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-mono focus:border-blue-500 outline-none uppercase"
                      value={formData.ifscCode} onChange={e => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Bank Name</label>
                    <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-sm focus:border-blue-500 outline-none"
                      value={formData.bankName} onChange={e => setFormData({ ...formData, bankName: e.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor="comp-branch" className="block text-[10px] font-black text-slate-400 uppercase mb-2.5 ml-1 tracking-widest">Branch Name</label>
                    <input id="comp-branch" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:border-blue-500 outline-none"
                      value={formData.branchName} onChange={e => setFormData(prev => ({ ...prev, branchName: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Staff Count</label>
                    <input type="number" className="w-full bg-white border-2 border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold focus:border-blue-500 outline-none shadow-sm"
                      value={formData.employees} onChange={e => setFormData({ ...formData, employees: e.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Annual Revenue ({formData.currencySymbol})</label>
                    <input type="number" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-black text-blue-600 focus:border-blue-500 outline-none"
                      value={formData.revenue} onChange={e => setFormData({ ...formData, revenue: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Est. OpEx ({formData.currencySymbol})</label>
                    <input type="number" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-black text-red-500 focus:border-blue-500 outline-none"
                      value={formData.expenses} onChange={e => setFormData({ ...formData, expenses: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse md:flex-row justify-end gap-4 pt-8 border-t border-slate-100">
                <button type="button" onClick={closeForm} className="w-full md:w-auto px-6 md:px-10 py-4 font-black text-slate-400 uppercase text-[10px] tracking-widest hover:bg-slate-50 rounded-2xl transition-all">Cancel</button>
                <button type="submit" disabled={isBusy} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 md:px-16 py-4 md:py-5 rounded-2xl md:rounded-[3rem] font-black shadow-xl shadow-blue-500/30 text-[10px] uppercase tracking-[0.2em] transition-all transform active:scale-95 flex items-center justify-center">
                  {isBusy ? <i className="fas fa-circle-notch fa-spin mr-3"></i> : <i className="fas fa-cloud-upload-alt mr-3"></i>}
                  {editingCompanyId ? 'Save Profile Updates' : 'Complete Registration & Launch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyManager;
