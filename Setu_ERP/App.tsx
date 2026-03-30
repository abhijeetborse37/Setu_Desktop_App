
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
import AccessDenied from './components/AccessDenied';
import ErrorBoundary from './components/ErrorBoundary';

// Import Backend services and utilities
import { companyService, productService, transactionService, customerService, dashboardService } from './services/api';

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

  const setActiveCompanyId = (id: string | null) => {
    setActiveCompanyIdState(id);
    if (id) localStorage.setItem('setu_active_company', id);
    else localStorage.removeItem('setu_active_company');
  };

  // Concurrency guard: prevent overlapping API calls
  const isFetchingRef = React.useRef(false);

  const fetchData = async () => {
    if (!currentUser) return;
    // Prevent concurrent fetches from overlapping and hammering the UI thread
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsSyncing(true);

    try {
      const response = await dashboardService.getInitData();
      const data = response.data;

      // Wrap large state updates in startTransition to prevent blocking the UI thread
      startTransition(() => {
        setCompanies(data.companies || []);
        setProducts(data.products || []);
        setCustomers(data.customers || []);
        setTransactions(data.transactions || []);

        // Resolve active company INSIDE the transition so it batches with the state above
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
      isFetchingRef.current = false;
      setIsSyncing(false);
    }
  };

  // Fetch ONLY when the user session changes — NOT on every tab switch.
  // Tab switching just re-renders already-loaded data; no new API call needed.
  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // Session handling
  useEffect(() => {
    const savedUser = localStorage.getItem('setu_user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('setu_user', JSON.stringify(user));
    // Admins land on admin panel; customers land on dashboard
    setActiveTab(user.role === UserRole.ADMIN ? 'admin' : 'dashboard');
    // Ensure the window has focus after login to prevent "frozen cursor"
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

  // Filtered data scoped to the active company only
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
    // Admin can only access: admin, users, profile
    if (isAdmin) {
      if (!['admin', 'users', 'profile'].includes(tab)) {
        alert('Unauthorized: Admins can only access Admin Panel, Access Control, and My Profile.');
        return;
      }
    } else {
      // Customer cannot access admin or users tabs
      if (tab === 'admin' || tab === 'users') {
        alert('Unauthorized: Admin access only.');
        return;
      }
      // For customers: check allowedTabsPattern
      if (tab !== 'profile') {
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
        return <SalesManager products={activeProducts} customers={customers} transactions={activeTransactions} activeCompany={activeCompany} currentUser={currentUser} onDataChange={fetchData} />;
      case 'products':
        if (isAdmin) return <AccessDenied />;
        return <ProductManager products={activeProducts} onDataChange={fetchData} activeCompanyId={activeCompanyId} activeCompany={activeCompany} currencySymbol={activeCompany?.currencySymbol || '₹'} currentUser={currentUser!} />;
      case 'customers':
        if (isAdmin) return <AccessDenied />;
        return <CustomerManager customers={customers} onDataChange={fetchData} activeCompanyId={activeCompanyId} currencySymbol={activeCompany?.currencySymbol || '₹'} currentUser={currentUser!} />;
      case 'users':
        return isAdmin ? <UserManager currentUser={currentUser} /> : <AccessDenied />;
      case 'admin':
        return isAdmin ? <AdminPanel /> : <AccessDenied />;
      case 'analytics':
        if (isAdmin) return <AccessDenied />;
        return <Analytics company={activeCompany} products={activeProducts} transactions={activeTransactions} />;
      case 'profile':
        return <EditProfile currentUser={currentUser} onProfileUpdated={handleProfileUpdated} />;
      default:
        if (isAdmin) return <AdminPanel />;
        return <Dashboard company={activeCompany} products={activeProducts} customers={activeCustomers} transactions={activeTransactions} onNavigate={navigateTo} />;
    }
  };

  return (
    <ErrorBoundary>
      <div className="flex h-[100dvh] overflow-hidden bg-slate-50 font-sans">
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

        {/* Mobile overlay is now inside the Sidebar component */}

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          <Header
            activeTab={activeTab}
            companyName={!isAdmin ? activeCompany?.name : undefined}
            onMenuClick={() => setIsSidebarOpen(true)}
          />

          {isSyncing && (
            <div className="absolute top-20 left-0 right-0 h-1 bg-blue-100 overflow-hidden z-50">
              <div className="h-full bg-blue-600 animate-[loading_1.5s_infinite] w-1/3"></div>
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
            <div className="max-w-7xl mx-auto flex-1 w-full">
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
