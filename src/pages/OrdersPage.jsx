import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import Swal from 'sweetalert2';
import { 
  getOrders, 
  updateOrderStatus, 
  verifyOrderPayment, 
  getCashAccounts,
  getProducts,
  createAdminOrder
} from '../services/api';
import { 
  Truck, CheckCircle2, Clock, XCircle, Search, RefreshCw, 
  Eye, X, Tag, Smartphone, CreditCard, DollarSign, Home, Train, 
  MessageSquare, Phone, Mail, Printer, ShieldCheck, FileText, 
  ExternalLink, ZoomIn, ArrowUpDown, ChevronRight, Check, AlertCircle, Building, MapPin,
  Plus, Trash2, ShoppingBag, User, Wallet
} from 'lucide-react';

const EGYPT_GOVERNORATES = [
  'القاهرة (Cairo)', 'الجيزة (Giza)', 'الإسكندرية (Alexandria)', 'القليوبية (Qalyubia)',
  'الشرقية (Sharqia)', 'الدقهلية (Dakahlia)', 'الغربية (Gharbia)', 'المنوفية (Monufia)',
  'البحيرة (Beheira)', 'كفر الشيخ (Kafr El Sheikh)', 'دمياط (Damietta)', 'بورسعيد (Port Said)',
  'الإسماعيلية (Ismailia)', 'السويس (Suez)', 'الفيوم (Faiyum)', 'بني سويف (Beni Suef)',
  'المنيا (Minya)', 'أسيوط (Assiut)', 'سوهاج (Sohag)', 'قنا (Qena)',
  'الأقصر (Luxor)', 'أسوان (Aswan)', 'البحر الأحمر (Red Sea)', 'شمال سيناء (North Sinai)',
  'جنوب سيناء (South Sinai)', 'مطروح (Matrouh)', 'الوادي الجديد (New Valley)'
];

