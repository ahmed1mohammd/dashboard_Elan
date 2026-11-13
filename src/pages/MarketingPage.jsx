import React, { useState, useEffect } from 'react';
import { 
  Target, 
  DollarSign, 
  TrendingUp, 
  ShoppingCart, 
  Percent, 
  ArrowUpRight, 
  Calendar, 
  Filter, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Copy, 
  Check, 
  ExternalLink, 
  ArrowRight, 
  ArrowLeft,
  ChevronDown,
  Layers,
  Sparkles,
  Tag,
  AlertCircle,
  HelpCircle,
  X
} from 'lucide-react';
import { 
  getMarketingDashboard, 
  getAdSpends, 
  createAdSpend, 
  deleteAdSpend, 
  getCashAccounts 
} from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { showSuccess, showError, showWarning } from '../utils/swal';

export default function MarketingPage() {
  const { lang, isRTL, formatCurrency } = useLanguage();

  // Filters State
  const [rangeKey, setRangeKey] = useState('last30days');
  const [platform, setPlatform] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data State
  const [dashboardData, setDashboardData] = useState(null);
  const [adSpendsList, setAdSpendsList] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]);

  // Active View Tab for Breakdown Section
  const [breakdownTab, setBreakdownTab] = useState('campaigns'); // 'campaigns' | 'promoCodes' | 'fragrances'

  // Modals & Tools State
  const [showSpendModal, setShowSpendModal] = useState(false);
  const [showUrlBuilder, setShowUrlBuilder] = useState(false);
  const [submittingSpend, setSubmittingSpend] = useState(false);

  // New Ad Spend Form State
  const [spendForm, setSpendForm] = useState({
    platform: 'meta',
    campaignName: '',
    adContent: '',
    amountEGP: '',
    startDate: new Date().toISOString().split('T')[0],
    paymentAccountId: '',
    notes: ''
  });

  // UTM Builder State
  const [utmForm, setUtmForm] = useState({
    platform: 'meta',
    destination: '/',
    campaignName: '',
    adContent: ''
  });
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Load Dashboard Data
  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      const [dash, spends, accounts] = await Promise.all([
        getMarketingDashboard({ rangeKey, platform }),
        getAdSpends({ platform: platform !== 'all' ? platform : undefined }),
        getCashAccounts()
      ]);

      setDashboardData(dash);
      setAdSpendsList(Array.isArray(spends) ? spends : []);
      setCashAccounts(Array.isArray(accounts) ? accounts : []);
    } catch (err) {
      console.error('Failed to load marketing dashboard:', err);
      showError(
        lang === 'ar' ? 'خطأ في تحميل البيانات' : 'Data Load Error',
        lang === 'ar' ? 'تعذر جلب تحليلات التسويق وحملات الإعلانات' : 'Failed to retrieve marketing analytics'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [rangeKey, platform]);

  // Handle Create Ad Spend
  const handleCreateSpend = async (e) => {
    e.preventDefault();
    if (!spendForm.campaignName.trim()) {
      showWarning(lang === 'ar' ? 'تنبيه' : 'Notice', lang === 'ar' ? 'يرجى إدخال اسم الحملة' : 'Please enter campaign name');
      return;
    }
    const amt = Math.round(Number(spendForm.amountEGP));
    if (!amt || amt <= 0) {
      showWarning(lang === 'ar' ? 'تنبيه' : 'Notice', lang === 'ar' ? 'يرجى إدخال مبلغ صحيح بالجنيه' : 'Please enter a valid amount');
      return;
    }

    try {
      setSubmittingSpend(true);
      await createAdSpend({
        ...spendForm,
        amountEGP: amt
      });

      showSuccess(
        lang === 'ar' ? 'تم تسجيل الإنفاق بنجاح' : 'Ad Spend Logged',
        lang === 'ar' ? 'تم تسجيل التكلفة الإعلانية وخصمها من الخزينة ومزامنتها مع المصروفات' : 'Cost recorded and synchronized with Finance Overview'
      );

      setSpendForm({
        platform: 'meta',
        campaignName: '',
        adContent: '',
        amountEGP: '',
        startDate: new Date().toISOString().split('T')[0],
        paymentAccountId: '',
        notes: ''
      });
      setShowSpendModal(false);
      loadData(true);
    } catch (err) {
      console.error('Error logging ad spend:', err);
      showError(
        lang === 'ar' ? 'فشل التسجيل' : 'Logging Failed',
        err.response?.data?.message || (lang === 'ar' ? 'تعذر تسجيل التكلفة الإعلانية' : 'Failed to save ad spend')
      );
    } finally {
      setSubmittingSpend(false);
    }
  };

  // Handle Delete Ad Spend
  const handleDeleteSpend = async (id) => {
    if (!window.confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذا الإنفاق واسترجاع رصيد الخزينة؟' : 'Delete this ad spend and reverse balance?')) return;
    try {
      await deleteAdSpend(id);
      showSuccess(lang === 'ar' ? 'تم الحذف' : 'Deleted', lang === 'ar' ? 'تم حذف الإنفاق واسترجاع الرصيد بنجاح' : 'Spend deleted and balance reversed');
      loadData(true);
    } catch (err) {
      showError(lang === 'ar' ? 'خطأ' : 'Error', lang === 'ar' ? 'فشل حذف السجل' : 'Failed to delete record');
    }
  };

  // Generated UTM Link Helper
  const generatedCampaignUrl = (() => {
    const baseUrl = 'https://m20fragrance.com';
    const cleanCamp = (utmForm.campaignName || '').trim().toLowerCase().replace(/[\s_]+/g, '_');
    const cleanContent = (utmForm.adContent || '').trim().toLowerCase().replace(/[\s_]+/g, '_');
    const source = utmForm.platform === 'meta' ? 'meta' : (utmForm.platform === 'tiktok' ? 'tiktok' : 'other');
    const medium = 'paid_social';

    const params = new URLSearchParams();
    params.set('utm_source', source);
    params.set('utm_medium', medium);
    if (cleanCamp) params.set('utm_campaign', cleanCamp);
    if (cleanContent) params.set('utm_content', cleanContent);

    const path = utmForm.destination.startsWith('/') ? utmForm.destination : `/${utmForm.destination}`;
    return `${baseUrl}${path}?${params.toString()}`;
  })();

  const copyToClipboard = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(generatedCampaignUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    }
  };

  const kpis = dashboardData?.kpis || {
    totalAdSpend: 0,
    totalPlacedRevenue: 0,
    deliveredRevenue: 0,
    totalOrdersCount: 0,
    deliveredOrdersCount: 0,
    grossRoas: 0,
    deliveredRoas: 0,
    cpa: 0,
    cpaBenchmark: 20,
    aov: 0,
    deliveredAov: 0,
    totalCogs: 0,
    totalShippingExpenses: 0,
    netCampaignProfit: 0
  };

  const funnel = dashboardData?.funnel || {
    overallConversionRate: 0,
    steps: []
  };

  const campaigns = dashboardData?.campaigns || [];
  const promoCodes = dashboardData?.promoCodes || [];
  const fragrances = dashboardData?.fragrances || [];

  return (
    <div className={`space-y-6 ${isRTL ? "font-['Cairo',sans-serif] text-right" : "font-sans text-left"} pb-12`}>
      
      {/* 1. Header Bar (Zero Tinted Circles, 1px Border) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Target size={20} className="text-[#174F43]" />
            <h1 className="text-xl font-bold text-[#174F43]">
              {lang === 'ar' ? 'تحليلات التسويق والإعلانات' : 'Marketing & Ads Analytics'}
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {lang === 'ar'
              ? 'تتبع الإنفاق الإعلاني، العائد على الإعلانات (ROAS)، تكلفة الطلب (CPA)، قمع التحويل، وصافي ربح الحملات (Meta vs. TikTok vs. Organic).'
              : 'Track Ad Spend, ROAS, CPA, conversion funnel drop-offs, and net campaign profit across Meta, TikTok, and Organic channels.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            title={lang === 'ar' ? 'تحديث البيانات' : 'Refresh Data'}
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin text-[#174F43]' : 'text-slate-500'} />
            <span>{lang === 'ar' ? 'تحديث' : 'Refresh'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowUrlBuilder(!showUrlBuilder)}
            className="px-3.5 py-2 border border-[#174F43]/30 bg-white hover:bg-[#174F43]/5 text-[#174F43] text-xs font-semibold rounded-sm flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ExternalLink size={13} />
            <span>{lang === 'ar' ? 'مولد روابط الحملات (UTM)' : 'Campaign URL Generator'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSpendModal(true)}
            className="px-4 py-2 bg-[#174F43] hover:bg-[#0F3830] text-white text-xs font-semibold rounded-sm flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus size={14} className="text-[#FF9D00]" />
            <span>{lang === 'ar' ? 'تسجيل إنفاق إعلاني' : 'Log Ad Spend'}</span>
          </button>
        </div>
      </div>

      {/* 2. Interactive Filters Bar (Date Range & Platform) */}
      <div className="bg-white border border-slate-200 rounded-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Platform Selector Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-bold text-slate-500 shrink-0 mx-1">
            {lang === 'ar' ? 'القناة الإعلانية:' : 'Platform:'}
          </span>
          {[
            { id: 'all', labelAr: 'الكل (جميع القنوات)', labelEn: 'All Channels' },
            { id: 'meta', labelAr: 'Meta (فيسبوك وإنستجرام)', labelEn: 'Meta (FB / IG)' },
            { id: 'tiktok', labelAr: 'TikTok Ads', labelEn: 'TikTok Ads' },
            { id: 'organic', labelAr: 'مباشر ومجاني (Organic)', labelEn: 'Direct / Organic' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPlatform(item.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors cursor-pointer shrink-0 border ${
                platform === item.id
                  ? 'bg-[#174F43] text-white border-[#174F43]'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {lang === 'ar' ? item.labelAr : item.labelEn}
            </button>
          ))}
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center gap-2 shrink-0">
          <Calendar size={14} className="text-slate-400" />
          <span className="text-xs font-bold text-slate-500">
            {lang === 'ar' ? 'الفترة:' : 'Period:'}
          </span>
          <select
            value={rangeKey}
            onChange={(e) => setRangeKey(e.target.value)}
            className="h-8 border border-slate-200 rounded-sm px-3 text-xs font-semibold bg-white text-slate-800 outline-none focus:border-[#174F43] cursor-pointer"
          >
            <option value="today">{lang === 'ar' ? 'اليوم' : 'Today'}</option>
            <option value="yesterday">{lang === 'ar' ? 'أمس' : 'Yesterday'}</option>
            <option value="last7days">{lang === 'ar' ? 'آخر 7 أيام' : 'Last 7 Days'}</option>
            <option value="last30days">{lang === 'ar' ? 'آخر 30 يوماً' : 'Last 30 Days'}</option>
            <option value="thisMonth">{lang === 'ar' ? 'هذا الشهر' : 'This Month'}</option>
            <option value="all">{lang === 'ar' ? 'جميع الأوقات' : 'All Time'}</option>
          </select>
        </div>
      </div>

      {/* 3. Campaign URL Generator (Collapsible Tool) */}
      {showUrlBuilder && (
        <div className="bg-white border border-[#174F43]/30 rounded-sm p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ExternalLink size={16} className="text-[#174F43]" />
              <h3 className="text-xs font-bold text-[#174F43]">
                {lang === 'ar' ? 'مولد روابط الحملات الإعلانية (Campaign URL Builder)' : 'Campaign URL Generator (UTM Builder)'}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowUrlBuilder(false)}
              className="text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {lang === 'ar' ? 'المنصة الإعلانية' : 'Platform'}
              </label>
              <select
                value={utmForm.platform}
                onChange={(e) => setUtmForm({ ...utmForm, platform: e.target.value })}
                className="w-full h-8 border border-slate-200 rounded-sm px-2 text-xs font-semibold bg-white outline-none focus:border-[#174F43]"
              >
                <option value="meta">Meta (Facebook & Instagram)</option>
                <option value="tiktok">TikTok Ads</option>
                <option value="other">{lang === 'ar' ? 'منصة أخرى' : 'Other'}</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {lang === 'ar' ? 'الصفحة المستهدفة' : 'Landing Page'}
              </label>
              <select
                value={utmForm.destination}
                onChange={(e) => setUtmForm({ ...utmForm, destination: e.target.value })}
                className="w-full h-8 border border-slate-200 rounded-sm px-2 text-xs font-semibold bg-white outline-none focus:border-[#174F43]"
              >
                <option value="/">{lang === 'ar' ? 'الرئيسية (/)' : 'Homepage (/)'}</option>
                <option value="/shop">{lang === 'ar' ? 'الكتالوج الكامل (/shop)' : 'All Fragrances (/shop)'}</option>
                <option value="/offers">{lang === 'ar' ? 'العروض والباقات (/offers)' : 'Special Offers (/offers)'}</option>
                <option value="/men">{lang === 'ar' ? 'مجموعة الرجال (/men)' : 'Men (/men)'}</option>
                <option value="/women">{lang === 'ar' ? 'مجموعة النساء (/women)' : 'Women (/women)'}</option>
                <option value="/product/crush">CRUSH Extrait de Parfum</option>
                <option value="/product/crown">CROWN Extrait de Parfum</option>
                <option value="/product/night">NIGHT Extrait de Parfum</option>
                <option value="/product/bloom">BLOOM Extrait de Parfum</option>
                <option value="/product/cherry">CHERRY Extrait de Parfum</option>
                <option value="/product/cloud">CLOUD Extrait de Parfum</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {lang === 'ar' ? 'اسم الحملة (utm_campaign)' : 'Campaign Name'}
              </label>
              <input
                type="text"
                placeholder="e.g. summer_launch_2026"
                value={utmForm.campaignName}
                onChange={(e) => setUtmForm({ ...utmForm, campaignName: e.target.value })}
                className="w-full h-8 border border-slate-200 rounded-sm px-3 text-xs font-mono outline-none focus:border-[#174F43]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {lang === 'ar' ? 'محتوى الإعلان (utm_content)' : 'Ad / Creative Content'}
              </label>
              <input
                type="text"
                placeholder="e.g. video_hook_oud_50ml"
                value={utmForm.adContent}
                onChange={(e) => setUtmForm({ ...utmForm, adContent: e.target.value })}
                className="w-full h-8 border border-slate-200 rounded-sm px-3 text-xs font-mono outline-none focus:border-[#174F43]"
              />
            </div>
          </div>

          {/* Generated URL Box */}
          <div className="pt-2">
            <span className="block text-[11px] font-bold text-slate-600 mb-1">
              {lang === 'ar' ? 'الرابط الجاهز للنسخ في مدير الإعلانات:' : 'Ready-to-use Ad Link:'}
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={generatedCampaignUrl}
                className="flex-1 h-9 bg-slate-50 border border-slate-200 rounded-sm px-3 text-xs font-mono text-slate-800 select-all outline-none"
              />
              <button
                type="button"
                onClick={copyToClipboard}
                className="h-9 px-4 bg-[#174F43] hover:bg-[#0F3830] text-white text-xs font-semibold rounded-sm flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                {copiedUrl ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{copiedUrl ? (lang === 'ar' ? 'تم النسخ!' : 'Copied!') : (lang === 'ar' ? 'نسخ الرابط' : 'Copy URL')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Top-Level Marketing KPI Cards (Strict DESIGN_RULES: 1px border, 0 gradients, 0 shadows, 0 tinted circles) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        {/* Card 1: Total Ad Spend */}
        <div className="bg-white border border-slate-200 rounded-sm p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>{lang === 'ar' ? 'إجمالي الإنفاق الإعلاني' : 'Total Ad Spend'}</span>
            <DollarSign size={14} className="text-slate-400" />
          </div>
          <div className="text-lg font-bold font-mono text-slate-900">
            {formatCurrency(kpis.totalAdSpend)}
          </div>
          <p className="text-[10px] text-slate-400">
            {lang === 'ar' ? 'التكلفة الإعلانية المسجلة' : 'Logged platform spend'}
          </p>
        </div>

        {/* Card 2: Ad-Attributed Revenue */}
        <div className="bg-white border border-slate-200 rounded-sm p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>{lang === 'ar' ? 'مبيعات الإعلانات المؤكدة' : 'Attributed Revenue'}</span>
            <TrendingUp size={14} className="text-slate-400" />
          </div>
          <div className="text-lg font-bold font-mono text-[#174F43]">
            {formatCurrency(kpis.deliveredRevenue)}
          </div>
          <p className="text-[10px] text-slate-400 truncate" title={`Placed: ${formatCurrency(kpis.totalPlacedRevenue)}`}>
            {lang === 'ar'
              ? `المؤكد: ${kpis.deliveredOrdersCount} من ${kpis.totalOrdersCount} طلب`
              : `${kpis.deliveredOrdersCount} of ${kpis.totalOrdersCount} delivered`}
          </p>
        </div>

        {/* Card 3: ROAS */}
        <div className="bg-white border border-slate-200 rounded-sm p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>{lang === 'ar' ? 'العائد على الإنفاق (ROAS)' : 'Delivered ROAS'}</span>
            <Percent size={14} className="text-slate-400" />
          </div>
          <div className="text-lg font-bold font-mono text-slate-900">
            {kpis.deliveredRoas > 0 ? `${kpis.deliveredRoas}x` : '0.0x'}
          </div>
          <p className="text-[10px] text-slate-400">
            {lang === 'ar' ? `العائد الكلي: ${kpis.grossRoas}x` : `Gross ROAS: ${kpis.grossRoas}x`}
          </p>
        </div>

        {/* Card 4: CPA */}
        <div className="bg-white border border-slate-200 rounded-sm p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>{lang === 'ar' ? 'تكلفة الأوردر (CPA)' : 'Cost Per Order (CPA)'}</span>
            <ShoppingCart size={14} className="text-slate-400" />
          </div>
          <div className="text-lg font-bold font-mono text-slate-900">
            {formatCurrency(kpis.cpa)}
          </div>
          <p className={`text-[10px] font-semibold ${
            kpis.cpa === 0 ? 'text-slate-400' : (kpis.cpa <= 20 ? 'text-emerald-700' : 'text-amber-800')
          }`}>
            {lang === 'ar'
              ? `الهدف: 20 ج.م (${kpis.cpa <= 20 ? 'مثالي' : `+${kpis.cpa - 20} ج.م`})`
              : `Target: 20 EGP (${kpis.cpa <= 20 ? 'Optimal' : `+${kpis.cpa - 20}`})`}
          </p>
        </div>

        {/* Card 5: AOV */}
        <div className="bg-white border border-slate-200 rounded-sm p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>{lang === 'ar' ? 'متوسط قيمة الطلب (AOV)' : 'Average Order (AOV)'}</span>
            <ArrowUpRight size={14} className="text-slate-400" />
          </div>
          <div className="text-lg font-bold font-mono text-slate-900">
            {formatCurrency(kpis.deliveredAov || kpis.aov)}
          </div>
          <p className="text-[10px] text-slate-400">
            {lang === 'ar' ? 'متوسط السلة المؤكدة' : 'Per confirmed checkout'}
          </p>
        </div>

        {/* Card 6: Net Campaign Profit */}
        <div className="bg-white border border-slate-200 rounded-sm p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>{lang === 'ar' ? 'صافي ربح الحملات' : 'Net Campaign Profit'}</span>
            <span className="w-2 h-2 rounded-full bg-[#174F43]" />
          </div>
          <div className={`text-lg font-bold font-mono ${kpis.netCampaignProfit >= 0 ? 'text-[#174F43]' : 'text-rose-700'}`}>
            {formatCurrency(kpis.netCampaignProfit)}
          </div>
          <p className="text-[10px] text-slate-400 truncate" title={`COGS: ${formatCurrency(kpis.totalCogs)} | Shipping: ${formatCurrency(kpis.totalShippingExpenses)}`}>
            {lang === 'ar' ? 'بعد التكلفة والشحن والإنفاق' : 'After COGS, shipping & ads'}
          </p>
        </div>
      </div>

      {/* 5. E-Commerce Conversion Funnel Breakdown (قمع التحويل) */}
      <div className="bg-white border border-slate-200 rounded-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-xs font-bold text-[#174F43] flex items-center gap-1.5">
              <Layers size={15} />
              <span>{lang === 'ar' ? 'قمع التحويل ومعدلات التسرب (Conversion Funnel)' : 'E-Commerce Conversion Funnel Breakdown'}</span>
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {lang === 'ar'
                ? 'تتبع رحلة العميل من الزيارة الأولى وتصفح العطور وحتى إتمام الشراء، لحساب نسبة التحويل لكل قناة بدقة.'
                : 'Customer drop-off analysis from initial page view to confirmed order checkout.'}
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-sm">
            <span className="text-xs font-bold text-slate-600">
              {lang === 'ar' ? 'معدل التحويل الكلي:' : 'Overall Conversion Rate:'}
            </span>
            <span className="font-mono font-bold text-xs text-[#174F43]">
              {funnel.overallConversionRate}%
            </span>
          </div>
        </div>

        {/* Horizontal Visual Funnel Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {funnel.steps.map((st, idx) => (
            <div key={st.step} className="border border-slate-200 rounded-sm p-3 bg-white space-y-2 relative">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#174F43] font-mono">0{st.step}</span>
                {idx > 0 && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    {st.dropRate > 0 ? `-${st.dropRate}%` : '0%'}
                  </span>
                )}
              </div>

              <div>
                <span className="block text-[11px] font-semibold text-slate-800 line-clamp-1">
                  {lang === 'ar' ? st.nameAr : st.nameEn}
                </span>
                <span className="block text-base font-bold font-mono text-slate-900 mt-0.5">
                  {st.count.toLocaleString()}
                </span>
              </div>

              {/* Progress visual bar */}
              <div className="w-full h-1.5 bg-slate-100 rounded-xs overflow-hidden">
                <div 
                  className="h-full bg-[#174F43] rounded-xs transition-all duration-300"
                  style={{ width: `${Math.max(8, Math.min(100, st.conversionToNext || 100))}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                <span>{lang === 'ar' ? 'التحويل للمرحلة التالية:' : 'Conv. to next:'}</span>
                <span className="font-mono font-semibold text-slate-700">{st.conversionToNext}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Breakdown Tables Section with Navigation Tabs */}
      <div className="bg-white border border-slate-200 rounded-sm p-5 space-y-4">
        {/* Breakdown Tabs Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setBreakdownTab('campaigns')}
              className={`px-3 py-1.5 text-xs font-bold rounded-sm border transition-colors cursor-pointer shrink-0 ${
                breakdownTab === 'campaigns'
                  ? 'bg-[#174F43] text-white border-[#174F43]'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {lang === 'ar' ? 'أداء الحملات والإعلانات' : 'Campaigns & Creatives Performance'}
            </button>

            <button
              type="button"
              onClick={() => setBreakdownTab('promoCodes')}
              className={`px-3 py-1.5 text-xs font-bold rounded-sm border transition-colors cursor-pointer shrink-0 ${
                breakdownTab === 'promoCodes'
                  ? 'bg-[#174F43] text-white border-[#174F43]'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {lang === 'ar' ? 'أداء كوبونات الخصم والشحن المجاني' : 'Promo Codes & Shipping Subsidies'}
            </button>

            <button
              type="button"
              onClick={() => setBreakdownTab('fragrances')}
              className={`px-3 py-1.5 text-xs font-bold rounded-sm border transition-colors cursor-pointer shrink-0 ${
                breakdownTab === 'fragrances'
                  ? 'bg-[#174F43] text-white border-[#174F43]'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {lang === 'ar' ? 'العطور الأكثر مبيعاً حسب القناة' : 'Best-Selling Fragrances by Channel'}
            </button>
          </div>

          <span className="text-xs text-slate-400">
            {breakdownTab === 'campaigns' && `${campaigns.length} ${lang === 'ar' ? 'حملة مسجلة' : 'campaigns'}`}
            {breakdownTab === 'promoCodes' && `${promoCodes.length} ${lang === 'ar' ? 'كود مستخدم' : 'promo codes'}`}
            {breakdownTab === 'fragrances' && `6 ${lang === 'ar' ? 'عطور أساسية' : 'signature perfumes'}`}
          </span>
        </div>

        {/* TAB A: CAMPAIGNS & CREATIVES BREAKDOWN */}
        {breakdownTab === 'campaigns' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="p-2.5">{lang === 'ar' ? 'المنصة' : 'Platform'}</th>
                  <th className="p-2.5">{lang === 'ar' ? 'اسم الحملة (Campaign)' : 'Campaign'}</th>
                  <th className="p-2.5">{lang === 'ar' ? 'الإعلان (Creative)' : 'Creative'}</th>
                  <th className="p-2.5">{lang === 'ar' ? 'الإنفاق' : 'Spend'}</th>
                  <th className="p-2.5">{lang === 'ar' ? 'الطلبات (كلي / مؤكد)' : 'Orders (Total / Del.)'}</th>
                  <th className="p-2.5">{lang === 'ar' ? 'نسبة الارتجاع' : 'Return %'}</th>
                  <th className="p-2.5">{lang === 'ar' ? 'المبيعات' : 'Revenue'}</th>
                  <th className="p-2.5">{lang === 'ar' ? 'تكلفة الأوردر (CPA)' : 'CPA'}</th>
                  <th className="p-2.5">{lang === 'ar' ? 'العائد (ROAS)' : 'ROAS'}</th>
                  <th className="p-2.5">{lang === 'ar' ? 'صافي الربح' : 'Net Profit'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {campaigns.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="p-8 text-center text-slate-400">
                      {lang === 'ar' ? 'لا توجد بيانات حملات مسجلة لهذه الفترة' : 'No campaign records for this period'}
                    </td>
                  </tr>
                ) : (
                  campaigns.map((camp, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-2.5 font-bold">
                        <span className={`inline-block px-2 py-0.5 rounded-xs text-[10px] font-mono border ${
                          camp.platform === 'meta'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : camp.platform === 'tiktok'
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {camp.platform.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-2.5 font-mono font-bold text-slate-900">{camp.campaignName}</td>
                      <td className="p-2.5 font-mono text-slate-500">{camp.adContent || '-'}</td>
                      <td className="p-2.5 font-mono font-semibold text-slate-800">{formatCurrency(camp.spend)}</td>
                      <td className="p-2.5 font-mono text-slate-700">
                        {camp.ordersCount} <span className="text-slate-400 text-[10px]">({camp.deliveredCount})</span>
                      </td>
                      <td className="p-2.5 font-mono text-slate-600">{camp.returnRate}%</td>
                      <td className="p-2.5 font-mono font-bold text-[#174F43]">{formatCurrency(camp.deliveredRevenue)}</td>
                      <td className="p-2.5 font-mono text-slate-800">{camp.cpa > 0 ? formatCurrency(camp.cpa) : '-'}</td>
                      <td className="p-2.5 font-mono font-bold text-slate-900">
                        {camp.roas > 0 ? `${camp.roas}x` : '-'}
                      </td>
                      <td className={`p-2.5 font-mono font-bold ${camp.netProfit >= 0 ? 'text-[#174F43]' : 'text-rose-700'}`}>
                        {formatCurrency(camp.netProfit)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB B: PROMO CODES & SHIPPING SUBSIDIES BREAKDOWN */}
        {breakdownTab === 'promoCodes' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="p-2.5">{lang === 'ar' ? 'كود الخصم / الكوبون' : 'Promo Code'}</th>
                  <th className="p-2.5">{lang === 'ar' ? 'مرات الاستخدام' : 'Times Used'}</th>
                  <th className="p-2.5">{lang === 'ar' ? 'الطلبات المسلمة' : 'Delivered Orders'}</th>
                  <th className="p-2.5">{lang === 'ar' ? 'إجمالي المبيعات' : 'Revenue Generated'}</th>
                  <th className="p-2.5">{lang === 'ar' ? 'الشحن المجاني المتحمل (دعم M20)' : 'Shipping Subsidized'}</th>
                  <th className="p-2.5">{lang === 'ar' ? 'صافي المبيعات بعد دعم الشحن' : 'Net After Subsidy'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {promoCodes.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-slate-400">
                      {lang === 'ar' ? 'لا توجد كوبونات مستخدمة في هذه الفترة' : 'No promo codes used in this period'}
                    </td>
                  </tr>
                ) : (
                  promoCodes.map((promo, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-2.5">
                        <span className="inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-xs">
                          <Tag size={11} /> {promo.code}
                        </span>
                      </td>
                      <td className="p-2.5 font-mono font-bold text-slate-800">{promo.timesUsed}</td>
                      <td className="p-2.5 font-mono text-slate-700">{promo.deliveredOrders}</td>
                      <td className="p-2.5 font-mono font-bold text-[#174F43]">{formatCurrency(promo.revenueGenerated)}</td>
                      <td className="p-2.5 font-mono text-amber-900 font-semibold">{formatCurrency(promo.shippingSubsidized)}</td>
                      <td className="p-2.5 font-mono font-bold text-slate-900">{formatCurrency(promo.netProfit)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB C: BEST-SELLING FRAGRANCES BY CHANNEL */}
        {breakdownTab === 'fragrances' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="p-2.5">{lang === 'ar' ? 'العطر' : 'Fragrance'}</th>
                  <th className="p-2.5">{lang === 'ar' ? 'مبيعات Meta (زجاجة)' : 'Meta Bottles'}</th>
                  <th className="p-2.5">{lang === 'ar' ? 'مبيعات TikTok (زجاجة)' : 'TikTok Bottles'}</th>
                  <th className="p-2.5">{lang === 'ar' ? 'مبيعات مباشر / Organic' : 'Organic'}</th>
                  <th className="p-2.5">{lang === 'ar' ? 'إجمالي الزجاجات' : 'Total Bottles'}</th>
                  <th className="p-2.5">{lang === 'ar' ? 'المبيعات (ج.م)' : 'Revenue'}</th>
                  <th className="p-2.5">{lang === 'ar' ? 'توزيع الأحجام الأكثر طلباً' : 'Bottle Sizes'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fragrances.map((frag, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-2.5 font-bold font-serif text-[#174F43] text-sm">
                      {frag.name}
                    </td>
                    <td className="p-2.5 font-mono text-blue-900 font-bold">
                      {frag.meta} <span className="text-[10px] text-slate-400 font-normal">({frag.totalBottles > 0 ? Math.round((frag.meta / frag.totalBottles) * 100) : 0}%)</span>
                    </td>
                    <td className="p-2.5 font-mono text-slate-900 font-bold">
                      {frag.tiktok} <span className="text-[10px] text-slate-400 font-normal">({frag.totalBottles > 0 ? Math.round((frag.tiktok / frag.totalBottles) * 100) : 0}%)</span>
                    </td>
                    <td className="p-2.5 font-mono text-slate-700">{frag.organic}</td>
                    <td className="p-2.5 font-mono font-bold text-slate-900">{frag.totalBottles}</td>
                    <td className="p-2.5 font-mono font-bold text-[#174F43]">{formatCurrency(frag.revenue)}</td>
                    <td className="p-2.5 font-mono text-slate-600 text-[11px]">
                      30ml: {frag.sizes['30ml']} | 50ml: {frag.sizes['50ml']} | 100ml: {frag.sizes['100ml']}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 7. Logged Ad Spend Records History Section */}
      <div className="bg-white border border-slate-200 rounded-sm p-5 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <DollarSign size={15} className="text-[#174F43]" />
            <span>{lang === 'ar' ? 'سجل التكاليف الإعلانية المسجلة ومصادر الدفع' : 'Logged Ad Spend Records'}</span>
          </h3>
          <span className="text-xs text-slate-500 font-mono">
            {adSpendsList.length} {lang === 'ar' ? 'سجلات' : 'records'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <th className="p-2">{lang === 'ar' ? 'التاريخ' : 'Date'}</th>
                <th className="p-2">{lang === 'ar' ? 'المنصة' : 'Platform'}</th>
                <th className="p-2">{lang === 'ar' ? 'اسم الحملة' : 'Campaign'}</th>
                <th className="p-2">{lang === 'ar' ? 'المبلغ' : 'Amount'}</th>
                <th className="p-2">{lang === 'ar' ? 'حساب الدفع (الخزينة)' : 'Paid From'}</th>
                <th className="p-2">{lang === 'ar' ? 'ملاحظات' : 'Notes'}</th>
                <th className="p-2 text-center">{lang === 'ar' ? 'إجراء' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {adSpendsList.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-6 text-center text-slate-400">
                    {lang === 'ar' ? 'لم يتم تسجيل مصاريف إعلانية بعد. اضغط "تسجيل إنفاق إعلاني" للبدء.' : 'No ad spend records logged yet.'}
                  </td>
                </tr>
              ) : (
                adSpendsList.map((spend) => (
                  <tr key={spend._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-2 font-mono text-slate-500">
                      {new Date(spend.startDate).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US')}
                    </td>
                    <td className="p-2 font-bold font-mono">
                      <span className={`inline-block px-1.5 py-0.5 rounded-xs text-[10px] border ${
                        spend.platform === 'meta'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : spend.platform === 'tiktok'
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {spend.platform.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-2 font-mono font-semibold text-slate-800">{spend.campaignName}</td>
                    <td className="p-2 font-mono font-bold text-[#174F43]">{formatCurrency(spend.amountEGP)}</td>
                    <td className="p-2 font-mono text-slate-700">
                      {spend.paymentAccountName || spend.paymentAccount?.name || '-'}
                    </td>
                    <td className="p-2 text-slate-500 truncate max-w-[150px]">{spend.notes || '-'}</td>
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteSpend(spend._id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title={lang === 'ar' ? 'حذف واسترجاع الرصيد' : 'Delete and reverse balance'}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 8. Modal: Log Ad Spend (Zero Tinted Circles, 1px Border) */}
      {showSpendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-sm border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-[#174F43] flex items-center gap-1.5">
                <Plus size={16} />
                <span>{lang === 'ar' ? 'تسجيل إنفاق إعلاني جديد' : 'Log New Ad Spend'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowSpendModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateSpend} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {lang === 'ar' ? 'المنصة الإعلانية' : 'Platform'} *
                </label>
                <select
                  value={spendForm.platform}
                  onChange={(e) => setSpendForm({ ...spendForm, platform: e.target.value })}
                  className="w-full h-8 border border-slate-200 rounded-sm px-3 text-xs bg-white outline-none focus:border-[#174F43]"
                >
                  <option value="meta">Meta (Facebook & Instagram)</option>
                  <option value="tiktok">TikTok Ads</option>
                  <option value="other">{lang === 'ar' ? 'أخرى' : 'Other'}</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {lang === 'ar' ? 'اسم الحملة (مطابق لـ utm_campaign)' : 'Campaign Name'} *
                </label>
                <input
                  type="text"
                  placeholder="e.g. summer_launch_2026"
                  required
                  value={spendForm.campaignName}
                  onChange={(e) => setSpendForm({ ...spendForm, campaignName: e.target.value })}
                  className="w-full h-8 border border-slate-200 rounded-sm px-3 text-xs font-mono outline-none focus:border-[#174F43]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {lang === 'ar' ? 'المبلغ بالجنيه المصري (أرقام صحيحة)' : 'Amount in EGP (Integer)'} *
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="e.g. 5000"
                  required
                  value={spendForm.amountEGP}
                  onChange={(e) => setSpendForm({ ...spendForm, amountEGP: e.target.value })}
                  className="w-full h-8 border border-slate-200 rounded-sm px-3 text-xs font-mono outline-none focus:border-[#174F43]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {lang === 'ar' ? 'تاريخ الإنفاق' : 'Date'} *
                </label>
                <input
                  type="date"
                  required
                  value={spendForm.startDate}
                  onChange={(e) => setSpendForm({ ...spendForm, startDate: e.target.value })}
                  className="w-full h-8 border border-slate-200 rounded-sm px-3 text-xs font-mono outline-none focus:border-[#174F43]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {lang === 'ar' ? 'حساب الدفع والخزينة (لمزامنة المالية تلقائياً)' : 'Payment Account (Syncs Finance Overview)'}
                </label>
                <select
                  value={spendForm.paymentAccountId}
                  onChange={(e) => setSpendForm({ ...spendForm, paymentAccountId: e.target.value })}
                  className="w-full h-8 border border-slate-200 rounded-sm px-3 text-xs bg-white outline-none focus:border-[#174F43]"
                >
                  <option value="">{lang === 'ar' ? 'بدون خصم من الخزائن (تسجيل تحليلي فقط)' : 'None (Analytics only, no cash deduction)'}</option>
                  {cashAccounts.map((acc) => (
                    <option key={acc._id} value={acc._id}>
                      {acc.name} ({formatCurrency(acc.balance)})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {lang === 'ar'
                    ? 'اختيار الحساب يخصم المبلغ تلقائياً من رصيد الخزينة ويسجله كمصروف تسويق رسمي بدون ازدواجية.'
                    : 'Selecting an account automatically deducts balance and records under Marketing Expenses.'}
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {lang === 'ar' ? 'ملاحظات إضافية' : 'Notes'}
                </label>
                <input
                  type="text"
                  placeholder={lang === 'ar' ? 'مثال: إعلانات فيديو تيك توك 50 مل' : 'Optional notes'}
                  value={spendForm.notes}
                  onChange={(e) => setSpendForm({ ...spendForm, notes: e.target.value })}
                  className="w-full h-8 border border-slate-200 rounded-sm px-3 text-xs outline-none focus:border-[#174F43]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSpendModal(false)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-sm hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submittingSpend}
                  className="px-4 py-1.5 bg-[#174F43] hover:bg-[#0F3830] text-white font-semibold rounded-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submittingSpend ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (lang === 'ar' ? 'تسجيل الإنفاق' : 'Save Spend')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
