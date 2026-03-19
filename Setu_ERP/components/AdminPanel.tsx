import React, { useState, useEffect, useRef } from 'react';
import { adminService } from '../services/api';
import { SubscriptionPlan, UserSubscription, BusinessType } from '../types';
import { formatDisplayDate } from '../utils';

// IFSC Code database (sample Indian banks)
const IFSC_DATABASE: { [key: string]: string } = {
  'SBIN0000001': 'SBI - New Delhi Branch', 'SBIN0000002': 'SBI - Mumbai Branch', 'SBIN0000003': 'SBI - Bangalore Branch',
  'HDFC0000001': 'HDFC - New Delhi Branch', 'HDFC0000002': 'HDFC - Mumbai Branch', 'HDFC0000003': 'HDFC - Bangalore Branch',
  'ICIC0000001': 'ICICI - New Delhi Branch', 'ICIC0000002': 'ICICI - Mumbai Branch', 'ICIC0000003': 'ICICI - Bangalore Branch',
  'AXIS0000001': 'Axis Bank - New Delhi Branch', 'AXIS0000002': 'Axis Bank - Mumbai Branch', 'AXIS0000003': 'Axis Bank - Bangalore Branch',
  'BKID0000001': 'Bank of India - New Delhi Branch', 'BKID0000002': 'Bank of India - Mumbai Branch',
  'IOBA0000001': 'IOB - New Delhi Branch', 'IOBA0000002': 'IOB - Mumbai Branch', 'IOBA0000003': 'IOB - Chennai Branch',
  'UBIN0000001': 'Union Bank - New Delhi Branch', 'UBIN0000002': 'Union Bank - Mumbai Branch',
  'PUNB0000001': 'PNB - New Delhi Branch', 'PUNB0000002': 'PNB - Mumbai Branch',
};

// Validation functions
const validateIFSC = (ifsc: string): { valid: boolean; message: string } => {
  if (!ifsc) return { valid: false, message: 'IFSC Code is required' };
  const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
  if (!ifscRegex.test(ifsc)) {
    return { valid: false, message: 'Invalid IFSC format. Format: ABCD0000123' };
  }
  return { valid: true, message: 'Valid IFSC' };
};

const validateAccountNumber = (accountNo: string): { valid: boolean; message: string } => {
  if (!accountNo) return { valid: false, message: 'Account Number is required' };
  if (!/^[0-9]{9,18}$/.test(accountNo.replace(/\s/g, ''))) {
    return { valid: false, message: 'Account number must have 9-18 digits' };
  }
  return { valid: true, message: 'Valid' };
};

const validateBankName = (bankName: string): { valid: boolean; message: string } => {
  if (!bankName) return { valid: false, message: 'Bank Name is required' };
  if (bankName.length < 3) return { valid: false, message: 'Bank Name is too short' };
  return { valid: true, message: 'Valid' };
};

const getBranchNameFromIFSC = (ifsc: string): string => {
  return IFSC_DATABASE[ifsc] || 'Enter branch name manually';
};

