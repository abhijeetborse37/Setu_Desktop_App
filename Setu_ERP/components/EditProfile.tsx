import React, { useState } from 'react';
import { User } from '../types';
import { authService } from '../services/api';

interface EditProfileProps {
  currentUser: User;
  onProfileUpdated: (updatedUser: User) => void;
}

type Step = 'form' | 'otp' | 'done';

const EditProfile: React.FC<EditProfileProps> = ({ currentUser, onProfileUpdated }) => {
  const [step, setStep] = useState<Step>('form');
  const [otpMethod, setOtpMethod] = useState<'email' | 'mobile'>('email');
  const [newName, setNewName] = useState(currentUser.name || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [simulatedOtp, setSimulatedOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleRequestOtp = async () => {
    setError('');
    if (newPassword && newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword && newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    try {
      const payload = otpMethod === 'email'
        ? { email: currentUser.email }
        : { contactNo: currentUser.contactNo };

      const res = await authService.requestOtp(payload);
      // In dev, the API returns the simulated OTP so we store it
      setSimulatedOtp(res.data.simulateOtp || '');
      setStep('otp');
      setSuccessMsg(`OTP sent to your registered ${otpMethod === 'email' ? 'email address' : 'mobile number'}.`);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAndUpdate = async () => {
    setError('');
    if (!otpInput || otpInput.length < 4) {
      setError('Please enter the OTP.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.updateProfile({
        email: currentUser.email,
        contactNo: currentUser.contactNo,
        newName: newName !== currentUser.name ? newName : undefined,
        newPassword: newPassword || undefined,
        simulatedOtp: simulatedOtp,
        providedOtp: otpInput,
      });

      const updatedUser: User = {
        ...currentUser,
        name: newName,
      };

      onProfileUpdated(updatedUser);
      setStep('done');
      setSuccessMsg('Profile updated successfully!');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid OTP or update failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">My Profile</h2>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Manage your personal information &amp; security</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        {/* Header bar */}
        <div className="h-2 bg-gradient-to-r from-blue-600 to-emerald-500"></div>

        <div className="p-8">
          {/* Avatar + Name section */}
          <div className="flex items-center gap-6 mb-8 pb-8 border-b border-slate-100">
            <div className="relative">
              <img
                src={currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=3b82f6&color=fff&size=128`}
                className="w-20 h-20 rounded-2xl shadow-lg border-4 border-slate-100"
                alt={currentUser.name}
              />
              <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg">
                <i className="fas fa-check text-white text-xs"></i>
              </div>
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800">{currentUser.name}</h3>
              <p className="text-sm text-slate-500">{currentUser.email}</p>
              {currentUser.contactNo && (
                <p className="text-sm text-slate-500"><i className="fas fa-phone mr-1.5 text-slate-400"></i>{currentUser.contactNo}</p>
              )}
              <span className="inline-flex items-center mt-2 text-[8px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-lg">
                <i className="fas fa-user mr-1"></i> Customer
              </span>
            </div>
          </div>

          {step === 'form' && (
            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Display Name</label>
                <div className="relative">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all pl-12"
                    placeholder="Your full name"
                  />
                  <i className="fas fa-user absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"></i>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">New Password <span className="text-slate-300">(leave blank to keep current)</span></label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all pl-12 pr-12"
                    placeholder="New password (min 6 chars)"
                  />
                  <i className="fas fa-lock absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"></i>
                  <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <i className={`fas ${showNewPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>

              {newPassword && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all pl-12"
                      placeholder="Confirm new password"
                    />
                    <i className="fas fa-lock absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"></i>
                  </div>
                </div>
              )}

              {/* OTP Delivery method */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Send OTP via</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setOtpMethod('email')}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-bold transition-all ${
                      otpMethod === 'email'
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <i className="fas fa-envelope"></i> Email
                  </button>
                  <button
                    type="button"
                    onClick={() => setOtpMethod('mobile')}
                    disabled={!currentUser.contactNo}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                      otpMethod === 'mobile'
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                    title={!currentUser.contactNo ? 'No mobile number on file' : ''}
                  >
                    <i className="fas fa-mobile-alt"></i> Mobile
                  </button>
                </div>
                {!currentUser.contactNo && (
                  <p className="text-[9px] text-amber-500 font-bold mt-1.5 ml-1"><i className="fas fa-info-circle mr-1"></i> No mobile number registered. Ask admin to add one.</p>
                )}
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold flex items-center">
                  <i className="fas fa-exclamation-circle mr-2"></i> {error}
                </div>
              )}

              <button
                onClick={handleRequestOtp}
                disabled={isLoading}
                className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-black transition-all shadow-xl flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? <><i className="fas fa-circle-notch fa-spin"></i> Sending OTP...</> : <><i className="fas fa-shield-check"></i> <span className="uppercase tracking-widest text-xs">Send OTP & Continue</span></>}
              </button>
            </div>
          )}

          {step === 'otp' && (
            <div className="space-y-5">
              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-start gap-3">
                <i className="fas fa-check-circle text-emerald-500 mt-0.5"></i>
                <div>
                  <p className="text-sm font-bold text-emerald-700">{successMsg}</p>
                  {simulatedOtp && (
                    <p className="text-xs text-emerald-600 mt-1 font-mono">
                      <i className="fas fa-info-circle mr-1"></i> Dev mode: OTP is <strong>{simulatedOtp}</strong>
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Enter OTP</label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-center tracking-[0.5em] font-mono font-black text-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="••••••"
                />
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold flex items-center">
                  <i className="fas fa-exclamation-circle mr-2"></i> {error}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => { setStep('form'); setError(''); setOtpInput(''); }} className="flex-1 py-3 text-slate-400 font-bold text-xs uppercase tracking-widest border border-slate-200 rounded-xl hover:border-slate-300">
                  <i className="fas fa-arrow-left mr-2"></i> Back
                </button>
                <button
                  onClick={handleVerifyAndUpdate}
                  disabled={isLoading}
                  className="flex-1 py-3 bg-slate-900 hover:bg-black text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg disabled:opacity-50"
                >
                  {isLoading ? 'Verifying...' : 'Verify & Update'}
                </button>
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="text-center py-6">
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5 text-3xl text-emerald-500">
                <i className="fas fa-check-circle"></i>
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">Profile Updated!</h3>
              <p className="text-slate-500 text-sm">{successMsg}</p>
              <button
                onClick={() => { setStep('form'); setNewPassword(''); setConfirmPassword(''); setOtpInput(''); setError(''); setSuccessMsg(''); }}
                className="mt-6 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
              >
                Make Another Change
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditProfile;
