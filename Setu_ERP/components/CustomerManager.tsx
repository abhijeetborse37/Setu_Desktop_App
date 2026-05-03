import React, { useState } from 'react';
import { Customer, CustomerGroup, User } from '../types';
import { customerService } from '../services/api';
import { validators } from '../utils';
import * as XLSX from 'xlsx';

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
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkPreview, setBulkPreview] = useState<any[]>([]);

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
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);
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
    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">CRM & Client Registry</h1>
          <p className="text-[10px] text-slate-400 font-bold tracking-[0.2em]">Centralized Customer Profile Management</p>
        </div>
        <div className="flex w-full lg:w-auto gap-3 print-hidden">
          <button
            onClick={() => setShowBulkModal(true)}
            className="flex-1 lg:flex-none bg-slate-900 hover:bg-black text-white px-6 py-3.5 rounded-2xl font-black shadow-xl shadow-slate-200 flex items-center justify-center transition-all uppercase text-[10px] tracking-[0.15em] border border-slate-700"
          >
            <i className="fas fa-file-upload mr-2 text-emerald-400"></i> Bulk Upload
          </button>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex-1 lg:flex-none bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-2xl font-black shadow-xl shadow-blue-500/20 flex items-center justify-center transition-all uppercase text-[10px] tracking-[0.15em]"
          >
            <i className="fas fa-user-plus mr-2"></i> Register New Client
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden no-print ring-4 ring-slate-100/50 transition-all duration-300">
        <div className="p-5 md:p-6 space-y-6">
          {/* Header & Search Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1 max-w-2xl relative group">
              <input
                type="text"
                placeholder="Search profiles by name, phone or email..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-5 pl-12 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm"
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
              <i className="fas fa-search absolute left-4.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors pointer-events-none"></i>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsFiltersVisible(!isFiltersVisible)}
                className={`flex items-center gap-2 px-5 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${isFiltersVisible ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
              >
                <i className={`fas ${isFiltersVisible ? 'fa-sliders-h' : 'fa-filter'} text-sm`}></i>
                {isFiltersVisible ? 'Hide Groups' : 'Filter by Group'}
              </button>
              {(searchTerm || filterGroup !== 'ALL') && (
                <button
                  onClick={() => { setSearchTerm(''); setFilterGroup('ALL'); setCurrentPage(1); }}
                  className="p-3.5 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-all"
                  title="Reset All"
                >
                  <i className="fas fa-undo-alt text-sm"></i>
                </button>
              )}
            </div>
          </div>

          {/* Collapsible Content */}
          {isFiltersVisible && (
            <div className="pt-6 border-t border-slate-100 animate-in slide-in-from-top-4 duration-300">
              <div className="flex flex-wrap items-center gap-3">
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mr-2 ml-1">Client Segments:</label>
                <div className="flex flex-wrap items-center gap-2">
                  {['ALL', CustomerGroup.REGULAR, CustomerGroup.VIP, CustomerGroup.NEW].map(group => (
                    <button
                      key={group}
                      onClick={() => { setFilterGroup(group as any); setCurrentPage(1); }}
                      className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all border ${filterGroup === group ? 'bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-200' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600'}`}
                    >
                      {group === 'ALL' ? 'Show All Profiles' : `${group} SEGMENT`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── MOBILE CARD VIEW (< lg) ── */}
      <div className="lg:hidden space-y-4">
        {paginatedCustomers.length === 0 && (
          <div className="p-10 text-center text-slate-400 bg-white rounded-[2rem] border border-slate-200">
            <i className="fas fa-users-slash text-3xl opacity-40"></i>
            <p className="text-xs font-bold uppercase tracking-widest mt-3">No Clients Found</p>
          </div>
        )}
        {paginatedCustomers.map(customer => (
          <div key={customer.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3 truncate">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 flex-shrink-0">
                  <i className="fas fa-user-circle"></i>
                </div>
                <div className="truncate">
                  <p className="text-sm font-black text-slate-800 uppercase tracking-tight truncate">{customer.name}</p>
                  <p className="text-[10px] text-slate-400 font-bold truncate uppercase tracking-widest">{customer.email || 'No email'}</p>
                </div>
              </div>
              <span className={`flex-shrink-0 inline-flex items-center text-[7px] font-black px-2 py-1 rounded-md uppercase tracking-[0.15em] ${customer.group === CustomerGroup.VIP ? 'bg-amber-100 text-amber-700' :
                customer.group === CustomerGroup.NEW ? 'bg-emerald-100 text-emerald-700' :
                  'bg-slate-100 text-slate-600'
                }`}>
                {customer.group === CustomerGroup.VIP ? 'VIP' : customer.group === CustomerGroup.NEW ? 'NEW' : 'REG'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Contact</p>
                <p className="text-xs font-black text-slate-700 font-mono">{customer.phone}</p>
              </div>
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Registry ID</p>
                <p className="text-xs font-bold text-blue-600 truncate">{customer.gstPanId || 'Pending'}</p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-[9px] text-slate-400 font-bold truncate uppercase tracking-widest max-w-[60%]">
                <i className="fas fa-map-marker-alt mr-1"></i> {customer.address || 'Address not set'}
              </p>
              <div className="flex items-center space-x-2">
                <button onClick={(e) => handleEdit(e, customer)} className="w-9 h-9 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center">
                  <i className="fas fa-edit text-xs"></i>
                </button>
                <button onClick={(e) => handleDelete(e, customer.id)} className="w-9 h-9 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center">
                  <i className="fas fa-trash-alt text-xs"></i>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── DESKTOP TABLE VIEW (lg+) ── */}
      <div className="hidden lg:block bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden ring-4 ring-slate-100/50">
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
      </div>

      {/* Pagination Controls matched with other managers */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 no-print">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
          <i className="fas fa-database mr-3 text-blue-400"></i>
          Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, customers.length)} of {customers.length} entries
        </p>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-400 hover:text-blue-600 hover:border-blue-200 disabled:opacity-30 transition-all uppercase tracking-widest shadow-sm active:scale-95"
          >
            Previous
          </button>
          <div className="flex space-x-1 px-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-9 h-9 rounded-xl text-[10px] font-black transition-all ${currentPage === pageNum ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-white border border-slate-100 text-slate-400 hover:bg-slate-50'}`}
              >
                {pageNum}
              </button>
            ))}
          </div>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-400 hover:text-blue-600 hover:border-blue-200 disabled:opacity-30 transition-all uppercase tracking-widest shadow-sm active:scale-95"
          >
            Next
          </button>
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

      {showBulkModal && (
        <div className="fixed inset-0 bg-slate-900/80 z-[70] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-50 px-8 py-7 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Bulk Client Import</h3>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Import multiple profiles via CSV</p>
              </div>
              <button onClick={() => { setShowBulkModal(false); setBulkPreview([]); setBulkFile(null); }} className="text-slate-400 hover:text-slate-600 p-2 transition-colors">
                <i className="fas fa-times text-2xl"></i>
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 space-y-3">
                <h4 className="text-xs font-black text-blue-800 uppercase tracking-widest flex items-center">
                  <i className="fas fa-info-circle mr-2"></i> Instructions
                </h4>
                <p className="text-[11px] text-blue-600 font-medium leading-relaxed">
                  Prepare an Excel or CSV file with the following headers: <br />
                  <code className="bg-blue-100 px-1.5 py-0.5 rounded font-bold text-blue-800">Name (Mandatory), Email (Optional), Phone (Mandatory), Address (Optional), GST/PAN ID (Optional), License No (Optional), Group (Mandatory)</code>
                  <br /><br />
                  <span className="font-bold">Group values:</span> Select from dropdown in Excel or use: REGULAR, VIP, or NEW.
                </p>
                <button
                  onClick={async () => {
                    const ExcelJS = await import('exceljs');
                    const workbook = new ExcelJS.Workbook();
                    const worksheet = workbook.addWorksheet('Clients');

                    worksheet.columns = [
                      { header: 'Name (Mandatory)', key: 'name', width: 25 },
                      { header: 'Email (Optional)', key: 'email', width: 25 },
                      { header: 'Phone (Mandatory)', key: 'phone', width: 15 },
                      { header: 'Address (Optional)', key: 'address', width: 30 },
                      { header: 'GST/PAN ID (Optional)', key: 'gstPanId', width: 20 },
                      { header: 'License No (Optional)', key: 'licenseNo', width: 20 },
                      { header: 'Group (Mandatory)', key: 'group', width: 15 },
                    ];

                    // Add headers style
                    worksheet.getRow(1).font = { bold: true };
                    worksheet.getRow(1).fill = {
                      type: 'pattern',
                      pattern: 'solid',
                      fgColor: { argb: 'FFE2E8F0' }
                    };

                    // Add some sample data
                    worksheet.addRow({ 
                      name: 'Example Client', 
                      email: 'client@example.com', 
                      phone: '9876543210', 
                      address: '123 Business St', 
                      gstPanId: '27AAAAA0000A1Z5',
                      licenseNo: 'LIC-998877',
                      group: 'REGULAR' 
                    });

                    // Add data validation for the 'group' column (Column G)
                    // We apply it to rows 2 to 500
                    for (let i = 2; i <= 500; i++) {
                      worksheet.getCell(`G${i}`).dataValidation = {
                        type: 'list',
                        allowBlank: true,
                        formulae: ['"REGULAR,VIP,NEW"'],
                        showErrorMessage: true,
                        errorTitle: 'Invalid Segment',
                        error: 'Please select a value from the list (REGULAR, VIP, NEW)'
                      };
                    }

                    const buffer = await workbook.xlsx.writeBuffer();
                    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'client_import_template.xlsx';
                    a.click();
                  }}
                  className="text-[10px] font-black text-blue-700 underline uppercase tracking-widest hover:text-blue-900 transition-colors flex items-center gap-2"
                >
                  <i className="fas fa-file-excel"></i> Download Sample Excel Template
                </button>
              </div>

              <div className="space-y-4">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select File (Excel or CSV)</label>
                <div className="relative group">
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setBulkFile(file);
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const bstr = event.target?.result;
                          const wb = XLSX.read(bstr, { type: 'binary' });
                          const wsname = wb.SheetNames[0];
                          const ws = wb.Sheets[wsname];
                          const data = XLSX.utils.sheet_to_json(ws);
                          setBulkPreview(data);
                        };
                        reader.readAsBinaryString(file);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center group-hover:border-blue-400 transition-all">
                    <i className="fas fa-cloud-upload-alt text-3xl text-slate-300 mb-3 group-hover:text-blue-500 transition-colors"></i>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{bulkFile ? bulkFile.name : 'Click to Browse or Drag & Drop'}</p>
                    <p className="text-[10px] text-slate-400 mt-1 uppercase">Supports .XLSX, .XLS and .CSV files</p>
                  </div>
                </div>
              </div>

              {bulkPreview.length > 0 && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preview ({bulkPreview.length} items detected)</h4>
                  </div>
                  <div className="max-h-40 overflow-y-auto border border-slate-100 rounded-xl bg-slate-50/50 p-2 custom-scrollbar">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="px-3 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">Name</th>
                          <th className="px-3 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">Phone</th>
                          <th className="px-3 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">Group</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkPreview.slice(0, 5).map((p, i) => {
                          const getValue = (key: string) => {
                            const entry = Object.entries(p).find(([k]) => k.toLowerCase().startsWith(key.toLowerCase()));
                            return entry ? String(entry[1]) : '';
                          };
                          return (
                            <tr key={i} className="border-b border-slate-100/50 last:border-none">
                              <td className="px-3 py-2 text-[10px] font-bold text-slate-600 truncate max-w-[120px]">{getValue('name')}</td>
                              <td className="px-3 py-2 text-[10px] font-medium text-slate-500">{getValue('phone')}</td>
                              <td className="px-3 py-2 text-[9px] font-black text-blue-500 uppercase">{getValue('group')}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {bulkPreview.length > 5 && <p className="text-[9px] text-slate-400 text-center py-2 italic">Showing first 5 rows...</p>}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-end gap-4 pt-4 border-t border-slate-100">
                <button
                  onClick={() => { setShowBulkModal(false); setBulkPreview([]); setBulkFile(null); }}
                  className="px-8 py-3.5 font-black text-slate-400 hover:text-slate-600 text-[10px] uppercase tracking-widest rounded-2xl"
                >
                  Cancel
                </button>
                <button
                  disabled={isBusy || bulkPreview.length === 0 || !activeCompanyId}
                  onClick={async () => {
                    setIsBusy(true);
                    try {
                      const processedData = bulkPreview.map(p => {
                        const getValue = (key: string) => {
                          const entry = Object.entries(p).find(([k]) => k.toLowerCase().startsWith(key.toLowerCase()));
                          return entry ? String(entry[1]).trim() : '';
                        };
                        return {
                          name: getValue('name'),
                          email: getValue('email'),
                          phone: getValue('phone'),
                          address: getValue('address'),
                          gstPanId: getValue('gstPanId') || getValue('gst') || '',
                          licenseNo: getValue('licenseNo') || getValue('license') || '',
                          group: getValue('group')?.toUpperCase() === 'VIP' ? CustomerGroup.VIP :
                                 getValue('group')?.toUpperCase() === 'NEW' ? CustomerGroup.NEW :
                                 CustomerGroup.REGULAR
                        };
                      }).filter(c => c.name && c.phone); // Filter out empty rows

                      if (processedData.length === 0) {
                        alert("No valid client data found in file.");
                        setIsBusy(false);
                        return;
                      }

                      // 1. Check for duplicates within the file
                      const internalDupes = processedData.filter((c, index) => 
                        processedData.findIndex(x => x.phone === c.phone) !== index
                      );
                      
                      // 2. Check for duplicates against existing system data
                      const systemDupes = processedData.filter(c => 
                        customers.some(x => x.phone === c.phone)
                      );

                      if (internalDupes.length > 0 || systemDupes.length > 0) {
                        let msg = "IMPORT BLOCKED: Duplicate records detected.\n\n";
                        
                        if (internalDupes.length > 0) {
                          msg += `FILE DUPLICATES (${internalDupes.length}):\n`;
                          internalDupes.slice(0, 5).forEach(d => msg += `• ${d.name} (${d.phone})\n`);
                          if (internalDupes.length > 5) msg += `... and ${internalDupes.length - 5} others\n`;
                          msg += "\n";
                        }
                        
                        if (systemDupes.length > 0) {
                          msg += `ALREADY IN SYSTEM (${systemDupes.length}):\n`;
                          systemDupes.slice(0, 5).forEach(d => msg += `• ${d.name} (${d.phone})\n`);
                          if (systemDupes.length > 5) msg += `... and ${systemDupes.length - 5} others\n`;
                        }
                        
                        msg += "\nPlease correct these phone numbers in your file and try again.";
                        alert(msg);
                        setIsBusy(false);
                        return;
                      }

                      const finalData = processedData.map(d => ({ ...d, companyId: activeCompanyId }));
                      await customerService.createBulk(finalData);
                      onDataChange();
                      setShowBulkModal(false);
                      setBulkPreview([]);
                      setBulkFile(null);
                      alert(`Successfully imported ${dataToUpload.length} clients!`);
                    } catch (err: any) {
                      alert("Bulk Import Failed: " + (err.response?.data?.message || err.message));
                    } finally {
                      setIsBusy(false);
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-3.5 rounded-2xl font-black shadow-xl shadow-blue-500/20 transition-all uppercase text-[10px] tracking-[0.15em] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isBusy ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-check-circle"></i>}
                  {isBusy ? 'Uploading...' : `Start Import (${bulkPreview.length} Clients)`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManager;
