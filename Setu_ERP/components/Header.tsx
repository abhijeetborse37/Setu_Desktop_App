import React from 'react';
import { NAVIGATION } from '../constants';
import { User, Product } from '../types';

interface HeaderProps {
  activeTab: string;
  companyName?: string;
  onMenuClick: () => void;
  onNavigate: (tab: string) => void;
  currentUser: User;
  products: Product[];
  adminUsers?: any[];
}

const Header: React.FC<HeaderProps> = ({ activeTab, companyName, onMenuClick, onNavigate, currentUser }) => {
  const currentNav = NAVIGATION.find(n => n.id === activeTab);
  const currentTitle = currentNav?.label || (activeTab === 'profile' ? 'My Profile' : activeTab === 'settings' ? 'Settings' : 'Dashboard');

  const isAdmin = currentUser.role === 'ADMIN';

  return (
    <header className="h-16 sm:h-20 bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-4 md:px-10 flex items-center justify-between sticky top-0 z-40 transition-all">
      <div className="flex items-center space-x-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2.5 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 hover:text-blue-600 border border-slate-200/50 transition-all active:scale-95"
          title="Open Menu"
        >
          <i className="fas fa-bars"></i>
        </button>
        
        <div className="hidden sm:flex flex-col">
          <nav className="flex items-center space-x-2 text-[10px] uppercase font-black tracking-[0.2em] text-slate-400 mb-1">
            <span onClick={() => onNavigate(isAdmin ? 'admin' : 'dashboard')} className="hover:text-blue-600 cursor-pointer transition-colors">Setu ERP</span>
            <i className="fas fa-chevron-right text-[8px] opacity-30"></i>
            <span className="text-blue-500">{currentTitle}</span>
          </nav>
          {companyName && (
            <div className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <p className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">
                Active Registry: <span className="text-slate-900 font-black">{companyName}</span>
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <button 
          onClick={() => onNavigate('profile')}
          className={`h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-lg shadow-blue-500/20 border-2 border-white ring-1 ring-slate-200 cursor-pointer hover:scale-105 transition-transform overflow-hidden ${activeTab === 'profile' ? 'ring-blue-500 ring-2' : ''}`}
        >
          {currentUser.avatar ? (
            <img src={currentUser.avatar} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            currentUser.name.charAt(0).toUpperCase()
          )}
        </button>
      </div>
    </header>
  );
};

export default Header;
