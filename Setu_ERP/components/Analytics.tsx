
import React, { useState, useMemo, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Company, Product, Transaction } from '../types';
import { formatDate } from '../utils';

interface Props {
  company: Company | null;
  products: Product[];
  transactions: Transaction[];
}

const Analytics: React.FC<Props> = ({ company, products, transactions }) => {
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [transactionType, setTransactionType] = useState<'ALL' | 'PURCHASE' | 'SALE'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Define useMemo BEFORE early return
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // API dates are "YYYY-MM-DDTHH:mm:ss", pickers are "YYYY-MM-DD"
      const tDate = t.date.split('T')[0];
      const dateMatch = tDate >= startDate && tDate <= endDate;
      const typeMatch = transactionType === 'ALL' || t.type === transactionType;
      return dateMatch && typeMatch;
    });
  }, [transactions, startDate, endDate, transactionType]);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate, transactionType]);

  // Now safe to do early return
  if (!company) return (
    <div className="py-20 text-center text-slate-400">Select a company to view reports.</div>
  );

  const handleDownloadReport = () => {
    if (filteredTransactions.length === 0) {
      alert("No data found for the selected criteria.");
      return;
    }

    const headers = ['Date', 'Invoice Number', 'Type', 'Entity (Customer/Supplier)', 'GST Number', 'Description', `Grand Total (In ${company.currency})`];
    const rows = filteredTransactions.map(t => [
      formatDate(t.date),
      t.invoiceNumber,
      t.type,
      t.entityName,
      t.entityGstNumber || '',
      t.items.map(i => `${i.productName} (x${i.quantity})`).join('; '),
      t.totalAmount.toLocaleString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    const typeLabel = transactionType === 'ALL' ? 'All' : transactionType;
    link.setAttribute("href", url);
    link.setAttribute("download", `Ledger_Report_${company.name.replace(/\s+/g, '_')}_${typeLabel}_${formatDate(startDate)}_to_${formatDate(endDate)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const symbol = company.currencySymbol || '$';

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Financial Reports</h3>
          <p className="text-sm text-slate-500">Select date ranges and transaction type to generate detailed ledgers</p>
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 w-full md:w-auto">
          {/* Transaction Type Filter */}
          <div className="flex items-center space-x-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
            <select 
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value as 'ALL' | 'PURCHASE' | 'SALE')}
              className="bg-transparent text-xs font-bold outline-none border-none cursor-pointer text-slate-800"
            >
              <option value="ALL">📊 All Transactions</option>
              <option value="PURCHASE">📥 Purchase Only</option>
              <option value="SALE">📤 Sales Only</option>
            </select>
          </div>

          {/* Date Range Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 bg-slate-50 p-2 sm:p-1.5 rounded-xl border border-slate-200 w-full sm:w-auto">
            <input type="date" className="flex-1 sm:flex-none bg-white sm:bg-transparent text-xs font-bold outline-none border sm:border-none rounded-lg sm:rounded-none px-3 py-2 sm:py-0" value={startDate} onChange={e => setStartDate(e.target.value)} />
            <span className="text-slate-300 text-xs text-center">to</span>
            <input type="date" className="flex-1 sm:flex-none bg-white sm:bg-transparent text-xs font-bold outline-none border sm:border-none rounded-lg sm:rounded-none px-3 py-2 sm:py-0" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <button
            onClick={handleDownloadReport}
            className="bg-slate-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-[10px] font-bold flex items-center shadow-lg shadow-slate-200 transition-all uppercase tracking-widest"
          >
            <i className="fas fa-file-export mr-2"></i> Export Ledger
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Transaction Ledger ({formatDate(startDate)} to {formatDate(endDate)})</h4>
          <div className="text-[10px] font-bold text-slate-400">Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length} entries</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white border-b border-slate-100">
                <th className="px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Type</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Entity (Customer/Supplier)</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">GST Number</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Description</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Grand Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginatedTransactions.length > 0 ? paginatedTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-8 py-4 text-xs font-bold text-slate-800">{formatDate(t.date)}</td>
                  <td className="px-8 py-4">
                    <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-black uppercase ${t.type === 'SALE' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                      {t.type}
                    </span>
                  </td>
                  <td className="px-8 py-4 text-xs font-bold text-slate-800">{t.entityName}</td>
                  <td className="px-8 py-4 text-xs text-slate-600 font-mono">{t.entityGstNumber || '-'}</td>
                  <td className="px-8 py-4">
                    <div className="text-xs text-slate-600">
                      {t.items[0]?.productName} {t.items.length > 1 && `(+${t.items.length - 1} more)`}
                      <div className="text-[10px] text-slate-400 font-mono">{t.invoiceNumber}</div>
                    </div>
                  </td>
                  <td className="px-8 py-4 text-right text-sm font-black text-slate-900">
                    {symbol}{t.totalAmount.toLocaleString()}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-slate-400 italic">No transactions found for the selected period.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-8 py-6 bg-slate-50/50 border-t border-slate-50">
          <div className="flex items-center space-x-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Items per page:</label>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </div>

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
                  pageNum = currentPage - 3 + i + 1;
                  if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                }
                const isCurrent = pageNum === currentPage;
                if (pageNum > 0 && pageNum <= totalPages) {
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${
                        isCurrent
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

          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Page {currentPage} of {Math.max(1, totalPages)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
