import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Phone, AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const [phone, setPhone] = useState('01000000001');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(phone);
      navigate('/');
    } catch (err) {
      console.error(err);
      setError(
        err.message ||
        err.response?.data?.message || 
        'رقم الهاتف غير مسجل كمدير نظام (Admin).'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 rtl font-['Tajawal',sans-serif]">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-sm p-6 sm:p-8 text-right">
        
        {/* Brand Header */}
        <div className="text-center mb-6">
          <h1 className="font-serif text-3xl font-bold tracking-[0.2em] text-[#03204E]">
            ÉLAN
          </h1>
          <p className="text-xs text-slate-500 mt-1">لوحة التحكم وإدارة المتجر</p>
        </div>

        {/* Credentials helper */}
        <div className="mb-5 p-3 rounded-sm bg-[#F8FAFC] border border-slate-200 text-slate-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-mono">
            <span className="text-slate-500">حساب الأدمن:</span>
            <span className="font-semibold text-slate-900">01000000001</span>
          </div>
          <button
            type="button"
            onClick={() => setPhone('01000000001')}
            className="px-2 py-1 rounded-sm border border-slate-300 bg-white hover:bg-slate-50 text-[#03204E] text-[11px] font-medium transition-colors"
          >
            تعبئة تلقائية
          </button>
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
            <label className="block text-xs font-medium text-slate-700 mb-1">رقم هاتف الأدمن</label>
            <div className="relative flex items-center">
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01000000001"
                className="w-full h-10 bg-white border border-slate-200 focus:border-[#03204E] rounded-sm px-3 pr-8 text-slate-900 placeholder:text-slate-400 text-xs font-mono outline-none transition-colors"
              />
              <Phone size={14} className="text-slate-400 absolute right-2.5" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 bg-[#03204E] hover:bg-[#02183b] text-white font-medium text-xs rounded-sm flex items-center justify-center gap-2 transition-colors duration-150 disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>جاري الدخول...</span>
              </>
            ) : (
              <>
                <span>دخول إلى لوحة التحكم</span>
                <ArrowLeft size={14} />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-200 text-center text-[11px] text-slate-400">
          <p>© 2026 ÉLAN Fine Fragrances</p>
        </div>
      </div>
    </div>
  );
}
