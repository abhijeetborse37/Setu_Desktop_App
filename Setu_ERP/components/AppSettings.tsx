import React from 'react';
import { User } from '../types';
import { authService } from '../services/api';

interface AppSettingsProps {
  currentUser: User;
  onSettingsUpdated: (updatedUser: User) => void;
}

const AppSettings: React.FC<AppSettingsProps> = ({ currentUser, onSettingsUpdated }) => {
  const isAdmin = currentUser.role === 'ADMIN';
  if (isAdmin) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Settings</h2>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Configure your application behavior & preferences</p>
      </div>

      {/* App Settings Card for Non-Admins */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="h-2 bg-slate-800"></div>
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">App Preferences</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Customize your workflow & accessibility</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
              <i className="fas fa-cog text-xl"></i>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:border-blue-200 transition-all">
              <div className="flex gap-4 items-center">
                <div className="w-10 h-10 rounded-xl bg-blue-100/50 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <i className="fas fa-layer-group"></i>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Multi-Business Item Selection</h4>
                  <p className="text-[10px] text-slate-500 font-medium">Allow generating invoices with products from all your registered businesses</p>
                </div>
              </div>
              <button
                onClick={async () => {
                  const newVal = !currentUser.allowCrossBusinessInvoicing;
                  try {
                    await authService.updateSettings({ allowCrossBusinessInvoicing: newVal });
                    onSettingsUpdated({ ...currentUser, allowCrossBusinessInvoicing: newVal });
                  } catch (err) {
                    alert("Failed to update settings. Please try again.");
                  }
                }}
                className={`w-14 h-7 rounded-full relative transition-all duration-300 ${currentUser.allowCrossBusinessInvoicing ? 'bg-blue-600' : 'bg-slate-200'}`}
              >
                <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${currentUser.allowCrossBusinessInvoicing ? 'left-8' : 'left-1'}`}></div>
              </button>
            </div>

            <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl flex items-start gap-4">
               <i className="fas fa-info-circle text-blue-500 mt-0.5"></i>
               <p className="text-[10px] text-blue-700 font-bold leading-relaxed">
                 By enabling <strong>Multi-Business Item Selection</strong>, you can mix products from any of your legal entities into a single transaction. This is useful for conglomerate billing but may require manual tax reconciliation.
               </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppSettings;
