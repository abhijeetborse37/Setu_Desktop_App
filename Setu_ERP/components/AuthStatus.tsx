import React, { useEffect, useState } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

const AuthStatus: React.FC = () => {
  const [authState, setAuthState] = useState<'loading' | 'authenticated' | 'error'>('loading');
  const [userId, setUserId] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth,
      (user) => {
        if (user) {
          setAuthState('authenticated');
          setUserId(user.uid.substring(0, 12) + '...');
          console.log('✓ Firebase Auth: Authenticated as', user.uid);
        } else {
          setAuthState('error');
          setError('Not authenticated');
          console.error('✗ Firebase Auth: Not authenticated');
        }
      },
      (err) => {
        setAuthState('error');
        setError((err as any).message || String(err));
        console.error('✗ Firebase Auth Error:', (err as any).code, (err as any).message);
      }
    );

    return () => unsubscribe();
  }, []);

  if (authState === 'loading') {
    return null; // Don't show anything while loading
  }

  if (authState === 'authenticated') {
    return (
      <div className="fixed bottom-4 right-4 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs font-bold text-emerald-700 shadow-sm flex items-center z-40 print:hidden">
        <i className="fas fa-check-circle mr-2"></i>
        Cloud Sync Ready ({userId})
      </div>
    );
  }

  // Error state
  return (
    <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs font-bold text-red-700 shadow-sm flex items-center gap-2 z-40 print:hidden cursor-pointer hover:bg-red-100"
      onClick={() => window.location.reload()}>
      <i className="fas fa-exclamation-circle"></i>
      <span>Auth Error - Click to reload</span>
    </div>
  );
};

export default AuthStatus;
