
import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Company, Product, Customer, Transaction } from '../types';
import { formatDate } from '../utils';

interface DashboardProps {
  company: Company | null;
  products: Product[];
  customers: Customer[];
  transactions: Transaction[];
  onNavigate: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ company, products, customers, transactions, onNavigate }) => {
  const [filter, setFilter] = useState<'DAILY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'>('MONTHLY');

  // Move all useMemo and useCallback BEFORE any conditional returns
  const chartData = useMemo(() => {
    if (!company) return [];
    const sales = transactions.filter(t => t.type === 'SALE');
    const now = new Date();

    if (filter === 'DAILY') {
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      return Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const total = sales.reduce((acc, t) => {
          const tDate = new Date(t.date);
          if (tDate.getDate() === day && tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear()) {
            return acc + t.totalAmount;
          }
          return acc;
        }, 0);
        return { name: day.toString(), revenue: total };
      });
    }

    if (filter === 'MONTHLY') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return months.map((month, idx) => {
        const total = sales.reduce((acc, t) => {
          const tDate = new Date(t.date);
          if (tDate.getMonth() === idx && tDate.getFullYear() === now.getFullYear()) {
            return acc + t.totalAmount;
          }
          return acc;
        }, 0);
        return { name: month, revenue: total };
      });
    }

    if (filter === 'QUARTERLY') {
      const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
      return quarters.map((q, idx) => {
        const total = sales.reduce((acc, t) => {
          const tDate = new Date(t.date);
          const quarter = Math.floor(tDate.getMonth() / 3);
          if (quarter === idx && tDate.getFullYear() === now.getFullYear()) {
            return acc + t.totalAmount;
          }
          return acc;
        }, 0);
        return { name: q, revenue: total };
      });
    }

    if (filter === 'YEARLY') {
      const currentYear = now.getFullYear();
      return Array.from({ length: 5 }, (_, i) => {
        const year = currentYear - 4 + i;
        const total = sales.reduce((acc, t) => {
          const tDate = new Date(t.date);
          if (tDate.getFullYear() === year) {
            return acc + t.totalAmount;
          }
          return acc;
        }, 0);
        return { name: year.toString(), revenue: total };
      });
    }

    return [];
  }, [transactions, filter, company]);

  const hasData = useMemo(() => chartData.some(d => d.revenue > 0), [chartData]);

  const filteredSales = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDay = now.getDate();

    return transactions.filter(t => {
      if (t.type !== 'SALE' || !t.date) return false;

      // Parse date safely - handle YYYY-MM-DD string format
      try {
        const parts = t.date.split('-');
        if (parts.length !== 3) return false;

        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Convert to 0-indexed
        const day = parseInt(parts[2], 10);

        if (isNaN(year) || isNaN(month) || isNaN(day)) return false;

        if (filter === 'DAILY') {
          return year === currentYear && month === currentMonth && day === currentDay;
        }
        if (filter === 'MONTHLY') {
          return year === currentYear && month === currentMonth;
        }
        if (filter === 'YEARLY') {
          return year === currentYear;
        }
        if (filter === 'QUARTERLY') {
          const currentQ = Math.floor(currentMonth / 3);
          const tQ = Math.floor(month / 3);
          return currentQ === tQ && year === currentYear;
        }
        // If we reach here, filter is not recognized, show all sales for current year
        return year === currentYear;
      } catch {
        return false;
      }
    });
  }, [transactions, filter]);

  // All hooks MUST be called BEFORE early returns - define all useMemo here
  const totalRevenue = useMemo(() =>
    filteredSales.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0),
    [filteredSales]
  );

  const totalSalesCount = useMemo(() =>
    filteredSales.length,
    [filteredSales]
  );

  const lowStockProducts = useMemo(() =>
    products
      .filter(p => p.stock < 10)
      .sort((a, b) => a.stock - b.stock),
    [products]
  );

  const lowStockCount = useMemo(() =>
    lowStockProducts.length,
    [lowStockProducts]
  );

  const recentTransactions = useMemo(() =>
    transactions.slice(0, 4).reverse(),
    [transactions]
  );

  if (!company) return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500 py-20 px-4 text-center">
      <div className="w-20 h-20 bg-white shadow-xl shadow-slate-200 rounded-3xl flex items-center justify-center mb-6">
        <i className="fas fa-building text-3xl text-slate-300"></i>
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-2">No Active Business Profile</h3>
      <p className="max-w-xs text-sm text-slate-500">Please select or register a business entity in the 'Business Entities' section to view analytics.</p>
      <button
        onClick={() => onNavigate('companies')}
        className="mt-6 bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all text-sm uppercase tracking-widest"
      >
        Go to Business Entities
      </button>
    </div>
  );

  const symbol = company.currencySymbol || '$';

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-1">Business Hub & Insights</h2>
          <p className="text-sm text-slate-500 font-medium">Real-time financial performance and operational oversight for <span className="text-blue-600 font-bold">{company.name}</span></p>
        </div>
        <div className="flex bg-white border border-slate-200/60 rounded-2xl p-1.5 shadow-sm overflow-x-auto no-scrollbar ring-8 ring-slate-100/30">
        {(['DAILY', 'MONTHLY', 'QUARTERLY', 'YEARLY'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`whitespace-nowrap px-4 md:px-5 py-2 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-50'}`}
          >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard title="Total Sales Revenue" value={`${symbol}${totalRevenue.toLocaleString()}`} icon="fa-wallet" color="blue" trend={filter} />
        <StatCard title="Active Orders" value={totalSalesCount.toString()} icon="fa-shopping-cart" color="purple" trend="Transactions" />
        <StatCard title="Inventory Alerts" value={lowStockCount.toString()} icon="fa-exclamation-triangle" color="amber" trend="Low Stock" />
        <StatCard title="Total Clients" value={customers.length.toString()} icon="fa-users" color="emerald" trend="Registry" />
    </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-widest">Revenue Flow</h3>
            <span className="text-[10px] bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg font-black uppercase tracking-widest">Growth Index</span>
        </div>
          <div className="h-64 sm:h-80 w-full">
            {!hasData && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-[1px] z-10 pointer-events-none">
                <p className="text-slate-400 text-[10px] uppercase font-black tracking-widest text-center px-4">Awaiting Transaction Data</p>
              </div>
            )}
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip
                  formatter={(val: number) => [`${symbol}${val.toLocaleString()}`, 'Revenue']}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-sm overflow-hidden flex flex-col h-full ring-4 ring-slate-100/50">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Inventory Health</h3>
            <span className="text-[10px] bg-red-50 text-red-500 px-3 py-1.5 rounded-lg font-black uppercase tracking-widest animate-pulse">Critical Alerts</span>
        </div>
          <div className="flex-1 space-y-4 overflow-y-auto max-h-[400px] lg:max-h-none pr-1 custom-scrollbar">
            {lowStockProducts.length > 0 ? lowStockProducts.slice(0, 4).map(p => (
              <div key={p.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-50 hover:border-blue-100 hover:bg-blue-50/10 transition-all group cursor-default">
                <div className="flex items-center space-x-4 truncate">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${p.stock < 10 ? 'bg-red-50 text-red-500 group-hover:bg-red-500 group-hover:text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-blue-500 group-hover:text-white'}`}>
                    <i className="fas fa-box text-sm"></i>
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-bold text-slate-800 truncate tracking-tight">{p.name}</p>
                    <p className="text-[11px] text-slate-400 font-mono uppercase truncate tracking-widest">{p.sku}</p>
                </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <p className={`text-sm font-black ${p.stock < 10 ? 'text-red-600' : 'text-slate-900'}`}>{p.stock}</p>
                </div>
              </div>
            )) : products.length > 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <i className="fas fa-check-circle text-emerald-500 text-2xl mb-2"></i>
                <p className="text-[11px] uppercase font-bold tracking-widest">Inventory is Healthy</p>
            </div>
            ) : (
              <p className="text-center text-slate-400 py-10 text-[10px] uppercase font-bold tracking-widest">No Products Logged</p>
            )}
          </div>
          <button
            onClick={() => onNavigate('inventory')}
            className="mt-6 w-full py-4 bg-slate-900 hover:bg-black text-white rounded-2xl text-[10px] uppercase tracking-[0.2em] font-black transition-all shadow-xl shadow-slate-200 active:scale-95 flex items-center justify-center"
          >
            <i className="fas fa-boxes mr-2"></i> View Full Inventory
          </button>
      </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-widest">Recent Activity</h3>
          <button
            onClick={() => onNavigate('analytics')}
            className="text-blue-600 text-[11px] font-black uppercase tracking-widest hover:underline"
          >
            View Full Ledger
          </button>
      </div>

        {/* Mobile List View */}
        <div className="md:hidden divide-y divide-slate-50">
          {recentTransactions.map((t) => (
            <div key={t.id} className="p-4 space-y-2">
              <div className="flex justify-between items-start">
                <span className={`px-2 py-0.5 rounded-[4px] text-[9px] font-black uppercase ${t.type === 'SALE' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                  {t.type}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">{formatDate(t.date)}</span>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-slate-800 uppercase tracking-tight">{t.entityName}</p>
                  <p className="text-[10px] text-slate-400 font-mono italic">{t.invoiceNumber}</p>
                </div>
              <p className="font-black text-slate-800 text-sm">{symbol}{t.totalAmount.toLocaleString()}</p>
              </div>
            </div>
          ))}
          {transactions.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-[10px] uppercase font-bold tracking-widest">No Recent Activity</div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto custom-scrollbar">
          <table className="w-full text-left whitespace-nowrap min-w-[500px]">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-widest">Entry Type</th>
                <th className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-widest">Entity</th>
                <th className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-widest text-right">Amount</th>
                <th className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-widest text-right">Date</th>
            </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {recentTransactions.length > 0 ? recentTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-[4px] text-[9px] font-black uppercase ${t.type === 'SALE' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                      {t.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs font-bold text-slate-800 uppercase tracking-tight">{t.entityName}</div>
                    <div className="text-[10px] text-slate-400 font-mono italic">{t.invoiceNumber}</div>
                  </td>
                <td className="px-6 py-4 text-right font-black text-slate-800 text-xs">
                    {symbol}{t.totalAmount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-400 text-[11px] font-bold">
                    {formatDate(t.date)}
                  </td>
              </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-[10px] uppercase font-bold tracking-widest">No Recent Transaction Activity</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string, value: string, icon: string, color: string, trend: string }> = ({ title, value, icon, color, trend }) => {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600'
  };

  return (
    <div className="bg-white p-4 lg:p-8 rounded-2xl lg:rounded-[2rem] border border-slate-200/60 shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 hover:border-blue-400/50 transition-all group flex flex-col justify-between h-full ring-4 ring-slate-100/50">
      <div className="flex items-start justify-between mb-4 lg:mb-8">
        <div className={`w-10 h-10 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl flex items-center justify-center ${colorClasses[color]} shadow-lg shadow-current/10 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
          <i className={`fas ${icon} text-lg lg:text-2xl`}></i>
        </div>
        <span className="text-[10px] lg:text-xs font-black px-3 py-1.5 lg:px-4 lg:py-2 rounded-xl bg-slate-50 text-slate-400 uppercase tracking-widest group-hover:bg-blue-600 group-hover:text-white transition-all hidden sm:inline-block">
          {trend}
        </span>
    </div>
      <div>
        <h4 className="text-slate-400 text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] mb-1 lg:mb-2 line-clamp-1">{title}</h4>
        <p className="text-xl sm:text-2xl lg:text-4xl font-black text-slate-900 tracking-tight truncate leading-none">{value}</p>
      </div>
  </div>
  );
};

export default Dashboard;
