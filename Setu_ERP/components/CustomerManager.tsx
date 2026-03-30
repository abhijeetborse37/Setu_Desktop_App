import React, { useState } from 'react';
import { Customer, CustomerGroup, User } from '../types';
import { customerService } from '../services/api';
import { validators } from '../utils';

interface Props {
  customers: Customer[];
  onDataChange: () => void;
  activeCompanyId: string | null;
  currencySymbol: string;
  currentUser: User;
}


const CustomerManager: React.FC<Props> = ({ customers, onDataChange, activeCompanyId, currencySymbol, currentUser }) => {
  const [filterGroup, setFilterGroup] = useState<CustomerGroup | 'ALL'>('ALL');
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isBusy, setIsBusy] = useState(false);

  const [formData, setFormData] = useState<Partial<Customer>>({
    group: CustomerGroup.NEW
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!validators.name(formData.name || '', 2)) newErrors.name = 'Valid name is required.';
    if (formData.email && !validators.email(formData.email)) newErrors.email = 'Invalid email format.';
    if (!validators.phone(formData.phone || '')) newErrors.phone = 'Valid phone is required.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  const { totalPages, paginatedCustomers } = React.useMemo(() => {
    const filtered = customers.filter(c => {
      const matchesGroup = filterGroup === 'ALL' || c.group === filterGroup;
      const term = searchTerm.toLowerCase();
      const matchesSearch = c.name.toLowerCase().includes(term) ||
        c.phone.toLowerCase().includes(term) ||
        (c.email && c.email.toLowerCase().includes(term)) ||
        (c.gstPanId && c.gstPanId.toLowerCase().includes(term));
      return matchesGroup && matchesSearch;
    }).sort((a, b) => a.name.localeCompare(b.name));

    const total = Math.ceil(filtered.length / itemsPerPage);
    const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return { totalPages: total, paginatedCustomers: paginated };
  }, [customers, filterGroup, searchTerm, currentPage, itemsPerPage]);

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', address: '', gstPanId: '', licenseNo: '', group: CustomerGroup.NEW });
    setEditingCustomer(null);
    setErrors({});
  };

  const handleEdit = (e: React.MouseEvent, customer: Customer) => {
    e.preventDefault(); e.stopPropagation();
    setEditingCustomer(customer);
    setFormData(customer);
    setErrors({});
    setShowForm(true);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault(); e.stopPropagation();
    if (window.confirm('Delete this customer?')) {
      try { await customerService.delete(id); onDataChange(); } catch (err) { alert("Delete failed"); }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (!activeCompanyId) { alert("Select a company first."); return; }

    setIsBusy(true);
    try {
      if (editingCustomer) {
        await customerService.update(editingCustomer.id, { ...formData, userId: currentUser.id, companyId: activeCompanyId });
      } else {
        await customerService.create({ ...formData, userId: currentUser.id, companyId: activeCompanyId });
      }
      onDataChange();
      setShowForm(false);
      resetForm();
    } catch (err: any) {
      alert("Save failed: " + (err.response?.data?.message || err.message));
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-8 px-8 py-10 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm ring-4 ring-slate-100/50">
        <div className="flex-1">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">CRM & Client Registry</h1>
          <p className="text-[10px] text-slate-400 font-bold tracking-[0.2em] mb-8">Centralized Customer Profile Management</p>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative w-full sm:w-80 group">
              <input
                type="text"
                placeholder="Search profiles..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-5 pl-12 text-sm font-bold text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm"
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
              <i className="fas fa-search absolute left-5 top-4.5 text-slate-300 group-focus-within:text-blue-500 transition-colors"></i>
            </div>

            <div className="flex items-center space-x-1 bg-slate-100/30 p-1.5 rounded-2xl border border-slate-200/60 w-full sm:w-auto overflow-x-auto no-scrollbar">
              {['ALL', CustomerGroup.REGULAR, CustomerGroup.VIP, CustomerGroup.NEW].map(group => (
                <button
                  key={group}
                  onClick={() => { setFilterGroup(group as any); setCurrentPage(1); }}
                  className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] whitespace-nowrap transition-all ${filterGroup === group ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:text-slate-700'}`}
                >
                  {group === 'ALL' ? 'Registry Total' : group}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="w-full lg:w-auto bg-blue-600 hover:bg-blue-700 text-white px-10 py-5 rounded-[1.8rem] font-black shadow-2xl shadow-blue-500/20 transition-all flex items-center justify-center text-[10px] uppercase tracking-[0.2em] active:scale-95 flex-shrink-0"
        >
          <i className="fas fa-user-plus mr-3 text-sm"></i> Register New Client
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden ring-4 ring-slate-100/50">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Client Profile</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Category</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Contact Details</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Registry ID</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedCustomers.map(customer => (
                <tr key={customer.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                        <i className="fas fa-user-circle text-lg"></i>
                      </div>
                      <div className="max-w-[200px] truncate">
                        <p className="text-sm font-black text-slate-800 uppercase tracking-tight truncate">{customer.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold truncate opacity-70 uppercase tracking-widest">{customer.email || 'NO EMAIL REGISTERED'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`inline-flex items-center text-[8px] font-black px-3 py-1.5 rounded-lg uppercase tracking-[0.15em] ${customer.group === CustomerGroup.VIP ? 'bg-amber-100 text-amber-700 ring-4 ring-amber-500/5' :
                      customer.group === CustomerGroup.NEW ? 'bg-emerald-100 text-emerald-700 ring-4 ring-emerald-500/5' :
                        'bg-slate-100 text-slate-600 ring-4 ring-slate-500/5'
                      }`}>
                      <i className={`fas ${customer.group === CustomerGroup.VIP ? 'fa-crown' : customer.group === CustomerGroup.NEW ? 'fa-star' : 'fa-user-tag'} mr-2 text-[6px]`}></i>
                      {customer.group === CustomerGroup.VIP ? 'VIP CLIENT' : customer.group === CustomerGroup.NEW ? 'NEW PARTNER' : 'REGULAR'}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="space-y-1">
                      <p className="text-sm font-black text-slate-700 font-mono tracking-tighter">{customer.phone}</p>
                      <p className="text-[10px] text-slate-400 font-bold truncate max-w-[250px] uppercase tracking-widest opacity-60"><i className="fas fa-map-marker-alt mr-1"></i> {customer.address || 'Global - Not Set'}</p>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-wrap gap-2">
                      {customer.gstPanId ? (
                        <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md uppercase tracking-wider">ID: {customer.gstPanId}</span>
                      ) : (
                        <span className="text-[9px] font-bold text-slate-300 italic uppercase">Pending Registry</span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button onClick={(e) => handleEdit(e, customer)} className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-blue-600 hover:text-white hover:rotate-3 transition-all flex items-center justify-center shadow-sm">
                        <i className="fas fa-edit text-xs"></i>
                      </button>
                      <button onClick={(e) => handleDelete(e, customer.id)} className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-red-600 hover:text-white hover:-rotate-3 transition-all flex items-center justify-center shadow-sm">
                        <i className="fas fa-trash-alt text-xs"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Improved Pagination inside table container footer */}
        <div className="bg-slate-50/50 p-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-6">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center">
            <i className="fas fa-database mr-3 text-blue-400"></i>
            Audit View: Page {currentPage} of {totalPages || 1} • {customers.length} Entries
          </p>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 hover:text-blue-600 hover:border-blue-200 disabled:opacity-30 transition-all uppercase tracking-widest shadow-sm active:scale-95"
            >
              Previous
            </button>
            <div className="flex items-center space-x-1 px-4">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-10 h-10 rounded-xl text-[10px] font-black transition-all ${currentPage === pageNum ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/30' : 'bg-white text-slate-400 hover:bg-slate-50'}`}
                >
                  {pageNum}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 hover:text-blue-600 hover:border-blue-200 disabled:opacity-30 transition-all uppercase tracking-widest shadow-sm active:scale-95"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/80 z-[70] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-50 px-8 py-7 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{editingCustomer ? 'Update CRM Profile' : 'New Client Registration'}</h3>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Global Customer Relationship Manager</p>
              </div>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 p-2 transform hover:rotate-90 transition-transform">
                <i className="fas fa-times text-2xl"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="col-span-full">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Legal Name / Representative *</label>
                  <input required type="text" autoFocus className={`w-full bg-slate-50 border ${errors.name ? 'border-red-400 ring-4 ring-red-50' : 'border-slate-200'} rounded-xl px-5 py-4 text-sm font-bold text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm`}
                    value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} />
                  {errors.name && <p className="text-[9px] text-red-500 mt-2 font-bold uppercase tracking-widest"><i className="fas fa-exclamation-triangle mr-1"></i> {errors.name}</p>}
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Email Address (Registry)</label>
                  <input type="email" placeholder="client@company.com" className={`w-full bg-slate-50 border ${errors.email ? 'border-red-400' : 'border-slate-200'} rounded-xl px-5 py-4 text-sm font-bold text-slate-800 focus:bg-white focus:border-blue-500 outline-none transition-all shadow-sm`}
                    value={formData.email} onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))} />
                  {errors.email && <p className="text-[9px] text-red-500 mt-1 font-bold">{errors.email}</p>}
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Mobile Contact *</label>
                  <input required type="tel" placeholder="+91 00000 00000" className={`w-full bg-slate-50 border ${errors.phone ? 'border-red-400' : 'border-slate-200'} rounded-xl px-5 py-4 text-sm font-mono font-black text-slate-800 focus:bg-white focus:border-blue-500 outline-none transition-all shadow-sm`}
                    value={formData.phone} onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))} />
                  {errors.phone && <p className="text-[9px] text-red-500 mt-1 font-bold uppercase tracking-widest">{errors.phone}</p>}
                </div>
                <div className="col-span-full">
                  <label htmlFor="cli-address" className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest">Registered Address</label>
                  <input id="cli-address" type="text" placeholder="Street, City, Country" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm"
                    value={formData.address} onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))} />
                </div>
                <div>
                  <label htmlFor="cli-gst" className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest">GST/PAN ID</label>
                  <input id="cli-gst" type="text" placeholder="Optional" className={`w-full bg-slate-50 border-2 ${errors.gstPanId ? 'border-red-400' : 'border-slate-100'} rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-mono shadow-sm`}
                    value={formData.gstPanId} onChange={e => setFormData(prev => ({ ...prev, gstPanId: e.target.value }))} />
                  {errors.gstPanId && <p className="text-[10px] text-red-500 mt-2 font-bold uppercase tracking-widest">{errors.gstPanId}</p>}
                </div>
                <div>
                  <label htmlFor="cli-license" className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest">License No.</label>
                  <input id="cli-license" type="text" placeholder="Optional" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-mono shadow-sm"
                    value={formData.licenseNo} onChange={e => setFormData(prev => ({ ...prev, licenseNo: e.target.value }))} />
                </div>
                <div>
                  <label htmlFor="cli-group" className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest">Client Segment</label>
                  <select id="cli-group" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm"
                    value={formData.group}
                    onChange={e => setFormData(prev => ({ ...prev, group: e.target.value as CustomerGroup }))}>
                    <option value={CustomerGroup.REGULAR}>PROPRIETORSHIP / REGULAR</option>
                    <option value={CustomerGroup.VIP}>PREMIUM / VIP</option>
                    <option value={CustomerGroup.NEW}>PARTNERSHIP / NEW</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-4 pt-8 border-t border-slate-100">
                <button type="button" onClick={() => setShowForm(false)} className="px-10 py-4 font-black text-slate-400 hover:bg-slate-50 text-[10px] uppercase tracking-[0.2em] rounded-2xl transition-all">Discard</button>
                <button type="submit" disabled={isBusy} className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-5 rounded-2xl font-black shadow-xl shadow-emerald-500/30 transition-all uppercase text-[10px] tracking-[0.2em] text-center min-w-[200px] flex items-center justify-center gap-2">
                  {isBusy ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-cloud-upload-alt"></i>}
                  {isBusy ? 'Processing...' : (editingCustomer ? 'Update Profile' : 'Complete Registration')}
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
