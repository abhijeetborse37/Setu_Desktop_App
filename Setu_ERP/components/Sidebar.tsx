import React, { useState, useEffect, useCallback } from 'react';
import { NAVIGATION } from '../constants';
import { User, UserRole } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;                        // mobile drawer open state
  setIsOpen: (open: boolean) => void;
  currentUser?: User | null;
  onLogout: () => void;
  isMinimized: boolean;                   // desktop collapsed state (icon-rail)
  setIsMinimized: (v: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  activeTab, setActiveTab,
  isOpen, setIsOpen,
  currentUser, onLogout,
  isMinimized, setIsMinimized,
}) => {
  const role = currentUser?.role;
  const isAdmin = role === UserRole.ADMIN;

  // Tracks whether the sidebar is being hovered (desktop only)
  const [isHovered, setIsHovered] = useState(false);

  // True when the sidebar should show labels
  const expanded = !isMinimized || isHovered;

  const allowedPattern = currentUser?.allowedTabsPattern ?? '*';
  const allowedSet = allowedPattern === '*'
    ? null
    : new Set(allowedPattern.split(',').map(s => s.trim()));

  const filteredNav = NAVIGATION.filter(item => {
    if (isAdmin) return ['admin', 'users'].includes(item.id);
    if (item.id === 'admin' || item.id === 'users') return false;
    // Settings and Profile are always allowed for customers
    if (item.id === 'settings' || item.id === 'profile') return true;
    if (allowedSet !== null && !allowedSet.has(item.id)) return false;
    return true;
  });

  const profileNav = { id: 'profile', label: 'My Profile', icon: 'fa-user-circle' };

  const handleNavClick = useCallback((id: string) => {
    setActiveTab(id);
    setIsOpen(false);   // auto-close on mobile after navigation
  }, [setActiveTab, setIsOpen]);

  const NavItem = ({ item }: { item: { id: string; label: string; icon: string } }) => {
    const isActive = activeTab === item.id;
    return (
      <button
        onClick={() => handleNavClick(item.id)}
        title={!expanded ? item.label : undefined}
        className={`
          w-full flex items-center rounded-xl transition-all duration-200 group min-h-[48px]
          ${expanded ? 'px-4 py-3' : 'px-0 py-3 justify-center'}
          ${isActive
            ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20'
            : 'hover:bg-slate-800/50 hover:text-white'}
        `}
      >
        <i className={`
          fas ${item.icon} text-lg flex-shrink-0 transition-transform group-hover:scale-110
          ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'}
          ${expanded ? 'w-6' : 'w-6 mx-auto'}
        `}></i>
        <span className={`
          font-semibold text-sm transition-all duration-300 overflow-hidden whitespace-nowrap
          ${expanded ? 'ml-3 max-w-[160px] opacity-100' : 'max-w-0 opacity-0'}
        `}>
          {item.label}
        </span>
      </button>
    );
  };

  return (
    <>
      {/* ── MOBILE OVERLAY ── */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/80 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* ── SIDEBAR PANEL ── */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          fixed lg:static inset-y-0 left-0 z-50 flex flex-col
          bg-slate-900 text-slate-300 border-r border-slate-800
          transition-[width,transform] duration-300 ease-in-out overflow-hidden
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isMinimized ? 'w-64 lg:w-[4.5rem] lg:hover:w-64' : 'w-64'}
        `}
      >
        {/* ── LOGO + CONTROLS ── */}
        <div className={`
          flex items-center border-b border-slate-800/50 min-h-[4.5rem] flex-shrink-0
          transition-all duration-300
          ${expanded ? 'px-5 py-4 justify-between' : 'px-0 py-4 justify-center'}
        `}>
          {/* Logo mark (always visible) */}
          <div className={`flex items-center ${expanded ? 'space-x-3' : ''}`}>
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/40 transform transition-all duration-300 hover:scale-105 hover:rotate-3">
                <i className="fas fa-bridge-water text-white text-lg"></i>
              </div>
            </div>
            {/* Word-mark – hidden when minimised */}
            <div className={`flex flex-col transition-all duration-300 overflow-hidden ${expanded ? 'max-w-[120px] opacity-100' : 'max-w-0 opacity-0'}`}>
              <span className="text-xl font-black text-white tracking-tighter leading-tight">Setu</span>
              <span className="text-[7px] font-black text-emerald-500 tracking-[0.3em] uppercase opacity-80">
                {isAdmin ? 'Admin Portal' : 'Business Suite'}
              </span>
            </div>
          </div>

          {/* Right controls */}
          <div className={`flex items-center gap-1 flex-shrink-0 transition-all duration-300 ${expanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
            {/* Desktop pin/collapse toggle */}
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700 transition-all"
              title={isMinimized ? 'Pin sidebar open' : 'Collapse sidebar'}
            >
              <i className={`fas ${isMinimized ? 'fa-thumbtack' : 'fa-thumbtack fa-rotate-90'} text-xs`}></i>
            </button>
            {/* Mobile close */}
            <button
              onClick={() => setIsOpen(false)}
              className="lg:hidden flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700 transition-all"
            >
              <i className="fas fa-times text-sm"></i>
            </button>
          </div>
        </div>

        {/* ── ROLE BADGE ── */}
        <div className={`transition-all duration-300 overflow-hidden flex-shrink-0 ${expanded ? 'px-5 pt-4 pb-2 max-h-20 opacity-100' : 'max-h-0 opacity-0 py-0'}`}>
          <span className={`inline-flex items-center text-[8px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-lg ${isAdmin
            ? 'bg-indigo-900/60 text-indigo-300 border border-indigo-700/40'
            : 'bg-emerald-900/40 text-emerald-400 border border-emerald-800/40'
            }`}>
            <i className={`fas ${isAdmin ? 'fa-crown' : 'fa-user'} mr-1.5`}></i>
            {isAdmin ? 'Super Admin' : 'Customer'}
          </span>
        </div>

        {/* ── NAVIGATION ── */}
        <nav className={`flex-1 space-y-1 mt-3 overflow-y-auto overflow-x-hidden custom-scrollbar transition-all duration-300 ${expanded ? 'px-3' : 'px-2'}`}>
          {filteredNav.map(item => <div key={item.id}><NavItem item={item} /></div>)}

          {/* Divider */}
          <div className="my-3 border-t border-slate-800/60 mx-1"></div>

          {/* Profile */}
          <NavItem item={profileNav} />
        </nav>

        {/* ── USER FOOTER ── */}
        <div className={`border-t border-slate-800 flex-shrink-0 transition-all duration-300 ${expanded ? 'p-4' : 'p-2'}`}>
          <div className={`flex items-center transition-all duration-300 ${expanded ? 'space-x-3 bg-slate-800/30 backdrop-blur-sm rounded-2xl p-3 border border-slate-700/30' : 'justify-center'}`}>
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <img
                src={currentUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name || 'User')}&background=3b82f6&color=fff`}
                className="w-9 h-9 rounded-full border-2 border-slate-700 shadow-inner"
                alt="User"
                title={!expanded ? `${currentUser?.name || 'User'} • Click to logout` : undefined}
                onClick={!expanded ? onLogout : undefined}
                style={{ cursor: !expanded ? 'pointer' : 'default' }}
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-slate-900 rounded-full bg-emerald-500"></div>
            </div>

            {/* Name + email – hidden when minimised */}
            <div className={`flex-1 min-w-0 transition-all duration-300 overflow-hidden ${expanded ? 'max-w-full opacity-100' : 'max-w-0 opacity-0'}`}>
              <p className="text-sm font-bold text-white truncate">{currentUser?.name || 'User'}</p>
              <p className="text-[10px] text-slate-500 truncate">{currentUser?.email}</p>
            </div>

            {/* Logout button – visible only when expanded */}
            <button
              onClick={onLogout}
              className={`flex-shrink-0 text-slate-500 hover:text-red-400 transition-all p-2 bg-slate-800/50 rounded-lg ${expanded ? 'opacity-100' : 'opacity-0 w-0 p-0 overflow-hidden'}`}
              title="Secure Logout"
            >
              <i className="fas fa-power-off text-xs"></i>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
