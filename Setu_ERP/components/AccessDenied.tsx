import React from 'react';

const AccessDenied: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-[400px] animate-in fade-in duration-500">
      <div className="text-center space-y-6">
        <div className="relative inline-flex">
          <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full"></div>
          <div className="relative w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/30">
            <i className="fas fa-lock text-white text-3xl"></i>
          </div>
        </div>
        
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-3">Access Restricted</h2>
          <p className="text-sm text-slate-500 font-bold max-w-md">
            You do not have permission to access this section. Please contact your administrator if you need access.
          </p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mt-6">
          <p className="text-xs font-bold text-red-600 uppercase tracking-widest flex items-center justify-center gap-2">
            <i className="fas fa-exclamation-circle"></i>
            Admin Access Required
          </p>
        </div>
      </div>
    </div>
  );
};

export default AccessDenied;
