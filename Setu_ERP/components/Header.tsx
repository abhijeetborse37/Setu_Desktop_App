import React from 'react';
import { NAVIGATION } from '../constants';

interface HeaderProps {
  activeTab: string;
  companyName?: string;
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ activeTab, companyName, onMenuClick }) => {
  const currentNav = NAVIGATION.find(n => n.id === activeTab);
  const currentTitle = currentNav?.label || 'Dashboard';
  const currentIcon = currentNav?.icon || 'fa-chart-pie';

  return (
    <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-6 md:px-10 flex items-center justify-between sticky top-0 z-40 transition-all">
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
            <span className="hover:text-blue-600 cursor-pointer">Setu ERP</span>
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

        <div className="flex items-center space-x-2 border-l border-slate-200 pl-4 ml-2">
          <button className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl relative transition-all active:scale-90" title="Notifications">
            <i className="fas fa-bell text-lg"></i>
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 border-2 border-white rounded-full"></span>
          </button>
          
          <button className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all active:scale-90" title="Settings">
            <i className="fas fa-cog text-lg"></i>
          </button>
        </div>

        <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-lg shadow-blue-500/20 border-2 border-white ring-1 ring-slate-200 cursor-pointer hover:scale-105 transition-transform">
          A
        </div>
      </div>
    </header>
  );
};

export default Header;
