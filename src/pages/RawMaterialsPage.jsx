import React, { useState, useEffect } from 'react';
import { 
  FlaskConical, Plus, Search, Filter, AlertTriangle, 
  ArrowUpDown, Edit2, Trash2, Check, RefreshCw, X, ShieldAlert, History, Package
} from 'lucide-react';
import { 
  getRawMaterials, createRawMaterial, updateRawMaterial, 
  deleteRawMaterial, adjustRawMaterialStock 
} from '../services/api';
import { showSuccess, showError, showConfirm, showToast } from '../utils/swal';

const CATEGORY_MAP = {
  fragrance_oil: { label: 'زيت عطري (Fragrance Oil)', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  alcohol: { label: 'كحول إيثيلي 96%', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
  bottle: { label: 'زجاجة عطر فارغة', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  sticker: { label: 'ستيكر / ليبل', bg: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  box: { label: 'علبة كرتون فاخرة', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  bag: { label: 'كيس هدايا براند', bg: 'bg-orange-50 text-orange-700 border-orange-200' },
  tester: { label: 'عبوة عينات / تيستر', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
  other: { label: 'مادة أخرى', bg: 'bg-slate-100 text-slate-700 border-slate-200' },
};

export default function RawMaterialsPage() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Add/Edit Form
  const [formData, setFormData] = useState({
    name: '',
    category: 'fragrance_oil',
    currentStock: '',
    costPerGram: '',
    unit: 'gram',
    supplier: '',
    lowStockThreshold: 100,
    notes: '',
  });

  // Adjust Form
  const [adjustData, setAdjustData] = useState({
    quantityChange: '',
    type: 'MANUAL_ADJUSTMENT',
    reason: '',
  });

  const [submitting, setSubmitting] = useState(false);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const data = await getRawMaterials({
        category: categoryFilter || undefined,
        search: searchQuery || undefined,
      });
      setMaterials(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching raw materials:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, [categoryFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchMaterials();
  };

  const handleOpenAdd = () => {
    setIsEditing(false);
    setSelectedMaterial(null);
    setFormData({
      name: '',
      category: 'fragrance_oil',
      currentStock: '',
      costPerGram: '',
      unit: 'gram',
      supplier: '',
      lowStockThreshold: 100,
      notes: '',
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (item) => {
    setIsEditing(true);
    setSelectedMaterial(item);
    setFormData({
      name: item.name || '',
      category: item.category || 'fragrance_oil',
      currentStock: item.currentStock ?? item.currentStockGrams ?? 0,
      costPerGram: item.costPerGram || 0,
      unit: item.unit || 'gram',
      supplier: item.supplier || '',
      lowStockThreshold: item.lowStockThreshold || 100,
      notes: item.notes || '',
    });
    setShowAddModal(true);
  };

  const handleOpenAdjust = (item) => {
    setSelectedMaterial(item);
    setAdjustData({
      quantityChange: '',
      type: 'MANUAL_ADJUSTMENT',
      reason: '',
    });
    setShowAdjustModal(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showError('بيانات ناقصة', 'يرجى إدخال اسم المادة الخام');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        category: formData.category,
        currentStock: Number(formData.currentStock) || 0,
        costPerGram: Number(formData.costPerGram) || 0,
        unit: formData.unit || 'gram',
        lowStockThreshold: Number(formData.lowStockThreshold) || 100,
        supplier: formData.supplier.trim(),
        notes: formData.notes.trim(),
      };

      if (isEditing && selectedMaterial) {
        await updateRawMaterial(selectedMaterial._id, payload);
        showSuccess('تم التحديث بنجاح', 'تم تحديث بيانات المادة الخام بنجاح');
      } else {
        await createRawMaterial(payload);
        showSuccess('تمت الإضافة بنجاح', 'تم تسجيل المادة الخام الجديدة بنجاح');
      }

      setShowAddModal(false);
      fetchMaterials();
    } catch (err) {
      showError('خطأ', err.response?.data?.message || 'حدث خطأ أثناء حفظ المادة الخام');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitAdjust = async (e) => {
    e.preventDefault();
    if (!selectedMaterial) return;
    setSubmitting(true);
    try {
      await adjustRawMaterialStock(selectedMaterial._id, {
        quantityChange: Number(adjustData.quantityChange),
        type: adjustData.type,
        reason: adjustData.reason,
      });
      showSuccess('تمت التسوية بنجاح', 'تم تعديل كمية المخزون وتسجيل الحركة بنجاح');
      setShowAdjustModal(false);
      fetchMaterials();
    } catch (err) {
      showError('خطأ', err.response?.data?.message || 'حدث خطأ أثناء تعديل المخزون');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item) => {
    const confirmed = await showConfirm('تأكيد الحذف', `هل أنت متأكد من حذف المادة الخام "${item.name}"؟`, 'نعم، احذف', 'إلغاء');
    if (!confirmed) return;
    try {
      await deleteRawMaterial(item._id);
      showToast('تم حذف المادة بنجاح');
      fetchMaterials();
    } catch (err) {
      showError('تعذر الحذف', err.response?.data?.message || 'تعذر حذف المادة');
    }
  };

  // KPIs with safe fallbacks
  const totalItemsCount = materials.length;
  const lowStockCount = materials.filter(m => {
    const stock = Number(m.currentStock ?? m.currentStockGrams ?? 0);
    const threshold = Number(m.lowStockThreshold || 0);
    return stock <= threshold;
  }).length;

  const totalInventoryGrams = materials
    .filter(m => (m.unit || 'gram').toLowerCase().includes('g') || (m.unit || '').toLowerCase().includes('جرام'))
    .reduce((sum, m) => sum + Number(m.currentStock ?? m.currentStockGrams ?? 0), 0);

  const totalValuation = materials.reduce((sum, m) => {
    const stock = Number(m.currentStock ?? m.currentStockGrams ?? 0);
    const cost = Number(m.costPerGram || 0);
    return sum + (stock * cost);
  }, 0);

  return (
    <div className="space-y-6 text-right font-['Tajawal',sans-serif]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#03204E] to-[#083375] text-white flex items-center justify-center shadow-md shadow-[#03204E]/10">
              <FlaskConical size={20} strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-[#03204E] tracking-tight">
                المواد الخام والزيوت العطرية ومواد التعبئة
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                إدارة المخزون، متابعة متوسط التكلفة المرجح (WAC)، وتنبيهات النواقص.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-xl bg-[#03204E] hover:bg-[#02183b] text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-sm hover:shadow active:scale-95"
          >
            <Plus size={16} />
            <span>إضافة مادة خام جديدة</span>
          </button>

          <button
            onClick={fetchMaterials}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-xs"
            title="تحديث"
          >
            <RefreshCw size={14} strokeWidth={1.7} className={loading ? 'animate-spin text-[#03204E]' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold block">إجمالي المواد المسجلة</span>
          <h3 className="text-2xl font-black text-slate-900 mt-1">{totalItemsCount} <span className="text-xs font-medium text-slate-400">مادة</span></h3>
        </div>

        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold block">إجمالي وزن الزيوت والكحول</span>
          <h3 className="text-2xl font-black text-[#03204E] mt-1">{(totalInventoryGrams / 1000).toFixed(2)} <span className="text-xs font-medium text-slate-400">كجم ({totalInventoryGrams.toLocaleString()} g)</span></h3>
        </div>

        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold block">إجمالي قيمة مخزون الخام</span>
          <h3 className="text-2xl font-black text-emerald-700 mt-1">{Math.round(totalValuation).toLocaleString()} <span className="text-xs font-medium text-slate-400">ج.م</span></h3>
        </div>

        <div className={`rounded-2xl p-4 border shadow-xs transition-all ${lowStockCount > 0 ? 'bg-amber-50/90 border-amber-200 text-amber-900' : 'bg-white/90 border-slate-200/80'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold block">نواقص دون الحد الأدنى</span>
            {lowStockCount > 0 && <AlertTriangle size={18} className="text-amber-600 animate-pulse" />}
          </div>
          <h3 className="text-2xl font-black mt-1 text-amber-700">{lowStockCount} <span className="text-xs font-medium opacity-80">مواد</span></h3>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-3.5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-80">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="بحث باسم المادة الخام..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pr-9 pl-3 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs outline-none focus:border-[#03204E] focus:bg-white transition-all"
            />
            <Search size={15} className="absolute right-3 top-3 text-slate-400" />
          </div>
          <button
            type="submit"
            className="px-4 h-10 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
          >
            بحث
          </button>
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <span className="text-xs text-slate-500 font-semibold flex items-center gap-1 shrink-0">
            <Filter size={13} />
            التصنيف:
          </span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-10 bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 text-xs font-medium outline-none text-slate-700 cursor-pointer"
          >
            <option value="">كل التصنيفات ({materials.length})</option>
            {Object.entries(CATEGORY_MAP).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Materials Table */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#F8FAFC] text-slate-700 font-bold border-b border-slate-200/80">
              <tr>
                <th className="py-3.5 px-4">اسم المادة الخام</th>
                <th className="py-3.5 px-4">التصنيف</th>
                <th className="py-3.5 px-4 text-center">المخزون الحالي</th>
                <th className="py-3.5 px-4 text-center">تكلفة الوحدة (WAC)</th>
                <th className="py-3.5 px-4 text-center">إجمالي القيمة</th>
                <th className="py-3.5 px-4">المورد الافتراضي</th>
                <th className="py-3.5 px-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={16} className="animate-spin text-[#03204E]" />
                      <span>جاري تحميل المواد الخام...</span>
                    </div>
                  </td>
                </tr>
              ) : materials.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    لا توجد مواد خام مضافة بعد. اضغط "إضافة مادة خام جديدة" للبدء.
                  </td>
                </tr>
              ) : (
                materials.map((item) => {
                  const stock = Number(item.currentStock ?? item.currentStockGrams ?? 0);
                  const threshold = Number(item.lowStockThreshold || 0);
                  const isLow = stock <= threshold;
                  const catInfo = CATEGORY_MAP[item.category] || CATEGORY_MAP.other;
                  const unitCost = Number(item.costPerGram || 0);
                  const itemTotalVal = stock * unitCost;
                  const displayUnit = item.unit || 'gram';

                  return (
                    <tr key={item._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-900">{item.name}</div>
                        {item.notes && <div className="text-[10px] text-slate-400 mt-0.5">{item.notes}</div>}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${catInfo.bg}`}>
                          {catInfo.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 font-mono">
                          <span className={`text-sm font-black ${isLow ? 'text-amber-600' : 'text-slate-900'}`}>
                            {stock.toLocaleString()} {displayUnit}
                          </span>
                          {isLow && (
                            <span title={`دون الحد الأدنى (${threshold} ${displayUnit})`} className="inline-block p-1 bg-amber-100 text-amber-700 rounded-md">
                              <AlertTriangle size={12} />
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-800">
                        {unitCost ? `${unitCost.toFixed(3)} ج.م / ${displayUnit}` : '0.000 ج.م'}
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono font-black text-emerald-700">
                        {Math.round(itemTotalVal).toLocaleString()} ج.م
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {item.supplier || '—'}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenAdjust(item)}
                            title="تسوية مخزون (جرد / هالك / زيادة)"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all active:scale-95"
                          >
                            <ArrowUpDown size={14} />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(item)}
                            title="تعديل المادة"
                            className="p-1.5 rounded-lg bg-blue-50 hover:bg-[#03204E] hover:text-white text-[#03204E] transition-all active:scale-95"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            title="حذف"
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 transition-all active:scale-95"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 rtl bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white/95 backdrop-blur-xl rounded-3xl border border-slate-200 shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200/80 bg-gradient-to-r from-[#03204E] to-[#0A3978] text-white flex items-center justify-between rounded-t-3xl">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <FlaskConical size={18} />
                <span>{isEditing ? `تعديل المادة: ${selectedMaterial?.name}` : 'إضافة مادة خام جديدة للمخزون'}</span>
              </h2>
              <button onClick={() => setShowAddModal(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">اسم المادة الخام *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="مثال: زيت فانيليا مدغشقر"
                    className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3.5 text-xs outline-none focus:border-[#03204E]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">التصنيف *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-xs font-semibold outline-none focus:border-[#03204E]"
                  >
                    {Object.entries(CATEGORY_MAP).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">وحدة القياس</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-xs outline-none font-semibold"
                  >
                    <option value="gram">جرام (gram) - للزيوت والعطور والكحول</option>
                    <option value="ml">مليلتر (ml)</option>
                    <option value="pcs">قطعة (pcs) - للزجاجات والعلب والاستيكرات</option>
                    <option value="kg">كيلوجرام (kg)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isEditing ? 'المخزون الحالي' : 'الرصيد الافتتاحي'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={formData.currentStock}
                    onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                    placeholder="1000"
                    className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-xs outline-none font-mono font-bold focus:border-[#03204E]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    تكلفة الوحدة (ج.م)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={formData.costPerGram}
                    onChange={(e) => setFormData({ ...formData, costPerGram: e.target.value })}
                    placeholder="مثال: 4.5"
                    className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-xs outline-none font-mono font-bold focus:border-[#03204E]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">حد تنبيه النواقص</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={formData.lowStockThreshold}
                    onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })}
                    placeholder="100"
                    className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-xs outline-none font-mono font-bold focus:border-[#03204E]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">المورد الافتراضي</label>
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  placeholder="مثال: شركة الأندلس للزيوت العطرية"
                  className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-xs outline-none focus:border-[#03204E]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ملاحظات إضافية</label>
                <textarea
                  rows="2"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="درجة النقاء، تاريخ الانتهاء، مكان التخزين..."
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs outline-none focus:border-[#03204E]"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 font-semibold h-10"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-[#03204E] text-white rounded-xl hover:bg-[#02183b] h-10 font-bold disabled:opacity-50 shadow-sm"
                >
                  {submitting ? 'جاري الحفظ...' : isEditing ? 'تحديث المادة' : 'إضافة المادة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {showAdjustModal && selectedMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 rtl bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-sm bg-white/95 backdrop-blur-xl rounded-3xl border border-slate-200 shadow-2xl z-10">
            <div className="px-5 py-3.5 border-b border-slate-200/80 bg-[#F8FAFC] flex items-center justify-between rounded-t-3xl">
              <h2 className="text-sm font-bold text-[#03204E]">
                تسوية مخزون: {selectedMaterial.name}
              </h2>
              <button onClick={() => setShowAdjustModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitAdjust} className="p-5 space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <span className="text-slate-500 font-medium block">المخزون الحالي المسجل:</span>
                <span className="text-base font-black text-slate-900 font-mono">
                  {(selectedMaterial.currentStock ?? selectedMaterial.currentStockGrams ?? 0).toLocaleString()} {selectedMaterial.unit || 'gram'}
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  كمية التعديل ({selectedMaterial.unit || 'gram'}) * (سالب للنقص، موجب للزيادة)
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={adjustData.quantityChange}
                  onChange={(e) => setAdjustData({ ...adjustData, quantityChange: e.target.value })}
                  placeholder="مثال: -50 أو +100"
                  className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-xs font-mono font-bold outline-none focus:border-[#03204E]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">نوع التسوية</label>
                <select
                  value={adjustData.type}
                  onChange={(e) => setAdjustData({ ...adjustData, type: e.target.value })}
                  className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-xs font-semibold outline-none"
                >
                  <option value="MANUAL_ADJUSTMENT">تسوية جرد دوري (Correction)</option>
                  <option value="WASTE">هالك إنتاج أو انسكاب (Waste)</option>
                  <option value="DAMAGED">تلف أثناء التخزين (Damaged)</option>
                  <option value="RETURN">مرتجع أو استرجاع (Return)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">بيان السبب / ملاحظة *</label>
                <textarea
                  rows="2"
                  required
                  value={adjustData.reason}
                  onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
                  placeholder="مثال: تسوية جرد ربع سنوي، كسر عبوة..."
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:border-[#03204E]"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 font-semibold h-10"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#03204E] text-white rounded-xl hover:bg-[#02183b] h-10 font-bold disabled:opacity-50 shadow-sm"
                >
                  {submitting ? 'جاري التأكيد...' : 'تأكيد التسوية'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
