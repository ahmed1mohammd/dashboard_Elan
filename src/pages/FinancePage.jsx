import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  DollarSign, CreditCard, Smartphone, TrendingUp, TrendingDown,
  Plus, RefreshCw, X, Save, Check, Calculator, Package, 
  Receipt, Wallet, Calendar, AlertCircle, ArrowUpRight, ArrowDownLeft,
  Settings, Sliders, Truck, Layers, ShieldCheck, Building2,
  RotateCcw, CheckCircle2, XCircle, Clock, Undo2, ExternalLink
} from 'lucide-react';
import { 
  getFinanceOverview, getCostSettings, updateCostSettings, 
  adjustCashAccount 
} from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { showSuccess, showError, showToast } from '../utils/swal';

const DATE_PRESETS = [
  { key: 'today', labelEn: 'Today', labelAr: 'اليوم' },
  { key: 'yesterday', labelEn: 'Yesterday', labelAr: 'أمس' },
  { key: 'this_week', labelEn: 'This Week', labelAr: 'هذا الأسبوع' },
  { key: 'this_month', labelEn: 'This Month', labelAr: 'هذا الشهر' },
  { key: 'last_month', labelEn: 'Last Month', labelAr: 'الشهر الماضي' },
  { key: 'this_year', labelEn: 'This Year', labelAr: 'هذا العام' },
  { key: 'all', labelEn: 'All Time', labelAr: 'الكل' },
];

