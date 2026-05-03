
import React, { useState, useMemo, useEffect, startTransition } from 'react';
import { Company, Product, Customer, Transaction, User, UserRole } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import CompanyManager from './components/CompanyManager';
import ProductManager from './components/ProductManager';
import CustomerManager from './components/CustomerManager';
import Analytics from './components/Analytics';
import UserManager from './components/UserManager';
import InventoryManager from './components/InventoryManager';
import SalesManager from './components/SalesManager';
import AdminPanel from './components/AdminPanel';
import Login from './components/Login';
import EditProfile from './components/EditProfile';
import AppSettings from './components/AppSettings';
import AccessDenied from './components/AccessDenied';
import ErrorBoundary from './components/ErrorBoundary';

// Import Backend services and utilities
import { companyService, productService, transactionService, customerService, dashboardService, adminService } from './services/api';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(() => localStorage.getItem('setu_sidebar_min') === 'true');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Persist sidebar minimized preference
  const handleSetSidebarMinimized = (v: boolean) => {
    setIsSidebarMinimized(v);
    localStorage.setItem('setu_sidebar_min', String(v));
  };

  // API-synchronized states
  const [companies, setCompanies] = useState<Company[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeCompanyId, setActiveCompanyIdState] = useState<string | null>(localStorage.getItem('setu_active_company'));
  const [adminUsers, setAdminUsers] = useState<any[]>([]);

  const setActiveCompanyId = (id: string | null) => {
    setActiveCompanyIdState(id);
    if (id) localStorage.setItem('setu_active_company', id);
    else localStorage.removeItem('setu_active_company');
  };

  // Concurrency guard: prevent overlapping API calls
  const isFetchingRef = React.useRef(false);

  const fetchData = async () => {
    if (!currentUser) return;
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsSyncing(true);

    try {
      const response = await dashboardService.getInitData();
      const data = response.data;

      startTransition(() => {
        setCompanies(data.companies || []);
        setProducts(data.products || []);
        setCustomers(data.customers || []);
        setTransactions(data.transactions || []);

        const companiesList: any[] = data.companies || [];
        const resolvedId = activeCompanyId && companiesList.find((c: any) => c.id === activeCompanyId)
          ? activeCompanyId
          : companiesList.length > 0 ? companiesList[0].id : null;

        if (resolvedId && resolvedId !== activeCompanyId) {
          setActiveCompanyId(resolvedId);
        }
      });
    } catch (err: any) {
      console.error('App: Error fetching dashboard data:', err.response?.data || err.message);
    } finally {
      if (currentUser?.role === UserRole.ADMIN) {
        adminService.getUsers().then(res => setAdminUsers(res.data)).catch(err => console.error(err));
      }
      isFetchingRef.current = false;
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  useEffect(() => {
    const savedUser = localStorage.getItem('setu_user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('setu_user', JSON.stringify(user));
    setActiveTab(user.role === UserRole.ADMIN ? 'admin' : 'dashboard');
    window.focus();
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('setu_user');
    setActiveTab('dashboard');
  };

  const handleProfileUpdated = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('setu_user', JSON.stringify(updatedUser));
  };

  const activeCompany = useMemo(() =>
    companies.find(c => c.id === activeCompanyId) || null,
    [companies, activeCompanyId]);

  const activeProducts = useMemo(() =>
    activeCompanyId ? products.filter(p => p.companyId === activeCompanyId) : products,
    [products, activeCompanyId]);

  const activeCustomers = useMemo(() =>
    activeCompanyId ? customers.filter(c => (c as any).companyId === activeCompanyId) : customers,
    [customers, activeCompanyId]);

  const activeTransactions = useMemo(() =>
    activeCompanyId ? transactions.filter(t => (t as any).companyId === activeCompanyId) : transactions,
    [transactions, activeCompanyId]);

  const isAdmin = currentUser?.role === UserRole.ADMIN;

  const navigateTo = (tab: string) => {
    if (isAdmin) {
      if (!['admin', 'users', 'profile'].includes(tab)) {
        alert('Unauthorized: Admins can only access Admin Panel, Access Control, and My Profile.');
        return;
      }
    } else {
      if (tab === 'admin' || tab === 'users') {
        alert('Unauthorized: Admin access only.');
        return;
      }
      if (tab !== 'profile' && tab !== 'settings') {
        const pattern = currentUser?.allowedTabsPattern ?? '*';
        if (pattern !== '*') {
          const allowed = pattern.split(',').map(s => s.trim());
          if (!allowed.includes(tab)) {
            alert('Access restricted: Your admin has not granted access to this section.');
            return;
          }
        }
      }
    }
    setActiveTab(tab);
    setIsSidebarOpen(false);
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        if (isAdmin) return <AccessDenied />;
        return <Dashboard company={activeCompany} products={activeProducts} customers={activeCustomers} transactions={activeTransactions} onNavigate={navigateTo} />;
      case 'companies':
        if (isAdmin) return <AccessDenied />;
        return (
          <CompanyManager
            companies={companies}
            activeId={activeCompanyId}
            setActiveId={setActiveCompanyId}
            products={activeProducts}
            transactions={activeTransactions}
            currentUser={currentUser}
            onDataChange={fetchData}
          />
        );
      case 'inventory':
        if (isAdmin) return <AccessDenied />;
        return <InventoryManager products={activeProducts} transactions={activeTransactions} activeCompany={activeCompany} currentUser={currentUser} onDataChange={fetchData} />;
      case 'sales':
        if (isAdmin) return <AccessDenied />;
        const salesProducts = currentUser?.allowCrossBusinessInvoicing ? products : activeProducts;
        return <SalesManager products={salesProducts} customers={customers} transactions={activeTransactions} activeCompany={activeCompany} companies={companies} currentUser={currentUser} onDataChange={fetchData} />;
      case 'products':
        if (isAdmin) return <AccessDenied />;
        return (
          <ProductManager 
            products={activeProducts} 
            activeCompany={activeCompany} 
            activeCompanyId={activeCompanyId}
            currencySymbol={activeCompany?.currencySymbol || '₹'}
            currentUser={currentUser}
            onDataChange={fetchData} 
          />
        );
      case 'customers':
        if (isAdmin) return <AccessDenied />;
        return (
          <CustomerManager 
            customers={activeCustomers} 
            activeCompany={activeCompany} 
            activeCompanyId={activeCompanyId}
            currencySymbol={activeCompany?.currencySymbol || '₹'}
            currentUser={currentUser}
            onDataChange={fetchData} 
          />
        );
      case 'analytics':
        if (isAdmin) return <AccessDenied />;
        return <Analytics company={activeCompany} products={activeProducts} transactions={activeTransactions} />;
      case 'profile':
        return <EditProfile currentUser={currentUser} onProfileUpdated={handleProfileUpdated} />;
      case 'settings':
        return <AppSettings currentUser={currentUser} onSettingsUpdated={handleProfileUpdated} />;
      case 'users':
        if (!isAdmin) return <AccessDenied />;
        return <UserManager />;
      case 'admin':
        if (!isAdmin) return <AccessDenied />;
        return <AdminPanel />;
      default:
        if (isAdmin) return <AdminPanel />;
        return <Dashboard company={activeCompany} products={activeProducts} customers={activeCustomers} transactions={activeTransactions} onNavigate={navigateTo} />;
    }
  };

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-700 overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={navigateTo}
          isOpen={isSidebarOpen}
          setIsOpen={setIsSidebarOpen}
          currentUser={currentUser}
          onLogout={handleLogout}
          isMinimized={isSidebarMinimized}
          setIsMinimized={handleSetSidebarMinimized}
        />

        <div className="flex-1 flex flex-col min-w-0 relative h-full overflow-hidden">
          <Header
            activeTab={activeTab}
            companyName={!isAdmin ? activeCompany?.name : undefined}
            onMenuClick={() => setIsSidebarOpen(true)}
            onNavigate={navigateTo}
            currentUser={currentUser}
            products={products}
            adminUsers={adminUsers}
          />

          {isSyncing && (
            <div className="absolute top-0 left-0 right-0 h-1 z-50 overflow-hidden">
              <div className="h-full bg-blue-500 animate-[loading_1.5s_infinite_linear]"></div>
            </div>
          )}

          {currentUser.warningMessage && (
            <div className="m-4 mb-0 bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-center justify-between text-amber-700 font-bold text-xs animate-in slide-in-from-top-2">
              <div className="flex items-center">
                <i className="fas fa-exclamation-triangle mr-3"></i>
                {currentUser.warningMessage}
              </div>
              <button onClick={() => setCurrentUser({ ...currentUser, warningMessage: undefined })} className="text-amber-400 hover:text-amber-600">
                <i className="fas fa-times"></i>
              </button>
            </div>
          )}

          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 flex flex-col custom-scrollbar">
            <div key={activeTab} className="max-w-7xl mx-auto flex-1 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
              {renderContent()}
            </div>

            <footer className="mt-auto py-6 border-t border-slate-200 text-center no-print flex-shrink-0">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center justify-center">
                Made with <i className="fas fa-heart text-red-500 mx-1.5"></i> in India <span className="ml-2">🇮🇳</span>
              </p>
              <p className="text-[8px] text-slate-300 font-bold uppercase tracking-widest mt-2">
                © {new Date().getFullYear()} Setu Business Suite • Powered by Abhibaba Pvt. Ltd.
              </p>
            </footer>
          </main>
        </div>
        <style>{`
          @keyframes loading {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(300%); }
          }
        `}</style>
      </div>
    </ErrorBoundary>
  );
};

export default App;
