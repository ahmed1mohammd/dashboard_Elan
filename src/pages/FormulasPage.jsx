import React, { useState, useEffect } from 'react';
import { 
  Layers, Plus, Trash2, Edit2, Check, AlertCircle, 
  RefreshCw, X, GitBranch, ArrowRight, Calculator, CheckCircle2, Scale, Sparkles
} from 'lucide-react';
import { 
  getFormulas, createFormula, updateFormula, 
  createFormulaVersion, deleteFormula, getRawMaterials, getProducts 
} from '../services/api';
import { showSuccess, showError, showConfirm, showWarning, showToast } from '../utils/swal';

export default function FormulasPage() {
  const [formulas, setFormulas] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals & form state
  const [showModal, setShowModal] = useState(false);
  const [isVersionMode, setIsVersionMode] = useState(false);
  const [selectedFormula, setSelectedFormula] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Sample Base Size in Grams (Default 100g for easy 1g = 1% formulation)
  const [sampleBaseGrams, setSampleBaseGrams] = useState(100);

  // Formula Form Data
  const [formData, setFormData] = useState({
    name: '',
    productId: '',
    code: '',
    description: '',
    defaultConcentration: 25,
    ingredients: [{ rawMaterial: '', grams: 100, percentage: 100, notes: '' }],
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [fData, mData, pData] = await Promise.all([
        getFormulas().catch(() => []),
        getRawMaterials({ category: 'fragrance_oil' }).catch(() => []),
        getProducts().catch(() => []),
      ]);
      setFormulas(Array.isArray(fData) ? fData : []);
      setRawMaterials(Array.isArray(mData) ? mData : []);
      setProducts(Array.isArray(pData) ? pData : []);
    } catch (err) {
      console.error('Error fetching formulas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Calculate current sum of percentages
  const currentTotalPercentage = formData.ingredients.reduce(
    (sum, ing) => sum + (Number(ing.percentage) || 0), 0
  );
  
  // Calculate current sum of grams
  const currentTotalGrams = formData.ingredients.reduce(
    (sum, ing) => sum + (Number(ing.grams) || 0), 0
  );

  const isSumValid = Math.abs(currentTotalPercentage - 100) < 0.05;

  // Calculate estimated cost per gram of oil blend
  const estimatedOilCostPerGram = formData.ingredients.reduce((sum, ing) => {
    const mat = rawMaterials.find(m => m._id === ing.rawMaterial);
    const cost = Number(mat?.costPerGram) || 0;
    const pct = (Number(ing.percentage) || 0) / 100;
    return sum + (cost * pct);
  }, 0);

  const handleOpenAdd = () => {
    setIsVersionMode(false);
    setSelectedFormula(null);
    setSampleBaseGrams(100);
    setFormData({
      name: '',
      productId: '',
      code: '',
      description: '',
      defaultConcentration: 25,
      ingredients: [{ rawMaterial: '', grams: 100, percentage: 100, notes: '' }],
    });
    setShowModal(true);
  };

  const handleOpenNewVersion = (formula) => {
    setIsVersionMode(true);
    setSelectedFormula(formula);
    setSampleBaseGrams(100);
    setFormData({
      name: formula.name,
      productId: formula.fragrance?._id || formula.product?._id || formula.product || '',
      code: formula.code || '',
      description: `تحديث لنسخة جديدة (v${(formula.version || 1) + 1})`,
      defaultConcentration: formula.defaultConcentration || 25,
      ingredients: (formula.ingredients || []).map(i => {
        const pct = Number(i.percentage) || 0;
        return {
          rawMaterial: i.rawMaterial?._id || i.rawMaterial,
          percentage: pct,
          grams: Number((pct * 1).toFixed(2)),
          notes: i.notes || '',
        };
      }),
    });
    setShowModal(true);
  };

  const handleAddIngredientRow = () => {
    setFormData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { rawMaterial: '', grams: 0, percentage: 0, notes: '' }],
    }));
  };

  const handleRemoveIngredientRow = (index) => {
    if (formData.ingredients.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index),
    }));
  };

  // Change by grams -> updates percentage
  const handleIngredientGramsChange = (index, val) => {
    const numericGrams = val === '' ? '' : Math.max(0, Number(val));
    setFormData(prev => {
      const updated = [...prev.ingredients];
      const prevPct = updated[index].percentage;
      
      const effectiveSample = Number(sampleBaseGrams) > 0 ? Number(sampleBaseGrams) : 100;
      const calcPct = numericGrams === '' ? 0 : Number(((numericGrams / effectiveSample) * 100).toFixed(2));
      
      updated[index] = {
        ...updated[index],
        grams: numericGrams,
        percentage: calcPct,
      };
      return { ...prev, ingredients: updated };
    });
  };

  // Change by percentage -> updates grams
  const handleIngredientPercentageChange = (index, val) => {
    const numericPct = val === '' ? '' : Math.max(0, Number(val));
    setFormData(prev => {
      const updated = [...prev.ingredients];
      const effectiveSample = Number(sampleBaseGrams) > 0 ? Number(sampleBaseGrams) : 100;
      const calcGrams = numericPct === '' ? 0 : Number(((numericPct / 100) * effectiveSample).toFixed(2));
      
      updated[index] = {
        ...updated[index],
        percentage: numericPct,
        grams: calcGrams,
      };
      return { ...prev, ingredients: updated };
    });
  };

  const handleRawMaterialSelect = (index, rawMaterialId) => {
    setFormData(prev => {
      const updated = [...prev.ingredients];
      updated[index] = {
        ...updated[index],
        rawMaterial: rawMaterialId,
      };
      return { ...prev, ingredients: updated };
    });
  };

  // Auto-normalize grams so their percentages total exactly 100%
  const handleNormalizeFromGrams = () => {
    const totalG = formData.ingredients.reduce((s, i) => s + (Number(i.grams) || 0), 0);
    if (totalG <= 0) {
      showWarning('تنبيه', 'يرجى إدخال أوزان بالجرام أولاً لمعايرتها');
      return;
    }

    setFormData(prev => {
      const updated = prev.ingredients.map(i => {
        const g = Number(i.grams) || 0;
        const pct = Number(((g / totalG) * 100).toFixed(2));
        return { ...i, percentage: pct };
      });

      // Fix any rounding error on the last element to make sum exactly 100
      const currentSum = updated.reduce((s, i) => s + i.percentage, 0);
      const diff = Number((100 - currentSum).toFixed(2));
      if (diff !== 0 && updated.length > 0) {
        updated[updated.length - 1].percentage = Number((updated[updated.length - 1].percentage + diff).toFixed(2));
      }

      return { ...prev, ingredients: updated };
    });

    setSampleBaseGrams(Number(totalG.toFixed(2)));
    showToast('تمت معايرة النسب المئوية تلقائياً لتساوي 100%');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showWarning('بيانات ناقصة', 'يرجى إدخال اسم التركيبة العطرية');
      return;
    }

    if (!isSumValid) {
      showWarning('النسب غير مكتملة', `مجموع نسب الزيوت العطرية يجب أن يساوي 100% بالضبط (المجموع الحالي: ${currentTotalPercentage.toFixed(2)}%). يمكنك استخدام زر "معايرة إلى 100%".`);
      return;
    }

    // Check for empty raw material selections
    const hasEmptyMat = formData.ingredients.some(i => !i.rawMaterial || Number(i.percentage) <= 0);
    if (hasEmptyMat) {
      showWarning('بيانات ناقصة', 'يرجى اختيار مادة خام صالحة وكمية أكبر من صفر لكل بند');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        product: formData.productId || undefined,
        fragrance: formData.productId || undefined,
        code: formData.code.trim(),
        description: formData.description.trim(),
        defaultConcentration: Number(formData.defaultConcentration) || 25,
        ingredients: formData.ingredients.map(i => ({
          rawMaterial: i.rawMaterial,
          percentage: Number(i.percentage),
          notes: i.notes || '',
        })),
      };

      if (isVersionMode && selectedFormula) {
        await createFormulaVersion(selectedFormula._id, payload);
        showSuccess('تم إنشاء إصدار جديد', 'تم حفظ وتفعيل الإصدار الجديد من التركيبة العطرية');
      } else {
        await createFormula(payload);
        showSuccess('تم الحفظ بنجاح', 'تم إنشاء التركيبة العطرية بنجاح');
      }

      setShowModal(false);
      fetchData();
    } catch (err) {
      showError('خطأ أثناء الحفظ', err.response?.data?.message || 'حدث خطأ أثناء حفظ التركيبة');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (formula) => {
    const confirmed = await showConfirm('تأكيد الحذف', `هل أنت متأكد من أرشفة / حذف تركيبة "${formula.name || formula.fragranceName}"؟`, 'نعم، احذف', 'إلغاء');
    if (!confirmed) return;
    try {
      await deleteFormula(formula._id);
      showToast('تم حذف التركيبة بنجاح');
      fetchData();
    } catch (err) {
      showError('تعذر الحذف', err.response?.data?.message || 'تعذر حذف التركيبة');
    }
  };

  return (
    <div className="space-y-6 text-right font-['Tajawal',sans-serif]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#03204E] to-[#083375] text-white flex items-center justify-center shadow-md shadow-[#03204E]/10">
              <Layers size={20} strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-[#03204E] tracking-tight">
                تركيبات العطور (Fragrance Formulas)
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                بناء وتوثيق وصفات الزيوت العطرية بالجرام والنسب المئوية، وحساب التكلفة المرجحة بدقة.
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
            <span>إنشاء تركيبة عطر جديدة</span>
          </button>

          <button
            onClick={fetchData}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-xs"
            title="تحديث"
          >
            <RefreshCw size={14} strokeWidth={1.7} className={loading ? 'animate-spin text-[#03204E]' : ''} />
          </button>
        </div>
      </div>

      {/* Formula Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200/80">
            <div className="flex items-center justify-center gap-3">
              <div className="w-6 h-6 border-2 border-[#03204E] border-t-transparent rounded-full animate-spin"></div>
              <span className="font-semibold text-xs">جاري تحميل التركيبات العطرية...</span>
            </div>
          </div>
        ) : formulas.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200/80 p-6">
            <Layers size={36} className="mx-auto text-slate-300 mb-2" strokeWidth={1.5} />
            <p className="font-bold text-slate-700 text-sm">لا توجد تركيبات مسجلة بعد</p>
            <p className="text-xs text-slate-400 mt-1">اضغط على "إنشاء تركيبة عطر جديدة" لبناء وصفة عطرية بالجرام والنسب.</p>
          </div>
        ) : (
          formulas.map((formula) => {
            const isVActive = formula.active !== false;
            const displayName = formula.name || formula.fragranceName || 'تركيبة عطرية';
            const prodName = formula.fragrance?.name || formula.product?.name;
            
            return (
              <div key={formula._id} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-slate-100 bg-[#F8FAFC]">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-sm text-[#03204E]">{displayName}</h3>
                        <span className="px-2 py-0.5 rounded-md bg-[#03204E]/10 text-[#03204E] text-[10px] font-mono font-bold">
                          v{formula.version || 1}
                        </span>
                      </div>
                      {prodName && (
                        <span className="text-[11px] text-slate-500 font-medium block mt-1">
                          العطر التجاري: <strong className="text-slate-800">{prodName}</strong>
                        </span>
                      )}
                    </div>

                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${isVActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {isVActive ? 'نشطة (Active)' : 'مؤرشفة'}
                    </span>
                  </div>

                  {formula.description && (
                    <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                      {formula.description}
                    </p>
                  )}
                </div>

                {/* Ingredients List */}
                <div className="p-4 flex-1 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 border-b border-slate-100 pb-1.5">
                    <span>الزيت الخام</span>
                    <div className="flex items-center gap-3">
                      <span>الوزن (لكل 100 جم)</span>
                      <span>النسبة</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {(formula.ingredients || []).map((ing, iIdx) => {
                      const matName = ing.rawMaterialName || ing.rawMaterial?.name || 'زيت عطري';
                      const pct = Number(ing.percentage) || 0;
                      const gVal = (pct * 1).toFixed(1);
                      return (
                        <div key={iIdx} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-50/60 border border-slate-100">
                          <span className="text-slate-700 font-medium truncate max-w-[140px]">{matName}</span>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="font-mono text-slate-500 text-[11px]">{gVal}g</span>
                            <span className="font-mono font-bold text-[#03204E]">{pct}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer specs & Actions */}
                <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">نسبة التركيز الافتراضية:</span>
                    <span className="font-mono font-bold text-[#03204E]">{formula.defaultConcentration || 25}%</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenNewVersion(formula)}
                      className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                      title="إنشاء إصدار جديد من هذه التركيبة"
                    >
                      <GitBranch size={13} className="text-[#03204E]" />
                      <span>إصدار جديد</span>
                    </button>

                    <button
                      onClick={() => handleDelete(formula)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="حذف"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / New Version Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 rtl bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl z-10 max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200/80 bg-[#F8FAFC] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#03204E]/10 text-[#03204E] flex items-center justify-center">
                  <Layers size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#03204E]">
                    {isVersionMode ? `إنشاء إصدار جديد: ${selectedFormula?.name || selectedFormula?.fragranceName} (v${(selectedFormula?.version || 1) + 1})` : 'إنشاء تركيبة عطر جديدة'}
                  </h2>
                  <p className="text-[11px] text-slate-400">إدخال مكونات الزيوت بالجرام والنسب المئوية</p>
                </div>
              </div>

              <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg">
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">اسم التركيبة العطرية *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="مثال: NOIR Signature Blend"
                    className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3.5 text-xs outline-none focus:border-[#03204E]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">ربط بمنتج المتجر (اختياري)</label>
                  <select
                    value={formData.productId}
                    onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                    className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-xs outline-none focus:border-[#03204E]"
                  >
                    <option value="">-- بدون ربط مباشر --</option>
                    {products.map(p => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">كود التركيبة (SKU/Code)</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="FORM-NOIR-01"
                    className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3.5 text-xs font-mono font-bold outline-none focus:border-[#03204E]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">نسبة تركيز الزيت الافتراضية (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    step="0.5"
                    value={formData.defaultConcentration}
                    onChange={(e) => setFormData({ ...formData, defaultConcentration: e.target.value })}
                    placeholder="25"
                    className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-xs font-mono font-bold outline-none focus:border-[#03204E]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">وصف التركيبة / النوتات العطرية</label>
                <textarea
                  rows="2"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="ملاحظات حول الهرم العطري والمكونات الافتتاحية والقلب والقاعدة..."
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs outline-none focus:border-[#03204E]"
                />
              </div>

              {/* Ingredients Builder */}
              <div className="border border-slate-200/90 rounded-2xl p-4 bg-[#F8FAFC] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                  <div>
                    <span className="font-extrabold text-[#03204E] text-xs flex items-center gap-1.5">
                      <Scale size={15} className="text-[#03204E]" />
                      <span>مكونات مزيج الزيت العطري (بالجرام والنسب المئوية)</span>
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      يمكنك كتابة الوزن بالجرام مباشرة وسيقوم النظام بحساب النسبة المئوية والتكلفة تلقائياً
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleNormalizeFromGrams}
                      className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-colors"
                      title="معايرة نسب الزيوت من الأوزان بالجرام لتساوي 100%"
                    >
                      <Sparkles size={13} />
                      <span>معايرة إلى 100%</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAddIngredientRow}
                      className="px-3 py-1.5 bg-[#03204E] hover:bg-[#02183b] text-white rounded-xl text-[11px] font-bold flex items-center gap-1 transition-colors shadow-2xs"
                    >
                      <Plus size={13} />
                      <span>إضافة زيت خام</span>
                    </button>
                  </div>
                </div>

                {/* Ingredients Column Headers */}
                <div className="hidden sm:grid grid-cols-12 gap-2 text-[11px] font-bold text-slate-500 px-2">
                  <div className="col-span-6">الزيت الخام (المخزون والتكلفة)</div>
                  <div className="col-span-3 text-center">الكمية (جرام)</div>
                  <div className="col-span-2 text-center">النسبة (%)</div>
                  <div className="col-span-1"></div>
                </div>

                <div className="space-y-2">
                  {formData.ingredients.map((ing, idx) => (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-white p-2.5 border border-slate-200 rounded-xl shadow-2xs">
                      {/* Raw Material Select */}
                      <div className="sm:col-span-6">
                        <select
                          value={ing.rawMaterial}
                          onChange={(e) => handleRawMaterialSelect(idx, e.target.value)}
                          className="w-full h-9 bg-slate-50 border border-slate-200 rounded-xl px-2.5 text-xs font-semibold outline-none focus:border-[#03204E]"
                          required
                        >
                          <option value="">-- اختر الزيت الخام --</option>
                          {rawMaterials.map(m => {
                            const stock = Number(m.currentStock ?? m.currentStockGrams ?? 0);
                            const cost = Number(m.costPerGram || 0);
                            return (
                              <option key={m._id} value={m._id}>
                                {m.name} ({cost.toFixed(2)} ج.م/g) - مخزون: {stock.toLocaleString()} {m.unit || 'جرام'}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* Grams Input */}
                      <div className="sm:col-span-3 flex items-center gap-1">
                        <div className="relative w-full">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={ing.grams}
                            onChange={(e) => handleIngredientGramsChange(idx, e.target.value)}
                            placeholder="الوزن"
                            className="w-full h-9 bg-slate-50 border border-slate-200 rounded-xl px-2.5 text-xs font-mono font-bold text-center outline-none focus:border-[#03204E]"
                          />
                          <span className="absolute left-2 top-2.5 text-[10px] text-slate-400 font-mono pointer-events-none">g</span>
                        </div>
                      </div>

                      {/* Percentage Input */}
                      <div className="sm:col-span-2 flex items-center gap-1">
                        <div className="relative w-full">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={ing.percentage}
                            onChange={(e) => handleIngredientPercentageChange(idx, e.target.value)}
                            placeholder="النسبة"
                            required
                            className="w-full h-9 bg-slate-50 border border-slate-200 rounded-xl px-2 text-xs font-mono font-bold text-center outline-none focus:border-[#03204E]"
                          />
                          <span className="absolute left-2 top-2.5 text-[10px] text-slate-400 font-mono pointer-events-none">%</span>
                        </div>
                      </div>

                      {/* Delete Button */}
                      <div className="sm:col-span-1 flex justify-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveIngredientRow(idx)}
                          disabled={formData.ingredients.length <= 1}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-20 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total Stats & Validation Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200">
                  <div className="flex items-center gap-2">
                    {isSumValid ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs">
                        <CheckCircle2 size={15} />
                        <span>مجموع النسب مكتمل 100% (إجمالي الأوزان: {currentTotalGrams.toFixed(1)} جم)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-red-50 border border-red-200 text-red-600 font-bold text-xs">
                        <AlertCircle size={15} />
                        <span>مجموع النسب: {currentTotalPercentage.toFixed(2)}% (مطلوب 100%)</span>
                      </span>
                    )}
                  </div>

                  <div className="text-left font-mono bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                    <span className="text-slate-400 text-[10px] block font-sans font-bold">تكلفة مزيج الزيت التقديرية:</span>
                    <strong className="text-[#03204E] text-xs font-extrabold">{estimatedOilCostPerGram.toFixed(3)} ج.م / g</strong>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 font-semibold h-10"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting || !isSumValid}
                  className="px-6 py-2 bg-[#03204E] text-white rounded-xl hover:bg-[#02183b] h-10 font-bold disabled:opacity-50 shadow-sm"
                >
                  {submitting ? 'جاري الحفظ...' : isVersionMode ? 'حفظ كإصدار جديد' : 'حفظ التركيبة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
