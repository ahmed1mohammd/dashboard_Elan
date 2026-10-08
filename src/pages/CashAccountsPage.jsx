import React, { useState, useEffect } from 'react';
import { 
  Wallet, Plus, Smartphone, CreditCard, DollarSign, 
  ArrowUpDown, RefreshCw, X, Check, Building2, TrendingUp, TrendingDown
} from 'lucide-react';
import { 
  getCashAccounts, createCashAccount, adjustCashAccount 
} from '../services/api';
import { showSuccess, showError, showToast } from '../utils/swal';


const ACCOUNT_TYPE_MAP = {
  cash: { label: 'خزينة نقدية (Cash)', icon: DollarSign, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  vodafone_cash: { label: 'فودافون كاش', icon: Smartphone, color: 'text-red-700 bg-red-50 border-red-200' },
  instapay: { label: 'إنستاباي (InstaPay)', icon: Smartphone, color: 'text-purple-700 bg-purple-50 border-purple-200' },
  bank: { label: 'حساب بنكي', icon: Building2, color: 'text-blue-700 bg-blue-50 border-blue-200' },
  cod_courier: { label: 'تحصيلات مناديب الشحن', icon: CreditCard, color: 'text-amber-700 bg-amber-50 border-amber-200' },
  other: { label: 'حساب آخر', icon: Wallet, color: 'text-slate-700 bg-slate-50 border-slate-200' },
};

export default function CashAccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Add Account Form
  const [addForm, setAddForm] = useState({
    accountName: '',
    accountType: 'vodafone_cash',
    accountIdentifier: '',
    openingBalance: '',
    notes: '',
  });

  // Adjust Balance Form
  const [adjustForm, setAdjustForm] = useState({
    amountChange: '',
    type: 'deposit',
    reason: '',
  });

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const data = await getCashAccounts();
      setAccounts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading cash accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleOpenAdd = () => {
    setAddForm({
      accountName: '',
      accountType: 'vodafone_cash',
      accountIdentifier: '',
      openingBalance: '',
      notes: '',
    });
    setShowAddModal(true);
  };

  const handleOpenAdjust = (account) => {
    setSelectedAccount(account);
    setAdjustForm({
      amountChange: '',
      type: 'deposit',
      reason: '',
    });
    setShowAdjustModal(true);
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createCashAccount({
        accountName: addForm.accountName,
        accountType: addForm.accountType,
        accountIdentifier: addForm.accountIdentifier,
        currentBalance: Number(addForm.openingBalance) || 0,
        notes: addForm.notes,
      });
      showSuccess('تمت الإضافة بنجاح', 'تم تسجيل حساب الخزينة الجديد بنجاح');
      setShowAddModal(false);
      fetchAccounts();
    } catch (err) {
      showError('خطأ أثناء الإضافة', err.response?.data?.message || 'حدث خطأ أثناء إضافة الحساب');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdjustBalance = async (e) => {
    e.preventDefault();
    if (!selectedAccount) return;

    setSubmitting(true);
    try {
      await adjustCashAccount(selectedAccount._id, {
        amountChange: Number(adjustForm.amountChange),
        type: adjustForm.type,
        reason: adjustForm.reason,
      });
      showSuccess('تم تعديل الرصيد', 'تمت تسوية رصيد الحساب بنجاح');
      setShowAdjustModal(false);
      fetchAccounts();
    } catch (err) {
      showError('خطأ أثناء التعديل', err.response?.data?.message || 'حدث خطأ أثناء تعديل الرصيد');
    } finally {
      setSubmitting(false);
    }
  };

  const totalCashBalance = accounts.reduce((sum, a) => sum + (a.currentBalance || 0), 0);

  return (
    <div className="space-y-6 text-right font-['Tajawal',sans-serif]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-[#03204E] flex items-center gap-2">
            <Wallet size={20} strokeWidth={1.5} className="text-[#03204E]" />
            <span>الخزائن وحسابات الدفع (Cash & Wallets Treasury)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            متابعة أرصدة فودافون كاش، إنستاباي، التحصيل عند الاستلام، والتحويلات البنكية.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-2 rounded-sm bg-[#03204E] hover:bg-[#02183b] text-white text-xs font-medium flex items-center gap-1.5 transition-colors duration-150 h-9"
          >
            <Plus size={14} />
            <span>إضافة خزينة / محفظة جديدة</span>
          </button>

          <button
            onClick={fetchAccounts}
            className="p-2 rounded-sm border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
            title="تحديث"
          >
            <RefreshCw size={14} strokeWidth={1.5} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Total Treasury Summary Header */}
      <div className="bg-[#03204E] text-white rounded-sm p-5 border border-[#03204E] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs text-white/70 block">إجمالي السيولة النقدية المتاحة (Total Liquid Funds)</span>
          <h2 className="text-2xl font-bold font-mono text-white mt-1">
            {Math.round(totalCashBalance).toLocaleString()} ج.م
          </h2>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="bg-white/10 px-3 py-2 rounded-sm border border-white/15">
            <span className="text-white/60 block text-[10px]">عدد الخزائن والمحافظ</span>
            <span className="font-bold text-white text-sm">{accounts.length} حسابات</span>
          </div>
        </div>
      </div>

      {/* Accounts Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400">
            <div className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-[#03204E] border-t-transparent rounded-full animate-spin"></div>
              <span>جاري تحميل الخزائن...</span>
            </div>
          </div>
        ) : accounts.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-sm border border-slate-200">
            لا توجد حسابات خزينة مسجلة. اضغط "إضافة خزينة / محفظة جديدة".
          </div>
        ) : (
          accounts.map((account) => {
            const typeInfo = ACCOUNT_TYPE_MAP[account.accountType] || ACCOUNT_TYPE_MAP.other;
            const Icon = typeInfo.icon;

            return (
              <div key={account._id} className="bg-white rounded-sm border border-slate-200 p-4 space-y-3 flex flex-col justify-between hover:border-slate-300 transition-shadow duration-150">
                <div>
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-sm border text-[11px] font-medium flex items-center gap-1.5 ${typeInfo.color}`}>
                      <Icon size={13} />
                      <span>{typeInfo.label}</span>
                    </span>

                    <span className="text-[10px] text-slate-400 font-mono">
                      {account.accountIdentifier || '—'}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 mt-2">
                    {account.accountName}
                  </h3>

                  <div className="mt-3">
                    <span className="text-[11px] text-slate-500 block">الرصيد الفعلي الحالي:</span>
                    <span className="text-xl font-bold font-mono text-slate-900 block mt-0.5">
                      {Math.round(account.currentBalance || 0).toLocaleString()} <span className="text-xs text-slate-500 font-normal">ج.م</span>
                    </span>
                  </div>

                  {account.notes && (
                    <p className="text-[11px] text-slate-500 mt-2 line-clamp-1">
                      {account.notes}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    آخر حركة: {new Date(account.updatedAt || Date.now()).toLocaleDateString('ar-EG')}
                  </span>

                  <button
                    onClick={() => handleOpenAdjust(account)}
                    className="px-3 py-1 bg-slate-100 hover:bg-[#03204E] hover:text-white text-slate-700 rounded-sm text-xs font-medium flex items-center gap-1 transition-colors"
                  >
                    <ArrowUpDown size={12} />
                    <span>تعديل الرصيد</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 rtl">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowAddModal(false)} />
          <div className="relative w-full max-w-md bg-white rounded-sm border border-slate-200 overlay-shadow z-10">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-[#F8FAFC] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#03204E] flex items-center gap-1.5">
                <Wallet size={16} />
                <span>إضافة خزينة / محفظة نقدية جديدة</span>
              </h2>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">اسم الحساب / الخزينة *</label>
                <input
                  type="text"
                  required
                  value={addForm.accountName}
                  onChange={(e) => setAddForm({ ...addForm, accountName: e.target.value })}
                  placeholder="مثال: محفظة فودافون كاش الرئيسية"
                  className="w-full h-9 bg-white border border-slate-200 rounded-sm px-3 text-xs outline-none focus:border-[#03204E]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">نوع الحساب *</label>
                  <select
                    value={addForm.accountType}
                    onChange={(e) => setAddForm({ ...addForm, accountType: e.target.value })}
                    className="w-full h-9 bg-white border border-slate-200 rounded-sm px-2 text-xs outline-none"
                  >
                    {Object.entries(ACCOUNT_TYPE_MAP).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">رقم المحفظة / الآيبان</label>
                  <input
                    type="text"
                    value={addForm.accountIdentifier}
                    onChange={(e) => setAddForm({ ...addForm, accountIdentifier: e.target.value })}
                    placeholder="010XXXXXXXX"
                    className="w-full h-9 bg-white border border-slate-200 rounded-sm px-3 text-xs font-mono outline-none focus:border-[#03204E]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">الرصيد الافتتاحي (ج.م)</label>
                <input
                  type="number"
                  step="any"
                  value={addForm.openingBalance}
                  onChange={(e) => setAddForm({ ...addForm, openingBalance: e.target.value })}
                  placeholder="0"
                  className="w-full h-9 bg-white border border-slate-200 rounded-sm px-3 text-xs font-mono outline-none focus:border-[#03204E]"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">ملاحظات</label>
                <textarea
                  rows="2"
                  value={addForm.notes}
                  onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                  placeholder="ملاحظات حول حدود السحب اليومي، المسؤول عن المحفظة..."
                  className="w-full bg-white border border-slate-200 rounded-sm p-2 text-xs outline-none focus:border-[#03204E]"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-sm hover:bg-slate-50 text-slate-700 h-9"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#03204E] text-white rounded-sm hover:bg-[#02183b] h-9 font-medium disabled:opacity-50"
                >
                  {submitting ? 'جاري الحفظ...' : 'إضافة الحساب'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Balance Modal */}
      {showAdjustModal && selectedAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 rtl">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowAdjustModal(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-sm border border-slate-200 overlay-shadow z-10">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-[#F8FAFC] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#03204E]">
                تعديل رصيد: {selectedAccount.accountName}
              </h2>
              <button onClick={() => setShowAdjustModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAdjustBalance} className="p-5 space-y-3.5 text-xs">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-sm">
                <span className="text-slate-500 text-[11px] block">الرصيد الحالي:</span>
                <span className="text-base font-bold font-mono text-slate-900">
                  {selectedAccount.currentBalance?.toLocaleString()} ج.م
                </span>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">نوع الحركة *</label>
                <select
                  value={adjustForm.type}
                  onChange={(e) => setAdjustForm({ ...adjustForm, type: e.target.value })}
                  className="w-full h-9 bg-white border border-slate-200 rounded-sm px-2 text-xs outline-none"
                >
                  <option value="deposit">إيداع / تحويل وارد (+)</option>
                  <option value="withdrawal">سحب / تحويل صادر (-)</option>
                  <option value="transfer">تحويل بين حسابات</option>
                  <option value="correction">تسوية جرد دوري</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">المبلغ (ج.م) *</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={adjustForm.amountChange}
                  onChange={(e) => setAdjustForm({ ...adjustForm, amountChange: e.target.value })}
                  placeholder="500"
                  className="w-full h-9 bg-white border border-slate-200 rounded-sm px-3 text-xs font-mono outline-none focus:border-[#03204E]"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">السبب / الملاحظة *</label>
                <textarea
                  rows="2"
                  required
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  placeholder="مثال: سحب نقدي للمصروفات، تحصيل مندوب شركة الشحن..."
                  className="w-full bg-white border border-slate-200 rounded-sm p-2 text-xs outline-none focus:border-[#03204E]"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-sm hover:bg-slate-50 text-slate-700 h-9"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#03204E] text-white rounded-sm hover:bg-[#02183b] h-9 font-medium disabled:opacity-50"
                >
                  {submitting ? 'جاري التأكيد...' : 'تأكيد تعديل الرصيد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
