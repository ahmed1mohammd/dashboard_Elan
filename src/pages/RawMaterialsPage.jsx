import React, { useState, useEffect } from 'react';
import { 
  FlaskConical, Plus, Search, Filter, AlertTriangle, 
  ArrowUpDown, Edit2, Trash2, Check, RefreshCw, X, ShieldAlert, Package, Layers
} from 'lucide-react';
import { 
  getRawMaterials, createRawMaterial, updateRawMaterial, 
  deleteRawMaterial, adjustRawMaterialStock 
} from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { showSuccess, showError, showConfirm, showToast } from '../utils/swal';

const CATEGORIES = [
  { value: 'fragrance_oil', labelEn: 'Fragrance Oil', labelAr: 'زيت عطري', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { value: 'alcohol', labelEn: 'Alcohol 96%', labelAr: 'كحول إيثيلي 96%', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'bottle', labelEn: 'Glass Bottle', labelAr: 'زجاجة عطر فارغة', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'sprayer', labelEn: 'Sprayer / Pump', labelAr: 'بامب / رشاش', badge: 'bg-teal-50 text-teal-700 border-teal-200' },
  { value: 'cap', labelEn: 'Bottle Cap', labelAr: 'غطاء زجاجة', badge: 'bg-slate-100 text-slate-700 border-slate-300' },
  { value: 'sticker', labelEn: 'Sticker / Label', labelAr: 'ستيكر / ليبل', badge: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { value: 'box', labelEn: 'Packaging Box', labelAr: 'علبة كرتون فاخرة', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'bag', labelEn: 'Brand Bag', labelAr: 'كيس براند', badge: 'bg-orange-50 text-orange-700 border-orange-200' },
  { value: 'packaging', labelEn: 'Packaging Supplies', labelAr: 'مستلزمات تغليف وشحن', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'tester', labelEn: 'Sample / Tester', labelAr: 'عبوة عينات / تيستر', badge: 'bg-pink-50 text-pink-700 border-pink-200' },
  { value: 'other', labelEn: 'Other Material', labelAr: 'مادة أخرى', badge: 'bg-gray-100 text-gray-700 border-gray-200' },
];

export default function RawMaterialsPage() {
  const { lang, isRTL, t, formatCurrency } = useLanguage();
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
      showError(
        lang === 'ar' ? 'بيانات ناقصة' : 'Missing Information',
        lang === 'ar' ? 'يرجى إدخال اسم المادة الخام' : 'Please enter the raw material name'
      );
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
        showSuccess(
          lang === 'ar' ? 'تم التحديث بنجاح' : 'Updated Successfully',
          lang === 'ar' ? 'تم تحديث بيانات المادة الخام بنجاح' : 'Raw material details updated'
        );
      } else {
        await createRawMaterial(payload);
        showSuccess(
          lang === 'ar' ? 'تمت الإضافة بنجاح' : 'Created Successfully',
          lang === 'ar' ? 'تم تسجيل المادة الخام الجديدة بنجاح' : 'New raw material added to inventory'
        );
      }

      setShowAddModal(false);
      fetchMaterials();
    } catch (err) {
      showError(
        lang === 'ar' ? 'خطأ' : 'Error',
        err.response?.data?.message || (lang === 'ar' ? 'حدث خطأ أثناء حفظ المادة الخام' : 'Failed to save raw material')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitAdjust = async (e) => {
    e.preventDefault();
    if (!selectedMaterial) return;
    const qty = Number(adjustData.quantityChange);
    if (isNaN(qty) || qty === 0) {
      showError(
        lang === 'ar' ? 'خطأ في الكمية' : 'Invalid Quantity',
        lang === 'ar' ? 'يرجى إدخال كمية تعديل غير صفرية' : 'Please enter a non-zero adjustment quantity'
      );
      return;
    }

    setSubmitting(true);
    try {
      await adjustRawMaterialStock(selectedMaterial._id, {
        quantityChange: qty,
        type: adjustData.type,
        reason: adjustData.reason,
      });
      showSuccess(
        lang === 'ar' ? 'تمت التسوية بنجاح' : 'Adjustment Saved',
        lang === 'ar' ? 'تم تعديل كمية المخزون وتسجيل الحركة بنجاح' : 'Stock level adjusted and audit log created'
      );
      setShowAdjustModal(false);
      fetchMaterials();
    } catch (err) {
      showError(
        lang === 'ar' ? 'خطأ' : 'Error',
        err.response?.data?.message || (lang === 'ar' ? 'حدث خطأ أثناء تعديل المخزون' : 'Failed to adjust stock')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item) => {
    const title = lang === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete';
    const msg = lang === 'ar' 
      ? `هل أنت متأكد من حذف المادة الخام "${item.name}"؟` 
      : `Are you sure you want to delete "${item.name}"?`;
    const confirmBtn = lang === 'ar' ? 'نعم، احذف' : 'Yes, Delete';
    const cancelBtn = lang === 'ar' ? 'إلغاء' : 'Cancel';

    const confirmed = await showConfirm(title, msg, confirmBtn, cancelBtn);
    if (!confirmed) return;

    try {
      await deleteRawMaterial(item._id);
      showToast(lang === 'ar' ? 'تم حذف المادة بنجاح' : 'Raw material deleted');
      fetchMaterials();
    } catch (err) {
      showError(
        lang === 'ar' ? 'تعذر الحذف' : 'Delete Failed',
        err.response?.data?.message || (lang === 'ar' ? 'تعذر حذف المادة' : 'Could not delete item')
      );
    }
  };

  // KPIs
  const totalItemsCount = materials.length;
  const lowStockCount = materials.filter(m => {
    const stock = Number(m.currentStock ?? m.currentStockGrams ?? 0);
    const threshold = Number(m.lowStockThreshold || 0);
    return stock <= threshold;
  }).length;

  const totalInventoryGrams = materials
    .filter(m => {
      const u = (m.unit || '').toLowerCase();
      const cat = m.category;
      return u.includes('g') || u.includes('جرام') || cat === 'fragrance_oil' || cat === 'alcohol';
    })
    .reduce((sum, m) => sum + Number(m.currentStock ?? m.currentStockGrams ?? 0), 0);

  const totalValuation = materials.reduce((sum, m) => {
    const stock = Number(m.currentStock ?? m.currentStockGrams ?? 0);
    const cost = Number(m.costPerGram || 0);
    return sum + (stock * cost);
  }, 0);

  const getCategoryInfo = (catValue) => {
    return CATEGORIES.find(c => c.value === catValue) || {
      value: catValue,
      labelEn: catValue,
      labelAr: catValue,
      badge: 'bg-slate-100 text-slate-700 border-slate-200'
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-sm bg-[#174F43] text-white flex items-center justify-center shrink-0">
            <FlaskConical size={20} strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {lang === 'ar' ? 'مخزون المواد الخام' : 'Raw Materials Inventory'}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {lang === 'ar' 
                ? 'متابعة كميات الزيوت والكحول والزجاجات ومواد التعبئة ومتوسط التكلفة المرجح (WAC).'
                : 'Track raw fragrance oils, alcohol, packaging, unit costs (WAC), and reorder alerts.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-sm bg-[#174F43] hover:bg-[#0F3830] text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-xs"
          >
            <Plus size={15} />
            <span>{lang === 'ar' ? 'إضافة مادة خام' : 'Add Raw Material'}</span>
          </button>

          <button
            onClick={fetchMaterials}
            className="p-2 rounded-sm border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-xs"
            title={lang === 'ar' ? 'تحديث' : 'Refresh'}
          >
            <RefreshCw size={15} strokeWidth={1.5} className={loading ? 'animate-spin text-[#174F43]' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-sm p-4 border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">
            {lang === 'ar' ? 'إجمالي المواد المسجلة' : 'Total Registered Materials'}
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-2xl font-bold text-slate-900 font-mono">{totalItemsCount}</h3>
            <span className="text-xs text-slate-400">{lang === 'ar' ? 'مادة' : 'items'}</span>
          </div>
        </div>

        <div className="bg-white rounded-sm p-4 border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">
            {lang === 'ar' ? 'إجمالي وزن الزيوت والكحول' : 'Bulk Oils & Alcohol Stock'}
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-2xl font-bold text-[#174F43] font-mono">
              {(totalInventoryGrams / 1000).toFixed(2)}
            </h3>
            <span className="text-xs text-slate-400">
              {lang === 'ar' ? `كجم (${totalInventoryGrams.toLocaleString()} جم)` : `kg (${totalInventoryGrams.toLocaleString()} g)`}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-sm p-4 border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">
            {lang === 'ar' ? 'إجمالي قيمة مخزون الخام' : 'Total Inventory Valuation'}
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-2xl font-bold text-emerald-700 font-mono">
              {formatCurrency(Math.round(totalValuation))}
            </h3>
          </div>
        </div>

        <div className={`rounded-sm p-4 border shadow-xs transition-colors ${
          lowStockCount > 0 ? 'bg-amber-50/70 border-amber-200' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium block ${lowStockCount > 0 ? 'text-amber-800' : 'text-slate-500'}`}>
              {lang === 'ar' ? 'مواد قاربت على النفاد' : 'Low Stock Reorder Alerts'}
            </span>
            {lowStockCount > 0 && <AlertTriangle size={16} className="text-amber-600" />}
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className={`text-2xl font-bold font-mono ${lowStockCount > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
              {lowStockCount}
            </h3>
            <span className="text-xs text-slate-400">{lang === 'ar' ? 'مواد' : 'items'}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-sm p-3 border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-80">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder={lang === 'ar' ? 'بحث باسم المادة الخام...' : 'Search raw material by name...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pr-9 pl-3 bg-slate-50 border border-slate-200 rounded-sm text-xs outline-none focus:border-[#174F43] focus:bg-white transition-colors"
            />
            <Search size={14} className={`absolute top-2.5 text-slate-400 ${isRTL ? 'right-3' : 'left-auto right-3'}`} />
          </div>
          <button
            type="submit"
            className="px-3.5 h-9 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-sm transition-colors"
          >
            {lang === 'ar' ? 'بحث' : 'Search'}
          </button>
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs text-slate-500 font-medium flex items-center gap-1 shrink-0">
            <Filter size={13} />
            {lang === 'ar' ? 'التصنيف:' : 'Category:'}
          </span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 bg-slate-50 border border-slate-200 rounded-sm px-3 text-xs font-medium outline-none text-slate-700 cursor-pointer"
          >
            <option value="">{lang === 'ar' ? `كل التصنيفات (${materials.length})` : `All Categories (${materials.length})`}</option>
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>
                {lang === 'ar' ? c.labelAr : c.labelEn}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Materials Table */}
      <div className="bg-white rounded-sm border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className={`py-3 px-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {lang === 'ar' ? 'اسم المادة الخام' : 'Material Name'}
                </th>
                <th className={`py-3 px-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {lang === 'ar' ? 'التصنيف' : 'Category'}
                </th>
                <th className="py-3 px-4 text-center">
                  {lang === 'ar' ? 'المخزون الحالي' : 'Available Stock'}
                </th>
                <th className="py-3 px-4 text-center">
                  {lang === 'ar' ? 'تكلفة الوحدة (WAC)' : 'Unit Cost (WAC)'}
                </th>
                <th className="py-3 px-4 text-center">
                  {lang === 'ar' ? 'إجمالي القيمة' : 'Total Value'}
                </th>
                <th className={`py-3 px-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {lang === 'ar' ? 'المورد' : 'Supplier'}
                </th>
                <th className="py-3 px-4 text-center">
                  {lang === 'ar' ? 'الإجراءات' : 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-normal">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={15} className="animate-spin text-[#174F43]" />
                      <span>{lang === 'ar' ? 'جاري تحميل المواد الخام...' : 'Loading raw materials...'}</span>
                    </div>
                  </td>
                </tr>
              ) : materials.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    {lang === 'ar' 
                      ? 'لا توجد مواد خام مطابقة. انقر على "إضافة مادة خام" للبدء.' 
                      : 'No raw materials found. Click "Add Raw Material" to get started.'}
                  </td>
                </tr>
              ) : (
                materials.map((item) => {
                  const stock = Number(item.currentStock ?? item.currentStockGrams ?? 0);
                  const threshold = Number(item.lowStockThreshold || 0);
                  const isLow = stock <= threshold;
                  const cat = getCategoryInfo(item.category);
                  const unitCost = Number(item.costPerGram || 0);
                  const itemTotalVal = stock * unitCost;
                  const displayUnit = item.unit || 'gram';

                  return (
                    <tr key={item._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{item.name}</div>
                        {item.notes && <div className="text-[10px] text-slate-400 mt-0.5">{item.notes}</div>}
                      </td>

                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-sm border text-[10px] font-semibold ${cat.badge}`}>
                          {lang === 'ar' ? cat.labelAr : cat.labelEn}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 font-mono">
                          <span className={`text-sm font-bold ${isLow ? 'text-amber-600' : 'text-slate-900'}`}>
                            {stock.toLocaleString()} {displayUnit}
                          </span>
                          {isLow && (
                            <span 
                              title={lang === 'ar' ? `دون الحد الأدنى (${threshold} ${displayUnit})` : `Below threshold (${threshold} ${displayUnit})`} 
                              className="inline-block p-0.5 bg-amber-100 text-amber-700 rounded-sm"
                            >
                              <AlertTriangle size={12} />
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-medium text-slate-800">
                        {unitCost ? `${unitCost.toFixed(2)} EGP / ${displayUnit}` : '0.00 EGP'}
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-bold text-emerald-700">
                        {formatCurrency(Math.round(itemTotalVal))}
                      </td>

                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {item.supplier || '—'}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenAdjust(item)}
                            title={lang === 'ar' ? 'تسوية مخزون (جرد / هالك / زيادة)' : 'Adjust stock (audit / waste)'}
                            className="p-1.5 rounded-sm bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                          >
                            <ArrowUpDown size={13} />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(item)}
                            title={lang === 'ar' ? 'تعديل المادة' : 'Edit item'}
                            className="p-1.5 rounded-sm bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            title={lang === 'ar' ? 'حذف' : 'Delete'}
                            className="p-1.5 rounded-sm bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                          >
                            <Trash2 size={13} />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-sm border border-slate-200 shadow-xl z-10 max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-[#174F43] text-white flex items-center justify-between">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <FlaskConical size={16} />
                <span>
                  {isEditing 
                    ? (lang === 'ar' ? `تعديل المادة: ${selectedMaterial?.name}` : `Edit Material: ${selectedMaterial?.name}`)
                    : (lang === 'ar' ? 'إضافة مادة خام جديدة للمخزون' : 'Add New Raw Material to Inventory')}
                </span>
              </h2>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-white/80 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {lang === 'ar' ? 'اسم المادة الخام *' : 'Material Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={lang === 'ar' ? 'مثال: زيت فانيليا مدغشقر' : 'e.g. French Vanilla Oil'}
                    className="w-full h-9 bg-white border border-slate-200 rounded-sm px-3 text-xs outline-none focus:border-[#174F43]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {lang === 'ar' ? 'التصنيف *' : 'Category *'}
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full h-9 bg-white border border-slate-200 rounded-sm px-2 text-xs font-medium outline-none focus:border-[#174F43]"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>
                        {lang === 'ar' ? c.labelAr : c.labelEn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {lang === 'ar' ? 'وحدة القياس' : 'Unit of Measure'}
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full h-9 bg-white border border-slate-200 rounded-sm px-2 text-xs outline-none"
                  >
                    <option value="gram">{lang === 'ar' ? 'جرام (gram)' : 'Gram (g)'}</option>
                    <option value="ml">{lang === 'ar' ? 'مليلتر (ml)' : 'Milliliter (ml)'}</option>
                    <option value="pcs">{lang === 'ar' ? 'قطعة (pcs)' : 'Piece (pcs)'}</option>
                    <option value="kg">{lang === 'ar' ? 'كيلوجرام (kg)' : 'Kilogram (kg)'}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {isEditing ? (lang === 'ar' ? 'المخزون الحالي' : 'Current Stock') : (lang === 'ar' ? 'الرصيد الافتتاحي' : 'Initial Stock')}
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={formData.currentStock}
                    onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                    placeholder="1000"
                    className="w-full h-9 bg-white border border-slate-200 rounded-sm px-3 text-xs outline-none font-mono focus:border-[#174F43]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {lang === 'ar' ? 'تكلفة الوحدة (ج.م)' : 'Unit Cost (EGP)'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={formData.costPerGram}
                    onChange={(e) => setFormData({ ...formData, costPerGram: e.target.value })}
                    placeholder="4.50"
                    className="w-full h-9 bg-white border border-slate-200 rounded-sm px-3 text-xs outline-none font-mono focus:border-[#174F43]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {lang === 'ar' ? 'حد تنبيه النواقص' : 'Low Stock Alert Threshold'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={formData.lowStockThreshold}
                    onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })}
                    placeholder="100"
                    className="w-full h-9 bg-white border border-slate-200 rounded-sm px-3 text-xs outline-none font-mono focus:border-[#174F43]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {lang === 'ar' ? 'المورد الافتراضي' : 'Default Supplier'}
                </label>
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  placeholder={lang === 'ar' ? 'مثال: شركة الأندلس للزيوت العطرية' : 'e.g. Al-Andalus Fragrance Oils'}
                  className="w-full h-9 bg-white border border-slate-200 rounded-sm px-3 text-xs outline-none focus:border-[#174F43]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {lang === 'ar' ? 'ملاحظات' : 'Notes'}
                </label>
                <textarea
                  rows="2"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder={lang === 'ar' ? 'درجة النقاء، تاريخ الانتهاء، مكان التخزين...' : 'Purity, storage location, expiry...'}
                  className="w-full bg-white border border-slate-200 rounded-sm p-2 text-xs outline-none focus:border-[#174F43]"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-sm hover:bg-slate-50 text-slate-700 font-medium"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#174F43] text-white rounded-sm hover:bg-[#0F3830] font-semibold disabled:opacity-50"
                >
                  {submitting 
                    ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') 
                    : isEditing 
                      ? (lang === 'ar' ? 'تحديث المادة' : 'Update Material') 
                      : (lang === 'ar' ? 'إضافة المادة' : 'Save Material')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {showAdjustModal && selectedMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="relative w-full max-w-sm bg-white rounded-sm border border-slate-200 shadow-xl z-10">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">
                {lang === 'ar' ? `تسوية مخزون: ${selectedMaterial.name}` : `Stock Adjustment: ${selectedMaterial.name}`}
              </h2>
              <button onClick={() => setShowAdjustModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitAdjust} className="p-5 space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-sm">
                <span className="text-slate-500 font-medium block">
                  {lang === 'ar' ? 'المخزون الحالي المسجل:' : 'Current Recorded Stock:'}
                </span>
                <span className="text-base font-bold text-slate-900 font-mono">
                  {(selectedMaterial.currentStock ?? selectedMaterial.currentStockGrams ?? 0).toLocaleString()} {selectedMaterial.unit || 'gram'}
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {lang === 'ar' 
                    ? `كمية التعديل (${selectedMaterial.unit || 'gram'}) * (سالب للنقص، موجب للزيادة)` 
                    : `Adjustment Quantity (${selectedMaterial.unit || 'gram'}) * (+ or -)`}
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={adjustData.quantityChange}
                  onChange={(e) => setAdjustData({ ...adjustData, quantityChange: e.target.value })}
                  placeholder="-50 or +100"
                  className="w-full h-9 bg-white border border-slate-200 rounded-sm px-3 text-xs font-mono font-bold outline-none focus:border-[#174F43]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {lang === 'ar' ? 'نوع التسوية' : 'Adjustment Type'}
                </label>
                <select
                  value={adjustData.type}
                  onChange={(e) => setAdjustData({ ...adjustData, type: e.target.value })}
                  className="w-full h-9 bg-white border border-slate-200 rounded-sm px-2 text-xs font-medium outline-none"
                >
                  <option value="MANUAL_ADJUSTMENT">
                    {lang === 'ar' ? 'تسوية جرد دوري (Correction)' : 'Inventory Audit / Correction'}
                  </option>
                  <option value="WASTE">
                    {lang === 'ar' ? 'هالك إنتاج أو انسكاب (Waste)' : 'Production Waste / Spillage'}
                  </option>
                  <option value="DAMAGED">
                    {lang === 'ar' ? 'تلف أثناء التخزين (Damaged)' : 'Damaged in Storage'}
                  </option>
                  <option value="RETURN">
                    {lang === 'ar' ? 'مرتجع أو استرجاع (Return)' : 'Customer or Supplier Return'}
                  </option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {lang === 'ar' ? 'بيان السبب / ملاحظة *' : 'Reason / Audit Note *'}
                </label>
                <textarea
                  rows="2"
                  required
                  value={adjustData.reason}
                  onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
                  placeholder={lang === 'ar' ? 'مثال: تسوية جرد ربع سنوي...' : 'e.g. Quarterly physical recount...'}
                  className="w-full bg-white border border-slate-200 rounded-sm p-2 text-xs outline-none focus:border-[#174F43]"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-sm hover:bg-slate-50 text-slate-700 font-medium"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#174F43] text-white rounded-sm hover:bg-[#0F3830] font-semibold disabled:opacity-50"
                >
                  {submitting 
                    ? (lang === 'ar' ? 'جاري التأكيد...' : 'Confirming...') 
                    : (lang === 'ar' ? 'تأكيد التسوية' : 'Confirm Adjustment')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
