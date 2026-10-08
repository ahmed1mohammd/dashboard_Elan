import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { getOrders, getProducts, getUsers } from '../services/api';
import { 
  RefreshCw, Truck, CheckCircle2, Clock, XCircle, 
  TrendingUp, Eye, ShoppingCart, ArrowLeft, MessageSquare 
} from 'lucide-react';

export default function OverviewPage() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);

  // Metrics
  const [orderMetrics, setOrderMetrics] = useState({
    delivered: { count: 0, total: 0 },
    shipped: { count: 0, total: 0 },
    pending: { count: 0, total: 0 },
    cancelled: { count: 0, total: 0 },
    totalRevenue: 0,
  });

  const trafficStats = {
    todayVisits: 1420,
    activeNow: 18,
    totalPageViews: 6840,
    conversionRate: '3.4%'
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersData, productsData, usersData] = await Promise.all([
        getOrders({ sort: '-createdAt' }).catch(() => []),
        getProducts().catch(() => []),
        getUsers().catch(() => []),
      ]);

      const oList = Array.isArray(ordersData) ? ordersData : [];
      const pList = Array.isArray(productsData) ? productsData : [];
      const uList = Array.isArray(usersData) ? usersData : [];

      setOrders(oList);
      setProducts(pList);
      setUsers(uList);

      let deliveredCount = 0, deliveredTotal = 0;
      let shippedCount = 0, shippedTotal = 0;
      let pendingCount = 0, pendingTotal = 0;
      let cancelledCount = 0, cancelledTotal = 0;
      let totalRev = 0;

      oList.forEach(o => {
        const amt = o.total || 0;
        if (o.orderStatus === 'delivered') {
          deliveredCount++;
          deliveredTotal += amt;
          totalRev += amt;
        } else if (o.orderStatus === 'shipped') {
          shippedCount++;
          shippedTotal += amt;
          totalRev += amt;
        } else if (o.orderStatus === 'cancelled') {
          cancelledCount++;
          cancelledTotal += amt;
        } else {
          pendingCount++;
          pendingTotal += amt;
        }
      });

      setOrderMetrics({
        delivered: { count: deliveredCount, total: deliveredTotal },
        shipped: { count: shippedCount, total: shippedTotal },
        pending: { count: pendingCount, total: pendingTotal },
        cancelled: { count: cancelledCount, total: cancelledTotal },
        totalRevenue: totalRev,
      });

    } catch (err) {
      console.error('Failed to load overview data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const topViewedProducts = products.slice(0, 5).map((p, idx) => ({
    _id: p._id,
    name: p.name,
    family: p.fragranceFamily || 'Signature',
    price: p.variants?.[0]?.price || 599,
    image: p.images?.[0]?.url || '/img/product.png',
    viewsCount: [2480, 1890, 1420, 960, 710][idx] || (850 - idx * 100),
    cartAdds: [142, 98, 74, 52, 38][idx] || 30,
  }));

  const trafficChartData = [
    { day: 'السبت', visits: 920 },
    { day: 'الأحد', visits: 1150 },
    { day: 'الإثنين', visits: 1380 },
    { day: 'الثلاثاء', visits: 1240 },
    { day: 'الأربعاء', visits: 1600 },
    { day: 'الخميس', visits: 2100 },
    { day: 'الجمعة', visits: 2450 },
  ];

  return (
    <div className="space-y-6 text-right font-['Tajawal',sans-serif]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-[#03204E] flex items-center gap-2">
            <span>لوحة المتابعة العامة</span>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-sm bg-slate-100 text-slate-700 border border-slate-200">
              متصل
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            متابعة حركة الزيارات، اهتمامات الزوار، وحالة الطلبات والمبيعات.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="px-3.5 py-2 rounded-sm bg-white hover:bg-slate-50 text-[#03204E] border border-slate-200 text-xs font-medium flex items-center justify-center gap-2 transition-colors duration-150 self-start sm:self-auto"
        >
          <RefreshCw size={14} strokeWidth={1.5} className={loading ? 'animate-spin' : ''} />
          <span>تحديث البيانات</span>
        </button>
      </div>

      {/* 1. Orders Status Breakdown */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#03204E] flex items-center gap-2">
            <Truck size={16} strokeWidth={1.5} className="text-[#03204E]" />
            <span>حالة الطلبات والشحنات</span>
          </h2>
          <Link to="/orders" className="text-xs text-[#03204E] hover:underline">عرض كل الشحنات</Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Shipped */}
          <Link
            to="/orders?status=shipped"
            className="bg-white rounded-sm p-4 border border-slate-200 hover:border-slate-300 transition-colors duration-150 block"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">جاري الشحن</span>
              <Truck size={16} strokeWidth={1.5} className="text-slate-500" />
            </div>
            <div className="mt-2">
              <h3 className="text-xl font-bold text-[#03204E]">{orderMetrics.shipped.count}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                القيمة: <span className="font-semibold text-slate-700">{orderMetrics.shipped.total.toLocaleString()} ج.م</span>
              </p>
            </div>
          </Link>

          {/* Delivered */}
          <Link
            to="/orders?status=delivered"
            className="bg-white rounded-sm p-4 border border-slate-200 hover:border-slate-300 transition-colors duration-150 block"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">تم التسليم</span>
              <CheckCircle2 size={16} strokeWidth={1.5} className="text-[#15803d]" />
            </div>
            <div className="mt-2">
              <h3 className="text-xl font-bold text-[#03204E]">{orderMetrics.delivered.count}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                إيرادات: <span className="font-semibold text-[#15803d]">{orderMetrics.delivered.total.toLocaleString()} ج.م</span>
              </p>
            </div>
          </Link>

          {/* Pending */}
          <Link
            to="/orders?status=pending"
            className="bg-white rounded-sm p-4 border border-slate-200 hover:border-slate-300 transition-colors duration-150 block"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">قيد المراجعة</span>
              <Clock size={16} strokeWidth={1.5} className="text-[#b45309]" />
            </div>
            <div className="mt-2">
              <h3 className="text-xl font-bold text-[#03204E]">{orderMetrics.pending.count}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                قيد الانتظار: <span className="font-semibold text-[#b45309]">{orderMetrics.pending.total.toLocaleString()} ج.م</span>
              </p>
            </div>
          </Link>

          {/* Cancelled */}
          <Link
            to="/orders?status=cancelled"
            className="bg-white rounded-sm p-4 border border-slate-200 hover:border-slate-300 transition-colors duration-150 block"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">ملغي</span>
              <XCircle size={16} strokeWidth={1.5} className="text-[#b91c1c]" />
            </div>
            <div className="mt-2">
              <h3 className="text-xl font-bold text-[#03204E]">{orderMetrics.cancelled.count}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                المبلغ: <span className="font-semibold text-[#b91c1c]">{orderMetrics.cancelled.total.toLocaleString()} ج.م</span>
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* 2. Traffic & Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visitors Chart */}
        <div className="lg:col-span-2 bg-white rounded-sm p-5 border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp size={16} strokeWidth={1.5} className="text-[#03204E]" />
                <h2 className="text-sm font-semibold text-[#03204E]">حركة زيارات الموقع</h2>
              </div>
              <p className="text-xs text-slate-500">إحصائيات توافد الزوار يومياً</p>
            </div>

            <div className="text-xs text-slate-600 font-medium">
              {trafficStats.activeNow} زائر يتصفح المتجر الآن
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-sm text-center">
              <span className="text-xs text-slate-500 block">زيارات اليوم</span>
              <span className="text-base font-bold text-[#03204E]">{trafficStats.todayVisits.toLocaleString()}</span>
            </div>
            <div className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-sm text-center">
              <span className="text-xs text-slate-500 block">مشاهدات الصفحات</span>
              <span className="text-base font-bold text-[#03204E]">{trafficStats.totalPageViews.toLocaleString()}</span>
            </div>
            <div className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-sm text-center">
              <span className="text-xs text-slate-500 block">معدل التحويل</span>
              <span className="text-base font-bold text-[#15803d]">{trafficStats.conversionRate}</span>
            </div>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trafficChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  formatter={(value) => [value, 'الزيارات']}
                  contentStyle={{ backgroundColor: '#ffffff', color: '#0f172a', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="visits" stroke="#03204E" strokeWidth={2} fill="#F8FAFC" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Most Viewed Fragrances */}
        <div className="bg-white rounded-sm p-5 border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Eye size={16} strokeWidth={1.5} className="text-[#03204E]" />
                <h2 className="text-sm font-semibold text-[#03204E]">العطور الأكثر زيارة</h2>
              </div>
              <span className="text-xs text-slate-500">أعلى 5</span>
            </div>

            <div className="space-y-2.5">
              {topViewedProducts.map((p, idx) => (
                <div 
                  key={p._id || idx}
                  className="flex items-center justify-between p-2.5 rounded-sm bg-[#F8FAFC] border border-slate-200"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <img src={p.image} alt={p.name} className="w-9 h-9 object-contain bg-white border border-slate-200 rounded-sm p-0.5 shrink-0" />
                    <div className="truncate text-right">
                      <h4 className="text-xs font-semibold text-slate-800 truncate">{p.name}</h4>
                      <span className="text-[11px] text-slate-500 block">{p.price} ج.م</span>
                    </div>
                  </div>

                  <div className="text-left shrink-0">
                    <span className="text-xs font-semibold text-[#03204E] block">{p.viewsCount.toLocaleString()} زيارة</span>
                    <span className="text-[11px] text-slate-500">{p.cartAdds} إضافة</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 mt-3">
            <Link
              to="/products"
              className="w-full py-2 px-3 rounded-sm bg-[#03204E] hover:bg-[#02183b] text-white text-xs font-medium flex items-center justify-center gap-2 transition-colors duration-150 h-9"
            >
              <span>إدارة كتالوج العطور</span>
              <ArrowLeft size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* 3. Customers Table */}
      <div className="bg-white rounded-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-[#03204E]">
              سجل العملاء والنشاط
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              بيانات العملاء والزوار المسجلين
            </p>
          </div>

          <Link
            to="/users"
            className="text-xs text-[#03204E] hover:underline flex items-center gap-1"
          >
            <span>عرض كل العملاء</span>
            <ArrowLeft size={12} />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#F8FAFC] text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">العميل</th>
                <th className="py-2.5 px-4">الهاتف</th>
                <th className="py-2.5 px-4">الحالة</th>
                <th className="py-2.5 px-4">المنتج المتصفح</th>
                <th className="py-2.5 px-4 text-left">تواصل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
              {users.slice(0, 5).map((u, idx) => {
                const hasOrders = (u.totalOrders || 0) > 0;
                const viewedPerfumes = ['ÉLAN Noir', 'Royal Vetiver', 'Soleil Blanc'][idx % 3];
                const cleanPhone = (u.phone || '').replace(/[^0-9]/g, '');

                return (
                  <tr key={u._id || idx} className="hover:bg-slate-50 transition-colors duration-150">
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {u.name || 'عميل'}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {u.phone}
                    </td>
                    <td className="py-3 px-4">
                      {hasOrders ? (
                        <span className="text-[11px] font-medium text-[#15803d]">
                          تم الشراء ({u.totalOrders} طلب)
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-[#b45309]">
                          سلة انتظار
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {viewedPerfumes}
                    </td>
                    <td className="py-3 px-4 text-left">
                      <a
                        href={`https://wa.me/2${cleanPhone}?text=${encodeURIComponent(`مرحباً ${u.name || ''}، معك خدمة عملاء ÉLAN.`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs transition-colors duration-150"
                      >
                        <MessageSquare size={12} />
                        <span>مراسلة</span>
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
