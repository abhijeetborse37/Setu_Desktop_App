import React, { useState, useMemo } from 'react';
import { Product, Transaction, Company, TransactionItem, User } from '../types';
import { transactionService } from '../services/api';
import { formatDate } from '../utils';
import SearchableSelect from './SearchableSelect';
import InvoiceModal from './InvoiceModal';

interface PurchaseLineItem {
  id: string;
  productId: string;
  quantity: string | number;
  unitCost: string | number;
  cgstRate: string | number;
  sgstRate: string | number;
}

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
  const [showInvoice, setShowInvoice] = useState<Transaction | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);

  const getTodayDDMMYYYY = () => {
    const d = new Date();
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  };

  const [supplierName, setSupplierName] = useState(activeCompany?.supplierName || '');
  const [entityGstNumber, setEntityGstNumber] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [displayDate, setDisplayDate] = useState(getTodayDDMMYYYY()); // Fallback for manual or display use if needed
  const [roundOff, setRoundOff] = useState<string | number>('');
  const [lineItems, setLineItems] = useState<PurchaseLineItem[]>([
    { id: '1', productId: '', quantity: '', unitCost: '', cgstRate: '', sgstRate: '' }
  ]);

  // Sync supplier name with active company when not editing an existing transaction
  React.useEffect(() => {
    if (!editingTransactionId) {
      setSupplierName(activeCompany?.supplierName || '');
    }
  }, [activeCompany?.supplierName, editingTransactionId, activeCompany?.id]);

  const autoInvoiceNumber = useMemo(() => {
    const purchaseInvoices = transactions
      .filter(t => t.type === 'PURCHASE' && t.invoiceNumber)
      .map(t => {
        const numMatch = t.invoiceNumber.match(/^\d+$/);
        return numMatch ? parseInt(numMatch[0], 10) : 0;
      });
    const maxNum = purchaseInvoices.length > 0 ? Math.max(...purchaseInvoices) : 0;
    return (maxNum + 1).toString();
  }, [transactions]);

  const addLineItem = () => {
    setLineItems([...lineItems, { id: Math.random().toString(), productId: '', quantity: '', unitCost: '', cgstRate: '', sgstRate: '' }]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id));
    }
  };

  const updateLineItem = (id: string, field: keyof PurchaseLineItem, value: any) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'productId') {
          const product = products.find(p => p.id === value);
          if (product) {
            updated.unitCost = product.unitCost || 0;
            updated.cgstRate = product.cgstRate || 0;
            updated.sgstRate = product.sgstRate || 0;
          }
        }
        return updated;
      }
      return item;
    }));
  };

  const purchaseSummary = useMemo(() => {
    let subtotal = 0;
    let totalQuantity = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;

    lineItems.forEach(item => {
      const q = Number(item.quantity) || 0;
      const c = Number(item.unitCost) || 0;
      const cr = Number(item.cgstRate) || 0;
      const sr = Number(item.sgstRate) || 0;
      
      const itemPrice = q * c;
      subtotal += itemPrice;
      totalQuantity += q;
      cgstTotal += itemPrice * (cr / 100);
      sgstTotal += itemPrice * (sr / 100);
    });

    const totalTax = cgstTotal + sgstTotal;
    const ro = Number(roundOff) || 0;
    
    return { 
      subtotal, 
      totalQuantity,
      totalTax, 
      cgstTotal, 
      sgstTotal, 
      grandTotal: subtotal + totalTax + ro
    };
  }, [lineItems, roundOff]);

  const lowStockProducts = useMemo(() => {
    return products.filter(p => p.stock <= 5);
  }, [products]);

  const filteredPurchases = useMemo(() => {
    return transactions
      .filter(t => t.type === 'PURCHASE')
      .filter(t => {
        const matchesSearch = t.entityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (t.referenceNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.items[0]?.productName?.toLowerCase().includes(searchTerm?.toLowerCase() || '');

        const [y, m, d] = t.date.split('T')[0].split('-').map(part => parseInt(part, 10).toString());

        const matchesYear = filterYear ? y === filterYear : true;
        const matchesMonth = filterMonth ? m === filterMonth : true;
        const matchesDate = filterDate ? d === filterDate : true;

        return matchesSearch && matchesYear && matchesMonth && matchesDate;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, searchTerm, filterYear, filterMonth, filterDate]);

  const totalPages = Math.ceil(filteredPurchases.length / itemsPerPage);
  const paginatedPurchases = filteredPurchases.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleEdit = (transaction: Transaction) => {
    setEditingTransactionId(transaction.id);
    setSupplierName(transaction.entityName);
    setEntityGstNumber(transaction.entityGstNumber || '');
    setInvoiceNumber(transaction.invoiceNumber || '');
    setReferenceNumber(transaction.referenceNumber || '');
    setRoundOff(transaction.roundOff || '');
    setPurchaseDate(transaction.date.split('T')[0]);
    setDisplayDate(transaction.date.split('T')[0].split('-').reverse().join('/'));
    setLineItems(transaction.items.map(item => ({
      id: Math.random().toString(),
      productId: item.productId,
      quantity: item.quantity,
      unitCost: item.unitPrice,
      cgstRate: item.cgstRate || 0,
      sgstRate: item.sgstRate || 0
    })));
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
    setIsBusy(true);

    const transactionItems: any[] = lineItems.map(line => {
      const product = products.find(p => p.id === line.productId);
      const qty = Number(line.quantity) || 0;
      const cost = Number(line.unitCost) || 0;
      const ctr = Number(line.cgstRate) || 0;
      const str = Number(line.sgstRate) || 0;

      const cgstAmount = (qty * cost) * (ctr / 100);
      const sgstAmount = (qty * cost) * (str / 100);
      const taxAmount = cgstAmount + sgstAmount;
      const totalAmount = (qty * cost) + taxAmount;

      return {
        productId: line.productId,
        productName: product?.name || 'Unknown',
        hsnCode: product?.hsnCode,
        quantity: qty,
        unitPrice: cost,
        taxRate: ctr + str,
        taxAmount,
        cgstRate: ctr,
        sgstRate: str,
        cgstAmount,
        sgstAmount,
        totalAmount
      };
    });

    let finalDate = purchaseDate;
    if (!finalDate && displayDate) {
      const dateParts = displayDate.split('/');
      if (dateParts.length === 3) {
        finalDate = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`;
      }
    }

    const transactionData: any = {
      type: 'PURCHASE',
      items: transactionItems,
      totalAmount: purchaseSummary.grandTotal,
      totalTax: purchaseSummary.totalTax,
      cgstTotal: purchaseSummary.cgstTotal,
      sgstTotal: purchaseSummary.sgstTotal,
      roundOff: Number(roundOff) || 0,
      date: finalDate,
      entityName: supplierName,
      entityGstNumber: entityGstNumber,
      invoiceNumber: invoiceNumber || autoInvoiceNumber,
      referenceNumber: referenceNumber,
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
    setSupplierName(activeCompany?.supplierName || '');
    setEntityGstNumber('');
    setInvoiceNumber('');
    setReferenceNumber('');
    setRoundOff('');
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setDisplayDate(getTodayDDMMYYYY());
    setLineItems([{ id: '1', productId: '', quantity: '', unitCost: '', cgstRate: '', sgstRate: '' }]);
  };

  const symbol = activeCompany?.currencySymbol || '$';
  const taxLabel = activeCompany ? (COUNTRY_TAX_MAP[activeCompany.country] || 'Tax') : 'Tax';

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Inventory & Stock Inflow</h1>
          <p className="text-[10px] text-slate-400 font-bold tracking-[0.2em]">Manage purchases, fulfill backorders and track incoming stock</p>
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

      <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden no-print ring-4 ring-slate-100/50 transition-all duration-300">
        <div className="p-5 md:p-6 space-y-6">
          {/* Header & Search Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1 max-w-2xl relative group">
              <input
                type="text"
                placeholder="Search by invoice, supplier or product..."
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
                <i className={`fas ${isFiltersVisible ? 'fa-filter-circle-xmark' : 'fa-filter'} text-sm`}></i>
                {isFiltersVisible ? 'Hide Filters' : 'Advanced Filters'}
              </button>
              {(searchTerm || filterYear || filterMonth || filterDate) && (
                <button
                  onClick={() => { setSearchTerm(''); setFilterYear(''); setFilterMonth(''); setFilterDate(''); setCurrentPage(1); }}
                  className="p-3.5 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-all"
                  title="Reset All Filters"
                >
                  <i className="fas fa-undo-alt text-sm"></i>
                </button>
              )}
            </div>
          </div>

          {/* Collapsible Filter Content */}
          {isFiltersVisible && (
            <div className="pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-in slide-in-from-top-4 duration-300">
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2.5 ml-1">Filter by Year</label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer hover:bg-slate-100 transition-colors"
                  value={filterYear}
                  onChange={e => { setFilterYear(e.target.value); setCurrentPage(1); }}
                >
                  <option value="">All Years</option>
                  {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2.5 ml-1">Filter by Month</label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer hover:bg-slate-100 transition-colors"
                  value={filterMonth}
                  onChange={e => { setFilterMonth(e.target.value); setCurrentPage(1); }}
                >
                  <option value="">All Months</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2.5 ml-1">Filter by Date</label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer hover:bg-slate-100 transition-colors"
                  value={filterDate}
                  onChange={e => { setFilterDate(e.target.value); setCurrentPage(1); }}
                >
                  <option value="">All Dates</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2.5 ml-1">Records Per Page</label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer hover:bg-slate-100 transition-colors"
                  value={itemsPerPage}
                  onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                >
                  <option value={10}>Show 10 Records</option>
                  <option value={20}>Show 20 Records</option>
                  <option value={50}>Show 50 Records</option>
                  <option value={100}>Show 100 Records</option>
                </select>
              </div>
            </div>
          )}
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
                  <h4 className="font-bold text-slate-800 text-sm uppercase tracking-tight">{t.entityName || 'NO SUPPLIER'}</h4>
                  {t.referenceNumber && (
                    <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mt-0.5">REF: {t.referenceNumber}</p>
                  )}
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
                <th className="px-6 py-4 font-black text-slate-600 text-[9px] uppercase tracking-widest">Supplier / Ref No.</th>
                <th className="px-6 py-4 font-black text-slate-600 text-[9px] uppercase tracking-widest">Lines</th>
                <th className="px-6 py-4 font-black text-slate-600 text-[9px] uppercase tracking-widest text-right">Total Price (Incl. GST)</th>
                <th className="px-6 py-4 font-black text-slate-600 text-[9px] uppercase tracking-widest text-right">Purchase Date</th>
                <th className="px-6 py-4 font-black text-slate-600 text-[9px] uppercase tracking-widest text-right print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginatedPurchases.map(t => (
                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 font-mono text-xs text-blue-600 font-bold tracking-tighter uppercase">{t.invoiceNumber}</td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-800 text-xs uppercase tracking-tight">{t.entityName || 'N/A'}</p>
                    {t.referenceNumber && (
                      <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mt-1">REF: {t.referenceNumber}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] font-bold">{t.items.length} Items</span>
                  </td>
                  <td className="px-6 py-4 text-right font-black text-slate-900 text-xs">{symbol}{t.totalAmount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-slate-400 text-[10px] font-black">{formatDate(t.date)}</td>
                  <td className="px-6 py-4 text-right print:hidden">
                    <div className="flex justify-end items-center space-x-1">
                      <button onClick={() => setShowInvoice(t)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><i className="fas fa-file-invoice text-xs"></i></button>
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
        <div className="fixed inset-0 bg-slate-900/80 z-[70] flex items-center justify-center p-2 sm:p-4 no-print overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-8">
            <div className="bg-slate-50 px-8 py-5 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{editingTransactionId ? 'Edit Purchase' : 'Add New Purchase'}</h3>
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Entry Registry & Itemization</p>
              </div>
              <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-2"><i className="fas fa-times text-xl"></i></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-6 border-b border-slate-100">
                <div className="lg:col-span-1">
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Supplier Name (Optional)</label>
                  <input type="text" placeholder="Who supplied this?" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    value={supplierName} onChange={e => setSupplierName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Invoice Number (Auto)</label>
                  <input type="text" disabled className="w-full bg-slate-100 text-slate-400 border border-slate-200 rounded-xl px-4 py-3 text-xs outline-none cursor-not-allowed font-mono font-bold"
                    value={invoiceNumber || (!editingTransactionId ? autoInvoiceNumber : '')} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Reference No. (Optional)</label>
                  <input type="text" placeholder="External ref/PO" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Purchase Date</label>
                  <input required type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    value={purchaseDate} onChange={e => {
                      setPurchaseDate(e.target.value);
                      const d = e.target.value.split('-');
                      if (d.length === 3) setDisplayDate(`${d[2]}/${d[1]}/${d[0]}`);
                    }} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Supplier GST/Tax ID</label>
                  <input type="text" placeholder="GST/PAN ID (optional)" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    value={entityGstNumber} onChange={e => setEntityGstNumber(e.target.value)} />
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Itemized Particulars</h4>
                  <button type="button" onClick={addLineItem} className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all flex items-center shadow-sm">
                    <i className="fas fa-plus-circle mr-2"></i> Add Product
                  </button>
                </div>

                <div className="space-y-4">
                  {lineItems.map((item) => {
                    const lineQty = Number(item.quantity) || 0;
                    const lineCost = Number(item.unitCost) || 0;
                    const lineCgstRate = Number(item.cgstRate) || 0;
                    const lineSgstRate = Number(item.sgstRate) || 0;
                    const lineCgstAmt = (lineQty * lineCost) * (lineCgstRate / 100);
                    const lineSgstAmt = (lineQty * lineCost) * (lineSgstRate / 100);

                    return (
                      <div key={item.id} className="bg-slate-50/50 p-6 rounded-[1.5rem] border border-slate-100 relative group hover:border-blue-200 transition-all">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
                          <div className="lg:col-span-4">
                            <SearchableSelect
                              label="Product / Item *"
                              placeholder="Search inventory..."
                              options={products.map(p => ({
                                id: p.id,
                                name: p.name,
                                subtext: `STOCK: ${p.stock} | COST: ${symbol}${p.unitCost || 0}`
                              }))}
                              value={item.productId}
                              onChange={val => updateLineItem(item.id, 'productId', val)}
                            />
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-6 lg:col-span-7 gap-3">
                            <div className="col-span-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block tracking-tight">Qty</label>
                              <input required type="number" step="0.01" className="w-full bg-white border border-slate-200 rounded-xl px-2 py-3 text-[11px] outline-none focus:ring-1 focus:ring-blue-500"
                                value={item.quantity} onChange={e => updateLineItem(item.id, 'quantity', e.target.value)} />
                            </div>
                            <div className="col-span-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block tracking-tight">Cost</label>
                              <input required type="number" step="0.01" className="w-full bg-white border border-slate-200 rounded-xl px-2 py-3 text-[11px] outline-none focus:ring-1 focus:ring-blue-500"
                                value={item.unitCost} onChange={e => updateLineItem(item.id, 'unitCost', e.target.value)} />
                            </div>
                            <div className="col-span-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block tracking-tight">CGST %</label>
                              <input type="number" step="0.01" className="w-full bg-white border border-slate-200 rounded-xl px-2 py-3 text-[11px] outline-none focus:ring-1 focus:ring-blue-500"
                                value={item.cgstRate} onChange={e => updateLineItem(item.id, 'cgstRate', e.target.value)} />
                            </div>
                            <div className="col-span-1">
                               <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block tracking-tight">CGST Amt</label>
                               <div className="w-full bg-slate-100/50 border border-slate-200 rounded-xl px-2 py-3 text-[11px] text-slate-500 font-bold overflow-hidden text-ellipsis whitespace-nowrap">
                                 {symbol}{lineCgstAmt.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                               </div>
                            </div>
                            <div className="col-span-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block tracking-tight">SGST %</label>
                              <input type="number" step="0.01" className="w-full bg-white border border-slate-200 rounded-xl px-2 py-3 text-[11px] outline-none focus:ring-1 focus:ring-blue-500"
                                value={item.sgstRate} onChange={e => updateLineItem(item.id, 'sgstRate', e.target.value)} />
                            </div>
                            <div className="col-span-1">
                               <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block tracking-tight">SGST Amt</label>
                               <div className="w-full bg-slate-100/50 border border-slate-200 rounded-xl px-2 py-3 text-[11px] text-slate-500 font-bold overflow-hidden text-ellipsis whitespace-nowrap">
                                 {symbol}{lineSgstAmt.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                               </div>
                            </div>
                          </div>
                          <div className="lg:col-span-1 flex justify-end lg:justify-center pb-2.5">
                            <button type="button" onClick={() => removeLineItem(item.id)} className="text-red-400 hover:text-red-600 p-2 transition-colors">
                              <i className="fas fa-trash-alt text-lg md:text-sm"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <div className="w-full md:w-96 space-y-3 bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:bg-slate-100/50">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500">
                    <span className="uppercase tracking-widest">Total Quantity</span>
                    <span className="font-black text-slate-700">{purchaseSummary.totalQuantity.toLocaleString()} Units</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-400">
                    <span className="uppercase tracking-widest">Subtotal (Before Tax)</span>
                    <span className="font-black text-slate-600">{symbol}{purchaseSummary.subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between items-center mt-2 pb-2 border-b border-dashed border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total CGST</span>
                    <span className="text-[10px] font-black text-slate-600">{symbol}{purchaseSummary.cgstTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1 pb-2 border-b border-dashed border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total SGST</span>
                    <span className="text-[10px] font-black text-slate-600">{symbol}{purchaseSummary.sgstTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 border-b border-slate-200 pb-2">
                    <span className="uppercase tracking-widest">Total GST Value</span>
                    <span className="font-black text-emerald-600">{symbol}{purchaseSummary.totalTax.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1 pb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Round Off</span>
                    <input type="number" step="0.01" placeholder="0.00" className="w-24 bg-white border border-slate-200 rounded-lg px-2 py-1 text-right font-black text-slate-600 outline-none focus:ring-1 focus:ring-blue-500" value={roundOff} onChange={e => setRoundOff(e.target.value)} />
                  </div>
                  <div className="flex justify-between items-end text-slate-900 pt-3 border-t border-slate-200">
                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">Grand Total</span>
                    <span className="text-xl font-black text-blue-600 leading-none">{symbol}{purchaseSummary.grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 font-bold text-slate-400 hover:text-slate-600 uppercase text-[10px] tracking-widest text-center order-2 sm:order-1">Discard</button>
                <button disabled={isBusy} type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-3 rounded-2xl font-bold shadow-lg shadow-emerald-500/30 transition-all uppercase text-[10px] tracking-widest text-center order-1 sm:order-2 flex items-center justify-center min-w-[200px]">
                  {isBusy ? <><i className="fas fa-spinner fa-spin mr-2"></i> Saving...</> : (editingTransactionId ? 'Save Purchase Updates' : 'Finalize & Add Stock')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showInvoice && <InvoiceModal transaction={showInvoice} company={activeCompany} customer={null} onClose={() => setShowInvoice(null)} />}
    </div>
  );
};

export default InventoryManager;
