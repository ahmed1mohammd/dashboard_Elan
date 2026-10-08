import React, { useState, useEffect } from 'react';
import { 
  History, Search, Filter, RefreshCw, ArrowUpRight, 
  ArrowDownLeft, Clock, ShieldCheck, Tag
} from 'lucide-react';
import { getStockMovements } from '../services/api';

const MOVEMENT_TYPE_MAP = {
  purchase: { label: 'فاتورة شراء (+)', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  batch_consumption: { label: 'حسم تشغيلة (-)', bg: 'bg-red-50 text-red-700 border-red-200' },
  bottling_production: { label: 'إنتاج تام (+)', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  order_sale: { label: 'مبيعات طلب (-)', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
  order_cancel_restock: { label: 'استرجاع إلغاء (+)', bg: 'bg-teal-50 text-teal-700 border-teal-200' },
  waste: { label: 'هالك إنتاج (-)', bg: 'bg-orange-50 text-orange-700 border-orange-200' },
  damaged: { label: 'تلف تخزين (-)', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
  correction: { label: 'تسوية جرد', bg: 'bg-slate-100 text-slate-700 border-slate-200' },
  return: { label: 'مرتجع عميل (+)', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
};

export default function StockMovementsPage() {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [itemTypeFilter, setItemTypeFilter] = useState('');
  const [movementTypeFilter, setMovementTypeFilter] = useState('');

  const fetchMovements = async () => {
    setLoading(true);
    try {
      const data = await getStockMovements({
        itemType: itemTypeFilter || undefined,
        movementType: movementTypeFilter || undefined,
      });
      setMovements(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading stock movements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovements();
  }, [itemTypeFilter, movementTypeFilter]);

  return (
    <div className="space-y-6 text-right font-['Tajawal',sans-serif]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-[#03204E] flex items-center gap-2">
            <History size={20} strokeWidth={1.5} className="text-[#03204E]" />
            <span>سجل حركات وتدقيق المخزون (Stock Movement Audit Log)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            سجل غير قابل للتعديل يوثق كل إضافة أو خصم للمواد الخام والمنتجات التامة مع السبب والمصدر.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchMovements}
            className="p-2 rounded-sm border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
            title="تحديث"
          >
            <RefreshCw size={14} strokeWidth={1.5} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-sm p-3 border border-slate-200 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">نوع الصنف:</span>
            <select
              value={itemTypeFilter}
              onChange={(e) => setItemTypeFilter(e.target.value)}
              className="h-9 bg-[#F8FAFC] border border-slate-200 rounded-sm px-2 text-xs outline-none"
            >
              <option value="">الكل (خام ومنتج تام)</option>
              <option value="raw_material">مواد خام وزيوت (g)</option>
              <option value="finished_product">منتجات تامة الصنع (SKU)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">نوع الحركة:</span>
            <select
              value={movementTypeFilter}
              onChange={(e) => setMovementTypeFilter(e.target.value)}
              className="h-9 bg-[#F8FAFC] border border-slate-200 rounded-sm px-2 text-xs outline-none"
            >
              <option value="">جميع أنواع الحركات</option>
              {Object.entries(MOVEMENT_TYPE_MAP).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
        </div>

        <span className="text-xs text-slate-500 font-mono">
          {movements.length} حركة مسجلة
        </span>
      </div>

      {/* Movements Table */}
      <div className="bg-white rounded-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#F8FAFC] text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">التاريخ والوقت</th>
                <th className="py-3 px-4">الصنف</th>
                <th className="py-3 px-4">نوع الحركة</th>
                <th className="py-3 px-4 text-center">الكمية (+ / -)</th>
                <th className="py-3 px-4 text-center">الرصيد قبل / بعد</th>
                <th className="py-3 px-4">المرجع / المستند</th>
                <th className="py-3 px-4">البيان والسبب</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-[#03204E] border-t-transparent rounded-full animate-spin"></div>
                      <span>جاري تحميل سجل الحركات...</span>
                    </div>
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    لا توجد حركات مسجلة تطابق معايير الفلترة.
                  </td>
                </tr>
              ) : (
                movements.map((mov) => {
                  const typeInfo = MOVEMENT_TYPE_MAP[mov.movementType] || { label: mov.movementType, bg: 'bg-slate-100 text-slate-700 border-slate-200' };
                  const isPositive = mov.quantityChange > 0;
                  const itemName = mov.rawMaterial?.name || (mov.product ? `${mov.product.name} (${mov.variantSize || ''})` : 'صنف غير محدد');

                  return (
                    <tr key={mov._id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                        {new Date(mov.createdAt).toLocaleString('ar-EG')}
                      </td>

                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {itemName}
                        <span className="block text-[10px] text-slate-400 font-normal">
                          {mov.itemType === 'raw_material' ? 'مادة خام (g)' : 'منتج تام (SKU)'}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-sm border text-[10px] font-medium ${typeInfo.bg}`}>
                          {typeInfo.label}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-bold">
                        <span className={isPositive ? 'text-emerald-700' : 'text-red-600'}>
                          {isPositive ? `+${mov.quantityChange}` : mov.quantityChange} {mov.unit}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center font-mono text-slate-600 text-[11px]">
                        {mov.previousQuantity} → <strong className="text-slate-900">{mov.newQuantity}</strong> {mov.unit}
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-slate-700">
                        {mov.referenceType ? `${mov.referenceType}: ${mov.referenceId || ''}` : '—'}
                      </td>

                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate text-[11px]">
                        {mov.reason || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
