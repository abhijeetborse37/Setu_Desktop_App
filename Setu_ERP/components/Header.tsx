
import React from 'react';
import { NAVIGATION } from '../constants';

interface HeaderProps {
  activeTab: string;
  companyName?: string;
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ activeTab, companyName, onMenuClick }) => {
  const currentTitle = NAVIGATION.find(n => n.id === activeTab)?.label || 'Dashboard';

  return (
    <header className="h-20 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center">
        <button
          onClick={onMenuClick}
          className="lg:hidden mr-4 p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors"
        >
          <i className="fas fa-bars"></i>
        </button>
        <div>
          <h1 className="text-lg md:text-2xl font-bold text-slate-800 leading-none">{currentTitle}</h1>
        </div>
      </div>

      <div className="flex items-center space-x-3 md:space-x-6">
        <button className="p-2.5 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 relative transition-colors shadow-sm">
          <i className="fas fa-bell text-sm"></i>
          <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>
        </button>

        <div className="h-8 w-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-xs shadow-md lg:hidden">
          A
        </div>
      </div>
    </header>
  );
};

export default Header;
