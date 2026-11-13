import React, { useState, useEffect } from 'react';
import { 
  Package, Plus, Search, Filter, AlertTriangle, 
  CheckCircle2, Clock, Check, RefreshCw, X, ArrowRight,
  FlaskConical, Sparkles, Layers, Box, Info, XCircle, Droplets, ArrowUpRight
} from 'lucide-react';
import { 
  getFinishedLiquidInventory, getFormulas, getRawMaterials, 
  previewBatchCalculation, createBatch, getBatches 
} from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { showSuccess, showError, showConfirm, showToast } from '../utils/swal';

export default function FinishedLiquidPage() {
  const { lang, isRTL, t, formatCurrency } = useLanguage();
  const [liquidInventory, setLiquidInventory] = useState([]);
  const [formulas, setFormulas] = useState([]);
  const [alcoholMaterials, setAlcoholMaterials] = useState([]);
  const [batchesHistory, setBatchesHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // New Production Modal
  const [showProductionModal, setShowProductionModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  // Production Form State
  const [productionForm, setProductionForm] = useState({
    fragranceId: '',
    formulaId: '',
    totalWeightGrams: 2000,
    concentrationPercent: 20,
    alcoholRawMaterialId: '',
    productionDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [liquidData, formulasData, rawMats, batchesData] = await Promise.all([
        getFinishedLiquidInventory().catch(() => []),
        getFormulas().catch(() => []),
        getRawMaterials().catch(() => []),
        getBatches({ limit: 15 }).catch(() => []),
      ]);

      setLiquidInventory(Array.isArray(liquidData) ? liquidData : []);
      setFormulas(Array.isArray(formulasData) ? formulasData : []);
      setBatchesHistory(Array.isArray(batchesData) ? batchesData : []);

      const mats = Array.isArray(rawMats) ? rawMats : [];
      const alcMats = mats.filter(m => m.category === 'alcohol');
      setAlcoholMaterials(alcMats);

      if (alcMats.length > 0 && !productionForm.alcoholRawMaterialId) {
        setProductionForm(prev => ({ ...prev, alcoholRawMaterialId: alcMats[0]._id }));
      }
    } catch (err) {
      console.error('Error fetching finished liquid data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Recalculate preview when production form values change
  useEffect(() => {
    if (showProductionModal && productionForm.formulaId && productionForm.totalWeightGrams > 0) {
      handleCalculatePreview();
    } else {
      setPreviewData(null);
    }
  }, [
    productionForm.formulaId, 
    productionForm.totalWeightGrams, 
    productionForm.concentrationPercent, 
    productionForm.alcoholRawMaterialId, 
    showProductionModal
  ]);

  const handleCalculatePreview = async () => {
    if (!productionForm.formulaId || !productionForm.totalWeightGrams) return;
    setPreviewLoading(true);
    try {
      const data = await previewBatchCalculation({
        formulaId: productionForm.formulaId,
        finalBatchWeight: Number(productionForm.totalWeightGrams),
        concentrationPercent: Number(productionForm.concentrationPercent),
        alcoholRawMaterialId: productionForm.alcoholRawMaterialId || undefined,
      });
      setPreviewData(data);
    } catch (err) {
      console.error('Preview error:', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleOpenProduction = (item = null) => {
    let matchedFormula = null;
    let targetFragranceId = '';

    if (item) {
      targetFragranceId = item.fragranceId;
      matchedFormula = formulas.find(f => 
        (item.formulaId && String(f._id) === String(item.formulaId)) ||
        String(f.fragrance?._id || f.fragrance) === String(item.fragranceId)
      );
    } else if (liquidInventory.length > 0) {
      const firstItem = liquidInventory[0];
      targetFragranceId = firstItem.fragranceId;
      matchedFormula = formulas.find(f => 
        (firstItem.formulaId && String(f._id) === String(firstItem.formulaId)) ||
        String(f.fragrance?._id || f.fragrance) === String(targetFragranceId)
      );
    }

    if (!matchedFormula && formulas.length > 0) {
      matchedFormula = formulas[0];
      targetFragranceId = matchedFormula.fragrance?._id || matchedFormula.fragrance || '';
    }

    setProductionForm({
      fragranceId: targetFragranceId,
      formulaId: matchedFormula ? matchedFormula._id : '',
      totalWeightGrams: 2000,
      concentrationPercent: matchedFormula?.defaultConcentration || 20,
      alcoholRawMaterialId: alcoholMaterials[0]?._id || '',
      productionDate: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setPreviewData(null);
    setShowProductionModal(true);
  };

  const handleFragranceChange = (fragranceId) => {
    const invItem = liquidInventory.find(l => String(l.fragranceId) === String(fragranceId));
    const matchedFormula = formulas.find(f => 
      (invItem?.formulaId && String(f._id) === String(invItem.formulaId)) ||
      String(f.fragrance?._id || f.fragrance) === String(fragranceId)
    );

    setProductionForm(prev => ({
      ...prev,
      fragranceId,
      formulaId: matchedFormula ? matchedFormula._id : '',
      concentrationPercent: matchedFormula?.defaultConcentration || prev.concentrationPercent || 20,
    }));
  };

  const handleSubmitProduction = async (e) => {
    e.preventDefault();
    if (!productionForm.formulaId) {
      showError(
        lang === 'ar' ? 'تركيبة غير محددة' : 'No Formula Available',
        lang === 'ar' ? 'لا توجد تركيبة نشطة لهذا العطر، يرجى تسجيل تركيبة أولاً.' : 'No active recipe found for this fragrance.'
      );
      return;
    }

    if (previewData?.hasShortage) {
      const confirmShortage = await showConfirm(
        lang === 'ar' ? 'تنبيه نقص في المواد الخام' : 'Raw Material Shortage Alert',
        lang === 'ar' 
          ? 'المخزون الحالي لبعض الزيوت أو الكحول غير كافٍ لهذه الكمية. هل تريد المتابعة على أية حال؟'
          : 'Some raw materials are below required quantities. Do you still wish to proceed?',
        lang === 'ar' ? 'متابعة الإنتاج' : 'Proceed Anyway',
        lang === 'ar' ? 'إلغاء' : 'Cancel'
      );
      if (!confirmShortage) return;
    }

    setSubmitting(true);
    try {
      await createBatch({
        formulaId: productionForm.formulaId,
        fragranceId: productionForm.fragranceId,
        finalBatchWeight: Number(productionForm.totalWeightGrams),
        concentrationPercent: Number(productionForm.concentrationPercent),
        alcoholRawMaterialId: productionForm.alcoholRawMaterialId || undefined,
        productionDate: productionForm.productionDate,
        notes: productionForm.notes,
      });

      showSuccess(
        lang === 'ar' ? 'تم الإنتاج بنجاح' : 'Production Completed',
        lang === 'ar' 
          ? `تم خلط وتشغيل ${productionForm.totalWeightGrams} جرام وإضافتها لمخزون العطر السائل مباشرة!`
          : `Produced ${productionForm.totalWeightGrams}g and updated finished liquid inventory!`
      );

      setShowProductionModal(false);
      fetchData();
    } catch (err) {
      showError(
        lang === 'ar' ? 'خطأ في الإنتاج' : 'Production Error',
        err.response?.data?.message || (lang === 'ar' ? 'تعذر إتمام تشغيلة الإنتاج' : 'Failed to execute production batch')
      );
    } finally {
      setSubmitting(false);
    }
  };

  // KPIs
  const totalGramsInStock = liquidInventory.reduce((sum, item) => sum + (Number(item.finishedLiquidGrams) || 0), 0);
  const totalLiquidValuation = liquidInventory.reduce((sum, item) => sum + (Number(item.totalValue) || 0), 0);
  const lowStockCount = liquidInventory.filter(item => item.isLowStock).length;
  const filteredInventory = liquidInventory.filter(item => 
    !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-sm bg-[#174F43] text-white flex items-center justify-center shrink-0">
            <Droplets size={20} strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {lang === 'ar' ? 'مخزون العطور السائلة' : 'Finished Liquid Inventory'}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {lang === 'ar' 
                ? 'متابعة كمية العطور المجهزة بالجرام، معادل الزجاجات، وتسجيل تشغيلات الإنتاج بضغطة واحدة.'
                : 'Bulk finished perfume liquid in grams, bottle equivalents, and one-click production batches.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => handleOpenProduction()}
            className="px-4 py-2 rounded-sm bg-[#174F43] hover:bg-[#0F3830] text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-xs"
          >
            <Plus size={15} />
            <span>{lang === 'ar' ? 'تشغيلة إنتاج جديدة' : 'New Production Batch'}</span>
          </button>

          <button
            onClick={fetchData}
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
            {lang === 'ar' ? 'إجمالي السائل المتوفر' : 'Total Bulk Liquid Stock'}
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-2xl font-bold text-[#174F43] font-mono">
              {(totalGramsInStock / 1000).toFixed(2)}
            </h3>
            <span className="text-xs text-slate-400">
              {lang === 'ar' ? `كجم (${totalGramsInStock.toLocaleString()} جم)` : `kg (${totalGramsInStock.toLocaleString()} g)`}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-sm p-4 border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">
            {lang === 'ar' ? 'قيمة مخزون العطور السائلة' : 'Liquid Stock Valuation'}
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-2xl font-bold text-emerald-700 font-mono">
              {formatCurrency(Math.round(totalLiquidValuation))}
            </h3>
          </div>
        </div>

        <div className="bg-white rounded-sm p-4 border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">
            {lang === 'ar' ? 'عطور تحت المراقبة' : 'Monitored Fragrances'}
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-2xl font-bold text-slate-900 font-mono">
              {liquidInventory.length}
            </h3>
            <span className="text-xs text-slate-400">{lang === 'ar' ? 'عطر' : 'scents'}</span>
          </div>
        </div>

        <div className={`rounded-sm p-4 border shadow-xs transition-colors ${
          lowStockCount > 0 ? 'bg-amber-50/70 border-amber-200' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium block ${lowStockCount > 0 ? 'text-amber-800' : 'text-slate-500'}`}>
              {lang === 'ar' ? 'تنبيهات نقص السائل' : 'Low Liquid Warnings'}
            </span>
            {lowStockCount > 0 && <AlertTriangle size={16} className="text-amber-600" />}
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className={`text-2xl font-bold font-mono ${lowStockCount > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
              {lowStockCount}
            </h3>
            <span className="text-xs text-slate-400">{lang === 'ar' ? 'عطور' : 'scents'}</span>
          </div>
        </div>
      </div>

      {/* Fragrance Liquid Overview Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Layers size={16} className="text-[#174F43]" />
            <span>{lang === 'ar' ? 'أرصدة العطور السائلة ومعادل الزجاجات' : 'Fragrance Bulk Stocks & Bottle Equivalents'}</span>
          </h2>

          <div className="w-64">
            <div className="relative">
              <input
                type="text"
                placeholder={lang === 'ar' ? 'بحث باسم العطر...' : 'Search fragrance...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pr-8 pl-3 bg-white border border-slate-200 rounded-sm text-xs outline-none focus:border-[#174F43]"
              />
              <Search size={13} className={`absolute top-2.5 text-slate-400 ${isRTL ? 'right-2.5' : 'left-auto right-2.5'}`} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInventory.map((item) => {
            const stockGrams = Number(item.finishedLiquidGrams) || 0;
            const costPerGram = Number(item.finishedLiquidCostPerGram) || 0;
            const density = item.liquidDensity || 0.86;

            return (
              <div 
                key={item.fragranceId} 
                className={`bg-white rounded-sm border p-4 shadow-xs flex flex-col justify-between transition-colors ${
                  item.isLowStock ? 'border-amber-300' : 'border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{item.name}</h3>
                      <p className="text-[11px] text-slate-400 capitalize">
                        {item.fragranceFamily || 'Fine Fragrance'} • {item.gender || 'Unisex'}
                      </p>
                    </div>
                    {item.isLowStock ? (
                      <span className="px-2 py-0.5 rounded-sm bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold flex items-center gap-1">
                        <AlertTriangle size={11} />
                        {lang === 'ar' ? 'منخفض' : 'Low'}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-sm bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                        {lang === 'ar' ? 'متوفر' : 'In Stock'}
                      </span>
                    )}
                  </div>

                  {/* Stock Metrics */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-sm my-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 font-medium">
                        {lang === 'ar' ? 'السائل المتاح:' : 'Available Liquid:'}
                      </span>
                      <span className="font-mono text-base font-bold text-slate-900">
                        {stockGrams.toLocaleString()} <span className="text-xs font-normal text-slate-500">g</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">
                        {lang === 'ar' ? 'تكلفة الجرام:' : 'Cost / Gram:'}
                      </span>
                      <span className="font-mono font-semibold text-slate-700">
                        {costPerGram ? `${costPerGram.toFixed(3)} EGP` : '0.00 EGP'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200">
                      <span className="text-slate-500 font-medium">
                        {lang === 'ar' ? 'إجمالي القيمة:' : 'Liquid Value:'}
                      </span>
                      <span className="font-mono font-bold text-emerald-700">
                        {formatCurrency(Math.round(item.totalValue || 0))}
                      </span>
                    </div>
                  </div>

                  {/* Bottle Equivalents */}
                  <div className="space-y-1 mb-4">
                    <span className="text-[11px] font-medium text-slate-400 block">
                      {lang === 'ar' ? `المعادل التقديري للزجاجات (كثافة ${density} g/ml):` : `Bottle Equivalents (density ${density} g/ml):`}
                    </span>
                    <div className="grid grid-cols-3 gap-1.5 text-center">
                      <div className="bg-slate-50 p-2 rounded-sm border border-slate-200">
                        <span className="block text-[10px] text-slate-500">30ml</span>
                        <span className="text-xs font-bold text-slate-800 font-mono">
                          {item.approxBottles?.['30ml'] || 0}
                        </span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-sm border border-slate-200">
                        <span className="block text-[10px] text-slate-500">50ml</span>
                        <span className="text-xs font-bold text-slate-800 font-mono">
                          {item.approxBottles?.['50ml'] || 0}
                        </span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-sm border border-slate-200">
                        <span className="block text-[10px] text-slate-500">100ml</span>
                        <span className="text-xs font-bold text-slate-800 font-mono">
                          {item.approxBottles?.['100ml'] || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenProduction(item)}
                  className="w-full py-2 bg-[#174F43] hover:bg-[#0F3830] text-white text-xs font-semibold rounded-sm flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus size={14} />
                  <span>{lang === 'ar' ? 'تشغيل إنتاج لهذا العطر' : 'Produce Batch for Scent'}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Production History Table */}
      <div className="space-y-3 pt-4">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Clock size={16} className="text-[#174F43]" />
          <span>{lang === 'ar' ? 'سجل تشغيلات الإنتاج الأخيرة' : 'Recent Production Batches Log'}</span>
        </h2>

        <div className="bg-white rounded-sm border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className={`py-3 px-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {lang === 'ar' ? 'كود التشغيلة' : 'Batch Code'}
                  </th>
                  <th className={`py-3 px-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {lang === 'ar' ? 'اسم العطر' : 'Fragrance'}
                  </th>
                  <th className="py-3 px-4 text-center">
                    {lang === 'ar' ? 'الكمية المنتجة' : 'Batch Weight'}
                  </th>
                  <th className="py-3 px-4 text-center">
                    {lang === 'ar' ? 'التركيز' : 'Concentration'}
                  </th>
                  <th className="py-3 px-4 text-center">
                    {lang === 'ar' ? 'التكلفة الإجمالية' : 'Total Batch Cost'}
                  </th>
                  <th className="py-3 px-4 text-center">
                    {lang === 'ar' ? 'تكلفة الجرام' : 'Cost / Gram'}
                  </th>
                  <th className="py-3 px-4 text-center">
                    {lang === 'ar' ? 'تاريخ الإنتاج' : 'Date'}
                  </th>
                  <th className="py-3 px-4 text-center">
                    {lang === 'ar' ? 'الحالة' : 'Status'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-normal">
                {batchesHistory.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-8 text-center text-slate-400">
                      {lang === 'ar' ? 'لا توجد تشغيلات إنتاج مسجلة بعد.' : 'No production batches recorded yet.'}
                    </td>
                  </tr>
                ) : (
                  batchesHistory.map((b) => (
                    <tr key={b._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        {b.batchNumber || b.batchCode || '—'}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {b.fragrance?.name || b.formula?.name || '—'}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-900">
                        {(b.finalBatchWeight || b.totalWeightGrams || 0).toLocaleString()} g
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-600">
                        {b.concentration || b.concentrationPercent || 20}%
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-emerald-700">
                        {formatCurrency(Math.round(b.totalBatchCost || 0))}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-700">
                        {(b.costPerGram || 0).toFixed(3)} EGP
                      </td>
                      <td className="py-3 px-4 text-center text-slate-500 font-mono text-[11px]">
                        {b.productionDate ? new Date(b.productionDate).toISOString().split('T')[0] : '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-sm bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                          {lang === 'ar' ? 'تم الخلط والتوريد' : 'Confirmed'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* One-Click New Production Modal */}
      {showProductionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl bg-white rounded-sm border border-slate-200 shadow-xl z-10 max-h-[92vh] overflow-y-auto">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-[#174F43] text-white flex items-center justify-between">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <FlaskConical size={16} />
                <span>{lang === 'ar' ? 'تشغيلة إنتاج عطر جديدة (New Production)' : 'New Fragrance Production Batch'}</span>
              </h2>
              <button onClick={() => setShowProductionModal(false)} className="p-1 text-white/80 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitProduction} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {lang === 'ar' ? 'اختر العطر المطلوب إنتاجه *' : 'Target Fragrance *'}
                  </label>
                  <select
                    required
                    value={productionForm.fragranceId}
                    onChange={(e) => handleFragranceChange(e.target.value)}
                    className="w-full h-9 bg-white border border-slate-200 rounded-sm px-2 text-xs font-semibold outline-none focus:border-[#174F43]"
                  >
                    {liquidInventory.map(item => (
                      <option key={item.fragranceId} value={item.fragranceId}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {lang === 'ar' ? 'التركيبة المسجلة *' : 'Formula / Recipe *'}
                  </label>
                  <select
                    required
                    value={productionForm.formulaId}
                    onChange={(e) => setProductionForm({ ...productionForm, formulaId: e.target.value })}
                    className="w-full h-9 bg-white border border-slate-200 rounded-sm px-2 text-xs font-medium outline-none focus:border-[#174F43]"
                  >
                    {formulas
                      .filter(f => !productionForm.fragranceId || String(f.fragrance?._id || f.fragrance) === String(productionForm.fragranceId))
                      .map(f => (
                        <option key={f._id} value={f._id}>
                          {f.name} (v{f.version || 1}) - {f.defaultConcentration || 20}%
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {lang === 'ar' ? 'الوزن الإجمالي للتشغيلة (جرام) *' : 'Total Batch Weight (grams) *'}
                  </label>
                  <input
                    type="number"
                    step="10"
                    min="100"
                    required
                    value={productionForm.totalWeightGrams}
                    onChange={(e) => setProductionForm({ ...productionForm, totalWeightGrams: e.target.value })}
                    placeholder="2000"
                    className="w-full h-9 bg-white border border-slate-200 rounded-sm px-3 text-xs font-mono font-bold outline-none focus:border-[#174F43]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {lang === 'ar' ? 'نسبة تركيز الزيت (%) *' : 'Oil Concentration (%) *'}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="5"
                    max="50"
                    required
                    value={productionForm.concentrationPercent}
                    onChange={(e) => setProductionForm({ ...productionForm, concentrationPercent: e.target.value })}
                    placeholder="20"
                    className="w-full h-9 bg-white border border-slate-200 rounded-sm px-3 text-xs font-mono font-bold outline-none focus:border-[#174F43]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {lang === 'ar' ? 'تاريخ الإنتاج' : 'Production Date'}
                  </label>
                  <input
                    type="date"
                    required
                    value={productionForm.productionDate}
                    onChange={(e) => setProductionForm({ ...productionForm, productionDate: e.target.value })}
                    className="w-full h-9 bg-white border border-slate-200 rounded-sm px-2 text-xs outline-none"
                  />
                </div>
              </div>

              {/* Alcohol Selection */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {lang === 'ar' ? 'مادة الكحول المستخدمة' : 'Alcohol Raw Material'}
                </label>
                <select
                  value={productionForm.alcoholRawMaterialId}
                  onChange={(e) => setProductionForm({ ...productionForm, alcoholRawMaterialId: e.target.value })}
                  className="w-full h-9 bg-white border border-slate-200 rounded-sm px-2 text-xs font-medium outline-none"
                >
                  {alcoholMaterials.map(m => (
                    <option key={m._id} value={m._id}>
                      {m.name} (متوفر: {m.currentStock} {m.unit || 'g'} - {m.costPerGram?.toFixed(3)} EGP/g)
                    </option>
                  ))}
                </select>
              </div>

              {/* Live Recipe Breakdown & Inventory Availability Preview */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-sm space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Sparkles size={14} className="text-[#174F43]" />
                    {lang === 'ar' ? 'حسابات التركيبة وتوافر المخزون تلقائياً:' : 'Automated Recipe & Stock Availability Preview:'}
                  </span>
                  {previewLoading && (
                    <RefreshCw size={12} className="animate-spin text-[#174F43]" />
                  )}
                </div>

                {previewData ? (
                  <div className="space-y-2">
                    {/* Summary row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px]">
                      <div className="bg-white p-2 rounded-sm border border-slate-200">
                        <span className="text-slate-400 block">{lang === 'ar' ? 'وزن الزيوت' : 'Oils Weight'}</span>
                        <span className="font-bold font-mono text-slate-800">{previewData.fragranceOilWeight} g</span>
                      </div>
                      <div className="bg-white p-2 rounded-sm border border-slate-200">
                        <span className="text-slate-400 block">{lang === 'ar' ? 'وزن الكحول' : 'Alcohol Weight'}</span>
                        <span className="font-bold font-mono text-slate-800">{previewData.alcoholWeight} g</span>
                      </div>
                      <div className="bg-white p-2 rounded-sm border border-slate-200">
                        <span className="text-slate-400 block">{lang === 'ar' ? 'إجمالي التكلفة' : 'Batch Cost'}</span>
                        <span className="font-bold font-mono text-emerald-700">{previewData.totalBatchCost} EGP</span>
                      </div>
                      <div className="bg-white p-2 rounded-sm border border-slate-200">
                        <span className="text-slate-400 block">{lang === 'ar' ? 'تكلفة الجرام' : 'Cost / Gram'}</span>
                        <span className="font-bold font-mono text-slate-800">{previewData.costPerGram} EGP</span>
                      </div>
                    </div>

                    {/* Shortage Warning */}
                    {previewData.hasShortage && (
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-sm text-amber-800 text-[11px] flex items-start gap-2">
                        <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block">
                            {lang === 'ar' ? 'تنبيه: عجز في مخزون المواد الخام المطلوبة!' : 'Warning: Raw materials stock shortage!'}
                          </span>
                          <ul className="list-disc list-inside mt-1 space-y-0.5">
                            {previewData.shortages.map((s, idx) => (
                              <li key={idx}>
                                {s.materialName}: {lang === 'ar' ? 'مطلوب' : 'Required'} {s.requiredGrams}g, {lang === 'ar' ? 'متوفر' : 'Available'} {s.availableGrams}g ({lang === 'ar' ? 'عجز' : 'Shortage'}: {s.shortageGrams}g)
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Ingredients list */}
                    <div className="mt-2 max-h-36 overflow-y-auto space-y-1">
                      {previewData.ingredients?.map((ing, idx) => (
                        <div key={idx} className="flex items-center justify-between py-1 px-2 bg-white rounded-sm text-[11px] border border-slate-100">
                          <span className="font-medium text-slate-700">{ing.name} ({ing.percentage}%)</span>
                          <span className="font-mono text-slate-800 font-semibold">{ing.weightGrams} g</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-slate-400 text-xs">
                    {lang === 'ar' ? 'اختر التركيبة وحدد وزن التشغيلة لعرض المعاينة الفورية.' : 'Select formula and batch weight to see live breakdown.'}
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {lang === 'ar' ? 'ملاحظات التشغيلة' : 'Batch Notes'}
                </label>
                <textarea
                  rows="2"
                  value={productionForm.notes}
                  onChange={(e) => setProductionForm({ ...productionForm, notes: e.target.value })}
                  placeholder={lang === 'ar' ? 'تاريخ التعتيق، أي ملاحظات فنية...' : 'Maceration period, temperature, etc...'}
                  className="w-full bg-white border border-slate-200 rounded-sm p-2 text-xs outline-none focus:border-[#174F43]"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowProductionModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-sm hover:bg-slate-50 text-slate-700 font-medium"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submitting || !productionForm.formulaId}
                  className="px-6 py-2 bg-[#174F43] text-white rounded-sm hover:bg-[#0F3830] font-semibold disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>{lang === 'ar' ? 'جاري الخلط والتوريد...' : 'Executing Production...'}</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>{lang === 'ar' ? 'تأكيد الإنتاج وإضافة المخزون' : 'Confirm & Produce Batch'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
