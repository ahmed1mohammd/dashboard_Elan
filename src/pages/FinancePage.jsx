import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { getProducts, getOrders, updateProduct } from '../services/api';
import { showSuccess, showError } from '../utils/swal';

import { 
  DollarSign, 
  CreditCard, 
  Smartphone, 
  TrendingUp, 
  Plus, 
  Trash2, 
  RefreshCw, 
  X, 
  Save, 
  Check, 
  Calculator, 
  Package, 
  Receipt 
} from 'lucide-react';

export default function FinancePage() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingProductId, setSavingProductId] = useState(null);
  const [savedSuccessId, setSavedSuccessId] = useState(null);

  // Wallets & Treasuries
  const [treasuries, setTreasuries] = useState(() => {
    try {
      const saved = localStorage.getItem('elan_finance_treasuries');
      return saved ? JSON.parse(saved) : {
        vodafone: { balance: 14850, phone: '01012345678', name: 'فودافون كاش' },
        instapay: { balance: 22400, handle: 'elan.perfumes@instapay', name: 'إنستاباي' },
        cod: { balance: 8600, name: 'عند الاستلام (المناديب)' },
        online: { balance: 19500, name: 'بوابة الدفع الإلكتروني' }
      };
    } catch {
      return {
        vodafone: { balance: 14850, phone: '01012345678', name: 'فودافون كاش' },
        instapay: { balance: 22400, handle: 'elan.perfumes@instapay', name: 'إنستاباي' },
        cod: { balance: 8600, name: 'عند الاستلام (المناديب)' },
        online: { balance: 19500, name: 'بوابة الدفع الإلكتروني' }
      };
    }
  });

  // Operating Expenses
  const [expenses, setExpenses] = useState(() => {
    try {
      const saved = localStorage.getItem('elan_finance_expenses');
      return saved ? JSON.parse(saved) : [
        { id: 1, title: 'إعلانات ومنشورات ترويجية', category: 'marketing', amount: 3500, date: '2026-09-28' },
        { id: 2, title: 'مواد تغليف وحماية الزجاجات', category: 'packaging', amount: 1800, date: '2026-09-30' },
      ];
    } catch {
      return [];
    }
  });

  const [newExpense, setNewExpense] = useState({ title: '', category: 'marketing', amount: '' });
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  // Editable pricing
  const [editableVariants, setEditableVariants] = useState({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const [productsData, ordersData] = await Promise.all([
        getProducts().catch(() => []),
        getOrders().catch(() => []),
      ]);

      const pList = Array.isArray(productsData) ? productsData : [];
      const oList = Array.isArray(ordersData) ? ordersData : [];

      setProducts(pList);
      setOrders(oList);

      const initialMap = {};
      pList.forEach(p => {
        initialMap[p._id] = (p.variants || []).map(v => ({
          size: v.size,
          price: v.price || 0,
          costPrice: v.costPrice || Math.round((v.price || 599) * 0.35),
          stock: v.stock || 0,
          SKU: v.SKU || ''
        }));
      });
      setEditableVariants(initialMap);

    } catch (err) {
      console.error('Failed to load finance data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('elan_finance_expenses', JSON.stringify(expenses));
      localStorage.setItem('elan_finance_treasuries', JSON.stringify(treasuries));
    } catch {
      // ignore
    }
  }, [expenses, treasuries]);

  const handlePriceChange = (productId, variantIndex, field, value) => {
    setEditableVariants(prev => {
      const productVariants = [...(prev[productId] || [])];
      productVariants[variantIndex] = {
        ...productVariants[variantIndex],
        [field]: Number(value) || 0
      };
      return {
        ...prev,
        [productId]: productVariants
      };
    });
  };

  const handleSaveProductPricing = async (product) => {
    const updatedVariants = editableVariants[product._id];
    if (!updatedVariants) return;

    setSavingProductId(product._id);
    try {
      await updateProduct(product._id, {
        ...product,
        variants: updatedVariants
      });
      setSavedSuccessId(product._id);
      showSuccess('تم الحفظ', `تم تحديث تكاليف وأسعار ${product.name} بنجاح`);
      setTimeout(() => setSavedSuccessId(null), 2500);
    } catch (err) {
      console.error(err);
      showError('خطأ', 'تعذر حفظ الأسعار.');
    } finally {
      setSavingProductId(null);
    }
  };

  const handleAddExpense = (e) => {
    e.preventDefault();
    if (!newExpense.title || !newExpense.amount) return;

    const expenseItem = {
      id: Date.now(),
      title: newExpense.title,
      category: newExpense.category,
      amount: Number(newExpense.amount),
      date: new Date().toISOString().split('T')[0]
    };

    setExpenses(prev => [expenseItem, ...prev]);
    setNewExpense({ title: '', category: 'marketing', amount: '' });
    setShowExpenseModal(false);
  };

  const handleDeleteExpense = (id) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const updateTreasuryField = (key, field, val) => {
    setTreasuries(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: val
      }
    }));
  };

  // Financial calculations
  const totalDeliveredRevenue = orders
    .filter(o => o.orderStatus === 'delivered' || o.paymentStatus === 'paid')
    .reduce((sum, o) => sum + (o.total || 0), 0);

  const totalCOGS = orders
    .filter(o => o.orderStatus === 'delivered' || o.paymentStatus === 'paid')
    .reduce((sum, o) => {
      const itemsCost = (o.items || []).reduce((iSum, item) => iSum + ((item.price || 0) * 0.35 * (item.quantity || 1)), 0);
      return sum + itemsCost;
    }, 0);

  const totalOperatingExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const grossProfit = totalDeliveredRevenue - totalCOGS;
  const netRealProfit = grossProfit - totalOperatingExpenses;
  const overallMargin = totalDeliveredRevenue > 0 ? Math.round((grossProfit / totalDeliveredRevenue) * 100) : 65;

  const totalInventoryRetailValue = Object.values(editableVariants).reduce((sum, vList) => {
    return sum + (vList || []).reduce((vSum, v) => vSum + ((v.price || 0) * (v.stock || 0)), 0);
  }, 0);

  const totalInventoryCostValue = Object.values(editableVariants).reduce((sum, vList) => {
    return sum + (vList || []).reduce((vSum, v) => vSum + ((v.costPrice || 0) * (v.stock || 0)), 0);
  }, 0);

  const totalTreasuriesBalance = Object.values(treasuries).reduce((sum, t) => sum + (t.balance || 0), 0);

  const financialChartData = [
    { month: 'أسبوع 1', revenue: 14500, costs: 5100, profit: 9400 },
    { month: 'أسبوع 2', revenue: 22800, costs: 7900, profit: 14900 },
    { month: 'أسبوع 3', revenue: 19400, costs: 6800, profit: 12600 },
    { month: 'أسبوع 4', revenue: 31200, costs: 10900, profit: 20300 },
  ];

  return (
    <div className="space-y-6 text-right font-['Tajawal',sans-serif]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-[#03204E] flex items-center gap-2">
            <DollarSign size={18} strokeWidth={1.5} className="text-[#03204E]" />
            <span>الإدارة المالية وحساب الأرباح</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            متابعة التحصيلات، تحديد تكلفة وسعر البيع لكل عطر، وتسجيل المصروفات.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setShowExpenseModal(true)}
            className="px-3.5 py-2 rounded-sm bg-[#03204E] hover:bg-[#02183b] text-white text-xs font-medium flex items-center gap-1.5 transition-colors duration-150 h-9"
          >
            <Plus size={14} />
            <span>تسجيل مصروف</span>
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

      {/* 1. Treasuries */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#03204E]">
            خزائن ومحافظ التحصيل
          </h2>
          <span className="text-xs text-slate-600 font-medium">
            إجمالي الرصيد: <span className="text-[#15803d] font-bold">{totalTreasuriesBalance.toLocaleString()} ج.م</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Vodafone Cash */}
          <div className="bg-white rounded-sm p-3.5 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-800 flex items-center gap-1.5">
                <Smartphone size={14} strokeWidth={1.5} />
                <span>فودافون كاش</span>
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block">الرصيد:</span>
              <span className="text-lg font-bold text-slate-900">{treasuries.vodafone.balance.toLocaleString()} ج.م</span>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[11px] text-slate-500 block mb-1">رقم الاستلام:</span>
              <input
                type="text"
                value={treasuries.vodafone.phone}
                onChange={(e) => updateTreasuryField('vodafone', 'phone', e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-sm px-2 py-1 text-xs font-mono text-slate-800 outline-none"
              />
            </div>
          </div>

          {/* InstaPay */}
          <div className="bg-white rounded-sm p-3.5 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-800 flex items-center gap-1.5">
                <Smartphone size={14} strokeWidth={1.5} />
                <span>إنستاباي</span>
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block">الرصيد:</span>
              <span className="text-lg font-bold text-slate-900">{treasuries.instapay.balance.toLocaleString()} ج.م</span>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[11px] text-slate-500 block mb-1">معرف الحساب:</span>
              <input
                type="text"
                value={treasuries.instapay.handle}
                onChange={(e) => updateTreasuryField('instapay', 'handle', e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-sm px-2 py-1 text-xs font-mono text-slate-800 outline-none"
              />
            </div>
          </div>

          {/* COD */}
          <div className="bg-white rounded-sm p-3.5 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-800 flex items-center gap-1.5">
                <DollarSign size={14} strokeWidth={1.5} />
                <span>عند الاستلام (المناديب)</span>
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block">المبالغ المعلقة:</span>
              <span className="text-lg font-bold text-slate-900">{treasuries.cod.balance.toLocaleString()} ج.م</span>
            </div>
            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
              تصفية دورية مع شركات الشحن.
            </div>
          </div>

          {/* Online Visa */}
          <div className="bg-white rounded-sm p-3.5 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-800 flex items-center gap-1.5">
                <CreditCard size={14} strokeWidth={1.5} />
                <span>المدفوعات الإلكترونية</span>
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block">المحصل بالبوابة:</span>
              <span className="text-lg font-bold text-slate-900">{treasuries.online.balance.toLocaleString()} ج.م</span>
            </div>
            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
              تحويل للحساب البنكي.
            </div>
          </div>
        </div>
      </div>

      {/* 2. KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-sm p-4 border border-slate-200">
          <span className="text-xs text-slate-500 block">المبيعات المحققة</span>
          <h3 className="text-xl font-bold text-slate-900 mt-1">{totalDeliveredRevenue.toLocaleString()} ج.م</h3>
        </div>

        <div className="bg-white rounded-sm p-4 border border-slate-200">
          <span className="text-xs text-slate-500 block">تكلفة البضاعة (COGS)</span>
          <h3 className="text-xl font-bold text-slate-900 mt-1">{Math.round(totalCOGS).toLocaleString()} ج.م</h3>
        </div>

        <div className="bg-white rounded-sm p-4 border border-slate-200">
          <span className="text-xs text-slate-500 block">المصروفات التشغيلية</span>
          <h3 className="text-xl font-bold text-[#b91c1c] mt-1">{totalOperatingExpenses.toLocaleString()} ج.م</h3>
        </div>

        <div className="bg-[#03204E] text-white rounded-sm p-4 border border-[#03204E]">
          <span className="text-xs text-white/70 block">صافي الربح الفعلي</span>
          <h3 className="text-xl font-bold text-white mt-1">{Math.round(netRealProfit).toLocaleString()} ج.م</h3>
          <span className="text-[11px] text-white/70 block mt-0.5">هامش الربح: {overallMargin}%</span>
        </div>
      </div>

      {/* 3. Analytics Chart & Inventory Valuation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-sm p-5 border border-slate-200">
          <h2 className="text-sm font-semibold text-[#03204E] mb-3 pb-2 border-b border-slate-200">
            تحليل المبيعات والتكاليف الأسبوعية
          </h2>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financialChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  formatter={(val, name) => [
                    `${val} ج.م`, 
                    name === 'revenue' ? 'المبيعات' : name === 'costs' ? 'التكاليف' : 'الربح'
                  ]}
                  contentStyle={{ backgroundColor: '#ffffff', color: '#0f172a', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Legend formatter={(val) => val === 'revenue' ? 'المبيعات' : val === 'costs' ? 'التكاليف' : 'الربح'} />
                <Bar dataKey="revenue" fill="#03204E" radius={[2, 2, 0, 0]} />
                <Bar dataKey="costs" fill="#94a3b8" radius={[2, 2, 0, 0]} />
                <Bar dataKey="profit" fill="#15803d" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Inventory summary */}
        <div className="bg-white rounded-sm p-5 border border-slate-200 flex flex-col justify-between">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-[#03204E] pb-2 border-b border-slate-200">
              تقييم المخزون الحالي
            </h2>

            <div className="p-3 bg-[#F8FAFC] rounded-sm border border-slate-200 text-xs">
              <span className="text-slate-500 block">القيمة البيعية للمخزون:</span>
              <span className="text-base font-bold text-slate-900 block mt-0.5">
                {totalInventoryRetailValue.toLocaleString()} ج.م
              </span>
            </div>

            <div className="p-3 bg-[#F8FAFC] rounded-sm border border-slate-200 text-xs">
              <span className="text-slate-500 block">تكلفة رأس المال في المخزون:</span>
              <span className="text-base font-bold text-slate-700 block mt-0.5">
                {totalInventoryCostValue.toLocaleString()} ج.م
              </span>
            </div>

            <div className="p-3 bg-[#F8FAFC] rounded-sm border border-slate-200 text-xs">
              <span className="text-slate-500 block">الربح المتوقع عند بيع المخزون:</span>
              <span className="text-base font-bold text-[#15803d] block mt-0.5">
                {(totalInventoryRetailValue - totalInventoryCostValue).toLocaleString()} ج.م
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Product Pricing Table */}
      <div className="bg-white rounded-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-[#F8FAFC] flex justify-between items-center">
          <h2 className="text-sm font-semibold text-[#03204E]">
            تحديد أسعار التكلفة وأسعار البيع
          </h2>
          <span className="text-xs text-slate-500">{products.length} عطر</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#F8FAFC] text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">اسم العطر</th>
                <th className="py-2.5 px-4">الحجم</th>
                <th className="py-2.5 px-4 text-center">سعر التكلفة (ج.م)</th>
                <th className="py-2.5 px-4 text-center">سعر البيع (ج.م)</th>
                <th className="py-2.5 px-4 text-center">صافي ربح القطعة</th>
                <th className="py-2.5 px-4 text-center">هامش الربح</th>
                <th className="py-2.5 px-4 text-center">المخزون</th>
                <th className="py-2.5 px-4 text-left">حفظ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
              {products.map((product) => {
                const variants = editableVariants[product._id] || product.variants || [];
                const isSaving = savingProductId === product._id;
                const isSaved = savedSuccessId === product._id;

                return variants.map((variant, vIdx) => {
                  const cost = variant.costPrice || 0;
                  const price = variant.price || 0;
                  const profit = price - cost;
                  const marginPercent = price > 0 ? Math.round((profit / price) * 100) : 0;
                  const mainImg = product.images?.[0]?.url || '/img/product.png';

                  return (
                    <tr key={`${product._id}-${vIdx}`} className="hover:bg-slate-50 transition-colors duration-150">
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2">
                          <img 
                            src={mainImg} 
                            alt={product.name} 
                            className="w-7 h-7 rounded-sm object-contain border border-slate-200 shrink-0"
                            onError={(e) => { e.target.src = '/img/product.png'; }}
                          />
                          <span className="font-medium text-slate-900 text-xs">{product.name}</span>
                        </div>
                      </td>

                      <td className="py-2.5 px-4 font-mono">
                        {variant.size}
                      </td>

                      <td className="py-2.5 px-4 text-center">
                        <input
                          type="number"
                          min="0"
                          value={variant.costPrice || ''}
                          onChange={(e) => handlePriceChange(product._id, vIdx, 'costPrice', e.target.value)}
                          className="w-20 bg-white border border-slate-200 rounded-sm px-2 py-1 text-xs text-center outline-none focus:border-[#03204E]"
                        />
                      </td>

                      <td className="py-2.5 px-4 text-center">
                        <input
                          type="number"
                          min="0"
                          value={variant.price || ''}
                          onChange={(e) => handlePriceChange(product._id, vIdx, 'price', e.target.value)}
                          className="w-20 bg-white border border-slate-200 rounded-sm px-2 py-1 text-xs text-center outline-none focus:border-[#03204E]"
                        />
                      </td>

                      <td className="py-2.5 px-4 text-center font-medium text-slate-900">
                        {profit > 0 ? `+${profit} ج.م` : `${profit} ج.م`}
                      </td>

                      <td className="py-2.5 px-4 text-center font-mono">
                        {marginPercent}%
                      </td>

                      <td className="py-2.5 px-4 text-center font-mono">
                        {variant.stock}
                      </td>

                      <td className="py-2.5 px-4 text-left">
                        {vIdx === 0 && (
                          <button
                            onClick={() => handleSaveProductPricing(product)}
                            disabled={isSaving}
                            className="px-2.5 py-1 rounded-sm bg-[#03204E] hover:bg-[#02183b] text-white text-xs inline-flex items-center gap-1 transition-colors duration-150 disabled:opacity-50"
                          >
                            {isSaved ? <Check size={12} /> : <Save size={12} />}
                            <span>{isSaved ? 'تم' : 'حفظ'}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Expenses */}
      <div className="bg-white rounded-sm border border-slate-200 p-4 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-[#03204E]">سجل المصروفات التشغيلية</h2>
          <button
            onClick={() => setShowExpenseModal(true)}
            className="text-xs text-[#03204E] hover:underline flex items-center gap-1"
          >
            <Plus size={12} />
            <span>إضافة مصروف</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {expenses.map((exp) => (
            <div key={exp.id} className="p-3 rounded-sm bg-[#F8FAFC] border border-slate-200 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block font-mono">{exp.date}</span>
                <h4 className="font-medium text-slate-800">{exp.title}</h4>
              </div>

              <div className="text-left flex items-center gap-2">
                <span className="font-semibold text-[#b91c1c]">{exp.amount.toLocaleString()} ج.م</span>
                <button
                  onClick={() => handleDeleteExpense(exp.id)}
                  className="p-1 text-slate-400 hover:text-red-700"
                  title="حذف"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 rtl">
          <div className="fixed inset-0 bg-black/40 transition-opacity duration-150" onClick={() => setShowExpenseModal(false)} />

          <div className="relative w-full max-w-sm bg-white rounded-sm border border-slate-200 overlay-shadow overflow-hidden z-10">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-[#F8FAFC] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#03204E]">تسجيل مصروف جديد</h2>
              <button onClick={() => setShowExpenseModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">اسم المصروف *</label>
                <input
                  type="text"
                  required
                  value={newExpense.title}
                  onChange={(e) => setNewExpense({ ...newExpense, title: e.target.value })}
                  placeholder="مواد تغليف"
                  className="w-full h-9 bg-white border border-slate-200 rounded-sm px-3 text-xs outline-none focus:border-[#03204E]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">التصنيف</label>
                  <select
                    value={newExpense.category}
                    onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                    className="w-full h-9 bg-white border border-slate-200 rounded-sm px-2 text-xs outline-none"
                  >
                    <option value="marketing">تسويق</option>
                    <option value="packaging">تغليف وشحن</option>
                    <option value="operations">تشغيل</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">المبلغ (ج.م) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                    placeholder="1000"
                    className="w-full h-9 bg-white border border-slate-200 rounded-sm px-3 text-xs outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-sm hover:bg-slate-50 text-slate-700 h-9"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#03204E] text-white rounded-sm hover:bg-[#02183b] h-9 font-medium"
                >
                  إضافة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
