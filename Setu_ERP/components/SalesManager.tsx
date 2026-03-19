import React, { useState, useMemo } from 'react';
import { Product, Transaction, Company, Customer, TransactionItem, User } from '../types';
import { transactionService } from '../services/api';
import InvoiceModal from './InvoiceModal';
import { formatDate } from '../utils';

interface Props {
  products: Product[];
  customers: Customer[];
  transactions: Transaction[];
  activeCompany: Company | null;
  currentUser: User;
  onDataChange: () => void;
}

interface SaleLineItem {
  id: string;
  productId: string;
  quantity: string | number;
  price: string | number;
  cgstRate: string | number;
  sgstRate: string | number;
}

const COUNTRY_TAX_MAP: Record<string, string> = {
  'India': 'GST',
  'United States': 'Sales Tax',
  'United Kingdom': 'VAT',
  'European Union': 'VAT',
  'Canada': 'HST/GST',
  'Australia': 'GST'
};

const SalesManager: React.FC<Props> = ({ products, customers, transactions, activeCompany, currentUser, onDataChange }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [showInvoice, setShowInvoice] = useState<Transaction | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [customerId, setCustomerId] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [roundOff, setRoundOff] = useState<string | number>('');
  const [lineItems, setLineItems] = useState<SaleLineItem[]>([
    { id: '1', productId: '', quantity: '', price: '', cgstRate: '', sgstRate: '' }
  ]);

  const addLineItem = () => {
    setLineItems([...lineItems, { id: Math.random().toString(), productId: '', quantity: '', price: '', cgstRate: '', sgstRate: '' }]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id));
    }
  };

  const updateLineItem = (id: string, field: keyof SaleLineItem, value: any) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'productId') {
          const product = products.find(p => p.id === value);
          if (product) {
            updated.price = product.price;
            updated.cgstRate = product.cgstRate || ''; 
            updated.sgstRate = product.sgstRate || '';
          }
        }
        return updated;
      }
      return item;
    }));
  };

  const saleSummary = useMemo(() => {
    let subtotal = 0;
    let totalTax = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;
    lineItems.forEach(item => {
      const q = Number(item.quantity) || 0;
      const p = Number(item.price) || 0;
      const ctr = Number(item.cgstRate) || 0;
      const str = Number(item.sgstRate) || 0;
      const tr = ctr + str;
      const lineTotal = q * p;
      subtotal += lineTotal;
      cgstTotal += lineTotal * (ctr / 100);
      sgstTotal += lineTotal * (str / 100);
      totalTax += lineTotal * (tr / 100);
    });
    const ro = Number(roundOff) || 0;
    return { subtotal, totalTax, cgstTotal, sgstTotal, roundOff: ro, grandTotal: subtotal + totalTax + ro };
  }, [lineItems, roundOff]);

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(t => t.type === 'SALE')
      .filter(t => {
        const matchesSearch = t.entityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStart = startDate ? t.date >= startDate : true;
        const matchesEnd = endDate ? t.date <= endDate : true;
        return matchesSearch && matchesStart && matchesEnd;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, searchTerm, startDate, endDate]);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const [isBusy, setIsBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBusy) return;

    const currentCustomerId = customerId;
    const currentLineItems = lineItems;
    const currentSaleDate = saleDate;
    const currentSummary = saleSummary;

    const customer = customers.find(c => c.id === currentCustomerId);
    if (!customer) {
      alert("Please select a valid customer.");
      return;
    }

    const transactionItems: any[] = currentLineItems.map(line => {
      const qty = Number(line.quantity) || 0;
      const price = Number(line.price) || 0;
      const cRate = Number(line.cgstRate) || 0;
      const sRate = Number(line.sgstRate) || 0;
      const tr = cRate + sRate;

      const cgstAmount = (qty * price) * (cRate / 100);
      const sgstAmount = (qty * price) * (sRate / 100);
      const taxAmount = cgstAmount + sgstAmount;
      const totalAmount = (qty * price) + taxAmount;

      // Get product name from products array
      const product = products.find(p => p.id === line.productId);
      const productName = product?.name || 'Unknown Product';

      return {
        productId: line.productId,
        productName: productName,
        hsnCode: product?.hsnCode,
        quantity: qty,
        unitPrice: price,
        taxRate: tr,
        taxAmount,
        cgstRate: cRate,
        sgstRate: sRate,
        cgstAmount,
        sgstAmount,
        totalAmount
      };
    });

    setIsBusy(true);

    try {
      const transactionData: any = {
        type: 'SALE',
        items: transactionItems,
        totalAmount: currentSummary.grandTotal,
        totalTax: currentSummary.totalTax,
        cgstTotal: currentSummary.cgstTotal,
        sgstTotal: currentSummary.sgstTotal,
        roundOff: currentSummary.roundOff,
        date: currentSaleDate,
        entityName: customer.name,
        entityGstNumber: customer.gstPanId || '',
        companyId: activeCompany?.id || '',
        userId: currentUser.id
      };

      if (editingTransactionId) {
        transactionData.id = editingTransactionId;
        // Find existing transaction to keep and pass back its invoice number
        const existing = transactions.find(t => t.id === editingTransactionId);
        if (existing) {
          transactionData.invoiceNumber = existing.invoiceNumber;
        }
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

  const handleEdit = (t: Transaction) => {
    const customer = customers.find(c => c.name === t.entityName);
    setCustomerId(customer?.id || '');
    setSaleDate(t.date.split('T')[0]);
    setEditingTransactionId(t.id);
    setRoundOff(t.roundOff || '');
    setLineItems(t.items.map(item => ({
      id: Math.random().toString(),
      productId: item.productId,
      quantity: item.quantity,
      price: item.unitPrice,
      cgstRate: item.cgstRate || (item.taxRate ? item.taxRate / 2 : ''),
      sgstRate: item.sgstRate || (item.taxRate ? item.taxRate / 2 : '')
    })));
    setShowModal(true);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this sale?")) {
      try {
        await transactionService.delete(id);
        onDataChange();
      } catch (err) {
        alert("Failed to delete sale record.");
      }
    }
  };

  const resetForm = () => {
    setCustomerId('');
    setEditingTransactionId(null);
    setRoundOff('');
    setSaleDate(new Date().toISOString().split('T')[0]);
    setLineItems([{ id: '1', productId: '', quantity: '', price: '', cgstRate: '', sgstRate: '' }]);
  };

  const symbol = activeCompany?.currencySymbol || '$';
  const taxLabel = activeCompany ? (COUNTRY_TAX_MAP[activeCompany.country] || 'Tax') : 'Tax';

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Stock-Out (Sales)</h2>
          <p className="text-xs text-slate-500">Create sales transactions with backorder support for unavailable stock</p>
        </div>
        <div className="flex w-full sm:w-auto space-x-2 print-hidden">
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-emerald-500/20 flex items-center justify-center transition-all uppercase text-[10px] tracking-widest"
          >
            <i className="fas fa-plus mr-2"></i> New Sale
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
                placeholder="Search invoice or customer..."
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
          {paginatedTransactions.map(t => (
            <div key={t.id} className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="inline-block px-2 py-1 bg-emerald-50 text-emerald-600 rounded text-[10px] font-black font-mono tracking-tight uppercase mb-1">
                    {t.invoiceNumber}
                  </span>
                  <h4 className="font-bold text-slate-800 text-sm uppercase tracking-tight">{t.entityName}</h4>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatDate(t.date)}</span>
              </div>

              <div className="flex items-center gap-2 pl-2 border-l-2 border-emerald-100">
                <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider">
                  {t.items.length} {t.items.length === 1 ? 'Item' : 'Items'}
                </span>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest truncate max-w-[150px]">
                  {t.items.map(i => i.productName).join(', ').substring(0, 30)}...
                </span>
              </div>

              <div className="flex justify-between items-end pt-2">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Sale</p>
                  <p className="text-lg font-black text-slate-900 leading-none">{symbol}{t.totalAmount.toLocaleString()}</p>
                </div>
                <div className="flex space-x-2">
                  <button onClick={() => setShowInvoice(t)} className="p-2 bg-blue-50 text-blue-600 rounded-lg shadow-sm hover:bg-blue-100 transition-colors">
                    <i className="fas fa-file-invoice text-xs"></i>
                  </button>
                  <button onClick={() => handleEdit(t)} className="p-2 bg-slate-50 text-slate-600 rounded-lg shadow-sm hover:bg-slate-100 transition-colors">
                    <i className="fas fa-pencil-alt text-xs"></i>
                  </button>
                  <button onClick={(e) => handleDelete(e, t.id)} className="p-2 bg-red-50 text-red-600 rounded-lg shadow-sm hover:bg-red-100 transition-colors">
                    <i className="fas fa-trash text-xs"></i>
                  </button>
                </div>
              </div>
            </div>
          ))}
          {paginatedTransactions.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
              No sales records found
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto custom-scrollbar">
          <table className="w-full text-left whitespace-nowrap min-w-[600px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 font-bold text-slate-600 text-[10px] uppercase tracking-widest">Invoice</th>
                <th className="px-6 py-4 font-bold text-slate-600 text-[10px] uppercase tracking-widest">Customer</th>
                <th className="px-6 py-4 font-bold text-slate-600 text-[10px] uppercase tracking-widest text-center">Lines</th>
                <th className="px-6 py-4 font-bold text-slate-600 text-[10px] uppercase tracking-widest text-right">Total</th>
                <th className="px-6 py-4 font-bold text-slate-600 text-[10px] uppercase tracking-widest text-right">Date</th>
                <th className="px-6 py-4 font-bold text-slate-600 text-[10px] uppercase tracking-widest text-right print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginatedTransactions.map(t => (
                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 font-mono text-xs text-emerald-600 font-bold">{t.invoiceNumber}</td>
                  <td className="px-6 py-4 font-medium text-slate-800 text-sm">{t.entityName}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] font-bold">{t.items.length}</span>
                  </td>
                  <td className="px-6 py-4 text-right font-black text-slate-800 text-sm">{symbol}{t.totalAmount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-slate-400 text-xs font-bold">{formatDate(t.date)}</td>
                  <td className="px-6 py-4 text-right print:hidden">
                    <div className="flex justify-end items-center space-x-1">
                      <button onClick={() => setShowInvoice(t)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                        <i className="fas fa-file-invoice text-sm"></i>
                      </button>
                      <button onClick={() => handleEdit(t)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                        <i className="fas fa-pencil-alt text-sm"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedTransactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-xs italic">No sales found in system.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 no-print">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length} records
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

      {
        showModal && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[70] flex items-center justify-center p-2 sm:p-4 no-print overflow-y-auto">
            <div className="bg-white rounded-3xl w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-8">
              <div className="bg-slate-50 px-6 sm:px-8 py-4 sm:py-5 border-b border-slate-200 flex justify-between items-center">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-800">{editingTransactionId ? 'Edit Sale' : 'New Sale'}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Multi-Item Order Entry</p>
                </div>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-2 transition-colors">
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-4 sm:p-8 space-y-6 max-h-[85vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pb-6 border-b border-slate-100">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Customer</label>
                    <select required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      value={customerId} onChange={e => setCustomerId(e.target.value)}>
                      <option value="">Select customer...</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Order Date</label>
                    <input required type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      value={saleDate} onChange={e => setSaleDate(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Items</h4>
                    <button type="button" onClick={addLineItem} className="text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase tracking-widest flex items-center">
                      <i className="fas fa-plus-circle mr-2"></i> Add Line
                    </button>
                  </div>

                  <div className="space-y-3">
                    {lineItems.map((item) => {
                      const selectedProduct = products.find(p => p.id === item.productId);

                      return (
                        <div key={item.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 relative shadow-sm">
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                            <div className="md:col-span-4">
                              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Product</label>
                              <select
                                required
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs outline-none transition-all cursor-pointer"
                                value={item.productId}
                                onChange={e => updateLineItem(item.id, 'productId', e.target.value)}
                              >
                                <option value="">Choose item...</option>
                                {products.map(p => (
                                  <option
                                    key={p.id}
                                    value={p.id}
                                    className="text-slate-800"
                                  >
                                    {p.name} (Stock: {p.stock})
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 md:col-span-7 gap-3">
                              <div className="col-span-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Qty</label>
                                <input required type="number" min="1" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs outline-none"
                                  value={item.quantity} onChange={e => updateLineItem(item.id, 'quantity', e.target.value)} />
                              </div>
                              <div className="col-span-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Price</label>
                                <input required type="number" step="0.01" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs outline-none"
                                  value={item.price} onChange={e => updateLineItem(item.id, 'price', e.target.value)} />
                              </div>
                              <div className="col-span-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">CGST%</label>
                                <input required type="number" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs outline-none"
                                  value={item.cgstRate} onChange={e => updateLineItem(item.id, 'cgstRate', e.target.value)} />
                              </div>
                              <div className="col-span-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">SGST%</label>
                                <input required type="number" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs outline-none"
                                  value={item.sgstRate} onChange={e => updateLineItem(item.id, 'sgstRate', e.target.value)} />
                              </div>
                            </div>
                            <div className="md:col-span-1 flex justify-end md:justify-center md:pb-2.5">
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
                  <div className="w-full md:w-64 space-y-2 border-t border-slate-100 pt-6">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400">
                      <span className="uppercase tracking-widest">Subtotal</span>
                      <span className="font-black text-slate-600">{symbol}{saleSummary.subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-400">
                      <span className="uppercase tracking-widest">Tax (Total)</span>
                      <span className="font-black text-slate-600">{symbol}{saleSummary.totalTax.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Round Off</span>
                      <input type="number" step="0.01" placeholder="0.00" className="w-24 bg-white border border-slate-200 rounded-lg px-2 py-1 text-right font-black text-slate-600 outline-none focus:ring-1 focus:ring-blue-500" value={roundOff} onChange={e => setRoundOff(e.target.value)} />
                    </div>
                    <div className="flex justify-between items-end text-slate-900 border-t border-slate-200 pt-3 mt-2">
                      <span className="text-[10px] font-black uppercase tracking-widest">Grand Total</span>
                      <span className="text-xl font-black text-blue-600 leading-none">{symbol}{saleSummary.grandTotal.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-3">
                  <button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 font-bold text-slate-400 hover:text-slate-600 uppercase text-[10px] tracking-widest text-center order-2 sm:order-1">Discard</button>
                  <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-3 rounded-2xl font-bold shadow-lg shadow-emerald-500/30 transition-all uppercase text-[10px] tracking-widest text-center order-1 sm:order-2">
                    {editingTransactionId ? 'Update Record' : 'Post Sale'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {showInvoice && <InvoiceModal transaction={showInvoice} company={activeCompany} customer={customers.find(c => c.name === showInvoice.entityName) || null} onClose={() => setShowInvoice(null)} />}
    </div >
  );
};

export default SalesManager;
