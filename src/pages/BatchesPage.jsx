import React, { useState, useEffect } from 'react';
import { 
  Package, Plus, Search, Filter, AlertTriangle, 
  CheckCircle2, Clock, Check, RefreshCw, X, ArrowRight,
  FlaskConical, Sparkles, Layers, Box, Info, XCircle
} from 'lucide-react';
import { 
  getBatches, createBatch, confirmBatch, 
  bottlingBatch, cancelBatch, getFormulas, 
  getRawMaterials, previewBatchCalculation, getProducts 
} from '../services/api';
import { showSuccess, showError, showConfirm, showWarning, showToast, customSwal } from '../utils/swal';


const STATUS_MAP = {
  draft: { label: 'مسودة (Draft)', bg: 'bg-slate-100 text-slate-700 border-slate-200' },
  confirmed: { label: 'تم الخلط والحسم (Confirmed)', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
  matured: { label: 'مكتمل التعتيق (Matured)', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
  bottled: { label: 'تمت التعبئة (Bottled)', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled: { label: 'ملغاة (Cancelled)', bg: 'bg-red-50 text-red-700 border-red-200' },
};

export default function BatchesPage() {
  const [batches, setBatches] = useState([]);
  const [formulas, setFormulas] = useState([]);
  const [alcoholMaterials, setAlcoholMaterials] = useState([]);
  const [packagingMaterials, setPackagingMaterials] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBottlingModal, setShowBottlingModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New Batch Form Data
  const [batchForm, setBatchForm] = useState({
    formulaId: '',
    batchCode: '',
    totalWeightGrams: 5000,
    concentrationPercent: 25,
    alcoholRawMaterialId: '',
    productionDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Bottling Form Data
  const [bottlingForm, setBottlingForm] = useState({
    productId: '',
    variantSize: '50ml',
    unitsBottled: 10,
    targetWeightGramsPerUnit: 45, // default 50ml perfume is ~42-45g
    packagingBottleId: '',
    packagingBoxId: '',
    packagingCapId: '',
    packagingStickerId: '',
    packagingBagId: '',
    otherPackagingCostPerUnit: 0,
    notes: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bData, fData, mData, pData] = await Promise.all([
        getBatches().catch(() => []),
        getFormulas().catch(() => []),
        getRawMaterials().catch(() => []),
        getProducts().catch(() => []),
      ]);
      setBatches(Array.isArray(bData) ? bData : []);
      setFormulas(Array.isArray(fData) ? fData : []);
      
      const allMats = Array.isArray(mData) ? mData : [];
      setAlcoholMaterials(allMats.filter(m => m.category === 'alcohol'));
      setPackagingMaterials(allMats.filter(m => 
        ['bottle', 'box', 'sticker', 'bag', 'tester', 'packaging_bottle', 'packaging_box', 'packaging_cap', 'packaging_pump', 'packaging_bag', 'label_sticker'].includes(m.category)
      ));
      setProducts(Array.isArray(pData) ? pData : []);

      // Pre-select first alcohol if available
      const firstAlc = allMats.find(m => m.category === 'alcohol');
      if (firstAlc && !batchForm.alcoholRawMaterialId) {
        setBatchForm(prev => ({ ...prev, alcoholRawMaterialId: firstAlc._id }));
      }
    } catch (err) {
      console.error('Error loading batches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update preview when batch parameters change
  useEffect(() => {
    if (batchForm.formulaId && batchForm.totalWeightGrams && batchForm.concentrationPercent) {
      handleCalculatePreview();
    } else {
      setPreviewData(null);
    }
  }, [batchForm.formulaId, batchForm.totalWeightGrams, batchForm.concentrationPercent, batchForm.alcoholRawMaterialId]);

  const handleCalculatePreview = async () => {
    if (!batchForm.formulaId || !batchForm.totalWeightGrams) return;
    setPreviewLoading(true);
    try {
      const data = await previewBatchCalculation({
        formulaId: batchForm.formulaId,
        totalWeightGrams: Number(batchForm.totalWeightGrams),
        concentrationPercent: Number(batchForm.concentrationPercent),
        alcoholRawMaterialId: batchForm.alcoholRawMaterialId || undefined,
      });
      setPreviewData(data);
    } catch (err) {
      console.error('Preview calc error:', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleFormulaSelect = (formulaId) => {
    const f = formulas.find(item => item._id === formulaId);
    setBatchForm(prev => ({
      ...prev,
      formulaId,
      concentrationPercent: f?.defaultConcentration || 25,
      batchCode: `BATCH-${f?.code || 'ELAN'}-${new Date().toISOString().slice(2, 7).replace('-', '')}-${Math.floor(100 + Math.random() * 900)}`,
    }));
  };

  const handleOpenCreate = () => {
    const defaultAlc = alcoholMaterials[0]?._id || '';
    setBatchForm({
      formulaId: formulas[0]?._id || '',
      batchCode: `BATCH-ELAN-${new Date().toISOString().slice(2, 7).replace('-', '')}-${Math.floor(100 + Math.random() * 900)}`,
      totalWeightGrams: 5000,
      concentrationPercent: formulas[0]?.defaultConcentration || 25,
      alcoholRawMaterialId: defaultAlc,
      productionDate: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setShowCreateModal(true);
  };

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createBatch({
        formula: batchForm.formulaId,
        batchCode: batchForm.batchCode,
        totalWeightGrams: Number(batchForm.totalWeightGrams),
        concentrationPercent: Number(batchForm.concentrationPercent),
        alcoholRawMaterialId: batchForm.alcoholRawMaterialId,
        productionDate: batchForm.productionDate,
        notes: batchForm.notes,
      });
      showSuccess('تم إنشاء الدفعة بنجاح', 'تم تسجيل وتأكيد دفعة الإنتاج الجديدة وحسم الخامات');
      setShowCreateModal(false);
      fetchData();
    } catch (err) {
      showError('خطأ في الإنشاء', err.response?.data?.message || 'حدث خطأ أثناء إنشاء دفعة الإنتاج');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmBatch = async (batch) => {
    const confirmed = await showConfirm('تأكيد خلط الدفعة', `هل أنت متأكد من خلط الدفعة "${batch.batchCode}" وحسم المواد الخام من المخزون بشكل نهائي؟`, 'نعم، خلط وحسم', 'إلغاء');
    if (!confirmed) return;
    try {
      await confirmBatch(batch._id);
      showSuccess('تم التأكيد', 'تم تأكيد خلط الدفعة وتحديث المخزون');
      fetchData();
    } catch (err) {
      showError('تعذر التأكيد', err.response?.data?.message || 'تعذر تأكيد الدفعة');
    }
  };

  const handleCancelBatch = async (batch) => {
    const { value: reason } = await customSwal.fire({
      title: 'إلغاء دفعة الإنتاج',
      input: 'text',
      inputLabel: 'يرجى كتابة سبب الإلغاء:',
      inputPlaceholder: 'اكتب سبب الإلغاء هنا...',
      showCancelButton: true,
      confirmButtonText: 'تأكيد الإلغاء',
      cancelButtonText: 'تراجع',
      inputValidator: (value) => {
        if (!value) {
          return 'يجب كتابة سبب الإلغاء!';
        }
      }
    });

    if (!reason) return;
    try {
      await cancelBatch(batch._id, reason || 'إلغاء يدوي من لوحة التحكم');
      showToast('تم إلغاء الدفعة بنجاح', 'info');
      fetchData();
    } catch (err) {
      showError('تعذر الإلغاء', err.response?.data?.message || 'تعذر إلغاء الدفعة');
    }
  };

  // Bottling Modal Open
  const handleOpenBottling = (batch) => {
    setSelectedBatch(batch);
    const linkedProd = batch.formula?.product || products[0];
    const firstVariant = linkedProd?.variants?.[0];
    
    // Auto find packaging materials
    const bottleMat = packagingMaterials.find(m => m.category === 'bottle' || m.category === 'packaging_bottle')?._id || '';
    const boxMat = packagingMaterials.find(m => m.category === 'box' || m.category === 'packaging_box')?._id || '';
    const capMat = packagingMaterials.find(m => m.category === 'packaging_cap')?._id || '';
    const stickerMat = packagingMaterials.find(m => m.category === 'sticker' || m.category === 'label_sticker')?._id || '';
    const bagMat = packagingMaterials.find(m => m.category === 'bag' || m.category === 'packaging_bag')?._id || '';

    setBottlingForm({
      productId: linkedProd?._id || '',
      variantSize: firstVariant?.size || '50ml',
      unitsBottled: 10,
      targetWeightGramsPerUnit: firstVariant?.targetWeightGrams || 45,
      packagingBottleId: bottleMat,
      packagingBoxId: boxMat,
      packagingCapId: capMat,
      packagingStickerId: stickerMat,
      packagingBagId: bagMat,
      otherPackagingCostPerUnit: 0,
      notes: '',
    });
    setShowBottlingModal(true);
  };

  const handleSubmitBottling = async (e) => {
    e.preventDefault();
    if (!selectedBatch) return;

    const totalLiquidGramsNeeded = Number(bottlingForm.unitsBottled) * Number(bottlingForm.targetWeightGramsPerUnit);
    if (totalLiquidGramsNeeded > (selectedBatch.remainingLiquidGrams || 0)) {
      showWarning('الكمية غير كافية', `الوزن المطلوب للتعبئة (${totalLiquidGramsNeeded}g) أكبر من السائل المتبقي في الدفعة (${selectedBatch.remainingLiquidGrams}g)`);
      return;
    }

    setSubmitting(true);
    try {
      // Calculate packaging costs from selected raw materials
      const bottleMat = packagingMaterials.find(m => m._id === bottlingForm.packagingBottleId);
      const boxMat = packagingMaterials.find(m => m._id === bottlingForm.packagingBoxId);
      const capMat = packagingMaterials.find(m => m._id === bottlingForm.packagingCapId);
      const stickerMat = packagingMaterials.find(m => m._id === bottlingForm.packagingStickerId);
      const bagMat = packagingMaterials.find(m => m._id === bottlingForm.packagingBagId);

      const packagingCosts = {
        bottle: bottleMat?.costPerGram || 0,
        box: boxMat?.costPerGram || 0,
        cap: capMat?.costPerGram || 0,
        sticker: stickerMat?.costPerGram || 0,
        bag: bagMat?.costPerGram || 0,
        other: Number(bottlingForm.otherPackagingCostPerUnit) || 0,
      };

      const packagingMaterialsUsed = [
        bottleMat && { rawMaterialId: bottleMat._id, quantity: Number(bottlingForm.unitsBottled) },
        boxMat && { rawMaterialId: boxMat._id, quantity: Number(bottlingForm.unitsBottled) },
        capMat && { rawMaterialId: capMat._id, quantity: Number(bottlingForm.unitsBottled) },
        stickerMat && { rawMaterialId: stickerMat._id, quantity: Number(bottlingForm.unitsBottled) },
        bagMat && { rawMaterialId: bagMat._id, quantity: Number(bottlingForm.unitsBottled) },
      ].filter(Boolean);

      await bottlingBatch(selectedBatch._id, {
        productId: bottlingForm.productId,
        variantSize: bottlingForm.variantSize,
        unitsBottled: Number(bottlingForm.unitsBottled),
        targetWeightGramsPerUnit: Number(bottlingForm.targetWeightGramsPerUnit),
        packagingCosts,
        packagingMaterialsUsed,
        notes: bottlingForm.notes,
      });

      showSuccess('تمت التعبئة بنجاح', 'تمت تعبئة العطور وإضافتها لمخزون المنتجات الجاهزة للبيع');
      setShowBottlingModal(false);
      fetchData();
    } catch (err) {
      showError('خطأ أثناء التعبئة', err.response?.data?.message || 'حدث خطأ أثناء تعبئة الدفعة');
    } finally {
      setSubmitting(false);
    }
  };

  // Preview packaging unit cost in bottling modal
  const selectedBottleCost = packagingMaterials.find(m => m._id === bottlingForm.packagingBottleId)?.costPerGram || 0;
  const selectedBoxCost = packagingMaterials.find(m => m._id === bottlingForm.packagingBoxId)?.costPerGram || 0;
  const selectedCapCost = packagingMaterials.find(m => m._id === bottlingForm.packagingCapId)?.costPerGram || 0;
  const selectedStickerCost = packagingMaterials.find(m => m._id === bottlingForm.packagingStickerId)?.costPerGram || 0;
  const selectedBagCost = packagingMaterials.find(m => m._id === bottlingForm.packagingBagId)?.costPerGram || 0;
  
  const unitPackagingTotal = selectedBottleCost + selectedBoxCost + selectedCapCost + selectedStickerCost + selectedBagCost + (Number(bottlingForm.otherPackagingCostPerUnit) || 0);
  const unitLiquidCost = (selectedBatch?.costPerGram || 0) * (Number(bottlingForm.targetWeightGramsPerUnit) || 0);
  const totalFinishedUnitCost = unitLiquidCost + unitPackagingTotal;

  return (
    <div className="space-y-6 text-right font-['Tajawal',sans-serif]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-[#03204E] flex items-center gap-2">
            <Package size={20} strokeWidth={1.5} className="text-[#03204E]" />
            <span>التشغيلات ودفعات الإنتاج (Production Batches)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            تجهيز خلطات العطور بالجرام (g)، حسم الزيوت والكحول فورياً، وحساب تكلفة الزجاجة التامة بدقة.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleOpenCreate}
            className="px-3.5 py-2 rounded-sm bg-[#03204E] hover:bg-[#02183b] text-white text-xs font-medium flex items-center gap-1.5 transition-colors duration-150 h-9"
          >
            <Plus size={14} />
            <span>إنشاء تشغيلة إنتاج جديدة</span>
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

      {/* Batches Table */}
      <div className="bg-white rounded-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#F8FAFC] text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">رقم التشغيلة (Batch Code)</th>
                <th className="py-3 px-4">اسم التركيبة</th>
                <th className="py-3 px-4 text-center">الوزن الإجمالي</th>
                <th className="py-3 px-4 text-center">التركيز (%)</th>
                <th className="py-3 px-4 text-center">تكلفة الجرام (g)</th>
                <th className="py-3 px-4 text-center">إجمالي تكلفة الخلطة</th>
                <th className="py-3 px-4 text-center">السائل المتبقي</th>
                <th className="py-3 px-4 text-center">الحالة</th>
                <th className="py-3 px-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-[#03204E] border-t-transparent rounded-full animate-spin"></div>
                      <span>جاري تحميل التشغيلات...</span>
                    </div>
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-400">
                    لا توجد تشغيلات إنتاج حتى الآن. اضغط على "إنشاء تشغيلة إنتاج جديدة".
                  </td>
                </tr>
              ) : (
                batches.map((batch) => {
                  const statusInfo = STATUS_MAP[batch.status] || STATUS_MAP.draft;
                  const isDraft = batch.status === 'draft';
                  const canBottle = (batch.status === 'confirmed' || batch.status === 'matured' || batch.status === 'bottled') && (batch.remainingLiquidGrams > 0);

                  return (
                    <tr key={batch._id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {batch.batchCode}
                        <span className="block text-[10px] text-slate-400 font-normal mt-0.5">
                          {new Date(batch.productionDate).toLocaleDateString('ar-EG')}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800">
                          {batch.formulaSnapshot?.name || batch.formula?.name || 'تركيبة مخصصة'}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          v{batch.formulaSnapshot?.version || batch.formula?.version || 1}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-900">
                        {batch.totalWeightGrams.toLocaleString()} g
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-medium text-slate-700">
                        {batch.concentrationPercent}%
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-medium text-slate-900">
                        {batch.costPerGram?.toFixed(3)} ج.م/g
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-bold text-[#15803d]">
                        {Math.round(batch.totalBatchCost || 0).toLocaleString()} ج.م
                      </td>

                      <td className="py-3 px-4 text-center font-mono">
                        <span className={`font-bold ${batch.remainingLiquidGrams > 0 ? 'text-indigo-700' : 'text-slate-400'}`}>
                          {batch.remainingLiquidGrams?.toLocaleString()} g
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-sm border text-[11px] font-medium ${statusInfo.bg}`}>
                          {statusInfo.label}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {isDraft && (
                            <button
                              onClick={() => handleConfirmBatch(batch)}
                              title="تأكيد الخلط وحسم المواد من المخزون"
                              className="px-2.5 py-1 bg-[#03204E] hover:bg-[#02183b] text-white rounded-sm text-[11px] font-medium transition-colors"
                            >
                              تأكيد وخصم
                            </button>
                          )}

                          {canBottle && (
                            <button
                              onClick={() => handleOpenBottling(batch)}
                              title="تعبئة زجاجات تامة الصنع"
                              className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-sm text-[11px] font-medium flex items-center gap-1 transition-colors"
                            >
                              <Box size={12} />
                              <span>تعبئة وتغليف</span>
                            </button>
                          )}

                          {isDraft && (
                            <button
                              onClick={() => handleCancelBatch(batch)}
                              title="إلغاء التشغيلة"
                              className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                            >
                              <XCircle size={14} />
                            </button>
                          )}
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

      {/* Create Batch Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 rtl">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowCreateModal(false)} />
          <div className="relative w-full max-w-2xl bg-white rounded-sm border border-slate-200 overlay-shadow z-10 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-[#F8FAFC] flex items-center justify-between shrink-0">
              <h2 className="text-sm font-semibold text-[#03204E] flex items-center gap-1.5">
                <FlaskConical size={16} />
                <span>إنشاء دفعة إنتاج جديدة (Production Batch)</span>
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">اختر تركيبة العطر *</label>
                  <select
                    value={batchForm.formulaId}
                    onChange={(e) => handleFormulaSelect(e.target.value)}
                    required
                    className="w-full h-9 bg-white border border-slate-200 rounded-sm px-2 text-xs outline-none focus:border-[#03204E]"
                  >
                    <option value="">-- اختر التركيبة --</option>
                    {formulas.map(f => (
                      <option key={f._id} value={f._id}>
                        {f.name} (v{f.version || 1}) - {f.defaultConcentration || 25}%
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">كود التشغيلة (Batch Code) *</label>
                  <input
                    type="text"
                    required
                    value={batchForm.batchCode}
                    onChange={(e) => setBatchForm({ ...batchForm, batchCode: e.target.value })}
                    className="w-full h-9 bg-white border border-slate-200 rounded-sm px-3 text-xs font-mono outline-none focus:border-[#03204E]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">الوزن الإجمالي للدفعة (جرام) *</label>
                  <input
                    type="number"
                    min="10"
                    step="1"
                    required
                    value={batchForm.totalWeightGrams}
                    onChange={(e) => setBatchForm({ ...batchForm, totalWeightGrams: e.target.value })}
                    placeholder="5000"
                    className="w-full h-9 bg-white border border-slate-200 rounded-sm px-3 text-xs font-mono outline-none focus:border-[#03204E]"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">تركيز الزيت العطري (%) *</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    step="0.5"
                    required
                    value={batchForm.concentrationPercent}
                    onChange={(e) => setBatchForm({ ...batchForm, concentrationPercent: e.target.value })}
                    placeholder="25"
                    className="w-full h-9 bg-white border border-slate-200 rounded-sm px-3 text-xs font-mono outline-none focus:border-[#03204E]"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">خام الكحول المستخدم *</label>
                  <select
                    value={batchForm.alcoholRawMaterialId}
                    onChange={(e) => setBatchForm({ ...batchForm, alcoholRawMaterialId: e.target.value })}
                    required
                    className="w-full h-9 bg-white border border-slate-200 rounded-sm px-2 text-xs outline-none"
                  >
                    <option value="">-- اختر كحول --</option>
                    {alcoholMaterials.map(m => (
                      <option key={m._id} value={m._id}>
                        {m.name} ({m.costPerGram?.toFixed(3)} ج.م/g)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Instant Calculation Preview Card */}
              {previewData && (
                <div className="border border-indigo-100 rounded-sm p-3.5 bg-indigo-50/40 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
                    <span className="font-semibold text-indigo-900 text-xs flex items-center gap-1">
                      <Sparkles size={14} className="text-indigo-600" />
                      <span>المعاينة الحسابية للدفعة (Gram Breakdown)</span>
                    </span>
                    <span className="font-mono text-xs font-bold text-indigo-950">
                      إجمالي التكلفة: {Math.round(previewData.totalBatchCost).toLocaleString()} ج.م ({previewData.costPerGram?.toFixed(3)} ج.م/g)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div className="bg-white p-2 rounded-sm border border-indigo-100">
                      <span className="text-[10px] text-slate-500 block">وزن الزيت الإجمالي</span>
                      <strong className="text-xs font-mono text-indigo-900">{previewData.fragranceOilWeightGrams?.toFixed(1)} g</strong>
                    </div>
                    <div className="bg-white p-2 rounded-sm border border-indigo-100">
                      <span className="text-[10px] text-slate-500 block">وزن الكحول الإجمالي</span>
                      <strong className="text-xs font-mono text-blue-900">{previewData.alcoholWeightGrams?.toFixed(1)} g</strong>
                    </div>
                    <div className="bg-white p-2 rounded-sm border border-indigo-100">
                      <span className="text-[10px] text-slate-500 block">تكلفة الزيوت</span>
                      <strong className="text-xs font-mono text-slate-900">{Math.round(previewData.fragranceOilCost || 0)} ج.م</strong>
                    </div>
                    <div className="bg-white p-2 rounded-sm border border-indigo-100">
                      <span className="text-[10px] text-slate-500 block">تكلفة الكحول</span>
                      <strong className="text-xs font-mono text-slate-900">{Math.round(previewData.alcoholCost || 0)} ج.م</strong>
                    </div>
                  </div>

                  {/* Ingredients breakdown list */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-semibold text-slate-700 block">الكميات المطلوبة من كل زيت خام:</span>
                    <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                      {(previewData.ingredientBreakdown || []).map((ing, iIdx) => (
                        <div key={iIdx} className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-sm border border-slate-200 text-[11px]">
                          <span className="font-medium text-slate-800">{ing.name} ({ing.percentage}%)</span>
                          <div className="flex items-center gap-3 font-mono">
                            <span className="text-slate-600">مطلوب: <strong>{ing.gramsNeeded?.toFixed(2)} g</strong></span>
                            <span className={ing.isAvailable ? 'text-emerald-700' : 'text-red-600 font-bold'}>
                              (متوفر: {ing.currentStock} g)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-medium text-slate-700 mb-1">ملاحظات التشغيلة</label>
                <textarea
                  rows="2"
                  value={batchForm.notes}
                  onChange={(e) => setBatchForm({ ...batchForm, notes: e.target.value })}
                  placeholder="ملاحظات حول وقت الخلط، درجة الحرارة، فترة التعتيق المستهدفة..."
                  className="w-full bg-white border border-slate-200 rounded-sm p-2 text-xs outline-none focus:border-[#03204E]"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-sm hover:bg-slate-50 text-slate-700 h-9"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting || !batchForm.formulaId}
                  className="px-5 py-2 bg-[#03204E] text-white rounded-sm hover:bg-[#02183b] h-9 font-medium disabled:opacity-50"
                >
                  {submitting ? 'جاري الحفظ...' : 'إنشاء مسودة التشغيلة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bottling Modal */}
      {showBottlingModal && selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 rtl">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowBottlingModal(false)} />
          <div className="relative w-full max-w-xl bg-white rounded-sm border border-slate-200 overlay-shadow z-10 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-[#F8FAFC] flex items-center justify-between shrink-0">
              <h2 className="text-sm font-semibold text-[#03204E] flex items-center gap-1.5">
                <Box size={16} />
                <span>تعبئة وتحويل لمنتج نهائي (Finished Product Bottling)</span>
              </h2>
              <button onClick={() => setShowBottlingModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitBottling} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-sm flex items-center justify-between">
                <div>
                  <span className="text-slate-500 text-[11px] block">رقم التشغيلة المصدر:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedBatch.batchCode}</span>
                </div>
                <div className="text-left">
                  <span className="text-slate-500 text-[11px] block">السائل المتاح:</span>
                  <span className="font-mono font-bold text-indigo-700">{selectedBatch.remainingLiquidGrams} g</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">المنتج النهائي *</label>
                  <select
                    value={bottlingForm.productId}
                    onChange={(e) => setBottlingForm({ ...bottlingForm, productId: e.target.value })}
                    required
                    className="w-full h-9 bg-white border border-slate-200 rounded-sm px-2 text-xs outline-none"
                  >
                    <option value="">-- اختر المنتج --</option>
                    {products.map(p => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">الحجم المستهدف (SKU) *</label>
                  <select
                    value={bottlingForm.variantSize}
                    onChange={(e) => setBottlingForm({ ...bottlingForm, variantSize: e.target.value })}
                    required
                    className="w-full h-9 bg-white border border-slate-200 rounded-sm px-2 text-xs font-mono outline-none"
                  >
                    <option value="50ml">50ml</option>
                    <option value="100ml">100ml</option>
                    <option value="30ml">30ml</option>
                    <option value="15ml">15ml (Sample / Travel)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">عدد الزجاجات المعبأة *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={bottlingForm.unitsBottled}
                    onChange={(e) => setBottlingForm({ ...bottlingForm, unitsBottled: e.target.value })}
                    className="w-full h-9 bg-white border border-slate-200 rounded-sm px-3 text-xs font-mono outline-none focus:border-[#03204E]"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">وزن السائل في الزجاجة (جرام) *</label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    required
                    value={bottlingForm.targetWeightGramsPerUnit}
                    onChange={(e) => setBottlingForm({ ...bottlingForm, targetWeightGramsPerUnit: e.target.value })}
                    placeholder="45"
                    className="w-full h-9 bg-white border border-slate-200 rounded-sm px-3 text-xs font-mono outline-none focus:border-[#03204E]"
                  />
                </div>
              </div>

              {/* Packaging Materials Selection */}
              <div className="border border-slate-200 rounded-sm p-3 bg-[#F8FAFC] space-y-2.5">
                <span className="font-semibold text-slate-800 text-xs block">مواد التغليف المستخدمة (يتم خصمها وحساب تكلفتها):</span>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">الزجاجة الفارغة:</label>
                    <select
                      value={bottlingForm.packagingBottleId}
                      onChange={(e) => setBottlingForm({ ...bottlingForm, packagingBottleId: e.target.value })}
                      className="w-full h-8 bg-white border border-slate-200 rounded-sm px-2 text-xs outline-none"
                    >
                      <option value="">-- بدون زجاجة مسجلة --</option>
                      {packagingMaterials.filter(m => m.category === 'packaging_bottle').map(m => (
                        <option key={m._id} value={m._id}>{m.name} ({m.costPerGram} ج.م)</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">العلبة الكرتون (Box):</label>
                    <select
                      value={bottlingForm.packagingBoxId}
                      onChange={(e) => setBottlingForm({ ...bottlingForm, packagingBoxId: e.target.value })}
                      className="w-full h-8 bg-white border border-slate-200 rounded-sm px-2 text-xs outline-none"
                    >
                      <option value="">-- بدون علبة --</option>
                      {packagingMaterials.filter(m => m.category === 'packaging_box').map(m => (
                        <option key={m._id} value={m._id}>{m.name} ({m.costPerGram} ج.م)</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">الغطاء (Cap):</label>
                    <select
                      value={bottlingForm.packagingCapId}
                      onChange={(e) => setBottlingForm({ ...bottlingForm, packagingCapId: e.target.value })}
                      className="w-full h-8 bg-white border border-slate-200 rounded-sm px-2 text-xs outline-none"
                    >
                      <option value="">-- بدون غطاء --</option>
                      {packagingMaterials.filter(m => m.category === 'packaging_cap').map(m => (
                        <option key={m._id} value={m._id}>{m.name} ({m.costPerGram} ج.م)</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">الستيكر / الليبل:</label>
                    <select
                      value={bottlingForm.packagingStickerId}
                      onChange={(e) => setBottlingForm({ ...bottlingForm, packagingStickerId: e.target.value })}
                      className="w-full h-8 bg-white border border-slate-200 rounded-sm px-2 text-xs outline-none"
                    >
                      <option value="">-- بدون ستيكر --</option>
                      {packagingMaterials.filter(m => m.category === 'label_sticker').map(m => (
                        <option key={m._id} value={m._id}>{m.name} ({m.costPerGram} ج.م)</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">كيس البراند (Bag):</label>
                    <select
                      value={bottlingForm.packagingBagId}
                      onChange={(e) => setBottlingForm({ ...bottlingForm, packagingBagId: e.target.value })}
                      className="w-full h-8 bg-white border border-slate-200 rounded-sm px-2 text-xs outline-none"
                    >
                      <option value="">-- بدون كيس --</option>
                      {packagingMaterials.filter(m => m.category === 'packaging_bag').map(m => (
                        <option key={m._id} value={m._id}>{m.name} ({m.costPerGram} ج.م)</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Total Calculated Unit Cost Breakdown */}
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-sm space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-emerald-900 font-semibold pb-1 border-b border-emerald-200">
                  <span>حساب تكلفة الوحدة التامة (COGS Per Unit):</span>
                  <span className="font-mono text-sm font-bold text-emerald-950">
                    {totalFinishedUnitCost.toFixed(2)} ج.م / زجاجة
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-emerald-800">
                  <div>تكلفة العطر السائل: <strong className="font-mono">{unitLiquidCost.toFixed(2)} ج.م</strong></div>
                  <div>تكلفة التغليف الكامل: <strong className="font-mono">{unitPackagingTotal.toFixed(2)} ج.م</strong></div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowBottlingModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-sm hover:bg-slate-50 text-slate-700 h-9"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-700 text-white rounded-sm hover:bg-emerald-800 h-9 font-medium disabled:opacity-50"
                >
                  {submitting ? 'جاري التعبئة...' : 'تأكيد التعبئة وإضافة المخزون التام'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
