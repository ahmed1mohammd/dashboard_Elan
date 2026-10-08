import React, { useState, useEffect } from 'react';
import { 
  Tag, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  Calendar, 
  Percent, 
  AlertCircle, 
  X,
  RefreshCw 
} from 'lucide-react';
import { getCoupons, createCoupon, deleteCoupon } from '../services/api';
import { showSuccess, showError, showConfirm, showToast } from '../utils/swal';


export default function CouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);
  
  const [formData, setFormData] = useState({
    code: '',
    discountType: 'percentage',
    discountValue: 10,
    minimumSpend: 0,
    maxUsage: 100,
    expiresAt: '',
    active: true
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchCouponsList = async () => {
    setLoading(true);
    try {
      const data = await getCoupons();
      setCoupons(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch coupons:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCouponsList();
  }, []);

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleDelete = async (id, code) => {
    const confirmed = await showConfirm('تأكيد حذف الكوبون', `هل أنت متأكد من حذف كود الخصم "${code}"؟`, 'نعم، احذف', 'إلغاء');
    if (!confirmed) return;
    try {
      await deleteCoupon(id);
      setCoupons(prev => prev.filter(c => c._id !== id));
      showToast('تم حذف الكوبون بنجاح');
    } catch (err) {
      console.error(err);
      showError('تعذر الحذف', 'تعذر حذف الكوبون.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await createCoupon(formData);
      showSuccess('تم إنشاء الكوبون بنجاح', `تم تفعيل كود الخصم ${formData.code} بنجاح`);
      setIsModalOpen(false);
      setFormData({
        code: '',
        discountType: 'percentage',
        discountValue: 10,
        minimumSpend: 0,
        maxUsage: 100,
        expiresAt: '',
        active: true
      });
      fetchCouponsList();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'تعذر إنشاء الكوبون، تأكد أن الكود غير مكرر.';
      setError(msg);
      showError('خطأ في إنشاء الكوبون', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-right font-['Tajawal',sans-serif]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-[#03204E] flex items-center gap-2">
            <Tag size={18} strokeWidth={1.5} className="text-[#03204E]" />
            <span>إدارة الكوبونات والخصومات</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            إنشاء أكواد الخصم والتحكم في شروط استخدامها وتاريخ صلاحيتها.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchCouponsList}
            className="p-2 rounded-sm border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
            title="تحديث"
          >
            <RefreshCw size={14} strokeWidth={1.5} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3.5 py-2 rounded-sm bg-[#03204E] hover:bg-[#02183b] text-white text-xs font-medium flex items-center gap-1.5 transition-colors duration-150 h-9"
          >
            <Plus size={14} strokeWidth={1.5} />
            <span>إنشاء كود خصم جديد</span>
          </button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-500">
          جاري تحميل الكوبونات...
        </div>
      ) : coupons.length === 0 ? (
        <div className="bg-white rounded-sm p-10 text-center border border-slate-200 text-xs text-slate-500">
          لا توجد كوبونات خصم حالياً.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {coupons.map((coupon) => (
            <div
              key={coupon._id}
              className="bg-white rounded-sm border border-slate-200 p-4 space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-[#03204E]">{coupon.code}</span>
                    <button
                      onClick={() => handleCopy(coupon.code)}
                      className="p-1 text-slate-400 hover:text-slate-700"
                      title="نسخ الكود"
                    >
                      {copiedCode === coupon.code ? <Check size={12} className="text-[#15803d]" /> : <Copy size={12} />}
                    </button>
                  </div>

                  <span className={`text-[11px] font-medium ${coupon.active ? 'text-[#15803d]' : 'text-slate-400'}`}>
                    {coupon.active ? 'نشط' : 'معطل'}
                  </span>
                </div>

                <div className="pt-2 space-y-1 text-xs text-slate-600">
                  <p>
                    <span className="text-slate-500">قيمة الخصم:</span>{' '}
                    <span className="font-semibold text-slate-900">
                      {coupon.discountValue} {coupon.discountType === 'percentage' ? '%' : 'ج.م'}
                    </span>
                  </p>
                  {coupon.minimumSpend > 0 && (
                    <p><span className="text-slate-500">الحد الأدنى للطلب:</span> {coupon.minimumSpend} ج.م</p>
                  )}
                  {coupon.maxUsage && (
                    <p><span className="text-slate-500">مرات الاستخدام المتاحة:</span> {coupon.maxUsage}</p>
                  )}
                  {coupon.expiresAt && (
                    <p><span className="text-slate-500">ينتهي في:</span> {new Date(coupon.expiresAt).toLocaleDateString('ar-EG')}</p>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400 font-mono">
                  تم الاستخدام: {coupon.usageCount || 0}
                </span>

                <button
                  onClick={() => handleDelete(coupon._id, coupon.code)}
                  className="p-1.5 rounded-sm border border-slate-200 hover:bg-red-50 text-slate-400 hover:text-red-700 transition-colors"
                  title="حذف الكوبون"
                >
                  <Trash2 size={12} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 rtl">
          <div className="fixed inset-0 bg-black/40 transition-opacity duration-150" onClick={() => setIsModalOpen(false)} />

          <div className="relative w-full max-w-md bg-white rounded-sm border border-slate-200 overlay-shadow overflow-hidden z-10">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-[#F8FAFC] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#03204E]">إنشاء كود خصم جديد</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
              {error && (
                <div className="p-2.5 rounded-sm bg-[#F8FAFC] border border-[#b91c1c]/40 text-[#b91c1c] flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block font-medium text-slate-700 mb-1">كود الخصم *</label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="ELAN10"
                  className="w-full h-9 bg-white border border-slate-200 rounded-sm px-3 text-xs font-mono uppercase outline-none focus:border-[#03204E]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">نوع الخصم</label>
                  <select
                    value={formData.discountType}
                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                    className="w-full h-9 bg-white border border-slate-200 rounded-sm px-2 text-xs outline-none"
                  >
                    <option value="percentage">نسبة مئوية (%)</option>
                    <option value="fixed">مبلغ ثابت (ج.م)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">قيمة الخصم *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
                    className="w-full h-9 bg-white border border-slate-200 rounded-sm px-3 text-xs outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">الحد الأدنى للطلب</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minimumSpend}
                    onChange={(e) => setFormData({ ...formData, minimumSpend: Number(e.target.value) })}
                    className="w-full h-9 bg-white border border-slate-200 rounded-sm px-3 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">أقصى عدد استخدام</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.maxUsage}
                    onChange={(e) => setFormData({ ...formData, maxUsage: Number(e.target.value) })}
                    className="w-full h-9 bg-white border border-slate-200 rounded-sm px-3 text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">تاريخ الانتهاء</label>
                <input
                  type="date"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  className="w-full h-9 bg-white border border-slate-200 rounded-sm px-3 text-xs outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-sm hover:bg-slate-50 text-slate-700 h-9"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#03204E] text-white rounded-sm hover:bg-[#02183b] disabled:opacity-50 h-9 font-medium"
                >
                  {submitting ? 'جاري الإنشاء...' : 'إنشاء الكود'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