export default function FinancePage() {
  const { lang, isRTL, t, formatCurrency } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('this_month');
  const [customDates, setCustomDates] = useState({ startDate: '', endDate: '' });
  const [data, setData] = useState(null);

  // Cost Settings Modal
  const [showCostModal, setShowCostModal] = useState(false);
  const [costForm, setCostForm] = useState({
    bottleWithCapSprayer: 45,
    sticker: 20,
    box: 25,
    marketingPerBottle: 20,
    defaultLiquidDensity: 0.86,
  });
  const [savingCosts, setSavingCosts] = useState(false);

  // Cash Adjustment Modal
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [adjustForm, setAdjustForm] = useState({
    amount: '',
    type: 'deposit', // deposit or withdrawal
    reason: '',
  });
  const [submittingAdjust, setSubmittingAdjust] = useState(false);

  const fetchFinanceData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (period === 'custom' && customDates.startDate && customDates.endDate) {
        params.startDate = customDates.startDate;
        params.endDate = customDates.endDate;
      } else {
        params.preset = period;
      }

      const overview = await getFinanceOverview(params);
      setData(overview);

      if (overview.costDefaults) {
        setCostForm({
          bottleWithCapSprayer: overview.costDefaults.bottleWithCapSprayer ?? 45,
          sticker: overview.costDefaults.sticker ?? 20,
          box: overview.costDefaults.box ?? 25,
          marketingPerBottle: overview.costDefaults.marketingPerBottle ?? 20,
          defaultLiquidDensity: overview.costDefaults.defaultLiquidDensity ?? 0.86,
        });
      }
    } catch (err) {
      console.error('Error fetching finance overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
  }, [period]);

  const handleCustomDateSubmit = (e) => {
    e.preventDefault();
    if (customDates.startDate && customDates.endDate) {
      setPeriod('custom');
      fetchFinanceData();
    }
  };

  const handleSaveCosts = async (e) => {
    e.preventDefault();
    setSavingCosts(true);
    try {
      const updated = await updateCostSettings({
        bottleWithCapSprayer: Number(costForm.bottleWithCapSprayer),
        sticker: Number(costForm.sticker),
        box: Number(costForm.box),
        marketingPerBottle: Number(costForm.marketingPerBottle),
        defaultLiquidDensity: Number(costForm.defaultLiquidDensity),
      });

      showSuccess(
        lang === 'ar' ? 'تم الحفظ بنجاح' : 'Settings Saved',
        lang === 'ar' ? 'تم تحديث التكاليف الافتراضية لحساب هوامش المنتجات تلقائياً' : 'Automated product cost calculation defaults updated'
      );
      setShowCostModal(false);
      fetchFinanceData();
    } catch (err) {
      showError(
        lang === 'ar' ? 'خطأ' : 'Error',
        err.response?.data?.message || (lang === 'ar' ? 'تعذر حفظ الإعدادات' : 'Failed to update cost settings')
      );
    } finally {
      setSavingCosts(false);
    }
  };

  const handleOpenAdjust = (account) => {
    setSelectedAccount(account);
    setAdjustForm({
      amount: '',
      type: 'deposit',
      reason: '',
    });
    setShowAdjustModal(true);
  };

  const handleSubmitAdjust = async (e) => {
    e.preventDefault();
    if (!selectedAccount) return;
    const amt = Number(adjustForm.amount);
    if (isNaN(amt) || amt <= 0) {
      showError(
        lang === 'ar' ? 'مبلغ غير صالح' : 'Invalid Amount',
        lang === 'ar' ? 'يرجى إدخال مبلغ صحيح أكبر من الصفر' : 'Please enter an amount greater than 0'
      );
      return;
    }

    setSubmittingAdjust(true);
    try {
      await adjustCashAccount(selectedAccount.id || selectedAccount._id, {
        amount: amt,
        type: adjustForm.type,
        reason: adjustForm.reason,
      });

      showSuccess(
        lang === 'ar' ? 'تمت التسوية بنجاح' : 'Balance Adjusted',
        lang === 'ar' ? 'تم تحديث رصيد الخزينة وتسجيل الحركة' : 'Account balance adjusted and audit record logged'
      );
      setShowAdjustModal(false);
      fetchFinanceData();
    } catch (err) {
      showError(
        lang === 'ar' ? 'خطأ' : 'Error',
        err.response?.data?.message || (lang === 'ar' ? 'تعذر تعديل الرصيد' : 'Failed to adjust account balance')
      );
    } finally {
      setSubmittingAdjust(false);
    }
  };

  const summary = data?.summary || {
    grossSales: 0,
    cogs: 0,
    grossProfit: 0,
    grossProfitMargin: 0,
    operatingExpenses: 0,
    shippingAndTransportExpenses: 0,
    netProfit: 0,
    netProfitMargin: 0,
    totalOrdersCount: 0,
    returnedOrdersCount: 0,
    totalReturnShippingExpenses: 0,
    outboundReturnShipping: 0,
    inboundReturnShipping: 0,
    returnShippingProfitImpact: 0,
  };

  const returnedShipments = data?.returnedShipments || {
    count: 0,
    totalCost: 0,
    outboundCost: 0,
    returnCost: 0,
    orders: [],
  };

  const cashBalances = data?.cashBalances || { total: 0, accounts: [] };
  const outstanding = data?.outstanding || {
    customerPayments: 0,
    customerOrdersCount: 0,
    supplierPayments: 0,
    unpaidInvoicesCount: 0,
  };
  const inventoryValuation = data?.inventoryValuation || {
    rawMaterialsValue: 0,
    finishedLiquidValue: 0,
    totalInventoryValue: 0,
  };

  const getAccountIcon = (type) => {
    switch (type) {
      case 'vodafone_cash':
      case 'mobile_wallet':
        return <Smartphone size={16} className="text-rose-600" />;
      case 'instapay':
        return <ArrowUpRight size={16} className="text-purple-600" />;
      case 'bank_account':
        return <Building2 size={16} className="text-blue-600" />;
      case 'payment_gateway':
        return <CreditCard size={16} className="text-emerald-600" />;
      case 'cash_on_delivery':
      case 'cash_in_hand':
      default:
        return <Wallet size={16} className="text-amber-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-sm bg-[#174F43] text-white flex items-center justify-center shrink-0">
            <DollarSign size={20} strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {lang === 'ar' ? 'نظرة عامة على المالية والأرباح' : 'Finance & Profit Overview'}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {lang === 'ar'
                ? 'متابعة المبيعات، تكلفة البضاعة المباعة (COGS)، صافي الأرباح، وأرصدة الخزائن وحسابات الدفع.'
                : 'Real-time sales, automated COGS, net profit margins, cash accounts, and payables.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setShowCostModal(true)}
            className="px-3.5 py-2 rounded-sm border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Sliders size={14} />
            <span>{lang === 'ar' ? 'إعدادات التكاليف التلقائية' : 'Cost Defaults Settings'}</span>
          </button>

          <button
            onClick={fetchFinanceData}
            className="p-2 rounded-sm border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-xs"
            title={lang === 'ar' ? 'تحديث' : 'Refresh'}
          >
            <RefreshCw size={15} strokeWidth={1.5} className={loading ? 'animate-spin text-[#174F43]' : ''} />
          </button>
        </div>
      </div>

      {/* Date Presets Filter Bar */}
      <div className="bg-white rounded-sm p-3 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1 shrink-0 mr-1">
            <Calendar size={13} />
            {lang === 'ar' ? 'الفترة:' : 'Period:'}
          </span>
          {DATE_PRESETS.map((p) => {
            const isActive = period === p.key;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-colors shrink-0 ${
                  isActive
                    ? 'bg-[#174F43] text-white font-semibold shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {lang === 'ar' ? p.labelAr : p.labelEn}
              </button>
            );
          })}
        </div>

        {/* Custom date range form */}
        <form onSubmit={handleCustomDateSubmit} className="flex items-center gap-2">
          <input
            type="date"
            value={customDates.startDate}
            onChange={(e) => setCustomDates({ ...customDates, startDate: e.target.value })}
            className="h-8 bg-slate-50 border border-slate-200 rounded-sm px-2 text-xs outline-none text-slate-700 font-mono"
          />
          <span className="text-slate-400 text-xs">-</span>
          <input
            type="date"
            value={customDates.endDate}
            onChange={(e) => setCustomDates({ ...customDates, endDate: e.target.value })}
            className="h-8 bg-slate-50 border border-slate-200 rounded-sm px-2 text-xs outline-none text-slate-700 font-mono"
          />
          <button
            type="submit"
            className="px-3 h-8 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-sm transition-colors"
          >
            {lang === 'ar' ? 'تطبيق' : 'Apply'}
          </button>
        </form>
      </div>

      {/* Primary Financial Performance KPIs (P&L Breakdown) */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        {/* Gross Sales */}
        <div className="bg-white rounded-sm p-4 border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">
            {lang === 'ar' ? 'إجمالي المبيعات' : 'Gross Sales'}
          </span>
          <div className="mt-1">
            <h3 className="text-xl font-bold text-slate-900 font-mono">
              {formatCurrency(Math.round(summary.grossSales))}
            </h3>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              {summary.totalOrdersCount} {lang === 'ar' ? 'طلب مؤكد' : 'orders'}
            </span>
          </div>
        </div>

        {/* Cost of Goods Sold (COGS) */}
        <div className="bg-white rounded-sm p-4 border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">
            {lang === 'ar' ? 'تكلفة البضاعة المباعة (COGS)' : 'Cost of Goods Sold'}
          </span>
          <div className="mt-1">
            <h3 className="text-xl font-bold text-slate-800 font-mono">
              {formatCurrency(Math.round(summary.cogs))}
            </h3>
            <span className="text-[10px] text-slate-400 block mt-0.5 truncate" title="Liquid + Bottle + Sticker + Box + Marketing">
              {lang === 'ar' ? 'سائل + زجاجة + علبة + تسويق' : 'Liquid + packaging + mkt'}
            </span>
          </div>
        </div>

        {/* Gross Profit */}
        <div className="bg-white rounded-sm p-4 border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">
            {lang === 'ar' ? 'مجمل الربح' : 'Gross Profit'}
          </span>
          <div className="mt-1">
            <h3 className="text-xl font-bold text-[#174F43] font-mono">
              {formatCurrency(Math.round(summary.grossProfit))}
            </h3>
            <span className="text-[11px] text-emerald-600 font-semibold block mt-0.5 font-mono">
              {summary.grossProfitMargin}% {lang === 'ar' ? 'هامش' : 'margin'}
            </span>
          </div>
        </div>

        {/* Operating Expenses */}
        <div className="bg-white rounded-sm p-4 border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">
            {lang === 'ar' ? 'المصروفات التشغيلية' : 'Operating Expenses'}
          </span>
          <div className="mt-1">
            <h3 className="text-xl font-bold text-slate-800 font-mono">
              {formatCurrency(Math.round(summary.operatingExpenses))}
            </h3>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              {lang === 'ar' ? 'إعلانات، إيجار، مرافق' : 'Ads, rent, utilities'}
            </span>
          </div>
        </div>

        {/* Shipping & Transport */}
        <div className="bg-white rounded-sm p-4 border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">
            {lang === 'ar' ? 'مصاريف الشحن والنقل' : 'Shipping & Logistics'}
          </span>
          <div className="mt-1">
            <h3 className="text-xl font-bold text-slate-800 font-mono">
              {formatCurrency(Math.round(summary.shippingAndTransportExpenses))}
            </h3>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              {lang === 'ar' ? 'شحن طلبات + نقل' : 'Orders + transit'}
            </span>
          </div>
        </div>

        {/* Returned Orders Shipping Costs */}
        <div className="bg-white rounded-sm p-4 border border-amber-200/90 shadow-xs">
          <span className="text-xs text-amber-900 font-semibold flex items-center justify-between">
            <span>{lang === 'ar' ? 'تكاليف شحن المرتجعات' : 'Return Shipping'}</span>
            <RotateCcw size={13} className="text-amber-700" />
          </span>
          <div className="mt-1">
            <h3 className="text-xl font-bold text-amber-900 font-mono">
              {formatCurrency(Math.round(summary.totalReturnShippingExpenses))}
            </h3>
            <span className="text-[11px] text-amber-700 block mt-0.5 font-medium">
              {summary.returnedOrdersCount} {lang === 'ar' ? 'شحنة مرتجعة' : 'returns'}
            </span>
          </div>
        </div>

        {/* Net Profit */}
        <div className={`rounded-sm p-4 border shadow-xs ${
          summary.netProfit >= 0 ? 'bg-emerald-50/60 border-emerald-200' : 'bg-rose-50/60 border-rose-200'
        }`}>
          <span className={`text-xs font-semibold block ${summary.netProfit >= 0 ? 'text-emerald-900' : 'text-rose-900'}`}>
            {lang === 'ar' ? 'صافي الربح' : 'Net Profit'}
          </span>
          <div className="mt-1">
            <h3 className={`text-xl font-black font-mono ${summary.netProfit >= 0 ? 'text-emerald-800' : 'text-rose-700'}`}>
              {formatCurrency(Math.round(summary.netProfit))}
            </h3>
            <span className={`text-[11px] font-bold block mt-0.5 font-mono ${summary.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
              {summary.netProfitMargin}% {lang === 'ar' ? 'صافي الهامش' : 'net margin'}
            </span>
          </div>
        </div>
      </div>

      {/* Cash and Payment Accounts (Treasuries) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet size={16} className="text-[#174F43]" />
            <h2 className="text-sm font-bold text-slate-900">
              {lang === 'ar' ? 'الخزائن وحسابات الدفع المتاحة' : 'Cash & Payment Account Balances'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">
              {lang === 'ar' ? 'إجمالي السيولة المتاحة:' : 'Total Available Cash:'}
            </span>
            <span className="text-base font-bold font-mono text-[#174F43]">
              {formatCurrency(Math.round(cashBalances.total))}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {cashBalances.accounts.map((acc) => (
            <div 
              key={acc.id} 
              className="bg-white rounded-sm border border-slate-200 p-3.5 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                    {getAccountIcon(acc.type)}
                    {acc.name}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-sm border border-slate-200">
                    {acc.type}
                  </span>
                </div>
                {acc.identifier && (
                  <span className="text-[11px] font-mono text-slate-500 block mb-2">
                    {acc.identifier}
                  </span>
                )}
                <div className="text-lg font-bold font-mono text-slate-900 mt-2">
                  {formatCurrency(Math.round(acc.balance))}
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleOpenAdjust(acc)}
                  className="text-[11px] font-semibold text-[#174F43] hover:underline"
                >
                  {lang === 'ar' ? 'تسوية / إيداع / سحب' : 'Adjust / Deposit'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Outstanding Balances & Inventory Valuation Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Outstanding Receivables and Payables */}
        <div className="bg-white rounded-sm border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
            <AlertCircle size={16} className="text-amber-600" />
            <h2 className="text-sm font-bold text-slate-900">
              {lang === 'ar' ? 'المستحقات المعلقة (العملاء والموردين)' : 'Outstanding Balances (Payables & Receivables)'}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Customer Receivables */}
            <div className="bg-slate-50 rounded-sm p-3 border border-slate-200">
              <span className="text-xs text-slate-500 font-medium block">
                {lang === 'ar' ? 'مستحقات معلقة لدى العملاء (تحصيل / دفع)' : 'Outstanding Customer Payments'}
              </span>
              <div className="text-xl font-bold font-mono text-amber-700 mt-1">
                {formatCurrency(Math.round(outstanding.customerPayments))}
              </div>
              <span className="text-[11px] text-slate-400 block mt-1">
                {outstanding.customerOrdersCount} {lang === 'ar' ? 'طلب غير مدفوع أو عند الاستلام' : 'unpaid / COD orders'}
              </span>
            </div>

            {/* Supplier Payables */}
            <div className="bg-slate-50 rounded-sm p-3 border border-slate-200">
              <span className="text-xs text-slate-500 font-medium block">
                {lang === 'ar' ? 'مستحقات معلقة للموردين (فواتير غير مسددة)' : 'Outstanding Supplier Payments'}
              </span>
              <div className="text-xl font-bold font-mono text-rose-700 mt-1">
                {formatCurrency(Math.round(outstanding.supplierPayments))}
              </div>
              <span className="text-[11px] text-slate-400 block mt-1">
                {outstanding.unpaidInvoicesCount} {lang === 'ar' ? 'فاتورة مشتريات غير مدفوعة' : 'unpaid purchase invoices'}
              </span>
            </div>
          </div>
        </div>

        {/* Live Inventory Valuation */}
        <div className="bg-white rounded-sm border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Package size={16} className="text-[#174F43]" />
              <h2 className="text-sm font-bold text-slate-900">
                {lang === 'ar' ? 'تقييم المخزون الحالي (قيمة الأصول)' : 'Live Inventory Asset Valuation'}
              </h2>
            </div>
            <span className="text-sm font-bold font-mono text-emerald-700">
              {formatCurrency(Math.round(inventoryValuation.totalInventoryValue))}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 p-3 rounded-sm border border-slate-200">
              <span className="text-xs text-slate-500 font-medium block">
                {lang === 'ar' ? 'مخزون المواد الخام' : 'Raw Materials Stock'}
              </span>
              <div className="text-base font-bold font-mono text-slate-800 mt-1">
                {formatCurrency(Math.round(inventoryValuation.rawMaterialsValue))}
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {lang === 'ar' ? 'زيوت، كحول، زجاجات، مواد تغليف' : 'Oils, alcohol, packaging'}
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-sm border border-slate-200">
              <span className="text-xs text-slate-500 font-medium block">
                {lang === 'ar' ? 'مخزون العطور السائلة المجهزة' : 'Finished Liquid Bulk'}
              </span>
              <div className="text-base font-bold font-mono text-slate-800 mt-1">
                {formatCurrency(Math.round(inventoryValuation.finishedLiquidValue))}
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {inventoryValuation.totalFinishedLiquidGrams?.toLocaleString()} {lang === 'ar' ? 'جرام مجهز' : 'g bulk ready'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* RETURNED ORDERS & SHIPPING CHARGES AUDIT SECTION */}
      <div className="bg-white rounded-sm border border-slate-200 p-4 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <RotateCcw size={16} className="text-amber-800" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {lang === 'ar' ? 'سجل وتكاليف الشحنات المرتجعة من الشحن' : 'Returned Shipments & Shipping Costs'}
              </h2>
              <span className="text-[11px] text-slate-500">
                {lang === 'ar' ? 'تكاليف الشحن المتكبدة عند رفض العميل الاستلام أو ارتداد الطرد' : 'Courier charges incurred for returned and refused deliveries'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-sm">
              {summary.returnedOrdersCount} {lang === 'ar' ? 'شحنة مرتجعة' : 'returns'}
            </span>
            <span className="text-xs font-bold font-mono px-2.5 py-1 bg-slate-100 text-slate-900 border border-slate-200 rounded-sm">
              {lang === 'ar' ? 'الإجمالي:' : 'Total:'} {formatCurrency(Math.round(summary.totalReturnShippingExpenses))}
            </span>
          </div>
        </div>

        {/* 4 Financial Policy Highlight Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-slate-50 p-3 rounded-sm border border-slate-200">
            <span className="text-[11px] text-slate-500 font-medium block">
              {lang === 'ar' ? 'شحن ذهاباً للعميل (Outbound)' : 'Outbound Shipping'}
            </span>
            <div className="text-base font-bold font-mono text-slate-900 mt-1">
              {formatCurrency(Math.round(summary.outboundReturnShipping))}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {lang === 'ar' ? 'رسوم التوصيل الصادرة للعنوان' : 'Outbound courier delivery fees'}
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-sm border border-slate-200">
            <span className="text-[11px] text-slate-500 font-medium block">
              {lang === 'ar' ? 'شحن إياباً / عودة (Inbound)' : 'Return Transit Fee'}
            </span>
            <div className="text-base font-bold font-mono text-slate-900 mt-1">
              {formatCurrency(Math.round(summary.inboundReturnShipping))}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {lang === 'ar' ? 'رسوم العودة للمقر / المخزن' : 'Inbound return transport fee'}
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-sm border border-slate-200">
            <span className="text-[11px] text-slate-500 font-medium block">
              {lang === 'ar' ? 'الأثر المالي على صافي الربح' : 'Net Profit Impact'}
            </span>
            <div className="text-base font-bold font-mono text-rose-700 mt-1">
              -{formatCurrency(Math.round(summary.totalReturnShippingExpenses))}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {lang === 'ar' ? 'يُخصم كمصروف نقل وتشغيل' : 'Deducted as transit expense'}
            </span>
          </div>

          <div className="bg-emerald-50/70 p-3 rounded-sm border border-emerald-200">
            <span className="text-[11px] text-emerald-900 font-semibold block flex items-center gap-1">
              <ShieldCheck size={13} className="text-emerald-700" />
              <span>{lang === 'ar' ? 'حماية تكلفة التصنيع (COGS)' : 'COGS Protection'}</span>
            </span>
            <div className="text-sm font-bold font-mono text-emerald-800 mt-1">
              0.00 {lang === 'ar' ? 'ج.م' : 'EGP'}
            </div>
            <span className="text-[10px] text-emerald-700 block mt-0.5">
              {lang === 'ar' ? 'لا تؤثر على تكلفة تصنيع المنتج' : 'Zero impact on product manufacturing cost'}
            </span>
          </div>
        </div>

        {/* Policy Explainer Note */}
        <div className="p-3 bg-amber-50/60 rounded-sm border border-amber-200/90 text-amber-950 text-xs leading-relaxed">
          <p className="font-semibold mb-0.5">
            {lang === 'ar' ? 'قواعد معالجة المرتجعات المالية في دار M20:' : 'M20 Return Finance Rules:'}
          </p>
          <p className="text-[11px] text-slate-700">
            {lang === 'ar'
              ? 'الطلبات المرتجعة أو غير المستلمة لا تُحسب ضمن إيرادات المبيعات المحققة. وتتحمل الشركة مصاريف الشحن كاملة لشركة الشحن وتُخصم من صافي الربح فقط. كما لا يُسترجع السائل للمخزون تلقائياً، بل ينتظر تأكيد الفحص الفعلي والتأكد من سلامة العبوة من لوحة الطلبات.'
              : 'Undelivered orders are excluded from sales revenue. Courier fees are charged to the business and deducted from net profit without touching product manufacturing cost. Liquid is only restocked after physical inspection.'}
          </p>
        </div>

        {/* Returned Shipments Table */}
        <div className="border border-slate-200 rounded-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                <tr>
                  <th className="p-2.5">{lang === 'ar' ? 'رقم الطلب' : 'Order #'}</th>
                  <th className="p-2.5">{lang === 'ar' ? 'العميل' : 'Customer'}</th>
                  <th className="p-2.5 text-center">{lang === 'ar' ? 'شحن ذهاباً' : 'Outbound'}</th>
                  <th className="p-2.5 text-center">{lang === 'ar' ? 'شحن عودة' : 'Return'}</th>
                  <th className="p-2.5 text-center">{lang === 'ar' ? 'إجمالي الشحن' : 'Total Cost'}</th>
                  <th className="p-2.5">{lang === 'ar' ? 'سبب الارتجاع' : 'Return Reason'}</th>
                  <th className="p-2.5 text-center">{lang === 'ar' ? 'فحص المخزون' : 'Inspection'}</th>
                  <th className="p-2.5 text-center">{lang === 'ar' ? 'الاسترداد' : 'Refund'}</th>
                  <th className="p-2.5 text-left">{lang === 'ar' ? 'الطلب' : 'View'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {returnedShipments.orders && returnedShipments.orders.length > 0 ? (
                  returnedShipments.orders.map((o, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-2.5 font-bold font-mono text-[#174F43]">
                        #{o.orderNumber}
                      </td>
                      <td className="p-2.5">
                        <div className="font-semibold text-slate-900">{o.customerName || 'عميل M20'}</div>
                        {o.customerPhone && (
                          <div className="text-[10px] text-slate-400 font-mono">{o.customerPhone}</div>
                        )}
                      </td>
                      <td className="p-2.5 text-center font-mono text-slate-700">
                        {o.outboundShippingFee?.toLocaleString()} ج.م
                      </td>
                      <td className="p-2.5 text-center font-mono text-slate-700">
                        {o.returnShippingFee?.toLocaleString()} ج.م
                      </td>
                      <td className="p-2.5 text-center font-mono font-bold text-rose-700">
                        {o.totalReturnShippingCost?.toLocaleString()} ج.م
                      </td>
                      <td className="p-2.5 text-slate-700 text-[11px] max-w-[200px] truncate" title={o.returnReason}>
                        {o.returnReason || '-'}
                      </td>
                      <td className="p-2.5 text-center">
                        {o.restockStatus === 'inspected_restocked' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 size={11} /> {lang === 'ar' ? 'تم استرجاع السائل' : 'Restocked'}
                          </span>
                        ) : o.restockStatus === 'inspected_damaged_discarded' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                            <XCircle size={11} /> {lang === 'ar' ? 'تالف ومستبعد' : 'Damaged'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock size={11} /> {lang === 'ar' ? 'قيد انتظار الفحص' : 'Pending Inspection'}
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 text-center">
                        {o.refundStatus === 'refunded' ? (
                          <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 font-mono">
                            {lang === 'ar' ? 'تم الاسترداد' : 'Refunded'} ({o.refundAmount} ج.م)
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-mono">
                            {lang === 'ar' ? 'غير مطلوب' : 'N/A'}
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 text-left">
                        <Link
                          to={`/orders?id=${o.orderId}`}
                          className="inline-flex items-center gap-1 text-slate-600 hover:text-[#174F43] font-semibold text-[11px]"
                        >
                          <span>{lang === 'ar' ? 'عرض' : 'View'}</span>
                          <ExternalLink size={12} />
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-slate-400 text-xs">
                      {lang === 'ar' ? 'لا توجد شحنات مرتجعة مسجلة خلال الفترة المحددة.' : 'No returned shipments recorded for the selected period.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {showCostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-sm border border-slate-200 shadow-xl z-10 max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-[#174F43] text-white flex items-center justify-between">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <Sliders size={16} />
                <span>{lang === 'ar' ? 'إعدادات التكاليف الافتراضية للمنتجات' : 'Automated Product Cost Settings'}</span>
              </h2>
              <button onClick={() => setShowCostModal(false)} className="p-1 text-white/80 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveCosts} className="p-5 space-y-3.5 text-xs">
              <p className="text-slate-500 leading-relaxed">
                {lang === 'ar'
                  ? 'هذه التكاليف تُحسب تلقائياً لكل زجاجة تُباع لخصم تكلفة البضاعة المباعة (COGS) بدقة دون الحاجة لإدخال يدوي مكرر.'
                  : 'These default unit costs are automatically applied to every sold unit to calculate true COGS.'}
              </p>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {lang === 'ar' ? 'تكلفة الزجاجة مع الرشاش والغطاء (ج.م) *' : 'Bottle w/ Sprayer & Cap Cost (EGP) *'}
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  required
                  value={costForm.bottleWithCapSprayer}
                  onChange={(e) => setCostForm({ ...costForm, bottleWithCapSprayer: e.target.value })}
                  placeholder="45"
                  className="w-full h-9 bg-white border border-slate-200 rounded-sm px-3 text-xs font-mono font-bold outline-none focus:border-[#174F43]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {lang === 'ar' ? 'تكلفة الستيكر / الليبل للزجاجة (ج.م) *' : 'Sticker / Label Cost (EGP) *'}
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  required
                  value={costForm.sticker}
                  onChange={(e) => setCostForm({ ...costForm, sticker: e.target.value })}
                  placeholder="20"
                  className="w-full h-9 bg-white border border-slate-200 rounded-sm px-3 text-xs font-mono font-bold outline-none focus:border-[#174F43]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {lang === 'ar' ? 'تكلفة العلبة الفاخرة للزجاجة (ج.م) *' : 'Packaging Box Cost (EGP) *'}
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  required
                  value={costForm.box}
                  onChange={(e) => setCostForm({ ...costForm, box: e.target.value })}
                  placeholder="25"
                  className="w-full h-9 bg-white border border-slate-200 rounded-sm px-3 text-xs font-mono font-bold outline-none focus:border-[#174F43]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {lang === 'ar' ? 'مخصص التسويق التقديري لكل زجاجة (ج.م) *' : 'Marketing Allocation per Bottle (EGP) *'}
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  required
                  value={costForm.marketingPerBottle}
                  onChange={(e) => setCostForm({ ...costForm, marketingPerBottle: e.target.value })}
                  placeholder="20"
                  className="w-full h-9 bg-white border border-slate-200 rounded-sm px-3 text-xs font-mono font-bold outline-none focus:border-[#174F43]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {lang === 'ar' ? 'الكثافة الافتراضية لسائل العطر (g/ml) *' : 'Default Liquid Density (g/ml) *'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.5"
                  max="1.5"
                  required
                  value={costForm.defaultLiquidDensity}
                  onChange={(e) => setCostForm({ ...costForm, defaultLiquidDensity: e.target.value })}
                  placeholder="0.86"
                  className="w-full h-9 bg-white border border-slate-200 rounded-sm px-3 text-xs font-mono font-bold outline-none focus:border-[#174F43]"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {lang === 'ar' ? 'تُستخدم لتحويل الحجم (50ml / 100ml) لوزن بالجرام لخصم السائل بدقة.' : 'Used to convert ml to grams for accurate liquid deduction.'}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCostModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-sm hover:bg-slate-50 text-slate-700 font-medium"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={savingCosts}
                  className="px-5 py-2 bg-[#174F43] text-white rounded-sm hover:bg-[#0F3830] font-semibold disabled:opacity-50"
                >
                  {savingCosts ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (lang === 'ar' ? 'حفظ الإعدادات' : 'Save Defaults')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cash Account Adjustment Modal */}
      {showAdjustModal && selectedAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="relative w-full max-w-sm bg-white rounded-sm border border-slate-200 shadow-xl z-10">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">
                {lang === 'ar' ? `تسوية حساب: ${selectedAccount.name}` : `Adjust Account: ${selectedAccount.name}`}
              </h2>
              <button onClick={() => setShowAdjustModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitAdjust} className="p-5 space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-sm">
                <span className="text-slate-500 font-medium block">
                  {lang === 'ar' ? 'الرصيد المسجل حالياً:' : 'Current Balance:'}
                </span>
                <span className="text-base font-bold text-slate-900 font-mono">
                  {formatCurrency(Math.round(selectedAccount.balance))}
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {lang === 'ar' ? 'نوع الحركة *' : 'Transaction Type *'}
                </label>
                <select
                  value={adjustForm.type}
                  onChange={(e) => setAdjustForm({ ...adjustForm, type: e.target.value })}
                  className="w-full h-9 bg-white border border-slate-200 rounded-sm px-2 text-xs font-semibold outline-none"
                >
                  <option value="deposit">{lang === 'ar' ? 'إيداع / زيادة رصيد (+)' : 'Deposit / Add Funds (+)'}</option>
                  <option value="withdrawal">{lang === 'ar' ? 'سحب / خصم رصيد (-)' : 'Withdrawal / Deduct Funds (-)'}</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {lang === 'ar' ? 'المبلغ (ج.م) *' : 'Amount (EGP) *'}
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  value={adjustForm.amount}
                  onChange={(e) => setAdjustForm({ ...adjustForm, amount: e.target.value })}
                  placeholder="1000"
                  className="w-full h-9 bg-white border border-slate-200 rounded-sm px-3 text-xs font-mono font-bold outline-none focus:border-[#174F43]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {lang === 'ar' ? 'السبب / بيان الحركة *' : 'Reason / Note *'}
                </label>
                <textarea
                  rows="2"
                  required
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  placeholder={lang === 'ar' ? 'مثال: تسوية رصيد بنكي شهري...' : 'e.g. Monthly bank reconciliation...'}
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
                  disabled={submittingAdjust}
                  className="px-5 py-2 bg-[#174F43] text-white rounded-sm hover:bg-[#0F3830] font-semibold disabled:opacity-50"
                >
                  {submittingAdjust ? (lang === 'ar' ? 'جاري التأكيد...' : 'Saving...') : (lang === 'ar' ? 'تأكيد التسوية' : 'Confirm')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