const statusConfig = {
  all: { label: 'جميع الطلبات', color: 'text-slate-700', bg: 'bg-slate-100', border: 'border-slate-200' },
  pending: { label: 'قيد الانتظار', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  confirmed: { label: 'تم التأكيد', color: 'text-[#03204E]', bg: 'bg-blue-50', border: 'border-blue-200' },
  processing: { label: 'جاري التجهيز', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  shipped: { label: 'جاري الشحن', color: 'text-sky-700', bg: 'bg-sky-50', border: 'border-sky-200' },
  delivered: { label: 'تم التوصيل', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  cancelled: { label: 'ملغي', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
};

const renderPaymentMethodBadge = (method, isPaid) => {
  let icon = <DollarSign size={12} strokeWidth={1.5} />;
  let label = 'عند الاستلام';
  
  if (method === 'vodafone_cash') {
    icon = <Smartphone size={12} strokeWidth={1.5} />;
    label = 'فودافون كاش';
  } else if (method === 'instapay') {
    icon = <Smartphone size={12} strokeWidth={1.5} />;
    label = 'إنستاباي';
  } else if (method === 'card' || method === 'fawaterk') {
    icon = <CreditCard size={12} strokeWidth={1.5} />;
    label = 'دفع إلكتروني';
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
        {icon}
        <span>{label}</span>
      </span>
      {isPaid ? (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
          <Check size={10} strokeWidth={2} /> مدفوع
        </span>
      ) : (
        <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.2 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
          معلق
        </span>
      )}
    </div>
  );
};

const initialNewOrderState = {
  customerName: '',
  customerPhone: '',
  customerPhone2: '',
  customerEmail: '',
  deliveryMethod: 'home_delivery',
  shippingAddress: {
    governorate: 'القاهرة (Cairo)',
    city: 'القاهرة',
    street: '',
    buildingNumber: '',
    floor: '',
    apartment: '',
    landmark: '',
    deliveryNotes: ''
  },
  metroPickup: {
    stationName: '',
    line: 'الخط الأول / الثاني',
    notes: ''
  },
  items: [
    { productId: '', size: '50ml', price: 1450, quantity: 1 }
  ],
  shipping: 50,
  discount: 0,
  paymentMethod: 'cash_on_delivery',
  paymentStatus: 'pending',
  orderStatus: 'confirmed',
  cashAccountId: '',
  adminNotes: ''
};

export default function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const initialStatus = searchParams.get('status') || 'all';
  const [selectedStatus, setSelectedStatus] = useState(initialStatus);
  
  // Modals & Print Views
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [zoomReceiptUrl, setZoomReceiptUrl] = useState(null);
  const [selectedCashAccountId, setSelectedCashAccountId] = useState('');
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [printMode, setPrintMode] = useState(null); // 'invoice' | 'shipping' | null

  // Create Order Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState(initialNewOrderState);
  const [creatingOrder, setCreatingOrder] = useState(false);

  const invoicePrintRef = useRef(null);
  const shippingPrintRef = useRef(null);

  const fetchOrdersAndAccounts = async () => {
    setLoading(true);
    try {
      const [ordersData, accountsData, prodsData] = await Promise.all([
        getOrders({ sort: '-createdAt' }),
        getCashAccounts(),
        getProducts()
      ]);
      const ordersList = Array.isArray(ordersData) ? ordersData : [];
      setOrders(ordersList);
      setCashAccounts(Array.isArray(accountsData) ? accountsData : []);
      setProductsList(Array.isArray(prodsData) ? prodsData : []);

      const queryId = searchParams.get('id');
      if (queryId) {
        const found = ordersList.find(o => o._id === queryId);
        if (found) setSelectedOrder(found);
      }
    } catch (err) {
      console.error('Failed to fetch orders or accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrdersAndAccounts();
  }, []);

  useEffect(() => {
    const qStatus = searchParams.get('status');
    if (qStatus) setSelectedStatus(qStatus);
  }, [searchParams]);

  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingStatus(true);
    try {
      await updateOrderStatus(orderId, newStatus);
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, orderStatus: newStatus } : o));
      if (selectedOrder && selectedOrder._id === orderId) {
        setSelectedOrder(prev => ({ ...prev, orderStatus: newStatus }));
      }
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'تم تحديث حالة الطلب بنجاح',
        showConfirmButton: false,
        timer: 2000
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'خطأ',
        text: err.response?.data?.message || 'تعذر تحديث حالة الطلب'
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleVerifyPayment = async () => {
    if (!selectedOrder) return;
    setVerifyingPayment(true);
    try {
      const res = await verifyOrderPayment(selectedOrder._id, {
        cashAccountId: selectedCashAccountId || null,
        amountReceived: selectedOrder.total
      });

      const updated = res || { ...selectedOrder, paymentStatus: 'paid', orderStatus: 'confirmed' };
      setOrders(prev => prev.map(o => o._id === selectedOrder._id ? { ...o, paymentStatus: 'paid', orderStatus: 'confirmed' } : o));
      setSelectedOrder(prev => ({ ...prev, paymentStatus: 'paid', orderStatus: 'confirmed' }));

      Swal.fire({
        icon: 'success',
        title: 'تم التحقق من الدفع وإيداعه بنجاح!',
        text: `تم تأكيد سداد الطلب #${selectedOrder.orderNumber} وترحيل المبلغ إلى حساب الخزينة المحدد وإرسال إشعار للعميل.`,
        confirmButtonColor: '#03204E',
        confirmButtonText: 'حسناً'
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'خطأ في التحقق',
        text: err.response?.data?.message || 'تعذر التحقق من الدفع'
      });
    } finally {
      setVerifyingPayment(false);
    }
  };

  const handlePrint = (mode) => {
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
    }, 250);
  };

  // Create Order Handlers
  const handleOpenCreateOrder = () => {
    const firstProd = productsList[0];
    const firstVariant = firstProd?.variants?.find(v => v.size === '50ml') || firstProd?.variants?.[0];
    
    setCreateFormData({
      ...initialNewOrderState,
      items: [
        {
          productId: firstProd?._id || '',
          size: firstVariant?.size || '50ml',
          price: firstVariant?.price || 1450,
          quantity: 1
        }
      ]
    });
    setShowCreateModal(true);
  };

  const handleAddItemRow = () => {
    const firstProd = productsList[0];
    const firstVariant = firstProd?.variants?.find(v => v.size === '50ml') || firstProd?.variants?.[0];
    setCreateFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          productId: firstProd?._id || '',
          size: firstVariant?.size || '50ml',
          price: firstVariant?.price || 1450,
          quantity: 1
        }
      ]
    }));
  };

  const handleRemoveItemRow = (index) => {
    if (createFormData.items.length <= 1) return;
    setCreateFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index)
    }));
  };

  const handleItemProductOrSizeChange = (index, field, value) => {
    setCreateFormData(prev => {
      const updated = [...prev.items];
      const item = { ...updated[index], [field]: value };

      const prod = productsList.find(p => p._id === (field === 'productId' ? value : item.productId));
      if (prod) {
        if (field === 'productId') {
          const v = prod.variants?.find(variant => variant.size === item.size) || prod.variants?.[0];
          if (v) {
            item.price = v.price;
            item.size = v.size;
          }
        } else if (field === 'size') {
          const v = prod.variants?.find(variant => variant.size === value);
          if (v) {
            item.price = v.price;
          }
        }
      }

      updated[index] = item;
      return { ...prev, items: updated };
    });
  };

  const handleItemQtyOrPriceChange = (index, field, value) => {
    setCreateFormData(prev => {
      const updated = [...prev.items];
      updated[index] = {
        ...updated[index],
        [field]: Number(value)
      };
      return { ...prev, items: updated };
    });
  };

  const createOrderSubtotal = createFormData.items.reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0
  );
  const createOrderTotal = Math.max(0, createOrderSubtotal + Number(createFormData.shipping || 0) - Number(createFormData.discount || 0));

  const handleSubmitCreateOrder = async (e) => {
    e.preventDefault();
    if (!createFormData.customerPhone?.trim()) {
      Swal.fire({ icon: 'warning', title: 'بيانات ناقصة', text: 'يرجى إدخال رقم هاتف العميل' });
      return;
    }

    if (!createFormData.items.length || !createFormData.items[0].productId) {
      Swal.fire({ icon: 'warning', title: 'بيانات ناقصة', text: 'يرجى اختيار عطر واحد على الأقل' });
      return;
    }

    setCreatingOrder(true);
    try {
      const payload = {
        customerName: createFormData.customerName?.trim() || 'عميل ÉLAN',
        customerPhone: createFormData.customerPhone.trim(),
        customerPhone2: createFormData.customerPhone2?.trim() || null,
        customerEmail: createFormData.customerEmail?.trim() || null,
        deliveryMethod: createFormData.deliveryMethod,
        shippingAddress: createFormData.deliveryMethod === 'home_delivery' ? createFormData.shippingAddress : {},
        metroPickup: createFormData.deliveryMethod === 'metro_pickup' ? createFormData.metroPickup : null,
        items: createFormData.items.map(i => ({
          productId: i.productId,
          size: i.size,
          price: Number(i.price) || 0,
          quantity: Number(i.quantity) || 1
        })),
        shipping: Number(createFormData.shipping) || 0,
        discount: Number(createFormData.discount) || 0,
        paymentMethod: createFormData.paymentMethod,
        paymentStatus: createFormData.paymentStatus,
        orderStatus: createFormData.orderStatus,
        cashAccountId: createFormData.cashAccountId || null,
        adminNotes: createFormData.adminNotes || 'تم إنشاؤه يدوياً من لوحة التحكم'
      };

      const res = await createAdminOrder(payload);
      setShowCreateModal(false);
      await fetchOrdersAndAccounts();

      Swal.fire({
        icon: 'success',
        title: 'تم إنشاء الطلب بنجاح!',
        text: `تم تسجيل الطلب رقم #${res.orderNumber || ''} بنجاح ويمكنك الآن طباعة الفاتورة أو البوليصة.`,
        confirmButtonColor: '#03204E',
        confirmButtonText: 'عرض تفاصيل الطلب'
      }).then(() => {
        if (res) setSelectedOrder(res);
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'تعذر إنشاء الطلب',
        text: err.response?.data?.message || 'حدث خطأ أثناء حفظ الطلب'
      });
    } finally {
      setCreatingOrder(false);
    }
  };

  const statusCounts = {
    all: orders.length,
    pending: orders.filter(o => o.orderStatus === 'pending').length,
    confirmed: orders.filter(o => o.orderStatus === 'confirmed').length,
    processing: orders.filter(o => o.orderStatus === 'processing').length,
    shipped: orders.filter(o => o.orderStatus === 'shipped').length,
    delivered: orders.filter(o => o.orderStatus === 'delivered').length,
    cancelled: orders.filter(o => o.orderStatus === 'cancelled').length,
  };

  const filteredOrders = orders.filter(o => {
    const term = search.toLowerCase();
    const orderNum = (o.orderNumber || o._id || '').toLowerCase();
    const customerName = (o.customer?.name || '').toLowerCase();
    const phone = (o.customerPhone || o.customer?.phone || '').toLowerCase();
    const phone2 = (o.customerPhone2 || '').toLowerCase();
    const email = (o.customerEmail || o.customer?.email || '').toLowerCase();
    const coupon = (o.couponCode || '').toLowerCase();
    
    const matchesSearch = orderNum.includes(term) || customerName.includes(term) || phone.includes(term) || phone2.includes(term) || email.includes(term) || coupon.includes(term);
    let matchesStatus = selectedStatus === 'all' || o.orderStatus === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 text-right font-['Tajawal',sans-serif]">
      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#03204E] to-[#083375] text-white flex items-center justify-center shadow-md shadow-[#03204E]/10">
              <Truck size={20} strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-[#03204E] tracking-tight">
                إدارة الطلبات والشحنات والفواتير
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                إنشاء طلبات يدوية، التحقق الفوري من إيصالات الدفع، وإصدار بوالص الشحن وفواتير 10×15 سم.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleOpenCreateOrder}
            className="px-4 py-2.5 rounded-xl bg-[#03204E] hover:bg-[#02183b] text-white text-xs font-bold flex items-center gap-2 transition-all shadow-sm hover:shadow active:scale-95"
          >
            <Plus size={16} />
            <span>إنشاء طلب يدوي جديد</span>
          </button>

          <button
            onClick={fetchOrdersAndAccounts}
            className="p-2.5 rounded-xl border border-slate-200 bg-white/80 backdrop-blur hover:bg-slate-50 text-slate-700 transition-all duration-150 shadow-xs"
            title="تحديث"
          >
            <RefreshCw size={14} strokeWidth={1.7} className={loading ? 'animate-spin text-[#03204E]' : ''} />
          </button>
        </div>
      </div>

      {/* Status Filter Cards with Glass & Glow */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { key: 'all', label: 'الكل', count: statusCounts.all, icon: FileText },
          { key: 'pending', label: 'قيد المراجعة', count: statusCounts.pending, icon: Clock, color: 'text-amber-600' },
          { key: 'confirmed', label: 'تم التأكيد', count: statusCounts.confirmed, icon: CheckCircle2, color: 'text-blue-600' },
          { key: 'processing', label: 'جاري التجهيز', count: statusCounts.processing, icon: RefreshCw, color: 'text-indigo-600' },
          { key: 'shipped', label: 'جاري الشحن', count: statusCounts.shipped, icon: Truck, color: 'text-sky-600' },
          { key: 'delivered', label: 'تم التوصيل', count: statusCounts.delivered, icon: CheckCircle2, color: 'text-emerald-600' },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = selectedStatus === item.key;
          return (
            <button
              key={item.key}
              onClick={() => {
                setSelectedStatus(item.key);
                setSearchParams(item.key === 'all' ? {} : { status: item.key });
              }}
              className={`p-3.5 rounded-2xl border text-right transition-all duration-200 relative overflow-hidden ${
                isActive 
                  ? 'bg-[#03204E] text-white border-[#03204E] shadow-lg shadow-[#03204E]/20 scale-[1.02]' 
                  : 'bg-white/80 backdrop-blur-md border-slate-200/90 text-slate-700 hover:border-slate-300 hover:bg-white shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">{item.label}</span>
                <Icon size={16} strokeWidth={1.8} className={isActive ? 'text-white' : item.color || 'text-slate-400'} />
              </div>
              <p className={`text-lg font-black mt-1.5 ${isActive ? 'text-white' : 'text-slate-900'}`}>
                {item.count} <span className="text-[11px] font-normal opacity-80">طلب</span>
              </p>
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <input
            type="text"
            placeholder="بحث برقم الطلب، اسم العميل، الهاتف، الإيميل أو الكوبون..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#F8FAFC] border border-slate-200 focus:border-[#03204E] rounded-xl px-4 py-2.5 pr-10 text-xs outline-none transition-all focus:bg-white focus:shadow-inner"
          />
          <Search size={16} className="text-slate-400 absolute right-3.5 top-3" />
        </div>

        <div className="text-xs text-slate-500 font-medium w-full sm:w-auto text-left flex items-center gap-3">
          <span>النتائج المعروضة: <strong>{filteredOrders.length}</strong> طلب</span>
          {selectedStatus !== 'all' && (
            <button
              onClick={() => { setSelectedStatus('all'); setSearchParams({}); }}
              className="text-[#03204E] font-semibold hover:underline"
            >
              إلغاء الفلترة
            </button>
          )}
        </div>
      </div>

      {/* Orders Table */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-500 bg-white/60 rounded-2xl border border-slate-200/60">
          <RefreshCw size={24} className="animate-spin text-[#03204E] mx-auto mb-2" />
          <span>جاري تحميل قائمة الطلبات والشحنات...</span>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-500 space-y-3">
          <Truck size={36} className="mx-auto text-slate-300" strokeWidth={1.5} />
          <h3 className="text-sm font-bold text-slate-800">لا توجد طلبات مطابقة</h3>
          <p className="text-xs text-slate-400">يمكنك الضغط على "إنشاء طلب يدوي جديد" لتسجيل طلب جديد فوراً.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#F8FAFC] text-slate-500 border-b border-slate-200 font-bold">
                <tr>
                  <th className="p-3.5">رقم الطلب</th>
                  <th className="p-3.5">العميل & الهاتف</th>
                  <th className="p-3.5">طريقة الاستلام & المحافظة</th>
                  <th className="p-3.5">محتويات الطلب</th>
                  <th className="p-3.5">طريقة الدفع</th>
                  <th className="p-3.5">الإجمالي</th>
                  <th className="p-3.5">حالة الطلب</th>
                  <th className="p-3.5 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((order) => {
                  const isPaid = order.paymentStatus === 'paid';
                  const hasProof = !!(order.paymentScreenshot || order.paymentProofUrl);
                  return (
                    <tr key={order._id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Order Number & Date */}
                      <td className="p-3.5 font-mono font-bold text-[#03204E]">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="hover:underline flex items-center gap-1 text-xs"
                        >
                          <span>#{order.orderNumber}</span>
                        </button>
                        <span className="text-[10px] text-slate-400 block font-sans font-normal mt-0.5">
                          {new Date(order.createdAt).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>

                      {/* Customer Info */}
                      <td className="p-3.5">
                        <span className="font-bold text-slate-900 block">{order.customer?.name || 'عميل زائر'}</span>
                        <span className="text-[11px] font-mono text-slate-500 block dir-ltr text-right">{order.customerPhone || order.customer?.phone}</span>
                        {order.customerPhone2 && (
                          <span className="text-[10px] font-mono text-slate-400 block dir-ltr text-right">{order.customerPhone2}</span>
                        )}
                      </td>

                      {/* Delivery Info */}
                      <td className="p-3.5">
                        {order.deliveryMethod === 'metro_pickup' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                            <Train size={12} /> {order.metroPickup?.stationNameAr || order.metroPickup?.stationName || 'محطة مترو'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700">
                            <Home size={12} className="text-slate-400" />
                            <span>{order.shippingAddress?.governorate || 'توصيل منزلي'}</span>
                          </span>
                        )}
                      </td>

                      {/* Items */}
                      <td className="p-3.5">
                        <span className="text-xs font-semibold text-slate-800">
                          {order.items?.length || 0} عطر
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate max-w-[150px]">
                          {order.items?.map(i => `${i.productName} (${i.size})`).join(', ')}
                        </span>
                      </td>

                      {/* Payment */}
                      <td className="p-3.5">
                        <div className="space-y-1">
                          {renderPaymentMethodBadge(order.paymentMethod, isPaid)}
                          {hasProof && (
                            <button
                              onClick={() => setZoomReceiptUrl(order.paymentScreenshot || order.paymentProofUrl)}
                              className="text-[10px] text-indigo-600 hover:underline flex items-center gap-0.5 font-bold"
                            >
                              <Eye size={10} /> معاينة الإيصال
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Total */}
                      <td className="p-3.5 font-mono font-black text-slate-900 text-xs">
                        {order.total?.toLocaleString()} ج.م
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        <select
                          value={order.orderStatus}
                          onChange={(e) => handleStatusChange(order._id, e.target.value)}
                          className={`text-[11px] font-bold px-2 py-1 rounded-lg border outline-none ${
                            statusConfig[order.orderStatus]?.bg || 'bg-slate-50'
                          } ${statusConfig[order.orderStatus]?.color || 'text-slate-800'} ${
                            statusConfig[order.orderStatus]?.border || 'border-slate-200'
                          }`}
                        >
                          <option value="pending">قيد الانتظار</option>
                          <option value="confirmed">تم التأكيد</option>
                          <option value="processing">جاري التجهيز</option>
                          <option value="shipped">جاري الشحن</option>
                          <option value="delivered">تم التوصيل</option>
                          <option value="cancelled">ملغي</option>
                        </select>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-[#03204E] hover:text-white text-slate-700 transition-colors"
                            title="عرض تفاصيل الطلب والفاتورة"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => { setSelectedOrder(order); handlePrint('shipping'); }}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                            title="طباعة بوليصة الشحن"
                          >
                            <Truck size={14} />
                          </button>
                          <button
                            onClick={() => { setSelectedOrder(order); handlePrint('invoice'); }}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                            title="طباعة فاتورة 10×15 سم"
                          >
                            <Printer size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE MANUAL ORDER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 rtl bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-3xl bg-white rounded-3xl border border-slate-200 shadow-2xl z-10 max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200/80 bg-[#F8FAFC] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#03204E]/10 text-[#03204E] flex items-center justify-center">
                  <ShoppingBag size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#03204E]">إنشاء طلب جديد يدوياً (Manual Order)</h2>
                  <p className="text-[11px] text-slate-400">تسجيل طلب مخصص، تحديد العطور والأحجام، وحساب الإجمالي</p>
                </div>
              </div>

              <button onClick={() => setShowCreateModal(false)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitCreateOrder} className="p-6 space-y-5 text-xs overflow-y-auto flex-1">
              {/* Section 1: Customer Information */}
              <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-3">
                <span className="font-extrabold text-[#03204E] text-xs flex items-center gap-1.5">
                  <User size={15} />
                  <span>بيانات العميل (Customer Details)</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">اسم العميل *</label>
                    <input
                      type="text"
                      required
                      value={createFormData.customerName}
                      onChange={(e) => setCreateFormData({ ...createFormData, customerName: e.target.value })}
                      placeholder="مثال: أحمد محمد"
                      className="w-full h-9 bg-white border border-slate-200 rounded-xl px-3 text-xs outline-none focus:border-[#03204E]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">رقم الهاتف الأساسي (WhatsApp/الاتصال) *</label>
                    <input
                      type="tel"
                      required
                      value={createFormData.customerPhone}
                      onChange={(e) => setCreateFormData({ ...createFormData, customerPhone: e.target.value })}
                      placeholder="010xxxxxxxx"
                      className="w-full h-9 bg-white border border-slate-200 rounded-xl px-3 text-xs font-mono outline-none focus:border-[#03204E]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">رقم هاتف إضافي (اختياري)</label>
                    <input
                      type="tel"
                      value={createFormData.customerPhone2}
                      onChange={(e) => setCreateFormData({ ...createFormData, customerPhone2: e.target.value })}
                      placeholder="011xxxxxxxx"
                      className="w-full h-9 bg-white border border-slate-200 rounded-xl px-3 text-xs font-mono outline-none focus:border-[#03204E]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">البريد الإلكتروني (اختياري)</label>
                    <input
                      type="email"
                      value={createFormData.customerEmail}
                      onChange={(e) => setCreateFormData({ ...createFormData, customerEmail: e.target.value })}
                      placeholder="customer@gmail.com"
                      className="w-full h-9 bg-white border border-slate-200 rounded-xl px-3 text-xs outline-none focus:border-[#03204E]"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Delivery & Shipping Details */}
              <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-[#03204E] text-xs flex items-center gap-1.5">
                    <Truck size={15} />
                    <span>طريقة التوصيل والعنوان (Shipping & Delivery)</span>
                  </span>

                  <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setCreateFormData({ ...createFormData, deliveryMethod: 'home_delivery', shipping: 50 })}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        createFormData.deliveryMethod === 'home_delivery' ? 'bg-[#03204E] text-white shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      توصيل منزلي
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreateFormData({ ...createFormData, deliveryMethod: 'metro_pickup', shipping: 0 })}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        createFormData.deliveryMethod === 'metro_pickup' ? 'bg-purple-700 text-white shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      استلام محطة مترو
                    </button>
                  </div>
                </div>

                {createFormData.deliveryMethod === 'home_delivery' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">المحافظة *</label>
                      <select
                        value={createFormData.shippingAddress.governorate}
                        onChange={(e) => setCreateFormData({
                          ...createFormData,
                          shippingAddress: { ...createFormData.shippingAddress, governorate: e.target.value }
                        })}
                        className="w-full h-9 bg-white border border-slate-200 rounded-xl px-3 text-xs outline-none focus:border-[#03204E]"
                      >
                        {EGYPT_GOVERNORATES.map(gov => (
                          <option key={gov} value={gov}>{gov}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">المدينة / المنطقة *</label>
                      <input
                        type="text"
                        required
                        value={createFormData.shippingAddress.city}
                        onChange={(e) => setCreateFormData({
                          ...createFormData,
                          shippingAddress: { ...createFormData.shippingAddress, city: e.target.value }
                        })}
                        placeholder="مدينة نصر، التجمع، المهندسين..."
                        className="w-full h-9 bg-white border border-slate-200 rounded-xl px-3 text-xs outline-none focus:border-[#03204E]"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">تفاصيل الشارع والعنوان *</label>
                      <input
                        type="text"
                        required
                        value={createFormData.shippingAddress.street}
                        onChange={(e) => setCreateFormData({
                          ...createFormData,
                          shippingAddress: { ...createFormData.shippingAddress, street: e.target.value }
                        })}
                        placeholder="اسم الشارع، رقم العمارة، الدور، الشقة..."
                        className="w-full h-9 bg-white border border-slate-200 rounded-xl px-3 text-xs outline-none focus:border-[#03204E]"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">اسم محطة المترو *</label>
                      <input
                        type="text"
                        required
                        value={createFormData.metroPickup.stationName}
                        onChange={(e) => setCreateFormData({
                          ...createFormData,
                          metroPickup: { ...createFormData.metroPickup, stationName: e.target.value }
                        })}
                        placeholder="محطة الشهداء، أنور السادات، الأوبرا..."
                        className="w-full h-9 bg-white border border-slate-200 rounded-xl px-3 text-xs outline-none focus:border-[#03204E]"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">ملاحظات ميعاد الاستلام</label>
                      <input
                        type="text"
                        value={createFormData.metroPickup.notes}
                        onChange={(e) => setCreateFormData({
                          ...createFormData,
                          metroPickup: { ...createFormData.metroPickup, notes: e.target.value }
                        })}
                        placeholder="مثال: من الساعة 3 إلى 6 مساءً"
                        className="w-full h-9 bg-white border border-slate-200 rounded-xl px-3 text-xs outline-none focus:border-[#03204E]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Section 3: Ordered Items Builder */}
              <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <span className="font-extrabold text-[#03204E] text-xs flex items-center gap-1.5">
                    <Tag size={15} />
                    <span>العطور والمنتجات المطلوبة (Order Items)</span>
                  </span>

                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="px-3 py-1 bg-[#03204E] hover:bg-[#02183b] text-white rounded-xl text-[11px] font-bold flex items-center gap-1 transition-colors shadow-2xs"
                  >
                    <Plus size={13} />
                    <span>إضافة عطر آخر</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {createFormData.items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      {/* Product Select */}
                      <div className="sm:col-span-5">
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">العطر</label>
                        <select
                          value={item.productId}
                          onChange={(e) => handleItemProductOrSizeChange(idx, 'productId', e.target.value)}
                          className="w-full h-8 bg-white border border-slate-200 rounded-lg px-2 text-xs font-bold outline-none focus:border-[#03204E]"
                          required
                        >
                          <option value="">-- اختر العطر --</option>
                          {productsList.map(p => (
                            <option key={p._id} value={p._id}>{p.name} ({p.gender || 'MEN'})</option>
                          ))}
                        </select>
                      </div>

                      {/* Size Select */}
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">الحجم</label>
                        <select
                          value={item.size}
                          onChange={(e) => handleItemProductOrSizeChange(idx, 'size', e.target.value)}
                          className="w-full h-8 bg-white border border-slate-200 rounded-lg px-2 text-xs font-bold outline-none"
                        >
                          <option value="30ml">30ml</option>
                          <option value="50ml">50ml</option>
                          <option value="100ml">100ml</option>
                        </select>
                      </div>

                      {/* Unit Price */}
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">السعر (ج.م)</label>
                        <input
                          type="number"
                          min="0"
                          value={item.price}
                          onChange={(e) => handleItemQtyOrPriceChange(idx, 'price', e.target.value)}
                          className="w-full h-8 bg-white border border-slate-200 rounded-lg px-2 text-xs font-mono font-bold text-center outline-none"
                          required
                        />
                      </div>

                      {/* Quantity */}
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">الكمية</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemQtyOrPriceChange(idx, 'quantity', e.target.value)}
                          className="w-full h-8 bg-white border border-slate-200 rounded-lg px-2 text-xs font-mono font-bold text-center outline-none"
                          required
                        />
                      </div>

                      {/* Delete */}
                      <div className="sm:col-span-1 flex justify-center pt-3 sm:pt-0">
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          disabled={createFormData.items.length <= 1}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg disabled:opacity-20"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 4: Payment, Status & Financial Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Payment & Status Settings */}
                <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-3">
                  <span className="font-extrabold text-[#03204E] text-xs flex items-center gap-1.5">
                    <Wallet size={15} />
                    <span>إعدادات السداد وحالة الطلب</span>
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">طريقة الدفع</label>
                      <select
                        value={createFormData.paymentMethod}
                        onChange={(e) => setCreateFormData({ ...createFormData, paymentMethod: e.target.value })}
                        className="w-full h-8 bg-white border border-slate-200 rounded-lg px-2 text-xs outline-none"
                      >
                        <option value="cash_on_delivery">عند الاستلام (COD)</option>
                        <option value="vodafone_cash">فودافون كاش</option>
                        <option value="instapay">إنستاباي (InstaPay)</option>
                        <option value="card">بطاقة بنكية / فيزا</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">حالة السداد</label>
                      <select
                        value={createFormData.paymentStatus}
                        onChange={(e) => setCreateFormData({ ...createFormData, paymentStatus: e.target.value })}
                        className="w-full h-8 bg-white border border-slate-200 rounded-lg px-2 text-xs font-bold outline-none"
                      >
                        <option value="pending">معلق (Pending)</option>
                        <option value="paid">مدفوع بالكامل (Paid)</option>
                      </select>
                    </div>
                  </div>

                  {createFormData.paymentStatus === 'paid' && (
                    <div>
                      <label className="block text-[11px] font-bold text-emerald-800 mb-1">إيداع المبلغ في الخزينة / الحساب:</label>
                      <select
                        value={createFormData.cashAccountId}
                        onChange={(e) => setCreateFormData({ ...createFormData, cashAccountId: e.target.value })}
                        className="w-full h-8 bg-white border border-emerald-300 rounded-lg px-2 text-xs font-bold outline-none text-emerald-900"
                      >
                        <option value="">-- الحساب الافتراضي --</option>
                        {cashAccounts.map(acc => (
                          <option key={acc._id} value={acc._id}>
                            {acc.name} ({acc.type}) - رصيد: {acc.balance?.toLocaleString()} ج.م
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">حالة الطلب الافتتاحية</label>
                    <select
                      value={createFormData.orderStatus}
                      onChange={(e) => setCreateFormData({ ...createFormData, orderStatus: e.target.value })}
                      className="w-full h-8 bg-white border border-slate-200 rounded-lg px-2 text-xs font-bold outline-none"
                    >
                      <option value="confirmed">تم التأكيد (Confirmed)</option>
                      <option value="pending">قيد المراجعة (Pending)</option>
                      <option value="processing">جاري التجهيز (Processing)</option>
                    </select>
                  </div>
                </div>

                {/* Financial Summary Calculation */}
                <div className="p-4 bg-[#F8FAFC] border border-slate-200 rounded-2xl flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <span className="font-extrabold text-[#03204E] text-xs block pb-1 border-b border-slate-200">
                      ملخص الحساب والفاتورة
                    </span>

                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>مجموع المنتجات:</span>
                      <strong className="font-mono">{createOrderSubtotal.toLocaleString()} ج.م</strong>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span>مصاريف الشحن (ج.م):</span>
                      <input
                        type="number"
                        min="0"
                        value={createFormData.shipping}
                        onChange={(e) => setCreateFormData({ ...createFormData, shipping: Number(e.target.value) })}
                        className="w-20 h-7 bg-white border border-slate-200 rounded-lg px-2 text-xs font-mono font-bold text-center outline-none"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-emerald-700">خصم إضافي (ج.م):</span>
                      <input
                        type="number"
                        min="0"
                        value={createFormData.discount}
                        onChange={(e) => setCreateFormData({ ...createFormData, discount: Number(e.target.value) })}
                        className="w-20 h-7 bg-white border border-slate-200 rounded-lg px-2 text-xs font-mono font-bold text-center outline-none text-emerald-700"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200/90 flex items-center justify-between">
                    <span className="font-extrabold text-xs text-[#03204E]">المبلغ الإجمالي النهائي:</span>
                    <strong className="text-base font-black text-[#03204E] font-mono">
                      {createOrderTotal.toLocaleString()} ج.م
                    </strong>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 font-semibold h-10"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={creatingOrder}
                  className="px-6 py-2 bg-[#03204E] text-white rounded-xl hover:bg-[#02183b] h-10 font-bold disabled:opacity-50 shadow-sm"
                >
                  {creatingOrder ? 'جاري إنشاء الطلب...' : 'تأكيد وحفظ الطلب'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ORDER DETAILS MODAL */}
      {selectedOrder && !printMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 rtl bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl z-10 max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200/80 bg-[#F8FAFC] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#03204E]/10 text-[#03204E] flex items-center justify-center">
                  <Truck size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#03204E]">طلب #{selectedOrder.orderNumber}</h2>
                  <p className="text-[11px] text-slate-400">
                    تاريخ الطلب: {new Date(selectedOrder.createdAt).toLocaleString('ar-EG')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrint('shipping')}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                  title="طباعة بوليصة شحن الشحنة"
                >
                  <Truck size={13} />
                  <span>بوليصة الشحن</span>
                </button>

                <button
                  onClick={() => handlePrint('invoice')}
                  className="px-3 py-1.5 rounded-xl bg-[#03204E] hover:bg-[#02183b] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                  title="طباعة فاتورة حرارية 10×15 سم مع QR Code"
                >
                  <Printer size={13} />
                  <span>فاتورة 10×15</span>
                </button>

                <button onClick={() => setSelectedOrder(null)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-xs overflow-y-auto flex-1">
              {/* Payment Verification Banner if pending */}
              {selectedOrder.paymentStatus !== 'paid' && (
                <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-900 font-bold">
                      <AlertCircle size={16} className="text-amber-600" />
                      <span>التحقق من الدفع وتأكيد السداد</span>
                    </div>
                    {(selectedOrder.paymentScreenshot || selectedOrder.paymentProofUrl) && (
                      <button
                        onClick={() => setZoomReceiptUrl(selectedOrder.paymentScreenshot || selectedOrder.paymentProofUrl)}
                        className="text-xs text-indigo-700 font-bold hover:underline flex items-center gap-1"
                      >
                        <ZoomIn size={14} /> معاينة إشعار التحويل
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 items-center">
                    <select
                      value={selectedCashAccountId}
                      onChange={(e) => setSelectedCashAccountId(e.target.value)}
                      className="w-full sm:flex-1 h-9 bg-white border border-slate-300 rounded-xl px-3 text-xs outline-none focus:border-[#03204E]"
                    >
                      <option value="">-- اختر خزينة / حساب التحويل المالي --</option>
                      {cashAccounts.map(acc => (
                        <option key={acc._id} value={acc._id}>
                          {acc.name} ({acc.type}) - رصيد: {acc.balance?.toLocaleString()} ج.م
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={handleVerifyPayment}
                      disabled={verifyingPayment}
                      className="w-full sm:w-auto px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
                    >
                      {verifyingPayment ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                      <span>تأكيد سداد وإيداع ({selectedOrder.total?.toLocaleString()} ج.م)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Customer & Address Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <span className="font-extrabold text-[#03204E] text-xs block">بيانات العميل</span>
                  <div className="space-y-1 text-slate-700">
                    <p><strong>الاسم:</strong> {selectedOrder.customer?.name || 'عميل ÉLAN'}</p>
                    <p className="font-mono"><strong>الهاتف 1:</strong> {selectedOrder.customerPhone || selectedOrder.customer?.phone}</p>
                    {selectedOrder.customerPhone2 && <p className="font-mono"><strong>الهاتف 2:</strong> {selectedOrder.customerPhone2}</p>}
                    {selectedOrder.customerEmail && <p><strong>الإيميل:</strong> {selectedOrder.customerEmail}</p>}
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <span className="font-extrabold text-[#03204E] text-xs block">تفاصيل التوصيل والعنوان</span>
                  <div className="space-y-1 text-slate-700">
                    {selectedOrder.deliveryMethod === 'metro_pickup' ? (
                      <p><strong>محطة المترو:</strong> {selectedOrder.metroPickup?.stationNameAr || selectedOrder.metroPickup?.stationName}</p>
                    ) : (
                      <>
                        <p><strong>المحافظة:</strong> {selectedOrder.shippingAddress?.governorate} - {selectedOrder.shippingAddress?.city}</p>
                        <p><strong>الشارع:</strong> {selectedOrder.shippingAddress?.street} (مبنى: {selectedOrder.shippingAddress?.buildingNumber || '-'})</p>
                        {selectedOrder.shippingAddress?.deliveryNotes && <p className="text-slate-500"><strong>ملاحظات:</strong> {selectedOrder.shippingAddress?.deliveryNotes}</p>}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Order Items Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#F8FAFC] border-b border-slate-200 font-bold text-slate-600">
                    <tr>
                      <th className="p-3">العطر / المنتج</th>
                      <th className="p-3">الحجم</th>
                      <th className="p-3">السعر</th>
                      <th className="p-3 text-center">الكمية</th>
                      <th className="p-3 text-left">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedOrder.items || []).map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-3 font-bold text-slate-900">{item.productName}</td>
                        <td className="p-3 font-mono">{item.size}</td>
                        <td className="p-3 font-mono">{item.price?.toLocaleString()} ج.م</td>
                        <td className="p-3 font-mono text-center font-bold">{item.quantity}</td>
                        <td className="p-3 font-mono font-bold text-left text-slate-900">
                          {(item.price * item.quantity).toLocaleString()} ج.م
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Totals */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">المجموع الفرعي:</span>
                  <span className="font-mono font-bold">{selectedOrder.subtotal?.toLocaleString()} ج.م</span>
                </div>
                {selectedOrder.discount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>الخصم المطبق:</span>
                    <span className="font-mono font-bold">-{selectedOrder.discount?.toLocaleString()} ج.م</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">رسوم الشحن:</span>
                  <span className="font-mono font-bold">{(selectedOrder.shipping || selectedOrder.metroPickupFee || 0) === 0 ? 'مجاناً' : `${selectedOrder.shipping || selectedOrder.metroPickupFee} ج.م`}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-black text-[#03204E]">
                  <span>الإجمالي النهائي:</span>
                  <span className="font-mono">{selectedOrder.total?.toLocaleString()} ج.م</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX FOR PAYMENT PROOF */}
      {zoomReceiptUrl && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={() => setZoomReceiptUrl(null)}>
          <div className="relative max-w-lg max-h-[85vh] bg-white p-2 rounded-2xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setZoomReceiptUrl(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-black/60 hover:bg-black text-white rounded-full transition-colors"
            >
              <X size={16} />
            </button>
            <img src={zoomReceiptUrl} alt="إشعار الدفع" className="max-h-[80vh] w-auto object-contain rounded-xl" />
          </div>
        </div>
      )}

      {/* HIDDEN PRINT VIEW CONTAINER */}
      {printMode && selectedOrder && (
        <div className="fixed inset-0 z-100 bg-white flex flex-col items-center justify-center p-4">
          <div className="no-print mb-4 flex items-center gap-3">
            <button 
              onClick={() => window.print()}
              className="px-4 py-2 bg-[#03204E] text-white font-bold rounded-xl text-xs flex items-center gap-2"
            >
              <Printer size={16} />
              <span>طباعة فورية</span>
            </button>
            <button 
              onClick={() => setPrintMode(null)}
              className="px-4 py-2 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs"
            >
              إغلاق
            </button>
          </div>

          {printMode === 'invoice' && (
            <div 
              ref={invoicePrintRef}
              style={{
                width: '100mm',
                minHeight: '148mm',
                padding: '6mm',
                boxSizing: 'border-box',
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
                margin: '0 auto',
                fontSize: '10px',
                border: '1px solid #E2E8F0'
              }}
            >
              {/* Thermal Invoice Top */}
              <div style={{ textAlign: 'center', borderBottom: '1.5px solid #03204E', paddingBottom: '6px', marginBottom: '8px' }}>
                <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#03204E', letterSpacing: '1px' }}>ÉLAN</h1>
                <p style={{ margin: 0, fontSize: '8px', textTransform: 'uppercase', color: '#64748B' }}>HAUTE PARFUMERIE • ATELIER DU CAIRE</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '11px', fontWeight: 'bold' }}>فاتورة طلب رقم #{selectedOrder.orderNumber}</p>
                <p style={{ margin: 0, fontSize: '8px', color: '#64748B' }}>{new Date(selectedOrder.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              </div>

              {/* Customer Box */}
              <div style={{ backgroundColor: '#F8FAFC', padding: '6px', borderRadius: '4px', marginBottom: '8px', fontSize: '9.5px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span><strong>العميل:</strong> {selectedOrder.customer?.name || 'عميل ÉLAN'}</span>
                  <span style={{ fontFamily: 'monospace' }}>{selectedOrder.customerPhone || selectedOrder.customer?.phone}</span>
                </div>
                {selectedOrder.customerPhone2 && (
                  <div style={{ fontSize: '8.5px', color: '#64748B', fontFamily: 'monospace', marginTop: '2px' }}>
                    هاتف بديل: {selectedOrder.customerPhone2}
                  </div>
                )}
                <div style={{ marginTop: '3px', fontSize: '8.5px', color: '#475569' }}>
                  {selectedOrder.deliveryMethod === 'metro_pickup' ? (
                    <span><strong>استلام محطة مترو:</strong> {selectedOrder.metroPickup?.stationNameAr || selectedOrder.metroPickup?.stationName}</span>
                  ) : (
                    <span><strong>العنوان:</strong> {selectedOrder.shippingAddress?.governorate} - {selectedOrder.shippingAddress?.city} - {selectedOrder.shippingAddress?.street}</span>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px', fontSize: '9px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #CBD5E1', textAlign: 'right', color: '#475569' }}>
                    <th style={{ padding: '3px 0' }}>العطر</th>
                    <th style={{ padding: '3px', textAlign: 'center' }}>الحجم</th>
                    <th style={{ padding: '3px', textAlign: 'center' }}>العدد</th>
                    <th style={{ padding: '3px 0', textAlign: 'left' }}>الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedOrder.items || []).map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px dashed #E2E8F0' }}>
                      <td style={{ padding: '4px 0', fontWeight: 'bold' }}>{item.productName}</td>
                      <td style={{ padding: '4px', textAlign: 'center', fontFamily: 'monospace' }}>{item.size}</td>
                      <td style={{ padding: '4px', textAlign: 'center', fontWeight: 'bold' }}>{item.quantity}</td>
                      <td style={{ padding: '4px', textAlign: 'left', fontWeight: 'bold' }}>{(item.price * item.quantity).toLocaleString()} ج.م</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Financial Totals */}
              <div style={{ backgroundColor: '#F8FAFC', padding: '6px', borderRadius: '4px', marginBottom: '8px', fontSize: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span>المجموع الفرعي:</span>
                  <span>{selectedOrder.subtotal?.toLocaleString()} ج.م</span>
                </div>
                {selectedOrder.discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d', marginBottom: '2px' }}>
                    <span>الخصم:</span>
                    <span>-{selectedOrder.discount?.toLocaleString()} ج.م</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span>الشحن:</span>
                  <span>{(selectedOrder.shipping || selectedOrder.metroPickupFee || 0) === 0 ? 'مجاناً' : `${selectedOrder.shipping || selectedOrder.metroPickupFee} ج.م`}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #CBD5E1', paddingTop: '4px', fontWeight: '900', fontSize: '12px', color: '#03204E' }}>
                  <span>الإجمالي النهائي:</span>
                  <span>{selectedOrder.total?.toLocaleString()} ج.م</span>
                </div>
              </div>

              {/* QR Code Verification Box */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #E2E8F0', padding: '6px', borderRadius: '6px' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 'bold', fontSize: '9px', color: '#03204E' }}>امسح للتحقق ومتابعة الشحنة</p>
                  <p style={{ margin: '2px 0 0 0', fontSize: '8px', color: '#64748B' }}>elan.online/track-order</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '7.5px', color: '#94A3B8' }}>شكراً لاختياركم دار عطور ÉLAN</p>
                </div>
                <div style={{ padding: '3px', backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '4px' }}>
                  <QRCodeSVG 
                    value={`https://elan.online/track-order?order=${selectedOrder.orderNumber}`} 
                    size={48}
                    level="M"
                  />
                </div>
              </div>
            </div>
          )}

          {printMode === 'shipping' && (
            <div 
              ref={shippingPrintRef}
              style={{
                width: '100mm',
                minHeight: '148mm',
                padding: '6mm',
                boxSizing: 'border-box',
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
                margin: '0 auto',
                fontSize: '11px',
                border: '2px solid #03204E'
              }}
            >
              {/* Shipping Label Top */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #03204E', paddingBottom: '6px', marginBottom: '8px' }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#03204E' }}>ÉLAN PARFUMS</h1>
                  <p style={{ margin: 0, fontSize: '8px', textTransform: 'uppercase', color: '#64748B' }}>Fragile • Luxury Goods</p>
                </div>
                <div style={{ textAlign: 'left', fontWeight: 'bold', fontSize: '13px', color: '#03204E' }}>
                  بوليصة شحن
                </div>
              </div>

              {/* Receiver Info */}
              <div style={{ border: '1.5px solid #03204E', padding: '8px', borderRadius: '6px', marginBottom: '8px', backgroundColor: '#F8FAFC' }}>
                <span style={{ display: 'inline-block', backgroundColor: '#03204E', color: '#FFFFFF', fontSize: '8px', fontWeight: 'bold', padding: '1px 5px', borderRadius: '2px', marginBottom: '4px' }}>
                  المرسل إليه (المستلم)
                </span>
                <p style={{ margin: '2px 0', fontSize: '13px', fontWeight: 'bold', color: '#03204E' }}>
                  {selectedOrder.customer?.name || 'عميل ÉLAN'}
                </p>
                <p style={{ margin: '2px 0', fontSize: '12px', fontWeight: 'bold', fontFamily: 'monospace' }}>
                  هاتف 1: {selectedOrder.customerPhone || selectedOrder.customer?.phone}
                </p>
                {selectedOrder.customerPhone2 && (
                  <p style={{ margin: '2px 0', fontSize: '12px', fontWeight: 'bold', fontFamily: 'monospace' }}>
                    هاتف 2: {selectedOrder.customerPhone2}
                  </p>
                )}
                <div style={{ marginTop: '4px', borderTop: '1px solid #CBD5E1', paddingTop: '4px' }}>
                  {selectedOrder.deliveryMethod === 'metro_pickup' ? (
                    <p style={{ margin: 0, fontSize: '11px', fontWeight: 'bold', color: '#03204E' }}>
                      تسليم محطة مترو: {selectedOrder.metroPickup?.stationNameAr || selectedOrder.metroPickup?.stationName}
                    </p>
                  ) : (
                    <p style={{ margin: 0, fontSize: '11px', lineHeight: '1.4' }}>
                      <strong>العنوان:</strong> {selectedOrder.shippingAddress?.governorate} - {selectedOrder.shippingAddress?.city} - {selectedOrder.shippingAddress?.street} (مبنى: {selectedOrder.shippingAddress?.buildingNumber || '-'})
                      {selectedOrder.shippingAddress?.deliveryNotes && ` [ملاحظات: ${selectedOrder.shippingAddress?.deliveryNotes}]`}
                    </p>
                  )}
                </div>
              </div>

              {/* COD / Payment Notice */}
              <div style={{ border: '2px dashed #03204E', padding: '6px', textAlign: 'center', marginBottom: '8px', borderRadius: '6px', backgroundColor: selectedOrder.paymentStatus === 'paid' ? '#ECFDF5' : '#FEF3C7' }}>
                <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748B' }}>
                  {selectedOrder.paymentStatus === 'paid' ? 'حالة السداد:' : 'المبلغ المطلوب تحصيله عند الاستلام (COD):'}
                </span>
                <p style={{ margin: '2px 0 0 0', fontSize: '16px', fontWeight: '900', color: selectedOrder.paymentStatus === 'paid' ? '#047857' : '#B45309' }}>
                  {selectedOrder.paymentStatus === 'paid' ? 'مدفوع بالكامل مسبقاً (لا يتم تحصيل أموال)' : `${selectedOrder.total?.toLocaleString()} جنيه مصري`}
                </p>
              </div>

              {/* Fragile & Dispatch info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9px', color: '#64748B', borderTop: '1px solid #E2E8F0', paddingTop: '6px' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 'bold', color: '#B91C1C' }}>⚠️ تنبيه: محتويات قابلة للكسر (عطور زجاجية فاخرة)</p>
                  <p style={{ margin: '2px 0 0 0' }}>المرسل: دار ÉLAN للعطور • القاهرة</p>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <QRCodeSVG value={`https://elan.online/track-order?order=${selectedOrder.orderNumber}`} size={38} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
