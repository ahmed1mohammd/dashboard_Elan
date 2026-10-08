import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, Download, RefreshCw, Calendar, 
  TrendingUp, DollarSign, Package, Layers, PieChart as PieIcon,
  ArrowUpRight, ArrowDownRight, CheckCircle2, ChevronDown
} from 'lucide-react';
import { 
  getProfitAndLoss, getSalesByFragranceReport, 
  getBatchHistoryReport, getInventoryValuation 
} from '../services/api';
import { showWarning, showToast } from '../utils/swal';


export default function ReportsPage() {
  const [plData, setPlData] = useState({});
  const [fragranceReport, setFragranceReport] = useState([]);
  const [batchReport, setBatchReport] = useState([]);
  const [inventoryValuation, setInventoryValuation] = useState({});
  const [loading, setLoading] = useState(true);

  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  });

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [pl, frag, batch, inv] = await Promise.all([
        getProfitAndLoss(dateRange).catch(() => ({})),
        getSalesByFragranceReport(dateRange).catch(() => []),
        getBatchHistoryReport().catch(() => []),
        getInventoryValuation().catch(() => ({})),
      ]);
      setPlData(pl || {});
      setFragranceReport(Array.isArray(frag) ? frag : []);
      setBatchReport(Array.isArray(batch) ? batch : []);
      setInventoryValuation(inv || {});
    } catch (err) {
      console.error('Error loading reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleApplyDateFilter = (e) => {
    e.preventDefault();
    fetchReports();
  };

  const handleExportCSV = (data, filename) => {
    if (!data || data.length === 0) {
      showWarning('تنبيه', 'لا توجد بيانات متاحة للتصدير');
      return;
    }
    
    // Simple CSV generator
    const keys = Object.keys(data[0]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + keys.join(",") + "\n"
      + data.map(row => keys.map(k => `"${row[k] || ''}"`).join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 text-right font-['Tajawal',sans-serif]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-[#03204E] flex items-center gap-2">
            <FileSpreadsheet size={20} strokeWidth={1.5} className="text-[#03204E]" />
            <span>التقارير التحليلية وبيان الأرباح (P&L & Analytics Reports)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            قوائم الدخل (P&L)، أرباح كل عطر وحجم، تاريخ تكاليف التشغيلات، وتقييم المخزون الرأسمالي.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => handleExportCSV(fragranceReport, 'elan_sales_by_fragrance')}
            className="px-3.5 py-2 rounded-sm bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors duration-150 h-9"
          >
            <Download size={14} />
            <span>تصدير تقرير العطور (CSV)</span>
          </button>

          <button
            onClick={fetchReports}
            className="p-2 rounded-sm border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
            title="تحديث"
          >
            <RefreshCw size={14} strokeWidth={1.5} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <form onSubmit={handleApplyDateFilter} className="bg-white rounded-sm p-3.5 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 flex items-center gap-1">
              <Calendar size={13} />
              من تاريخ:
            </span>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="h-8 bg-[#F8FAFC] border border-slate-200 rounded-sm px-2 text-xs outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">إلى تاريخ:</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="h-8 bg-[#F8FAFC] border border-slate-200 rounded-sm px-2 text-xs outline-none"
            />
          </div>

          <button
            type="submit"
            className="px-4 h-8 bg-[#03204E] text-white rounded-sm hover:bg-[#02183b] transition-colors"
          >
            تطبيق
          </button>
        </div>

        <span className="text-slate-400 text-[11px]">
          تحديث مباشر من قاعدة البيانات
        </span>
      </form>

      {/* 1. Profit & Loss Statement (P&L) */}
      <div className="bg-white rounded-sm border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <h2 className="text-sm font-bold text-[#03204E] flex items-center gap-2">
            <DollarSign size={16} />
            <span>قائمة الدخل والأرباح (Profit & Loss Statement)</span>
          </h2>
          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-sm text-[11px] font-mono font-semibold border border-emerald-200">
            صافي الهامش: {plData.netMarginPercentage || 0}%
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-3.5 bg-[#F8FAFC] rounded-sm border border-slate-200">
            <span className="text-slate-500 text-xs block">إجمالي الإيرادات (Revenue)</span>
            <h3 className="text-xl font-bold text-slate-900 font-mono mt-1">
              {Math.round(plData.revenue || 0).toLocaleString()} ج.م
            </h3>
            <span className="text-[10px] text-slate-400 block mt-0.5">من الطلبات المكتملة والمسددة</span>
          </div>

          <div className="p-3.5 bg-[#F8FAFC] rounded-sm border border-slate-200">
            <span className="text-slate-500 text-xs block">تكلفة البضاعة المباعة (COGS)</span>
            <h3 className="text-xl font-bold text-slate-800 font-mono mt-1">
              {Math.round(plData.cogs || 0).toLocaleString()} ج.م
            </h3>
            <span className="text-[10px] text-slate-400 block mt-0.5">تكلفة السائل + زجاج + تغليف</span>
          </div>

          <div className="p-3.5 bg-[#F8FAFC] rounded-sm border border-slate-200">
            <span className="text-slate-500 text-xs block">المصروفات التشغيلية (OpEx)</span>
            <h3 className="text-xl font-bold text-[#b91c1c] font-mono mt-1">
              {Math.round(plData.operatingExpenses || 0).toLocaleString()} ج.م
            </h3>
            <span className="text-[10px] text-slate-400 block mt-0.5">تسويق، رواتب، تشغيل</span>
          </div>

          <div className="p-3.5 bg-[#03204E] text-white rounded-sm border border-[#03204E]">
            <span className="text-white/70 text-xs block">صافي الربح الفعلي (Net Profit)</span>
            <h3 className="text-xl font-bold text-white font-mono mt-1">
              {Math.round(plData.netProfit || 0).toLocaleString()} ج.م
            </h3>
            <span className="text-[10px] text-white/70 block mt-0.5">
              مجمل الربح: {Math.round(plData.grossProfit || 0).toLocaleString()} ج.م ({plData.grossMarginPercentage || 0}%)
            </span>
          </div>
        </div>
      </div>

      {/* 2. Sales & Margin By Fragrance Report Table */}
      <div className="bg-white rounded-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-[#F8FAFC] flex justify-between items-center">
          <h2 className="text-sm font-bold text-[#03204E] flex items-center gap-1.5">
            <Package size={16} />
            <span>مبيعات وهوامش ربح العطور (Sales & Profit by Fragrance)</span>
          </h2>
          <span className="text-xs text-slate-500 font-mono">{fragranceReport.length} منتجات</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#F8FAFC] text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">اسم العطر</th>
                <th className="py-3 px-4 text-center">القطع المباعة</th>
                <th className="py-3 px-4 text-center">إجمالي الإيرادات</th>
                <th className="py-3 px-4 text-center">إجمالي تكلفة الإنتاج (COGS)</th>
                <th className="py-3 px-4 text-center">مجمل الربح (Gross Profit)</th>
                <th className="py-3 px-4 text-center">هامش الربح (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
              {fragranceReport.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400">
                    لا توجد مبيعات مسجلة في هذه الفترة.
                  </td>
                </tr>
              ) : (
                fragranceReport.map((item, idx) => {
                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {item.productName}
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                        {item.unitsSold} قطعة
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-900">
                        {Math.round(item.revenue || 0).toLocaleString()} ج.م
                      </td>

                      <td className="py-3 px-4 text-center font-mono text-slate-600">
                        {Math.round(item.cogs || 0).toLocaleString()} ج.م
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-bold text-[#15803d]">
                        +{Math.round(item.grossProfit || 0).toLocaleString()} ج.م
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-bold">
                        <span className="px-2 py-0.5 rounded-sm bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px]">
                          {item.grossMarginPercentage}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Inventory Valuation Summary */}
      <div className="bg-white rounded-sm border border-slate-200 p-5 space-y-3">
        <h2 className="text-sm font-bold text-[#03204E] pb-2 border-b border-slate-200">
          تقييم رأس المال المستثمر في المخزون (Inventory Capital Valuation)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-sm">
            <span className="text-xs text-slate-500 block">قيمة مخزون المواد الخام والزيوت:</span>
            <span className="text-lg font-bold font-mono text-slate-900 block mt-1">
              {Math.round(inventoryValuation.rawMaterialsValue || 0).toLocaleString()} ج.م
            </span>
          </div>

          <div className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-sm">
            <span className="text-xs text-slate-500 block">تكلفة مخزون المنتجات التامة بالمخزن:</span>
            <span className="text-lg font-bold font-mono text-slate-900 block mt-1">
              {Math.round(inventoryValuation.finishedProductsCostValue || 0).toLocaleString()} ج.م
            </span>
          </div>

          <div className="p-3 bg-[#03204E] text-white border border-[#03204E] rounded-sm">
            <span className="text-xs text-white/70 block">إجمالي رأس المال المحتجز بالمخزون:</span>
            <span className="text-lg font-bold font-mono text-white block mt-1">
              {Math.round(inventoryValuation.totalCombinedCostValue || 0).toLocaleString()} ج.م
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
