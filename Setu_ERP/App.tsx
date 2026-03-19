
import React, { useState, useMemo, useEffect } from 'react';
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

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

  const fetchData = async () => {
    if (!currentUser) return;
    setIsSyncing(true);
    
    const normalize = (obj: any) => {
      if (!obj || typeof obj !== 'object') return obj;
      const newObj: any = {};
      for (const key in obj) {
        const normalizedKey = key.toLowerCase() === 'id' ? 'id' : (key.charAt(0).toLowerCase() + key.slice(1));
        newObj[normalizedKey] = obj[key];
      }
      return newObj;
    };

    try {
      // OPTIMIZATION: Use single unified endpoint instead of 4 separate calls
      const response = await dashboardService.getInitData();
      const data = response.data;

      const normalizedCompanies = (data.companies || []).map(normalize);
      const normalizedProducts = (data.products || []).map(normalize);
      const normalizedCustomers = (data.customers || []).map(normalize);
      const normalizedTransactions = (data.transactions || []).map(normalize);

      setCompanies(normalizedCompanies);
      setProducts(normalizedProducts);
      setCustomers(normalizedCustomers);
      setTransactions(normalizedTransactions);

      // Set active company
      let currentActiveId = data.activeCompanyId || activeCompanyId;
      if (!currentActiveId || !normalizedCompanies.find((c: any) => c.id === currentActiveId)) {
        currentActiveId = normalizedCompanies.length > 0 ? normalizedCompanies[0].id : null;
      }
      
      if (currentActiveId) {
        setActiveCompanyId(currentActiveId);
      }
    } catch (err: any) {
      console.error('App: Error fetching dashboard data:', err.response?.data || err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser, activeCompanyId]);

  // Refresh data when switching tabs (but not on initial load)
  const [hasInitialLoad, setHasInitialLoad] = useState(false);
  useEffect(() => {
    if (hasInitialLoad && currentUser) {
      fetchData();
    }
  }, [activeTab]);

  useEffect(() => {
    if (currentUser && !hasInitialLoad) {
      setHasInitialLoad(true);
    }
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
        return <Dashboard company={activeCompany} products={products} customers={customers} transactions={transactions} onNavigate={navigateTo} />;
      case 'companies':
        if (isAdmin) return <AccessDenied />;
        return (
          <CompanyManager
            companies={companies}
            activeId={activeCompanyId}
            setActiveId={setActiveCompanyId}
            products={products}
            transactions={transactions}
            currentUser={currentUser}
            onDataChange={fetchData}
          />
        );
      case 'inventory':
        if (isAdmin) return <AccessDenied />;
        return <InventoryManager products={products} transactions={transactions} activeCompany={activeCompany} currentUser={currentUser} onDataChange={fetchData} />;
      case 'sales':
        if (isAdmin) return <AccessDenied />;
        return <SalesManager products={products} customers={customers} transactions={transactions} activeCompany={activeCompany} currentUser={currentUser} onDataChange={fetchData} />;
      case 'products':
        if (isAdmin) return <AccessDenied />;
        return <ProductManager products={products} onDataChange={fetchData} activeCompanyId={activeCompanyId} currencySymbol={activeCompany?.currencySymbol || '₹'} currentUser={currentUser!} />;
      case 'customers':
        if (isAdmin) return <AccessDenied />;
        return <CustomerManager customers={customers} onDataChange={fetchData} activeCompanyId={activeCompanyId} currencySymbol={activeCompany?.currencySymbol || '₹'} currentUser={currentUser!} />;
      case 'users':
        return isAdmin ? <UserManager currentUser={currentUser} /> : <AccessDenied />;
      case 'admin':
        return isAdmin ? <AdminPanel /> : <AccessDenied />;
      case 'analytics':
        if (isAdmin) return <AccessDenied />;
        return <Analytics company={activeCompany} products={products} transactions={transactions} />;
      case 'profile':
        return <EditProfile currentUser={currentUser} onProfileUpdated={handleProfileUpdated} />;
      default:
        if (isAdmin) return <AdminPanel />;
        return <Dashboard company={activeCompany} products={products} customers={customers} transactions={transactions} onNavigate={navigateTo} />;
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
        />

        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          <Header
            activeTab={activeTab}
            companyName={activeCompany?.name}
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