const AdminPanel: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'subscriptions' | 'plans' | 'businesses'>('dashboard');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [pendingSubs, setPendingSubs] = useState<UserSubscription[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Subscription creation
  const [showSubForm, setShowSubForm] = useState(false);
  const [subFormUser, setSubFormUser] = useState<any | null>(null);
  const [subFormPlanId, setSubFormPlanId] = useState('');
  const [subFormStartDate, setSubFormStartDate] = useState('');
  const [subFormError, setSubFormError] = useState('');
  const [subFormLoading, setSubFormLoading] = useState(false);
  const [userActiveSubscription, setUserActiveSubscription] = useState<any | null>(null);
  const [minDate, setMinDate] = useState('');
  const [subFormWarning, setSubFormWarning] = useState('');
  const [renewalMode, setRenewalMode] = useState(false);

  // Business registration
  const [showBusinessForm, setShowBusinessForm] = useState(false);
  const [businessFormUser, setBusinessFormUser] = useState<any | null>(null);
  const [businessFormData, setBusinessFormData] = useState<any>({
    name: '',
    address: '',
    country: 'India',
    currency: 'INR',
    currencySymbol: '₹',
    contact: '',
    type: 0,
    taxId: '',
    gstNumber: '',
    licenseNumber: '',
    bankAccount: '',
    bankName: '',
    ifscCode: '',
    branchName: '',
    industry: '',
    employees: 0,
    revenue: 0,
    expenses: 0,
    incorporationDate: new Date().toISOString().split('T')[0],
    website: ''
  });
  const [bankValidationErrors, setBankValidationErrors] = useState<any>({});
  const [businessFormError, setBusinessFormError] = useState('');
  const [businessFormLoading, setBusinessFormLoading] = useState(false);

  // Plan management
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planFormData, setPlanFormData] = useState<any>({
    name: '',
    description: '',
    price: 0,
    validity: '',
    maxCompanies: 1,
    maxProducts: 10,
    maxUsers: 5,
    featuresJson: '[]',
    status: 'Active'
  });
  const [planFormError, setPlanFormError] = useState('');
  const [planFormLoading, setPlanFormLoading] = useState(false);

  // Invoice preview
  const [invoiceUser, setInvoiceUser] = useState<any | null>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    setIsLoading(true);
    
    // Fire requests independently so one failure doesn't stop others
    try {
      adminService.getStats()
        .then(res => setStats(res.data))
        .catch(err => console.error('Error fetching stats:', err));
        
      adminService.getUsers()
        .then(res => setUsers(res.data))
        .catch(err => console.error('Error fetching users:', err));
        
      adminService.getPendingSubscriptions()
        .then(res => setPendingSubs(res.data))
        .catch(err => console.error('Error fetching pending subs:', err));
        
      adminService.getPlans()
        .then(res => setPlans(res.data))
        .catch(err => console.error('Error fetching plans:', err));

      // Wait a moment for the critical ones to likely complete before hiding spinner
      await new Promise(resolve => setTimeout(resolve, 800));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [activeSubTab]);

  const handleApprove = async (id: string) => {
    if (!window.confirm('Approve this subscription request?')) return;
    try {
      await adminService.approveSubscription(id);
      fetchData();
    } catch { alert('Approval failed.'); }
  };

  const handleReject = async (id: string) => {
    if (!window.confirm('Reject this subscription request?')) return;
    try {
      await adminService.rejectSubscription(id);
      fetchData();
    } catch { alert('Rejection failed.'); }
  };

  const handleCreateSubscription = async () => {
    setSubFormError('');
    if (!subFormUser || !subFormPlanId) {
      setSubFormError('Please select a user and a plan.');
      return;
    }

    // Validate date is not in the past
    if (subFormStartDate) {
      const selectedDate = new Date(subFormStartDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        setSubFormError('Start date cannot be in the past.');
        return;
      }
    }

    // Check if user has active plan and is trying to change
    if (userActiveSubscription && userActiveSubscription.isActive && !renewalMode) {
      setSubFormError('This customer has an ACTIVE subscription. Click "Renew" button below to upgrade or renew the existing plan.');
      return;
    }

    setSubFormLoading(true);
    try {
      await adminService.createSubscription({
        userId: subFormUser.id,
        planId: subFormPlanId,
        startDate: subFormStartDate || new Date().toISOString().split('T')[0]
      });
      alert('Subscription assigned successfully!');
      setShowSubForm(false);
      setSubFormUser(null);
      setSubFormPlanId('');
      setSubFormStartDate('');
      setUserActiveSubscription(null);
      setRenewalMode(false);
      setSubFormError('');
      setSubFormWarning('');
      fetchData();
    } catch (err: any) {
      setSubFormError(err?.response?.data?.message || 'Failed to create subscription.');
    } finally {
      setSubFormLoading(false);
    }
  };

  const handleUserChange = (userId: string) => {
    const user = customerUsers.find(u => u.id === userId);
    setSubFormUser(user || null);
    setSubFormPlanId('');
    setSubFormError('');
    setSubFormWarning('');
    setRenewalMode(false);

    // Check if user has active subscription
    if (user?.subscription) {
      setUserActiveSubscription(user.subscription);
      if (user.subscription.isActive) {
        const endDate = user.subscription.endDate ? new Date(user.subscription.endDate).toLocaleDateString() : 'N/A';
        setSubFormWarning(`⚠️ Active Plan: ${user.subscription.planName} (expires: ${endDate})`);
      }
    } else {
      setUserActiveSubscription(null);
      setSubFormWarning('');
    }

    // Set minimum date to today
    const today = new Date();
    const minDateStr = today.toISOString().split('T')[0];
    setMinDate(minDateStr);
  };

  const handleOpenSubForm = (user: any = null) => {
    if (user) {
      handleUserChange(user.id);
    } else {
      setSubFormUser(null);
      setSubFormPlanId('');
      setSubFormStartDate('');
      setUserActiveSubscription(null);
      setRenewalMode(false);
      setSubFormError('');
      setSubFormWarning('');
      const today = new Date();
      setMinDate(today.toISOString().split('T')[0]);
    }
    setShowSubForm(true);
  };

  const handleRegisterBusiness = async () => {
    setBusinessFormError('');
    setBankValidationErrors({});
    
    if (!businessFormUser) {
      setBusinessFormError('Please select a customer.');
      return;
    }
    if (!businessFormData.name || !businessFormData.taxId || !businessFormData.contact) {
      setBusinessFormError('Please fill in all required fields (Name, Tax ID, Contact).');
      return;
    }

    // Validate bank details
    const errors: any = {};
    const accountValidation = validateAccountNumber(businessFormData.bankAccount);
    if (!accountValidation.valid) errors.bankAccount = accountValidation.message;
    
    const bankNameValidation = validateBankName(businessFormData.bankName);
    if (!bankNameValidation.valid) errors.bankName = bankNameValidation.message;
    
    const ifscValidation = validateIFSC(businessFormData.ifscCode);
    if (!ifscValidation.valid) errors.ifscCode = ifscValidation.message;
    
    if (!businessFormData.branchName) {
      errors.branchName = 'Branch Name is required';
    }

    if (Object.keys(errors).length > 0) {
      setBankValidationErrors(errors);
      setBusinessFormError('Please fix the bank details errors.');
      return;
    }
    
    setBusinessFormLoading(true);
    try {
      await adminService.registerCompanyForUser({
        userId: businessFormUser.id,
        ...businessFormData,
        type: Number(businessFormData.type),
        employees: Number(businessFormData.employees) || 0,
        revenue: Number(businessFormData.revenue) || 0,
        expenses: Number(businessFormData.expenses) || 0,
      });
      setShowBusinessForm(false);
      setBusinessFormUser(null);
      setBusinessFormError('');
      setBankValidationErrors({});
      setBusinessFormData({
        name: '', address: '', country: 'India', currency: 'INR', currencySymbol: '₹',
        contact: '', type: 0, taxId: '', gstNumber: '', licenseNumber: '', bankAccount: '',
        bankName: '', ifscCode: '', branchName: '', industry: '', employees: 0, revenue: 0, expenses: 0,
        incorporationDate: new Date().toISOString().split('T')[0], website: ''
      });
      alert('Business registered successfully!');
      fetchData();
    } catch (err: any) {
      setBusinessFormError(err?.response?.data?.message || 'Failed to register business.');
    } finally {
      setBusinessFormLoading(false);
    }
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceAmt = Number(planFormData.price);
    if (!planFormData.name || !planFormData.validity || isNaN(priceAmt) || priceAmt < 0 || String(planFormData.price).trim() === '') {
      setPlanFormError('Plan name, validity, and a valid price (≥ 0) are required.');
      return;
    }

    setPlanFormLoading(true);
    try {
      let featuresArray: string[] = [];
      try {
        featuresArray = typeof planFormData.featuresJson === 'string' 
          ? JSON.parse(planFormData.featuresJson) 
          : planFormData.featuresJson;
      } catch {}

      const payload = {
        ...planFormData,
        featuresJson: JSON.stringify(featuresArray),
        price: Number(planFormData.price),
        maxCompanies: Number(planFormData.maxCompanies),
        maxProducts: Number(planFormData.maxProducts),
        maxUsers: Number(planFormData.maxUsers)
      };

      if (editingPlanId) {
        await adminService.updatePlan(editingPlanId, payload);
      } else {
        await adminService.createPlan(payload);
        setActiveSubTab('plans'); // Switch to plans tab after creating
      }
      
      setShowPlanForm(false);
      setEditingPlanId(null);
      setPlanFormData({
        name: '', description: '', price: 0, validity: '', maxCompanies: 1, 
        maxProducts: 10, maxUsers: 5, featuresJson: '[]', status: 'Active'
      });
      setPlanFormError('');
      fetchData();
    } catch (err: any) {
      setPlanFormError(err?.response?.data?.message || 'Failed to save plan.');
    } finally {
      setPlanFormLoading(false);
    }
  };

  const handleEditPlan = (plan: SubscriptionPlan) => {
    setEditingPlanId(plan.id);
    let features: string[] = [];
    try { features = JSON.parse(plan.featuresJson || '[]'); } catch {}
    setPlanFormData({
      name: plan.name,
      description: plan.description,
      price: plan.price,
      validity: plan.validity,
      maxCompanies: plan.maxCompanies,
      maxProducts: plan.maxProducts,
      maxUsers: plan.maxUsers,
      featuresJson: features,
      status: plan.status
    });
    setShowPlanForm(true);
  };

  const handleDeletePlan = async (planId: string) => {
    if (!window.confirm('Are you sure you want to delete this plan?')) return;
    try {
      await adminService.deletePlan(planId);
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete plan.');
    }
  };

  const handlePrintInvoice = () => {
    if (!invoiceRef.current) return;
    const content = invoiceRef.current.innerHTML;
    const printWin = window.open('', '', 'width=900,height=700');
    if (!printWin) return;
    printWin.document.write(`<!DOCTYPE html><html><head>
      <title>Subscription Invoice</title>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
      <style>
        body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #1e293b; }
        .inv-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0; }
        .inv-logo { font-size: 28px; font-weight: 900; letter-spacing: -1px; color: #1e293b; }
        .inv-logo span { color: #3b82f6; }
        table { width: 100%; border-collapse: collapse; margin: 24px 0; }
        th { background: #f8fafc; padding: 10px 14px; text-align: left; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; }
        td { padding: 12px 14px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; }
        .badge-active { background: #f0fdf4; color: #16a34a; }
        .badge-pending { background: #fffbeb; color: #d97706; }
        .total-row td { font-weight: 900; font-size: 15px; color: #1e293b; border-top: 2px solid #e2e8f0; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
      </style>
    </head><body>${content}</body></html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => { printWin.print(); printWin.close(); }, 300);
  };

  const customerUsers = users.filter(u => u.role === 'Customer' || u.role === 1);

  // Helper function to get plan status
  const getPlanStatus = (subscription: any) => {
    if (!subscription) return { status: 'none', label: 'No Plan', color: 'slate', daysLeft: 0 };
    
    if (subscription.status === 'Active' && subscription.isActive) {
      const endDate = new Date(subscription.endDate);
      const today = new Date();
      const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysLeft <= 0) {
        return { status: 'expired', label: 'Expired', color: 'red', daysLeft };
      } else if (daysLeft <= 7) {
        return { status: 'expiring-soon', label: `Expiring in ${daysLeft}d`, color: 'amber', daysLeft };
      } else {
        return { status: 'active', label: 'Active', color: 'emerald', daysLeft };
      }
    } else if (subscription.status === 'Pending') {
      return { status: 'pending', label: 'Pending', color: 'amber', daysLeft: 0 };
    } else {
      return { status: 'inactive', label: 'Inactive', color: 'slate', daysLeft: 0 };
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">Admin Portal</h1>
          <p className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Platform Management &amp; Control</p>
        </div>
        <div className="flex flex-col sm:flex-wrap gap-1 sm:gap-2 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm w-full sm:w-fit">
          {(['dashboard', 'subscriptions', 'plans', 'businesses'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              className={`px-3 sm:px-5 py-2 sm:py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all flex-1 sm:flex-none text-center ${
                activeSubTab === tab ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab === 'dashboard' ? 'Overview' : tab === 'businesses' ? 'Businesses' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* DASHBOARD TAB */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-8">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <StatCard title="Total Customers" value={stats?.totalUsers || 0} icon="fa-users" color="blue" />
            <StatCard title="Active Subs" value={stats?.activeSubscriptions || 0} icon="fa-check-circle" color="emerald" />
            <StatCard title="Expired Subs" value={stats?.expiredSubscriptions || 0} icon="fa-clock" color="amber" />
            <StatCard title="Pending Requests" value={stats?.pendingSubscriptionRequests || 0} icon="fa-hourglass-half" color="purple" />
          </div>

          {/* Customer Overview Table */}
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="font-black text-slate-800 uppercase tracking-tight">Customer Overview</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">All registered customer accounts</p>
              </div>
              <button
                onClick={() => handleOpenSubForm()}
                className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 flex items-center gap-2"
              >
                <i className="fas fa-plus"></i> Assign Subscription
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4 hidden md:table-cell">Contact</th>
                    <th className="px-6 py-4">Plan</th>
                    <th className="px-6 py-4">Start Date</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 hidden lg:table-cell">Expiry</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customerUsers.map((u) => {
                    const planStatus = getPlanStatus(u.subscription);
                    return (
                    <tr key={u.id} className={`hover:bg-slate-50/50 transition-colors ${planStatus.status === 'expired' ? 'bg-red-50/30' : planStatus.status === 'expiring-soon' ? 'bg-amber-50/20' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center font-black text-white text-xs flex-shrink-0">
                            {u.name?.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{u.name}</p>
                            <p className="text-[10px] text-slate-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <p className="text-xs text-slate-600">{u.contactNo || '—'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-bold text-slate-700">{u.subscription?.planName || <span className="text-slate-300">No Plan</span>}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-[10px] font-bold text-slate-500">{u.subscription?.startDate ? formatDisplayDate(u.subscription.startDate) : '—'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest ${
                          planStatus.status === 'expired' ? 'bg-red-50 text-red-600'
                          : planStatus.status === 'expiring-soon' ? 'bg-amber-50 text-amber-600'
                          : planStatus.status === 'active' ? 'bg-emerald-50 text-emerald-600'
                          : planStatus.status === 'pending' ? 'bg-amber-50 text-amber-600'
                          : 'bg-slate-100 text-slate-400'
                        }`}>
                          {planStatus.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                          {u.subscription?.endDate ? formatDisplayDate(u.subscription.endDate) : '—'}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => { setInvoiceUser(u); }}
                            disabled={!u.subscription}
                            className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all text-xs disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Generate Invoice"
                          >
                            <i className="fas fa-file-invoice"></i>
                          </button>
                          <button
                            onClick={() => handleOpenSubForm(u)}
                            className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-all text-xs"
                            title="Assign/Renew Subscription"
                          >
                            <i className="fas fa-sync-alt"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                  })}
                  {customerUsers.length === 0 && (
                    <tr><td colSpan={6} className="py-12 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">No customers yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBSCRIPTIONS TAB */}
      {activeSubTab === 'subscriptions' && (
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-black text-slate-800 uppercase tracking-tight">Pending Subscription Requests</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Approve or reject incoming requests</p>
            </div>
            <span className="bg-amber-100 text-amber-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
              {pendingSubs.length} Pending
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Requested Plan</th>
                  <th className="px-6 py-4 text-right">Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingSubs.length === 0 ? (
                  <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">No pending requests</td></tr>
                ) : (
                  pendingSubs.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-800">{sub.userName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{sub.userId}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-black text-blue-600 uppercase tracking-tighter">{sub.planName}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleReject(sub.id)} className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all">Reject</button>
                          <button onClick={() => handleApprove(sub.id)} className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all">Approve</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PLANS TAB */}
      {activeSubTab === 'plans' && (
        <div className="space-y-6">
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-black text-slate-800 uppercase tracking-tight">Subscription Plans</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Manage subscription tiers and features</p>
              </div>
              <button
                onClick={() => { 
                  setEditingPlanId(null); 
                  setPlanFormData({
                    name: '', description: '', price: 0, validity: '', maxCompanies: 1, 
                    maxProducts: 10, maxUsers: 5, featuresJson: '[]', status: 'Active'
                  });
                  setShowPlanForm(true); 
                }}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 flex items-center gap-2"
              >
                <i className="fas fa-plus"></i> New Plan
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((p) => (
              <div key={p.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative group hover:border-blue-300 transition-all">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{p.name}</h3>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${p.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                    {p.status}
                  </span>
                </div>
                <div className="mb-6">
                  <span className="text-3xl font-black text-slate-900">₹{p.price}</span>
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-widest ml-2">/ {p.validity}</span>
                </div>
                <p className="text-xs text-slate-500 mb-6">{p.description}</p>
                <div className="space-y-2 mb-6 border-t border-slate-50 pt-5">
                  <div className="text-[10px] text-slate-500 font-medium flex justify-between uppercase tracking-widest">
                    <span>Max Companies</span><span className="font-black text-slate-800">{p.maxCompanies}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium flex justify-between uppercase tracking-widest">
                    <span>Max Products</span><span className="font-black text-slate-800">{p.maxProducts}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium flex justify-between uppercase tracking-widest">
                    <span>Max Users</span><span className="font-black text-slate-800">{p.maxUsers}</span>
                  </div>
                </div>
                {(() => {
                  let feats: string[] = [];
                  try { feats = JSON.parse(p.featuresJson || '[]'); } catch {}
                  return feats.length > 0 ? (
                    <ul className="space-y-1.5 mb-6">
                      {feats.map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-slate-600">
                          <i className="fas fa-check text-emerald-500 text-[9px]"></i> {f}
                        </li>
                      ))}
                    </ul>
                  ) : null;
                })()}
                <div className="flex gap-2 border-t border-slate-50 pt-5">
                  <button
                    onClick={() => handleEditPlan(p)}
                    className="flex-1 bg-blue-50 text-blue-600 px-4 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-blue-100 transition-colors flex items-center justify-center gap-1"
                  >
                    <i className="fas fa-edit"></i> Edit
                  </button>
                  <button
                    onClick={() => handleDeletePlan(p.id)}
                    className="flex-1 bg-red-50 text-red-600 px-4 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-red-100 transition-colors flex items-center justify-center gap-1"
                  >
                    <i className="fas fa-trash"></i> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BUSINESSES TAB */}
      {activeSubTab === 'businesses' && (
        <div className="space-y-6">
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between ml-0 mb-6">
              <div>
                <h3 className="font-black text-slate-800 uppercase tracking-tight">Register Business for Customer</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Create a new business account for any customer</p>
              </div>
              <button
                onClick={() => { setShowBusinessForm(true); setBusinessFormUser(null); setBusinessFormError(''); }}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 flex items-center gap-2"
              >
                <i className="fas fa-plus"></i> New Business
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Subscription Modal */}
      {showSubForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[80] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 my-8">
            <div className="h-1.5 bg-gradient-to-r from-blue-600 to-emerald-500"></div>
            <div className="p-4 sm:p-8">
              <h3 className="text-xl font-black text-slate-800 mb-1 uppercase tracking-tight">
                {renewalMode ? '↻ Renew/Upgrade Subscription' : 'Assign New Subscription'}
              </h3>
              <p className="text-xs text-slate-400 mb-6">
                {renewalMode 
                  ? 'Renew or upgrade the existing subscription plan for this customer' 
                  : 'Create a new subscription for a customer'}
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Customer</label>
                  <select
                    value={subFormUser?.id || ''}
                    onChange={e => handleUserChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none font-medium"
                  >
                    <option value="">— Select Customer —</option>
                    {customerUsers.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email}) {u.subscription?.isActive ? '🔄 Active' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {subFormWarning && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-amber-700 text-xs font-bold flex items-center gap-2">
                    <i className="fas fa-info-circle"></i> {subFormWarning}
                  </div>
                )}

                {userActiveSubscription?.isActive && (
                  <button
                    type="button"
                    onClick={() => {
                      setRenewalMode(!renewalMode);
                      setSubFormError('');
                    }}
                    className={`w-full py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-colors ${
                      renewalMode 
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' 
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {renewalMode ? '✓ Renew Mode Enabled' : '↻ Renew/Upgrade Current Plan'}
                  </button>
                )}

                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Plan</label>
                  <select
                    value={subFormPlanId}
                    onChange={e => setSubFormPlanId(e.target.value)}
                    disabled={!subFormUser}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">— Select Plan —</option>
                    {plans.filter(p => p.status === 'Active').map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} — ₹{p.price}/{p.validity}
                        {userActiveSubscription?.planName === p.name && userActiveSubscription?.isActive ? ' (Current)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Start Date <span className="text-slate-300 font-normal">(from today onwards)</span>
                  </label>
                  <input
                    type="date"
                    value={subFormStartDate}
                    onChange={e => setSubFormStartDate(e.target.value)}
                    min={minDate || new Date().toISOString().split('T')[0]}
                    disabled={!subFormUser}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <p className="text-[8px] text-slate-400 mt-1">⚠️ Cannot select past dates</p>
                </div>

                {subFormError && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold flex items-center gap-2 border border-red-200">
                    <i className="fas fa-exclamation-circle"></i> {subFormError}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setShowSubForm(false)} 
                    className="flex-1 py-3 text-slate-400 font-bold text-xs uppercase tracking-widest border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateSubscription}
                    disabled={subFormLoading || !subFormUser || !subFormPlanId}
                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
                  >
                    {subFormLoading ? (renewalMode ? 'Renewing...' : 'Assigning...') : (renewalMode ? 'Renew Plan' : 'Assign Plan')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {invoiceUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[80] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] w-full max-w-md sm:max-w-lg md:max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 my-8">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="font-black text-slate-800 uppercase tracking-tight text-lg">Subscription Invoice</h3>
              <div className="flex gap-2">
                <button
                  onClick={handlePrintInvoice}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest"
                >
                  <i className="fas fa-print"></i> Print / PDF
                </button>
                <button onClick={() => setInvoiceUser(null)} className="p-2 text-slate-400 hover:text-slate-600">
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>

            <div className="p-8 overflow-auto max-h-[70vh]">
              <div ref={invoiceRef}>
                {/* Invoice content */}
                <div className="inv-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, paddingBottom: 20, borderBottom: '2px solid #e2e8f0' }}>
                  <div>
                    <div className="inv-logo" style={{ fontSize: 28, fontWeight: 900, letterSpacing: -1, color: '#1e293b' }}>
                      Setu <span style={{ color: '#3b82f6' }}>Business Suite</span>
                    </div>
                    <p style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>subscription@setu.in</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 20, fontWeight: 900, color: '#1e293b' }}>INVOICE</p>
                    <p style={{ fontSize: 11, color: '#64748b' }}>Date: {formatDisplayDate(new Date().toISOString())}</p>
                    <p style={{ fontSize: 11, color: '#64748b' }}>INV-{invoiceUser.id?.substring(0, 8).toUpperCase()}</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: 8 }}>Billed To</p>
                    <p style={{ fontWeight: 700, color: '#1e293b' }}>{invoiceUser.name}</p>
                    <p style={{ fontSize: 13, color: '#64748b' }}>{invoiceUser.email}</p>
                    {invoiceUser.contactNo && <p style={{ fontSize: 13, color: '#64748b' }}>{invoiceUser.contactNo}</p>}
                  </div>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: 8 }}>Subscription Details</p>
                    <p style={{ fontWeight: 700, color: '#1e293b' }}>{invoiceUser.subscription?.planName} Plan</p>
                    <p style={{ fontSize: 13, color: '#64748b' }}>
                      {invoiceUser.subscription?.startDate ? formatDisplayDate(invoiceUser.subscription.startDate) : 'N/A'} →{' '}
                      {invoiceUser.subscription?.endDate ? formatDisplayDate(invoiceUser.subscription.endDate) : 'N/A'}
                    </p>
                    <span style={{ display: 'inline-block', marginTop: 6, padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 900, textTransform: 'uppercase', background: invoiceUser.subscription?.isActive ? '#f0fdf4' : '#fef9c3', color: invoiceUser.subscription?.isActive ? '#16a34a' : '#d97706' }}>
                      {invoiceUser.subscription?.status}
                    </span>
                  </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', margin: '0 0 24px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b' }}>Description</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '14px', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                        <strong>{invoiceUser.subscription?.planName} - Subscription Plan</strong>
                        <br />
                        <span style={{ color: '#64748b', fontSize: 11 }}>Access to Setu Business Suite</span>
                      </td>
                      <td style={{ padding: '14px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', fontWeight: 700, fontSize: 14 }}>
                        {plans.find(p => p.name === invoiceUser.subscription?.planName) ? `₹${plans.find(p => p.name === invoiceUser.subscription?.planName)!.price}` : '—'}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '14px', fontWeight: 900, fontSize: 15, color: '#1e293b', borderTop: '2px solid #e2e8f0' }}>Total</td>
                      <td style={{ padding: '14px', fontWeight: 900, fontSize: 18, color: '#1e293b', textAlign: 'right', borderTop: '2px solid #e2e8f0' }}>
                        {plans.find(p => p.name === invoiceUser.subscription?.planName) ? `₹${plans.find(p => p.name === invoiceUser.subscription?.planName)!.price}` : '—'}
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid #e2e8f0', fontSize: 10, color: '#94a3b8', textAlign: 'center' }}>
                  Thank you for your business! For queries contact: support@setu.in | © {new Date().getFullYear()} Setu Business Suite
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Register Business Modal */}
      {showBusinessForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[80] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] w-full max-w-md sm:max-w-lg md:max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 my-8">
            <div className="h-1.5 bg-gradient-to-r from-emerald-600 to-blue-600"></div>
            <div className="p-4 sm:p-8">
              <h3 className="text-xl font-black text-slate-800 mb-1 uppercase tracking-tight">Register Business for Customer</h3>
              <p className="text-xs text-slate-400 mb-6">Create a new business account and assign it to a customer</p>

              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {/* Customer Selection */}
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Select Customer</label>
                  <select
                    value={businessFormUser?.id || ''}
                    onChange={e => setBusinessFormUser(users.find(u => u.id === e.target.value) || null)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none"
                  >
                    <option value="">— Select Customer —</option>
                    {users.filter(u => u.role === 1 || u.role === 'Customer').map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                    ))}
                  </select>
                </div>

                {/* Business Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Business Name *</label>
                    <input
                      type="text"
                      value={businessFormData.name}
                      onChange={e => setBusinessFormData({ ...businessFormData, name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none"
                      placeholder="Legal business name"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Tax ID *</label>
                    <input
                      type="text"
                      value={businessFormData.taxId}
                      onChange={e => setBusinessFormData({ ...businessFormData, taxId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none"
                      placeholder="PAN / VAT / GST"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Contact *</label>
                    <input
                      type="text"
                      value={businessFormData.contact}
                      onChange={e => setBusinessFormData({ ...businessFormData, contact: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none"
                      placeholder="Phone number"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Address</label>
                    <input
                      type="text"
                      value={businessFormData.address}
                      onChange={e => setBusinessFormData({ ...businessFormData, address: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none"
                      placeholder="Business address"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Country</label>
                    <select
                      value={businessFormData.country}
                      onChange={e => {
                        const countryData: any = {
                          'India': { currency: 'INR', symbol: '₹' },
                          'United States': { currency: 'USD', symbol: '$' },
                          'United Kingdom': { currency: 'GBP', symbol: '£' },
                          'Other': { currency: 'USD', symbol: '$' }
                        };
                        const data = countryData[e.target.value] || countryData['Other'];
                        setBusinessFormData({ ...businessFormData, country: e.target.value, currency: data.currency, currencySymbol: data.symbol });
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none"
                    >
                      <option>India</option>
                      <option>United States</option>
                      <option>United Kingdom</option>
                      <option>Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Entity Structure</label>
                    <select
                      value={businessFormData.type}
                      onChange={e => setBusinessFormData({ ...businessFormData, type: parseInt(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none"
                    >
                      <option value={BusinessType.PRIVATE}>Private Limited</option>
                      <option value={BusinessType.PUBLIC}>Public Limited</option>
                      <option value={BusinessType.FIRM}>Proprietorship / Firm</option>
                      <option value={BusinessType.PARTNERSHIP}>Partnership / LLP</option>
                      <option value={BusinessType.NGO}>Non-Profit / NGO</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Industry</label>
                    <input
                      type="text"
                      value={businessFormData.industry}
                      onChange={e => setBusinessFormData({ ...businessFormData, industry: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none"
                      placeholder="e.g., Manufacturing, Retail"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">GST Number</label>
                    <input
                      type="text"
                      value={businessFormData.gstNumber || ''}
                      onChange={e => setBusinessFormData({ ...businessFormData, gstNumber: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none"
                      placeholder="Optional"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">License No.</label>
                    <input
                      type="text"
                      value={businessFormData.licenseNumber}
                      onChange={e => setBusinessFormData({ ...businessFormData, licenseNumber: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none"
                      placeholder="Business license"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Bank Name *</label>
                    <input
                      type="text"
                      value={businessFormData.bankName}
                      onChange={e => {
                        setBusinessFormData({ ...businessFormData, bankName: e.target.value });
                        setBankValidationErrors({ ...bankValidationErrors, bankName: '' });
                      }}
                      className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm focus:outline-none ${
                        bankValidationErrors.bankName ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
                      }`}
                      placeholder="e.g., State Bank of India, HDFC Bank"
                    />
                    {bankValidationErrors.bankName && (
                      <p className="text-red-500 text-[8px] mt-1 font-bold flex items-center gap-1">
                        <i className="fas fa-exclamation-circle"></i> {bankValidationErrors.bankName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Account Number *</label>
                    <input
                      type="text"
                      value={businessFormData.bankAccount}
                      onChange={e => {
                        setBusinessFormData({ ...businessFormData, bankAccount: e.target.value });
                        setBankValidationErrors({ ...bankValidationErrors, bankAccount: '' });
                      }}
                      inputMode="numeric"
                      className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm focus:outline-none ${
                        bankValidationErrors.bankAccount ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
                      }`}
                      placeholder="9-18 digits"
                    />
                    {bankValidationErrors.bankAccount && (
                      <p className="text-red-500 text-[8px] mt-1 font-bold flex items-center gap-1">
                        <i className="fas fa-exclamation-circle"></i> {bankValidationErrors.bankAccount}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">IFSC Code *</label>
                    <input
                      type="text"
                      value={businessFormData.ifscCode}
                      onChange={e => {
                        const ifsc = e.target.value.toUpperCase();
                        setBusinessFormData({ ...businessFormData, ifscCode: ifsc });
                        setBankValidationErrors({ ...bankValidationErrors, ifscCode: '' });
                        // Auto-populate branch name if IFSC is found in database
                        if (ifsc.length === 11 && IFSC_DATABASE[ifsc]) {
                          setBusinessFormData((prev: any) => ({
                            ...prev,
                            ifscCode: ifsc,
                            branchName: IFSC_DATABASE[ifsc]
                          }));
                        }
                      }}
                      maxLength="11"
                      className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm focus:outline-none font-mono ${
                        bankValidationErrors.ifscCode ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
                      }`}
                      placeholder="e.g., SBIN0000001"
                    />
                    {bankValidationErrors.ifscCode && (
                      <p className="text-red-500 text-[8px] mt-1 font-bold flex items-center gap-1">
                        <i className="fas fa-exclamation-circle"></i> {bankValidationErrors.ifscCode}
                      </p>
                    )}
                    <p className="text-[8px] text-slate-400 mt-1">Format: ABCD0000123</p>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                      Branch Name *
                      {IFSC_DATABASE[businessFormData.ifscCode] && (
                        <span className="ml-2 text-emerald-600 font-bold">(Auto-populated from IFSC)</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={businessFormData.branchName}
                      onChange={e => {
                        setBusinessFormData({ ...businessFormData, branchName: e.target.value });
                        setBankValidationErrors({ ...bankValidationErrors, branchName: '' });
                      }}
                      className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm focus:outline-none ${
                        bankValidationErrors.branchName ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
                      }`}
                      placeholder="e.g., SBI - New Delhi Branch"
                    />
                    {bankValidationErrors.branchName && (
                      <p className="text-red-500 text-[8px] mt-1 font-bold flex items-center gap-1">
                        <i className="fas fa-exclamation-circle"></i> {bankValidationErrors.branchName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Incorporation Date</label>
                    <input
                      type="date"
                      value={businessFormData.incorporationDate}
                      onChange={e => setBusinessFormData({ ...businessFormData, incorporationDate: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Employees</label>
                    <input
                      type="number"
                      value={businessFormData.employees}
                      onChange={e => setBusinessFormData({ ...businessFormData, employees: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none"
                      placeholder="0"
                    />
                  </div>
                </div>

                {businessFormError && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                    <i className="fas fa-exclamation-circle"></i> {businessFormError}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowBusinessForm(false)} className="flex-1 py-3 text-slate-400 font-bold text-xs uppercase tracking-widest border border-slate-200 rounded-xl">Cancel</button>
                  <button
                    onClick={handleRegisterBusiness}
                    disabled={businessFormLoading}
                    className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                  >
                    {businessFormLoading ? 'Registering...' : 'Register Business'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plan Form Modal */}
      {showPlanForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[80] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] w-full max-w-md sm:max-w-lg md:max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 my-8">
            <div className="h-1.5 bg-gradient-to-r from-blue-600 to-emerald-500"></div>
            <div className="p-4 sm:p-8">
              <h3 className="text-xl font-black text-slate-800 mb-1 uppercase tracking-tight">{editingPlanId ? 'Edit Plan' : 'Create New Plan'}</h3>
              <p className="text-xs text-slate-400 mb-6">Configure subscription plan details and features</p>

              {planFormError && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6 text-red-600 text-xs font-bold flex items-center gap-2">
                  <i className="fas fa-exclamation-circle"></i> {planFormError}
                </div>
              )}

              <form onSubmit={handleSavePlan} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Plan Name *</label>
                    <input
                      type="text"
                      value={planFormData.name}
                      onChange={e => setPlanFormData({ ...planFormData, name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none"
                      placeholder="e.g., Starter, Professional"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Description</label>
                    <textarea
                      value={planFormData.description}
                      onChange={e => setPlanFormData({ ...planFormData, description: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none resize-none"
                      placeholder="Plan description"
                      rows={2}
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Price (₹) *</label>
                    <input
                      type="number"
                      value={planFormData.price}
                      onChange={e => setPlanFormData({ ...planFormData, price: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none"
                      placeholder="0"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Validity (Period) *</label>
                    <input
                      type="text"
                      value={planFormData.validity}
                      onChange={e => setPlanFormData({ ...planFormData, validity: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none"
                      placeholder="e.g., Month, Year"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Max Companies</label>
                    <input
                      type="number"
                      value={planFormData.maxCompanies}
                      onChange={e => setPlanFormData({ ...planFormData, maxCompanies: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none"
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Max Products</label>
                    <input
                      type="number"
                      value={planFormData.maxProducts}
                      onChange={e => setPlanFormData({ ...planFormData, maxProducts: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none"
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Max Users</label>
                    <input
                      type="number"
                      value={planFormData.maxUsers}
                      onChange={e => setPlanFormData({ ...planFormData, maxUsers: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none"
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Status</label>
                    <select
                      value={planFormData.status}
                      onChange={e => setPlanFormData({ ...planFormData, status: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Features (Comma-separated)</label>
                    <textarea
                      value={Array.isArray(planFormData.featuresJson) ? planFormData.featuresJson.join(', ') : planFormData.featuresJson}
                      onChange={e => setPlanFormData({ ...planFormData, featuresJson: e.target.value.split(',').map(f => f.trim()) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none resize-none"
                      placeholder="API Access, Priority Support, Custom Reports"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setShowPlanForm(false)} 
                    className="flex-1 py-3 text-slate-400 font-bold text-xs uppercase tracking-widest border border-slate-200 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={planFormLoading}
                    className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                  >
                    {planFormLoading ? 'Saving...' : 'Save Plan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: number | string; icon: string; color: string }> = ({ title, value, icon, color }) => {
  const colors: any = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-5">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl shadow-sm flex-shrink-0 ${colors[color] || colors.blue}`}>
        <i className={`fas ${icon}`}></i>
      </div>
      <div>
        <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</h4>
        <p className="text-3xl font-black text-slate-900 tracking-tighter">{value}</p>
      </div>
    </div>
  );
};

export default AdminPanel;
