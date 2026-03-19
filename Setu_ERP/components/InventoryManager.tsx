
import React, { useState, useMemo } from 'react';
import { Product, Transaction, Company, TransactionItem, User } from '../types';
import { transactionService } from '../services/api';
import { formatDate } from '../utils';

interface Props {
  products: Product[];
  transactions: Transaction[];
  activeCompany: Company | null;
  currentUser: User;
  onDataChange: () => void;
}

const COUNTRY_TAX_MAP: Record<string, string> = {
  'India': 'GST',
  'United States': 'Sales Tax',
  'United Kingdom': 'VAT',
  'European Union': 'VAT',
  'Canada': 'HST/GST',
  'Australia': 'GST'
};

const InventoryManager: React.FC<Props> = ({ products, transactions, activeCompany, currentUser, onDataChange }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [formData, setFormData] = useState({
    productId: '',
    supplierName: '',
    entityGstNumber: '',
    quantity: '' as string | number,
    unitCost: '' as string | number,
    cgstRate: '' as string | number,
    sgstRate: '' as string | number,
    date: new Date().toISOString().split('T')[0]
  });

  const lowStockProducts = useMemo(() => {
    return products.filter(p => p.stock <= 5);
  }, [products]);

  const filteredPurchases = useMemo(() => {
    return transactions
      .filter(t => t.type === 'PURCHASE')
      .filter(t => {
        const matchesSearch = t.entityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.items[0]?.productName?.toLowerCase().includes(searchTerm?.toLowerCase() || '');
        const matchesStart = startDate ? t.date >= startDate : true;
        const matchesEnd = endDate ? t.date <= endDate : true;
        return matchesSearch && matchesStart && matchesEnd;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, searchTerm, startDate, endDate]);

  const totalPages = Math.ceil(filteredPurchases.length / itemsPerPage);
  const paginatedPurchases = filteredPurchases.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleEdit = (transaction: Transaction) => {
    const item = transaction.items[0];
    setEditingTransactionId(transaction.id);
    setFormData({
      productId: item.productId,
      supplierName: transaction.entityName,
      entityGstNumber: transaction.entityGstNumber || '',
      quantity: item.quantity,
      unitCost: item.unitPrice,
      cgstRate: item.cgstRate || (item.taxRate ? item.taxRate / 2 : ''),
      sgstRate: item.sgstRate || (item.taxRate ? item.taxRate / 2 : ''),
      date: transaction.date.split('T')[0]
    });
    setShowModal(true);
  };

  const [isBusy, setIsBusy] = useState(false);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm("CRITICAL ACTION: Are you sure you want to delete this purchase?")) {
      try {
        await transactionService.delete(id);
        onDataChange();
      } catch (err) {
        alert("Failed to delete purchase record.");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBusy) return;

    const product = products.find(p => p.id === formData.productId);
    if (!product) return;

    const qty = Number(formData.quantity) || 0;
    const cost = Number(formData.unitCost) || 0;
    const cgstVal = Number(formData.cgstRate) || 0;
    const sgstVal = Number(formData.sgstRate) || 0;

    const cgstAmount = (qty * cost) * (cgstVal / 100);
    const sgstAmount = (qty * cost) * (sgstVal / 100);
    const taxAmount = cgstAmount + sgstAmount;
    const taxRateVal = cgstVal + sgstVal;
    const totalAmount = (qty * cost) + taxAmount;

    const item: any = {
      productId: formData.productId,
      productName: product.name,
      hsnCode: product.hsnCode,
      quantity: qty,
      unitPrice: cost,
      taxRate: taxRateVal,
      taxAmount: taxAmount,
      cgstRate: cgstVal,
      sgstRate: sgstVal,
      cgstAmount: cgstAmount,
      sgstAmount: sgstAmount,
      totalAmount: totalAmount
    };

    const transactionData: any = {
      items: [item],
      totalAmount,
      totalTax: taxAmount,
      cgstTotal: cgstAmount,
      sgstTotal: sgstAmount,
      date: formData.date,
      entityName: formData.supplierName,
      entityGstNumber: formData.entityGstNumber,
      type: 'PURCHASE',
      companyId: activeCompany?.id || '',
      userId: currentUser.id
    };

    setIsBusy(true);
    try {
      if (editingTransactionId) {
        transactionData.id = editingTransactionId;
        await transactionService.update(editingTransactionId, transactionData);
      } else {
        await transactionService.create(transactionData);
      }
      onDataChange();
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      console.error("Save Error:", err.response?.data || err);
      const msg = typeof err.response?.data === 'string' ? err.response.data : JSON.stringify(err.response?.data) || err.message;
      alert("Save Error: " + msg);
    } finally {
      setIsBusy(false);
    }
  };

  const resetForm = () => {
    setEditingTransactionId(null);
    setFormData({
      productId: '',
      supplierName: '',
      entityGstNumber: '',
      quantity: '',
      unitCost: '',
      cgstRate: '',
      sgstRate: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  const symbol = activeCompany?.currencySymbol || '$';
  const taxLabel = activeCompany ? (COUNTRY_TAX_MAP[activeCompany.country] || 'Tax') : 'Tax';

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Purchase History</h2>
          <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">Inventory Inflow Records - Fulfills backorders and increases stock</p>
        </div>
        <div className="flex w-full sm:w-auto space-x-2 print-hidden">
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-black shadow-lg shadow-blue-500/20 flex items-center justify-center transition-all uppercase text-[10px] tracking-[0.15em]"
          >
            <i className="fas fa-plus mr-2"></i> Add New Purchase
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 filter-bar no-print">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Transaction Filtering</h4>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
          <div className="lg:col-span-6">
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Search Records</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search invoice, supplier or product..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 pl-11 text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
              <i className="fas fa-search absolute left-4 top-3.5 text-slate-300"></i>
            </div>
          </div>
          <div className="lg:col-span-6 flex flex-col sm:flex-row items-center gap-3">
            <div className="w-full">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Date Range</label>
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-[10px] focus:ring-2 focus:ring-blue-500 outline-none"
                  value={startDate}
                  onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }}
                />
                <span className="text-slate-300">-</span>
                <input
                  type="date"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-[10px] focus:ring-2 focus:ring-blue-500 outline-none"
                  value={endDate}
                  onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }}
                />
              </div>
            </div>
            <div className="w-full sm:w-auto">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Per Page</label>
              <select
                className="bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-[10px] font-bold focus:ring-2 focus:ring-blue-500 outline-none w-full"
                value={itemsPerPage}
                onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              >
                <option value={10}>10 Records</option>
                <option value={20}>20 Records</option>
                <option value={50}>50 Records</option>
                <option value={100}>100 Records</option>
              </select>
            </div>
            <button
              onClick={() => { setSearchTerm(''); setStartDate(''); setEndDate(''); setCurrentPage(1); }}
              className="w-full sm:w-auto mt-6 bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:border-none print:shadow-none">

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-slate-100">
          {paginatedPurchases.map(t => (
            <div key={t.id} className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="inline-block px-2 py-1 bg-blue-50 text-blue-600 rounded text-[10px] font-black font-mono tracking-tight uppercase mb-1">
                    {t.invoiceNumber}
                  </span>
                  <h4 className="font-bold text-slate-800 text-sm uppercase tracking-tight">{t.entityName}</h4>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatDate(t.date)}</span>
              </div>

              <div className="pl-2 border-l-2 border-slate-100">
                <p className="text-xs font-black text-slate-700 uppercase tracking-tight">{t.items[0]?.productName}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Qty: {t.items[0]?.quantity}</span>
                  <span className="text-[10px] text-slate-400 font-mono tracking-tighter">@ {symbol}{t.items[0]?.unitPrice}</span>
                </div>
              </div>

              <div className="flex justify-between items-end pt-2">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total</p>
                  <p className="text-lg font-black text-slate-900 leading-none">{symbol}{t.totalAmount.toLocaleString()}</p>
                </div>
                <div className="flex space-x-2">
                  <button onClick={() => handleEdit(t)} className="p-2 bg-blue-50 text-blue-600 rounded-lg shadow-sm hover:bg-blue-100 transition-colors">
                    <i className="fas fa-pencil-alt text-xs"></i>
                  </button>
                  <button onClick={(e) => handleDelete(e, t.id)} className="p-2 bg-red-50 text-red-600 rounded-lg shadow-sm hover:bg-red-100 transition-colors">
                    <i className="fas fa-trash text-xs"></i>
                  </button>
                </div>
              </div>
            </div>
          ))}
          {paginatedPurchases.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
              No records found
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto custom-scrollbar">
          <table className="w-full text-left whitespace-nowrap min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 font-black text-slate-600 text-[9px] uppercase tracking-widest">Invoice No.</th>
                <th className="px-6 py-4 font-black text-slate-600 text-[9px] uppercase tracking-widest">Supplier</th>
                <th className="px-6 py-4 font-black text-slate-600 text-[9px] uppercase tracking-widest">Product Item</th>
                <th className="px-6 py-4 font-black text-slate-600 text-[9px] uppercase tracking-widest text-right">Quantity</th>
                <th className="px-6 py-4 font-black text-slate-600 text-[9px] uppercase tracking-widest text-right">Total Price</th>
                <th className="px-6 py-4 font-black text-slate-600 text-[9px] uppercase tracking-widest text-right">Purchase Date</th>
                <th className="px-6 py-4 font-black text-slate-600 text-[9px] uppercase tracking-widest text-right print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginatedPurchases.map(t => (
                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 font-mono text-xs text-blue-600 font-bold tracking-tighter uppercase">{t.invoiceNumber}</td>
                  <td className="px-6 py-4 font-bold text-slate-800 text-xs uppercase tracking-tight">{t.entityName}</td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-black text-slate-900 uppercase tracking-tighter">{t.items[0]?.productName}</p>
                    <p className="text-[9px] text-slate-400 font-mono tracking-tighter italic">COST: {symbol}{t.items[0]?.unitPrice}</p>
                  </td>
                  <td className="px-6 py-4 text-right font-black text-slate-900 text-xs">{t.items[0]?.quantity}</td>
                  <td className="px-6 py-4 text-right font-black text-slate-900 text-xs">{symbol}{t.totalAmount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-slate-400 text-[10px] font-black">{formatDate(t.date)}</td>
                  <td className="px-6 py-4 text-right print:hidden">
                    <div className="flex justify-end items-center space-x-1">
                      <button onClick={() => handleEdit(t)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><i className="fas fa-pencil-alt text-xs"></i></button>
                      <button onClick={(e) => handleDelete(e, t.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><i className="fas fa-trash text-xs"></i></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 no-print">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredPurchases.length)} of {filteredPurchases.length} records
        </p>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all uppercase tracking-widest"
          >
            Previous
          </button>
          <div className="flex space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum = i + 1;
              if (totalPages > 5 && currentPage > 3) {
                pageNum = currentPage - 3 + i + 1; // Center current page
                if (pageNum > totalPages) pageNum = totalPages - (4 - i);
              }
              const isCurrent = pageNum === currentPage;
              if (pageNum > 0 && pageNum <= totalPages) {
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${isCurrent
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                    {pageNum}
                  </button>
                );
              }
              return null;
            })}
          </div>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all uppercase tracking-widest"
          >
            Next
          </button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[70] flex items-center justify-center p-2 sm:p-4 no-print overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-50 px-8 py-5 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{editingTransactionId ? 'Edit Purchase' : 'Add New Purchase'}</h3>
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Fill in purchase details</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-2"><i className="fas fa-times text-xl"></i></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Select Product</label>
                <select
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-xs shadow-inner uppercase font-bold"
                  value={formData.productId}
                  onChange={e => setFormData({ ...formData, productId: e.target.value })}
                >
                  <option value="">Choose product...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Supplier Name</label>
                  <input required type="text" placeholder="Who supplied this?" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.supplierName} onChange={e => setFormData({ ...formData, supplierName: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Supplier GST Number</label>
                  <input type="text" placeholder="GST/PAN ID (optional)" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.entityGstNumber} onChange={e => setFormData({ ...formData, entityGstNumber: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Purchase Date</label>
                <input required type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Quantity</label>
                  <input required type="number" placeholder="0" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs outline-none"
                    value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value === '' ? '' : Number(e.target.value) })} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Unit Cost</label>
                  <input required type="number" placeholder="0.00" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs outline-none"
                    value={formData.unitCost} onChange={e => setFormData({ ...formData, unitCost: e.target.value === '' ? '' : Number(e.target.value) })} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">CGST (%)</label>
                  <input required type="number" placeholder="0" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs outline-none"
                    value={formData.cgstRate} onChange={e => setFormData({ ...formData, cgstRate: e.target.value === '' ? '' : Number(e.target.value) })} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">SGST (%)</label>
                  <input required type="number" placeholder="0" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs outline-none"
                    value={formData.sgstRate} onChange={e => setFormData({ ...formData, sgstRate: e.target.value === '' ? '' : Number(e.target.value) })} />
                </div>
              </div>
              <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-center sm:text-left">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Bill Amount</p>
                  <p className="text-xl font-black text-slate-900">{symbol}{((Number(formData.quantity) || 0) * (Number(formData.unitCost) || 0) * (1 + ((Number(formData.cgstRate) || 0) + (Number(formData.sgstRate) || 0)) / 100)).toLocaleString()}</p>
                </div>
                <button type="submit" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-10 py-3 rounded-xl font-black shadow-lg shadow-blue-500/20 transition-all uppercase text-[10px] tracking-widest">
                  {editingTransactionId ? 'Save Changes' : 'Add to Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManager;
