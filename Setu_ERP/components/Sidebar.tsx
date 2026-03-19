import React from 'react';
import { NAVIGATION } from '../constants';
import { User, UserRole } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  currentUser?: User | null;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isOpen, setIsOpen, currentUser, onLogout }) => {
  const role = currentUser?.role;
  const isAdmin = role === UserRole.ADMIN;

  const allowedPattern = currentUser?.allowedTabsPattern ?? '*';
  const allowedSet = allowedPattern === '*'
    ? null
    : new Set(allowedPattern.split(',').map(s => s.trim()));

  const filteredNav = NAVIGATION.filter(item => {
    // Admin sees: ONLY admin panel and access control (users)
    if (isAdmin) {
      return ['admin', 'users'].includes(item.id);
    }
    // Customers: never see admin or users tabs
    if (item.id === 'admin' || item.id === 'users') return false;
    // Apply allowedTabsPattern if it's not wildcard
    if (allowedSet !== null && !allowedSet.has(item.id)) return false;
    return true;
  });

  // Profile tab (always visible for all logged-in users)
  const profileNav = { id: 'profile', label: 'My Profile', icon: 'fa-user-circle' };

  return (
    <aside className={`
      fixed lg:static inset-y-0 left-0 z-50
      w-64 bg-slate-900 text-slate-300 border-r border-slate-800
      transform ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      transition-transform duration-300 ease-in-out
      flex flex-col
    `}>
      {/* Logo */}
      <div className="p-6 flex items-center justify-between border-b border-slate-800/50">
        <div className="flex items-center space-x-3 group cursor-pointer">
          <div className="relative">
            <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/40 transform transition-all duration-300 group-hover:scale-105 group-hover:rotate-3">
              <i className="fas fa-bridge-water text-white text-xl"></i>
            </div>
            <div className="absolute -inset-1 bg-blue-500/20 blur-md rounded-xl -z-10 group-hover:bg-emerald-400/20 transition-all duration-300"></div>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black text-white tracking-tighter leading-tight group-hover:text-blue-400 transition-colors">Setu</span>
            <span className="text-[7px] font-black text-emerald-500 tracking-[0.4em] uppercase opacity-80">
              {isAdmin ? 'Admin Portal' : 'Business Suite'}
            </span>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="lg:hidden text-slate-500 hover:text-white p-2 transition-colors"
        >
          <i className="fas fa-times text-lg"></i>
        </button>
      </div>

      {/* Role Badge */}
      <div className="px-6 pt-4 pb-2">
        <span className={`inline-flex items-center text-[8px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-lg ${
          isAdmin
            ? 'bg-indigo-900/60 text-indigo-300 border border-indigo-700/40'
            : 'bg-emerald-900/40 text-emerald-400 border border-emerald-800/40'
        }`}>
          <i className={`fas ${isAdmin ? 'fa-crown' : 'fa-user'} mr-1.5`}></i>
          {isAdmin ? 'Super Admin' : 'Customer'}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1 mt-3 overflow-y-auto custom-scrollbar">
        {filteredNav.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 group ${
              activeTab === item.id
                ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20'
                : 'hover:bg-slate-800/50 hover:text-white'
            }`}
          >
            <i className={`fas ${item.icon} w-6 text-lg transition-transform group-hover:scale-110 ${activeTab === item.id ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'}`}></i>
            <span className="ml-3 font-semibold text-sm">{item.label}</span>
          </button>
        ))}

        {/* Divider before profile */}
        <div className="my-3 border-t border-slate-800/60"></div>

        {/* Profile tab - always visible */}
        <button
          onClick={() => setActiveTab(profileNav.id)}
          className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 group ${
            activeTab === profileNav.id
              ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20'
              : 'hover:bg-slate-800/50 hover:text-white'
          }`}
        >
          <i className={`fas ${profileNav.icon} w-6 text-lg transition-transform group-hover:scale-110 ${activeTab === profileNav.id ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'}`}></i>
          <span className="ml-3 font-semibold text-sm">{profileNav.label}</span>
        </button>
      </nav>

      {/* User footer */}
      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-4 flex items-center space-x-3 border border-slate-700/30">
          <div className="relative flex-shrink-0">
            <img
              src={currentUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name || 'User')}&background=3b82f6&color=fff`}
              className="w-10 h-10 rounded-full border-2 border-slate-700 shadow-inner"
              alt="User"
            />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 border-2 border-slate-900 rounded-full bg-emerald-500"></div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{currentUser?.name || 'User'}</p>
            <p className="text-[10px] text-slate-500 truncate">{currentUser?.email}</p>
          </div>
          <button
            onClick={onLogout}
            className="text-slate-500 hover:text-red-400 transition-colors p-2 bg-slate-800/50 rounded-lg flex-shrink-0"
            title="Secure Logout"
          >
            <i className="fas fa-power-off text-xs"></i>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
