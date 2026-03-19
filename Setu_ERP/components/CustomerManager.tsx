import React, { useState } from 'react';
import { Customer, CustomerGroup, User } from '../types';
import { customerService } from '../services/api';

interface Props {
  customers: Customer[];
  onDataChange: () => void;
  activeCompanyId: string | null;
  currencySymbol: string;
  currentUser: User;
}

const PHONE_VALIDATION = {
  regex: /^\+(\d{1,3})[\s\-]?(\d{10,15})$/,
  indiaRegex: /^(\+91[\-\s]?)?[6789]\d{9}$/
};

const CustomerManager: React.FC<Props> = ({ customers, onDataChange, activeCompanyId, currencySymbol, currentUser }) => {
  const [filterGroup, setFilterGroup] = useState<CustomerGroup | 'ALL'>('ALL');
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '',
    email: '',
    phone: '',
    address: '',
    gstPanId: '',
    licenseNo: '',
    group: CustomerGroup.NEW,
    totalSpent: 0
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name || formData.name.trim().length < 2) {
      newErrors.name = 'Full name is required.';
    }

    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Valid email address is required.';
    }

    if (formData.phone) {
      const isIndia = formData.phone.startsWith('+91') || formData.phone.length === 10;
      if (isIndia && !PHONE_VALIDATION.indiaRegex.test(formData.phone)) {
        newErrors.phone = 'Invalid India number (+91 or 10 digits).';
      } else if (!isIndia && !/^\+\d{1,4}[\d\s\-]{7,15}$/.test(formData.phone)) {
        newErrors.phone = 'Invalid phone format (+[Code][Number]).';
      }
    } else {
      newErrors.phone = 'Phone number is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const filteredCustomers = filterGroup === 'ALL'
    ? customers
    : customers.filter(c => c.group === filterGroup);

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      gstPanId: '',
      licenseNo: '',
      group: CustomerGroup.NEW,
      totalSpent: 0
    });
    setEditingCustomer(null);
    setErrors({});
  };

  const handleEdit = (e: React.MouseEvent, customer: Customer) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingCustomer(customer);
    setFormData(customer);
    setErrors({});
    setShowForm(true);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Permanently remove this customer?')) {
      try {
        await customerService.delete(id);
        onDataChange();
      } catch (err) { alert("Delete failed"); }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (!activeCompanyId) {
      alert("Please select or activate a company first from the 'My Companies' tab.");
      return;
    }

    try {
      if (editingCustomer) {
        const updateData = {
          ...formData,
          userId: currentUser.id,
          companyId: formData.companyId || activeCompanyId
        };
        console.log("CRM: Updating Customer Payload:", updateData);
        await customerService.update(editingCustomer.id, updateData);
      } else {
        const newCustomer = {
          ...formData,
          userId: currentUser.id,
          companyId: activeCompanyId
        };
        console.log("CRM: Creating Customer Payload:", newCustomer);
        await customerService.create(newCustomer);
      }
      onDataChange();
      setShowForm(false);
      resetForm();
    } catch (err: any) {
      console.error("CRM Save Error:", err.response?.data || err);
      const msg = typeof err.response?.data === 'string' ? err.response.data : (err.response?.data?.message || JSON.stringify(err.response?.data) || err.message);
      alert("Failed to save customer: " + msg);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-4 md:px-0">
        <div className="flex items-center space-x-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm overflow-x-auto max-w-full">
          <button
            onClick={() => setFilterGroup('ALL')}
            className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${filterGroup === 'ALL' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            All Clients
          </button>
          <button
            onClick={() => setFilterGroup(CustomerGroup.REGULAR)}
            className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${filterGroup === CustomerGroup.REGULAR ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Regular
          </button>
          <button
            onClick={() => setFilterGroup(CustomerGroup.VIP)}
            className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${filterGroup === CustomerGroup.VIP ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            VIP
          </button>
          <button
            onClick={() => setFilterGroup(CustomerGroup.NEW)}
            className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${filterGroup === CustomerGroup.NEW ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            New
          </button>
        </div>

        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center text-xs uppercase tracking-widest"
        >
          <i className="fas fa-user-plus mr-2"></i> Register New Client
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredCustomers.map(customer => (
          <div key={customer.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm group hover:border-blue-500 hover:shadow-xl transition-all relative overflow-hidden flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center space-x-3 truncate pr-4">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors flex-shrink-0">
                  <i className="fas fa-user text-xl"></i>
                </div>
                <div className="truncate">
                  <h4 className="font-bold text-slate-800 truncate uppercase tracking-tight">{customer.name}</h4>
                  <p className="text-[10px] text-slate-400 font-mono truncate">{customer.email}</p>
                </div>
              </div>
              <span className={`flex-shrink-0 text-[8px] font-black px-2 py-1 rounded-md uppercase tracking-widest ${customer.group === CustomerGroup.VIP ? 'bg-amber-100 text-amber-600' :
                customer.group === CustomerGroup.NEW ? 'bg-emerald-100 text-emerald-600' :
                  'bg-slate-100 text-slate-500'
                }`}>
                {customer.group === CustomerGroup.VIP ? 'VIP' : customer.group}
              </span>
            </div>

            <div className="space-y-2 mb-6 flex-1">
              <div className="flex items-center text-xs text-slate-600 font-medium">
                <i className="fas fa-phone w-6 text-slate-300"></i>
                {customer.phone}
              </div>
              <div className="flex items-start text-xs text-slate-500">
                <i className="fas fa-map-marker-alt w-6 text-slate-300 mt-0.5"></i>
                <span className="line-clamp-2">{customer.address || 'Address not listed'}</span>
              </div>
              {(customer.gstPanId || customer.licenseNo) && (
                <div className="pt-2 flex flex-wrap gap-2">
                  {customer.gstPanId && (
                    <span className="text-[9px] bg-slate-50 border border-slate-100 px-2 py-0.5 rounded text-slate-500 font-mono">
                      GST: {customer.gstPanId}
                    </span>
                  )}
                  {customer.licenseNo && (
                    <span className="text-[9px] bg-slate-50 border border-slate-100 px-2 py-0.5 rounded text-slate-500 font-mono">
                      LIC: {customer.licenseNo}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
              <div>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Value Portfolio</p>
                <p className="font-black text-slate-900">{currencySymbol}{customer.totalSpent.toLocaleString()}</p>
              </div>
              <div className="flex space-x-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => handleEdit(e, customer)} className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 hover:bg-blue-600 hover:text-white flex items-center justify-center transition-all">
                  <i className="fas fa-pencil-alt text-[10px]"></i>
                </button>
                <button onClick={(e) => handleDelete(e, customer.id)} className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 hover:bg-red-600 hover:text-white flex items-center justify-center transition-all">
                  <i className="fas fa-trash text-[10px]"></i>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[70] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-50 px-8 py-6 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800 uppercase tracking-tight">{editingCustomer ? 'Update CRM Profile' : 'New Client Registration'}</h3>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Global Customer Relationship Manager</p>
              </div>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 p-2">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="col-span-full">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">Full Name / Entity Representative</label>
                  <input required type="text" className={`w-full bg-slate-50 border ${errors.name ? 'border-red-500 ring-1 ring-red-100' : 'border-slate-200'} rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all`}
                    value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                  {errors.name && <p className="text-[10px] text-red-500 mt-1 font-bold">{errors.name}</p>}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">Email Address</label>
                  <input required type="email" placeholder="client@company.com" className={`w-full bg-slate-50 border ${errors.email ? 'border-red-500 ring-1 ring-red-100' : 'border-slate-200'} rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all`}
                    value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                  {errors.email && <p className="text-[10px] text-red-500 mt-1 font-bold">{errors.email}</p>}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">Contact Number</label>
                  <input required type="tel" placeholder="+91 98765-43210" className={`w-full bg-slate-50 border ${errors.phone ? 'border-red-500 ring-1 ring-red-100' : 'border-slate-200'} rounded-xl px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none transition-all`}
                    value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                  {errors.phone && <p className="text-[10px] text-red-500 mt-1 font-bold">{errors.phone}</p>}
                </div>
                <div className="col-span-full">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">Registered Address</label>
                  <input type="text" placeholder="Street, City, Country" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none"
                    value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">GST/PAN ID</label>
                  <input type="text" placeholder="Optional" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none font-mono"
                    value={formData.gstPanId} onChange={e => setFormData({ ...formData, gstPanId: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">License No.</label>
                  <input type="text" placeholder="Optional" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none font-mono"
                    value={formData.licenseNo} onChange={e => setFormData({ ...formData, licenseNo: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">Market Segment</label>
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none"
                    value={formData.group}
                    onChange={e => setFormData({ ...formData, group: e.target.value as CustomerGroup })}>
                    <option value={CustomerGroup.REGULAR}>Regular</option>
                    <option value={CustomerGroup.VIP}>VIP</option>
                    <option value={CustomerGroup.NEW}>New</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">Initial Ledger Balance</label>
                  <input type="number" min="0" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none font-black"
                    value={formData.totalSpent} onChange={e => setFormData({ ...formData, totalSpent: Number(e.target.value) })} />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-6 border-t border-slate-100">
                <button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 font-bold text-slate-400 hover:text-slate-600 text-[10px] uppercase tracking-widest text-center">Discard</button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-3 rounded-2xl font-bold shadow-lg shadow-blue-500/30 transition-all uppercase text-[10px] tracking-widest text-center">
                  {editingCustomer ? 'Commit Changes' : 'Initialize Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManager;
