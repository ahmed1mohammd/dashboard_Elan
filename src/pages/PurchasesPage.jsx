import React, { useState, useEffect } from 'react';
import { 
  Receipt, Plus, Trash2, Search, Filter, RefreshCw, 
  X, Check, AlertCircle, ArrowUpRight, DollarSign, Wallet
} from 'lucide-react';
import { 
  getPurchases, createPurchase, deletePurchase, 
  getRawMaterials, getCashAccounts 
} from '../services/api';
import { showSuccess, showError, showConfirm, showWarning, showToast } from '../utils/swal';


export default function PurchasesPage() {
  const [purchases, setPurchases] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals & Form
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    invoiceNumber: '',
    supplier: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    paymentAccount: '',
    shippingFee: 0,
    taxFee: 0,
    notes: '',
    items: [
      { rawMaterial: '', quantity: '', unitCost: '', totalCost: '' }
    ],
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pData, mData, aData] = await Promise.all([
        getPurchases().catch(() => []),
        getRawMaterials().catch(() => []),
        getCashAccounts().catch(() => []),
      ]);
      setPurchases(Array.isArray(pData) ? pData : []);
      setRawMaterials(Array.isArray(mData) ? mData : []);
      setCashAccounts(Array.isArray(aData) ? aData : []);

      if (aData?.length && !formData.paymentAccount) {
        setFormData(prev => ({ ...prev, paymentAccount: aData[0]._id }));
      }
    } catch (err) {
      console.error('Error fetching purchases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAdd = () => {
    setFormData({
      invoiceNumber: `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`,
      supplier: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      paymentAccount: cashAccounts[0]?._id || '',
      shippingFee: 0,
      taxFee: 0,
      notes: '',
      items: [
        { rawMaterial: '', quantity: '', unitCost: '', totalCost: '' }
      ],
    });
    setShowModal(true);
  };

  const handleAddItemRow = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { rawMaterial: '', quantity: '', unitCost: '', totalCost: '' }]
    }));
  };

  const handleRemoveItemRow = (index) => {
    if (formData.items.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleItemChange = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.items];
      const item = { ...updated[index], [field]: value };

      if (field === 'quantity' || field === 'unitCost') {
        const qty = Number(field === 'quantity' ? value : item.quantity) || 0;
        const uCost = Number(field === 'unitCost' ? value : item.unitCost) || 0;
        item.totalCost = qty * uCost;
      } else if (field === 'totalCost') {
        const qty = Number(item.quantity) || 0;
        const tCost = Number(value) || 0;
        if (qty > 0) {
          item.unitCost = (tCost / qty).toFixed(3);
        }
      }

      updated[index] = item;
      return { ...prev, items: updated };
    });
  };

  const itemsSubtotal = formData.items.reduce((sum, item) => sum + (Number(item.totalCost) || 0), 0);
  const invoiceGrandTotal = itemsSubtotal + (Number(formData.shippingFee) || 0) + (Number(formData.taxFee) || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.supplier) {
      showWarning('بيانات ناقصة', 'يرجى كتابة اسم المورد');
      return;
    }

    const validItems = formData.items.filter(i => i.rawMaterial && Number(i.quantity) > 0);
    if (validItems.length === 0) {
      showWarning('بيانات ناقصة', 'يرجى إضافة مادة خام واحدة على الأقل بكمية صالحة');
      return;
    }

    setSubmitting(true);
    try {
      await createPurchase({
        invoiceNumber: formData.invoiceNumber,
        supplier: formData.supplier,
        purchaseDate: formData.purchaseDate,
        paymentAccount: formData.paymentAccount || undefined,
        shippingFee: Number(formData.shippingFee) || 0,
        taxFee: Number(formData.taxFee) || 0,
        notes: formData.notes,
        items: validItems.map(i => ({
          rawMaterial: i.rawMaterial,
          quantity: Number(i.quantity),
          unitCost: Number(i.unitCost) || (Number(i.totalCost) / Number(i.quantity)),
          totalCost: Number(i.totalCost),
        })),
      });

      showSuccess('تم تسجيل الفاتورة بنجاح', 'تم تحديث المخزون وحساب متوسط التكلفة الجديد تلقائياً');
      setShowModal(false);
      fetchData();
    } catch (err) {
      showError('خطأ أثناء الحفظ', err.response?.data?.message || 'حدث خطأ أثناء حفظ فاتورة المشتريات');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (purchase) => {
    const confirmed = await showConfirm('تأكيد الحذف', `هل أنت متأكد من حذف فاتورة "${purchase.invoiceNumber}"؟ (لن يتم التراجع عن تحديثات المخزون السابقة)`, 'نعم، احذف', 'إلغاء');
    if (!confirmed) return;
    try {
      await deletePurchase(purchase._id);
      showToast('تم حذف الفاتورة بنجاح');
      fetchData();
    } catch (err) {
      showError('تعذر الحذف', err.response?.data?.message || 'تعذر حذف الفاتورة');
    }
  };

  const totalPurchasesAmount = purchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);

  return (
    <div className="space-y-6 text-right font-['Tajawal',sans-serif]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-[#03204E] flex items-center gap-2">
            <Receipt size={20} strokeWidth={1.5} className="text-[#03204E]" />
            <span>فواتير مشتريات المواد الخام (Procurement & Invoices)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            تسجيل توريدات الزيوت ومواد التغليف، حساب متوسط التكلفة المرجح (WAC)، والخصم التلقائي من الخزائن.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-2 rounded-sm bg-[#03204E] hover:bg-[#02183b] text-white text-xs font-medium flex items-center gap-1.5 transition-colors duration-150 h-9"
          >
            <Plus size={14} />
            <span>تسجيل فاتورة شراء جديدة</span>
          </button>

          <button
            onClick={fetchData}
            className="p-2 rounded-sm border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
            title="تحديث"
          >
            <RefreshCw size={14} strokeWidth={1.5} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-sm p-4 border border-slate-200">
          <span className="text-xs text-slate-500 block">إجمالي عدد الفواتير</span>
          <h3 className="text-xl font-bold text-slate-900 mt-1">{purchases.length} فاتورة</h3>
        </div>

        <div className="bg-white rounded-sm p-4 border border-slate-200">
          <span className="text-xs text-slate-500 block">إجمالي مصروف المشتريات والتوريد</span>
          <h3 className="text-xl font-bold text-[#03204E] mt-1">{Math.round(totalPurchasesAmount).toLocaleString()} ج.م</h3>
        </div>

        <div className="bg-white rounded-sm p-4 border border-slate-200">
          <span className="text-xs text-slate-500 block">طريقة تقييم التكلفة</span>
          <h3 className="text-sm font-bold text-emerald-700 mt-1">متوسط مرجح تراكمي (WAC)</h3>
        </div>
      </div>

      {/* Purchases Table */}
      <div className="bg-white rounded-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#F8FAFC] text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">رقم الفاتورة</th>
                <th className="py-3 px-4">المورد</th>
                <th className="py-3 px-4">تاريخ الشراء</th>
                <th className="py-3 px-4">البنود المشتراة</th>
                <th className="py-3 px-4 text-center">الإجمالي (ج.م)</th>
                <th className="py-3 px-4">حساب الدفع</th>
                <th className="py-3 px-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-[#03204E] border-t-transparent rounded-full animate-spin"></div>
                      <span>جاري تحميل الفواتير...</span>
                    </div>
                  </td>
                </tr>
              ) : purchases.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    لا توجد فواتير مشتريات مسجلة بعد.
                  </td>
                </tr>
              ) : (
                purchases.map((purchase) => {
                  return (
                    <tr key={purchase._id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {purchase.invoiceNumber}
                      </td>

                      <td className="py-3 px-4 font-medium text-slate-800">
                        {purchase.supplier}
                      </td>

                      <td className="py-3 px-4 text-slate-600 font-mono">
                        {new Date(purchase.purchaseDate).toLocaleDateString('ar-EG')}
                      </td>

                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          {(purchase.items || []).map((item, idx) => (
                            <div key={idx} className="text-[11px] text-slate-700">
                              • {item.rawMaterial?.name || 'مادة خام'}: <span className="font-mono font-semibold">{item.quantity} {item.rawMaterial?.unit || 'g'}</span> ({item.unitCost?.toFixed(2)} ج.م/{item.rawMaterial?.unit || 'g'})
                            </div>
                          ))}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-bold text-[#03204E]">
                        {Math.round(purchase.totalAmount || 0).toLocaleString()} ج.م
                      </td>

                      <td className="py-3 px-4 text-slate-600 text-[11px]">
                        {purchase.paymentAccount?.accountName || 'غير محدد / أجل'}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleDelete(purchase)}
                          title="حذف الفاتورة"
                          className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Purchase Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 rtl">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-2xl bg-white rounded-sm border border-slate-200 overlay-shadow z-10 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-[#F8FAFC] flex items-center justify-between shrink-0">
              <h2 className="text-sm font-semibold text-[#03204E] flex items-center gap-1.5">
                <Receipt size={16} />
                <span>تسجيل فاتورة شراء وتوريد مواد خام</span>
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">اسم المورد / الشركة *</label>
                  <input
                    type="text"
                    required
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    placeholder="مثال: شركة لوريس للزيوت العطرية"
                    className="w-full h-9 bg-white border border-slate-200 rounded-sm px-3 text-xs outline-none focus:border-[#03204E]"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">رقم الفاتورة *</label>
                  <input
                    type="text"
                    required
                    value={formData.invoiceNumber}
                    onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                    className="w-full h-9 bg-white border border-slate-200 rounded-sm px-3 text-xs font-mono outline-none focus:border-[#03204E]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">تاريخ الشراء *</label>
                  <input
                    type="date"
                    required
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                    className="w-full h-9 bg-white border border-slate-200 rounded-sm px-3 text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">الخزينة المسدد منها</label>
                  <select
                    value={formData.paymentAccount}
                    onChange={(e) => setFormData({ ...formData, paymentAccount: e.target.value })}
                    className="w-full h-9 bg-white border border-slate-200 rounded-sm px-2 text-xs outline-none"
                  >
                    <option value="">-- بدون سداد فوري / أجل --</option>
                    {cashAccounts.map(acc => (
                      <option key={acc._id} value={acc._id}>
                        {acc.accountName} (رصيد: {acc.currentBalance?.toLocaleString()} ج.م)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Purchase Items List */}
              <div className="border border-slate-200 rounded-sm p-3 bg-[#F8FAFC] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 text-xs">أصناف الفاتورة:</span>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="px-2 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-[#03204E] rounded-sm text-[11px] font-medium flex items-center gap-1 transition-colors"
                  >
                    <Plus size={12} />
                    <span>إضافة مادة خام</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white p-2.5 border border-slate-200 rounded-sm">
                      <div className="flex-1">
                        <label className="block text-[10px] text-slate-500 mb-0.5">المادة الخام:</label>
                        <select
                          value={item.rawMaterial}
                          onChange={(e) => handleItemChange(idx, 'rawMaterial', e.target.value)}
                          required
                          className="w-full h-8 bg-slate-50 border border-slate-200 rounded-sm px-2 text-xs outline-none"
                        >
                          <option value="">-- اختر المادة --</option>
                          {rawMaterials.map(m => (
                            <option key={m._id} value={m._id}>
                              {m.name} - حالي: {Number(m.currentStock ?? m.currentStockGrams ?? 0).toLocaleString()} {m.unit || 'g'}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-24">
                        <label className="block text-[10px] text-slate-500 mb-0.5">الكمية:</label>
                        <input
                          type="number"
                          step="any"
                          min="0.1"
                          required
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          placeholder="1000"
                          className="w-full h-8 bg-slate-50 border border-slate-200 rounded-sm px-2 text-xs font-mono outline-none text-center"
                        />
                      </div>

                      <div className="w-28">
                        <label className="block text-[10px] text-slate-500 mb-0.5">سعر الوحدة (ج.م):</label>
                        <input
                          type="number"
                          step="any"
                          min="0.01"
                          required
                          value={item.unitCost}
                          onChange={(e) => handleItemChange(idx, 'unitCost', e.target.value)}
                          placeholder="4.5"
                          className="w-full h-8 bg-slate-50 border border-slate-200 rounded-sm px-2 text-xs font-mono outline-none text-center"
                        />
                      </div>

                      <div className="w-28">
                        <label className="block text-[10px] text-slate-500 mb-0.5">الإجمالي (ج.م):</label>
                        <input
                          type="number"
                          step="any"
                          value={item.totalCost}
                          onChange={(e) => handleItemChange(idx, 'totalCost', e.target.value)}
                          placeholder="4500"
                          className="w-full h-8 bg-white font-bold text-slate-900 border border-slate-200 rounded-sm px-2 text-xs font-mono outline-none text-center"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(idx)}
                        disabled={formData.items.length <= 1}
                        className="p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-30 self-end mb-1"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Subtotal & Grand Total */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                  <div className="text-slate-600">
                    مجموع الأصناف: <strong className="font-mono text-slate-900">{itemsSubtotal.toLocaleString()} ج.م</strong>
                  </div>

                  <div className="font-mono text-sm font-bold text-[#03204E]">
                    إجمالي الفاتورة النهائي: {invoiceGrandTotal.toLocaleString()} ج.م
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">مصاريف الشحن / النقل (ج.م)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.shippingFee}
                    onChange={(e) => setFormData({ ...formData, shippingFee: e.target.value })}
                    className="w-full h-9 bg-white border border-slate-200 rounded-sm px-3 text-xs font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">ضرائب أو رسوم إضافية (ج.م)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.taxFee}
                    onChange={(e) => setFormData({ ...formData, taxFee: e.target.value })}
                    className="w-full h-9 bg-white border border-slate-200 rounded-sm px-3 text-xs font-mono outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">ملاحظات الفاتورة</label>
                <textarea
                  rows="2"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="ملاحظات حول طريقة السداد، الشحن، الفحص..."
                  className="w-full bg-white border border-slate-200 rounded-sm p-2 text-xs outline-none focus:border-[#03204E]"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-sm hover:bg-slate-50 text-slate-700 h-9"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#03204E] text-white rounded-sm hover:bg-[#02183b] h-9 font-medium disabled:opacity-50"
                >
                  {submitting ? 'جاري الحفظ وتحديث التكلفة...' : 'حفظ الفاتورة وإضافة المخزون'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
