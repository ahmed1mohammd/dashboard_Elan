import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { User, Lock, AlertCircle, RefreshCw, ArrowLeft, ArrowRight, Globe } from 'lucide-react';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('m20.fragrances.26@gmail.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();
  const { lang, dir, isRTL, toggleLang } = useLanguage();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({ identifier, password });
      navigate('/');
    } catch (err) {
      console.error(err);
      setError(
        err.message ||
        err.response?.data?.message || 
        (isRTL ? 'بيانات الدخول غير صحيحة أو لا تمتلك صلاحيات مدير النظام.' : 'Invalid credentials or account is not authorized as Administrator.')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir={dir} className={`min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 ${isRTL ? "font-['Cairo',sans-serif]" : "font-sans"}`}>
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-sm p-6 sm:p-8 shadow-xs">
        
        {/* Language switch top */}
        <div className="flex justify-end mb-4">
          <button
            type="button"
            onClick={toggleLang}
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-xs font-bold text-[#174F43] transition-colors"
          >
            <Globe size={13} />
            <span>{lang === 'en' ? 'العربية' : 'English'}</span>
          </button>
        </div>

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-2">
            <img 
              src="/img/m20-logo-emerald.png" 
              alt="M20 Fine Fragrances" 
              className="h-11 sm:h-12 w-auto object-contain drop-shadow-xs"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/img/m20-logo.png';
              }}
            />
          </div>
          <h1 className="font-serif text-2xl font-bold tracking-[0.2em] text-[#174F43]">
            M20
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isRTL ? 'لوحة التحكم وإدارة العمليات' : 'Management & Operations Suite'}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-5 p-3 rounded-sm bg-[#F8FAFC] border border-[#b91c1c]/40 flex items-start gap-2 text-[#b91c1c] text-xs">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {isRTL ? 'البريد الإلكتروني أو الهاتف' : 'Admin Email or Phone'}
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="m20.fragrances.26@gmail.com"
                className={`w-full h-10 bg-white border border-slate-200 focus:border-[#174F43] rounded-sm px-3 ${
                  isRTL ? 'pr-8' : 'pl-8'
                } text-slate-900 placeholder:text-slate-400 text-xs font-mono outline-none transition-colors`}
              />
              <User size={14} className={`text-slate-400 absolute ${isRTL ? 'right-2.5' : 'left-2.5'}`} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {isRTL ? 'كلمة المرور' : 'Password'}
            </label>
            <div className="relative flex items-center">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className={`w-full h-10 bg-white border border-slate-200 focus:border-[#174F43] rounded-sm px-3 ${
                  isRTL ? 'pr-8' : 'pl-8'
                } text-slate-900 placeholder:text-slate-400 text-xs font-mono outline-none transition-colors`}
              />
              <Lock size={14} className={`text-slate-400 absolute ${isRTL ? 'right-2.5' : 'left-2.5'}`} />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 bg-[#174F43] hover:bg-[#0F3830] text-white font-medium text-xs rounded-sm flex items-center justify-center gap-2 transition-colors duration-150 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>{isRTL ? 'جاري الدخول...' : 'Signing In...'}</span>
              </>
            ) : (
              <>
                <span>{isRTL ? 'دخول إلى لوحة التحكم' : 'Sign In to Dashboard'}</span>
                {isRTL ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-200 text-center text-[11px] text-slate-400">
          <p>© 2026 M20 Fine Fragrances</p>
        </div>
      </div>
    </div>
  );
}
