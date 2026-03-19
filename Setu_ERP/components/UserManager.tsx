import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { authService, adminService } from '../services/api';

interface Props {
  currentUser: User | null;
}

const ALL_TABS = ['dashboard', 'companies', 'inventory', 'sales', 'products', 'customers', 'analytics'];
const TAB_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  companies: 'Companies',
  inventory: 'Stock-In (Purchase)',
  sales: 'Stock-Out (Sales)',
  products: 'Catalog',
  customers: 'Customers',
  analytics: 'Reports',
};

const UserManager: React.FC<Props> = ({ currentUser }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    contactNo: '',
    role: 'Customer',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [error, setError] = useState('');
  const [successResult, setSuccessResult] = useState<any>(null);
  const [tabEditingUser, setTabEditingUser] = useState<any | null>(null);
  const [tabSelection, setTabSelection] = useState<Record<string, boolean>>({});
  const [resetPasswordUser, setResetPasswordUser] = useState<any | null>(null);
  const [newResetPassword, setNewResetPassword] = useState('');

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const res = await adminService.getUsers();
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formData.name || !formData.email || formData.password.length < 6) {
      setError('Please fill all fields. Password must be at least 6 characters.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await authService.createUser({
        name: formData.name.trim(),
        email: formData.email.toLowerCase(),
        password: formData.password,
        contactNo: formData.contactNo,
        role: formData.role,
      });
      setSuccessResult(res.data.user);
      setFormData({ name: '', email: '', password: '', contactNo: '', role: 'Customer' });
      fetchUsers();
      // Open tab access editor for the newly created user
      setTimeout(() => {
        openTabEditor(res.data.user);
      }, 100);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create user.');
    } finally {
      setIsLoading(false);
    }
  };

  const openTabEditor = (user: any) => {
    const pattern = user.allowedTabsPattern ?? '*';
    const initialTabs: Record<string, boolean> = {};
    ALL_TABS.forEach(t => {
      initialTabs[t] = pattern === '*' || pattern.split(',').map((s: string) => s.trim()).includes(t);
    });
    setTabSelection(initialTabs);
    setTabEditingUser(user);
  };

  const saveTabAccess = async () => {
    if (!tabEditingUser) return;
    setIsLoading(true);
    try {
      const selected = ALL_TABS.filter(t => tabSelection[t]);
      const pattern = selected.length === ALL_TABS.length ? '*' : selected.join(',');
      await authService.setUserTabs(tabEditingUser.id, pattern);
      setTabEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update tab access.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (userId: string) => {
    try {
      await adminService.toggleUserStatus(userId);
      fetchUsers();
    } catch {
      alert('Failed to toggle user status.');
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordUser || newResetPassword.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }
    try {
      await adminService.resetUserPassword(resetPasswordUser.id, newResetPassword);
      setResetPasswordUser(null);
      setNewResetPassword('');
      alert('Password reset successfully!');
    } catch {
      alert('Failed to reset password.');
    }
  };

  const customerUsers = users.filter(u => u.role === 'Customer' || u.role === 1);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Access Control</h2>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Create &amp; manage customer accounts</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setSuccessResult(null); setError(''); }}
          className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-blue-500/30 text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 self-start sm:self-auto"
        >
          <i className="fas fa-user-plus"></i> Create User
        </button>
      </div>

      {/* User Table */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-black text-slate-800 uppercase tracking-tight">Customer Accounts</h3>
          <span className="bg-blue-50 text-blue-600 text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest">
            {customerUsers.length} Total
          </span>
        </div>
        <div className="overflow-x-auto">
          {isLoadingUsers ? (
            <div className="flex items-center justify-center py-16">
              <i className="fas fa-circle-notch fa-spin text-blue-500 text-2xl"></i>
            </div>
          ) : customerUsers.length === 0 ? (
            <div className="py-16 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">
              <i className="fas fa-users text-3xl text-slate-200 mb-3 block"></i>
              No customer accounts yet. Create one →
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4 hidden md:table-cell">Contact</th>
                  <th className="px-6 py-4 hidden lg:table-cell">Tabs Access</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customerUsers.map(user => (
                  <tr key={user.id} className={`hover:bg-slate-50/50 transition-colors ${!user.isActive ? 'opacity-50' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center font-black text-white text-xs flex-shrink-0">
                          {user.name?.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{user.name}</p>
                          <p className="text-[10px] text-slate-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <p className="text-xs text-slate-600 font-medium">{user.contactNo || <span className="text-slate-300">—</span>}</p>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <span className="text-[9px] bg-slate-100 text-slate-600 font-mono px-2 py-1 rounded-lg truncate max-w-[120px] block">
                        {user.allowedTabsPattern === '*' ? 'All Tabs' : (user.allowedTabsPattern || '*')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest ${
                        user.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                      }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => openTabEditor(user)}
                          className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all text-xs"
                          title="Manage Tab Access"
                        >
                          <i className="fas fa-sliders-h"></i>
                        </button>
                        <button
                          onClick={() => { setResetPasswordUser(user); setNewResetPassword(''); }}
                          className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-all text-xs"
                          title="Reset Password"
                        >
                          <i className="fas fa-key"></i>
                        </button>
                        <button
                          onClick={() => handleToggleStatus(user.id)}
                          className={`p-2 rounded-lg transition-all text-xs ${user.isActive ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                          title={user.isActive ? 'Deactivate' : 'Activate'}
                        >
                          <i className={`fas ${user.isActive ? 'fa-ban' : 'fa-check'}`}></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create User Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[80] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="h-1.5 bg-gradient-to-r from-blue-600 to-emerald-500"></div>
            <div className="p-8">
              {successResult ? (
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl text-emerald-500">
                    <i className="fas fa-check-circle"></i>
                  </div>
                  <h3 className="text-lg font-black text-slate-800 mb-2">User Created!</h3>
                  <p className="text-slate-500 text-sm mb-6">Share these one-time credentials with the user:</p>
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left space-y-2 mb-6">
                    <p className="text-xs"><span className="font-black text-slate-500 uppercase tracking-widest text-[9px] block mb-0.5">Name</span> <span className="font-bold text-slate-800">{successResult.name}</span></p>
                    <p className="text-xs"><span className="font-black text-slate-500 uppercase tracking-widest text-[9px] block mb-0.5">Email</span> <span className="font-mono text-blue-600 font-bold">{successResult.email}</span></p>
                    {successResult.contactNo && <p className="text-xs"><span className="font-black text-slate-500 uppercase tracking-widest text-[9px] block mb-0.5">Mobile</span> <span className="font-bold text-slate-800">{successResult.contactNo}</span></p>}
                    <p className="text-xs"><span className="font-black text-slate-500 uppercase tracking-widest text-[9px] block mb-0.5">One-Time Password</span> <span className="font-mono text-emerald-600 font-black text-base tracking-widest">{successResult.oneTimePassword}</span></p>
                  </div>
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-6">
                    <p className="text-[10px] text-amber-600 font-bold"><i className="fas fa-info-circle mr-1"></i> The user must change their password after first login.</p>
                  </div>
                  <button
                    onClick={() => { setShowForm(false); setSuccessResult(null); }}
                    className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="text-xl font-black text-slate-800 mb-1 uppercase tracking-tight">Create Customer Account</h3>
                  <p className="text-xs text-slate-400 mb-6">One-time credentials will be generated for the user</p>
                  <form onSubmit={handleCreateUser} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Full Name *</label>
                        <input required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                          placeholder="John Doe"
                          value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Contact No.</label>
                        <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-all"
                          placeholder="+91 98765 43210"
                          value={formData.contactNo} onChange={e => setFormData({ ...formData, contactNo: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Email Address *</label>
                      <input required type="email" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-all"
                        placeholder="user@example.com"
                        value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Initial Password *</label>
                      <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none font-mono transition-all"
                        placeholder="Set a one-time password (min 6 chars)"
                        value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Role</label>
                      <div className="grid grid-cols-2 gap-3">
                        {['Admin', 'Customer'].map(r => (
                          <button key={r} type="button"
                            onClick={() => setFormData({ ...formData, role: r })}
                            className={`py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                              formData.role === r ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                            }`}
                          >
                            <i className={`fas ${r === 'Admin' ? 'fa-crown' : 'fa-user'}`}></i> {r}
                          </button>
                        ))}
                      </div>
                    </div>

                    {error && (
                      <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                        <i className="fas fa-exclamation-circle"></i> {error}
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <button type="button" onClick={() => { setShowForm(false); setError(''); }} className="flex-1 py-3 text-slate-400 font-bold text-xs uppercase tracking-widest border border-slate-200 rounded-xl hover:border-slate-300">Cancel</button>
                      <button type="submit" disabled={isLoading} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 disabled:opacity-50">
                        {isLoading ? <><i className="fas fa-circle-notch fa-spin mr-2"></i>Creating...</> : 'Create Account'}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab Access Editor Modal */}
      {tabEditingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[80] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="h-1.5 bg-gradient-to-r from-blue-600 to-emerald-500"></div>
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center font-black text-white text-xs">
                  {tabEditingUser.name?.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">Tab Access</h3>
                  <p className="text-xs text-slate-500">{tabEditingUser.name}</p>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-4">Select tabs this user can access</p>
              <div className="grid grid-cols-2 gap-2.5 mb-6">
                {ALL_TABS.map(tab => (
                  <label key={tab} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    tabSelection[tab] ? 'bg-blue-50 border-blue-300' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}>
                    <input
                      type="checkbox"
                      checked={!!tabSelection[tab]}
                      onChange={e => setTabSelection({ ...tabSelection, [tab]: e.target.checked })}
                      className="rounded accent-blue-600"
                    />
                    <span className={`text-xs font-bold ${tabSelection[tab] ? 'text-blue-700' : 'text-slate-600'}`}>{TAB_LABELS[tab]}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setTabEditingUser(null)} className="flex-1 py-3 text-slate-400 font-bold text-xs uppercase tracking-widest border border-slate-200 rounded-xl">Cancel</button>
                <button onClick={saveTabAccess} disabled={isLoading} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest disabled:opacity-50">
                  {isLoading ? 'Saving...' : 'Save Access'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPasswordUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[80] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 p-8">
            <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight mb-1">Reset Password</h3>
            <p className="text-xs text-slate-500 mb-6">Set a new one-time password for <strong>{resetPasswordUser.name}</strong></p>
            <input
              type="text"
              value={newResetPassword}
              onChange={e => setNewResetPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono focus:border-blue-500 outline-none mb-4"
              placeholder="New password (min 6 chars)"
            />
            <div className="flex gap-3">
              <button onClick={() => setResetPasswordUser(null)} className="flex-1 py-3 text-slate-400 font-bold text-xs uppercase tracking-widest border border-slate-200 rounded-xl">Cancel</button>
              <button onClick={handleResetPassword} className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-xs uppercase tracking-widest">Reset</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManager;
