import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import Swal from 'sweetalert2';
import { useLanguage } from '../context/LanguageContext';
import { EGYPT_GOVERNORATES, getGovernorateRate, getGovernorateObject } from '../data/egyptGovernorates';
import { 
  getOrders, 
  updateOrderStatus, 
  verifyOrderPayment, 
  confirmReturnRestock,
  processReturnRefund,
  getCashAccounts,
  getProducts,
  createAdminOrder
} from '../services/api';
import { 
  Truck, CheckCircle2, Clock, XCircle, Search, RefreshCw, 
  Eye, X, Tag, Smartphone, CreditCard, DollarSign, Home, Train, 
  MessageSquare, Phone, Mail, Printer, ShieldCheck, FileText, 
  ExternalLink, ZoomIn, ArrowUpDown, ChevronRight, Check, AlertCircle, Building, MapPin,
  Plus, Trash2, ShoppingBag, User, Wallet, RotateCcw, Undo2, AlertTriangle, Archive, Banknote, Save
} from 'lucide-react';

const formatGovernorate = (govStr, isRTL) => {
  if (!govStr) return '-';
  const gov = getGovernorateObject(govStr);
  if (gov) {
    return isRTL ? gov.nameAr : gov.nameEn;
  }
  if (govStr.includes('(') && govStr.includes(')')) {
    const parts = govStr.split(/[()]/).filter(Boolean);
    return isRTL ? parts[0].trim() : (parts[1]?.trim() || parts[0].trim());
  }
  return govStr;
};

const statusConfig = {
  all: { labelAr: 'جميع الطلبات', labelEn: 'All Orders', color: 'text-slate-700', bg: 'bg-slate-100', border: 'border-slate-200' },
  pending: { labelAr: 'قيد الانتظار', labelEn: 'Pending', color: 'text-amber-800', bg: 'bg-amber-50', border: 'border-amber-200' },
  confirmed: { labelAr: 'تم التأكيد', labelEn: 'Confirmed', color: 'text-[#174F43]', bg: 'bg-[#174F43]/10', border: 'border-[#174F43]/25' },
  processing: { labelAr: 'جاري التجهيز', labelEn: 'Processing', color: 'text-[#B45309]', bg: 'bg-[#FF9D00]/15', border: 'border-[#FF9D00]/30' },
  shipped: { labelAr: 'جاري الشحن', labelEn: 'Shipped', color: 'text-sky-800', bg: 'bg-sky-50', border: 'border-sky-200' },
  delivered: { labelAr: 'تم التوصيل', labelEn: 'Delivered', color: 'text-[#174F43]', bg: 'bg-[#174F43]/15', border: 'border-[#174F43]/30' },
  returned_from_shipping: { labelAr: 'مرتجع من الشحن', labelEn: 'Returned from Shipping', color: 'text-amber-900', bg: 'bg-amber-100/90', border: 'border-amber-300' },
  cancelled: { labelAr: 'ملغي', labelEn: 'Cancelled', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
};

const renderPaymentMethodBadge = (method, isPaid, isRTL = true) => {
  let icon = <DollarSign size={12} strokeWidth={1.5} />;
  let label = isRTL ? 'عند الاستلام' : 'COD';
  
  if (method === 'vodafone_cash') {
    icon = <Smartphone size={12} strokeWidth={1.5} />;
    label = isRTL ? 'فودافون كاش' : 'Vodafone Cash';
  } else if (method === 'instapay') {
    icon = <Smartphone size={12} strokeWidth={1.5} />;
    label = isRTL ? 'إنستاباي' : 'InstaPay';
  } else if (method === 'card' || method === 'fawaterk') {
    icon = <CreditCard size={12} strokeWidth={1.5} />;
    label = isRTL ? 'دفع إلكتروني' : 'Card / Online';
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
        {icon}
        <span>{label}</span>
      </span>
      {isPaid ? (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
          <Check size={10} strokeWidth={2} /> {isRTL ? 'مدفوع' : 'Paid'}
        </span>
      ) : (
        <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.2 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
          {isRTL ? 'معلق' : 'Pending'}
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
    governorate: 'Giza',
    city: 'الجيزة',
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
  shipping: 65,
  discount: 0,
  paymentMethod: 'cash_on_delivery',
  paymentStatus: 'pending',
  orderStatus: 'confirmed',
  cashAccountId: '',
  adminNotes: ''
};

export default function OrdersPage() {
  const { lang, isRTL, formatCurrency } = useLanguage();
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

  // Carrier Cost Inline Editing
  const [editingCarrierCost, setEditingCarrierCost] = useState(false);
  const [carrierCostInput, setCarrierCostInput] = useState('');
  const [savingCarrierCost, setSavingCarrierCost] = useState(false);

  // Create Order Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState(initialNewOrderState);
  const [creatingOrder, setCreatingOrder] = useState(false);

  // Return Shipping Modal State
  const [returnModalOrder, setReturnModalOrder] = useState(null);
  const [returnForm, setReturnForm] = useState({
    outboundShippingCost: 65,
    returnShippingCost: 65,
    returnReason: 'رفض العميل الاستلام',
    paymentAccountId: '',
    notes: ''
  });
  const [submittingReturn, setSubmittingReturn] = useState(false);

  // Customer Refund Modal State
  const [refundModalOrder, setRefundModalOrder] = useState(null);
  const [refundForm, setRefundForm] = useState({
    refundAmount: 0,
    cashAccountId: '',
    notes: ''
  });
  const [submittingRefund, setSubmittingRefund] = useState(false);
  const [inspectingRestock, setInspectingRestock] = useState(false);

  const invoicePrintRef = useRef(null);
  const shippingPrintRef = useRef(null);

  const getItemImage = (item) => {
    if (item?.product && typeof item.product === 'object') {
      if (item.product.mainImage?.url) return item.product.mainImage.url;
      if (item.product.images?.[0]?.url) return item.product.images[0].url;
    }
    const prodId = item?.product?._id || item?.product || item?.productId;
    if (prodId && Array.isArray(productsList)) {
      const found = productsList.find(p => p._id === prodId || p.id === prodId);
      if (found?.mainImage?.url) return found.mainImage.url;
      if (found?.images?.[0]?.url) return found.images[0].url;
    }
    return '/img/product.png';
  };

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

  useEffect(() => {
    if (selectedOrder) {
      const defaultCost = Math.round(Number(
        selectedOrder.actualOutboundShippingCost ??
        selectedOrder.realShippingCost ??
        getGovernorateRate(selectedOrder.shippingAddress?.governorate) ??
        65
      ));
      setCarrierCostInput(defaultCost);
      setEditingCarrierCost(false);
    }
  }, [selectedOrder?._id]);

  const handleSaveCarrierCost = async () => {
    if (!selectedOrder) return;
    const cost = Math.max(0, Math.round(Number(carrierCostInput) || 0));
    setSavingCarrierCost(true);
    try {
      const res = await updateOrderStatus(selectedOrder._id, {
        actualOutboundShippingCost: cost
      });
      const updated = res || {
        ...selectedOrder,
        actualOutboundShippingCost: cost,
        realShippingCost: cost
      };
      setOrders(prev => prev.map(o => o._id === selectedOrder._id ? { ...o, ...updated, actualOutboundShippingCost: cost, realShippingCost: cost } : o));
      setSelectedOrder(prev => ({ ...prev, ...updated, actualOutboundShippingCost: cost, realShippingCost: cost }));
      setEditingCarrierCost(false);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: isRTL ? 'تم حفظ تكلفة الشحن الفعلية للشركة بنجاح' : 'Actual outbound carrier cost saved successfully',
        showConfirmButton: false,
        timer: 2000
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: isRTL ? 'خطأ' : 'Error',
        text: err.response?.data?.message || (isRTL ? 'تعذر حفظ تكلفة الشحن' : 'Failed to update carrier shipping cost')
      });
    } finally {
      setSavingCarrierCost(false);
    }
  };

  const handleOpenReturnModal = (order) => {
    setReturnModalOrder(order);
    const govRate = getGovernorateRate(order.shippingAddress?.governorate);
    const outFee = Math.round(Number(order.returnDetails?.outboundShippingFee ?? (order.actualOutboundShippingCost || order.realShippingCost || order.shipping || govRate || 65)));
    const retFee = Math.round(Number(order.returnDetails?.returnShippingFee ?? (order.actualReturnShippingCost || order.actualOutboundShippingCost || order.realShippingCost || order.shipping || govRate || 65)));
    setReturnForm({
      outboundShippingCost: outFee,
      returnShippingCost: retFee,
      returnReason: order.returnDetails?.returnReason || (isRTL ? 'رفض العميل الاستلام' : 'Customer Refused Delivery'),
      paymentAccountId: order.returnDetails?.paymentAccountId || (cashAccounts[0]?._id || ''),
      notes: order.returnDetails?.inspectionNotes || ''
    });
  };

  const handleStatusChange = async (orderId, newStatus) => {
    if (newStatus === 'returned_from_shipping') {
      const targetOrder = orders.find(o => o._id === orderId) || (selectedOrder?._id === orderId ? selectedOrder : null);
      if (targetOrder) {
        handleOpenReturnModal(targetOrder);
        return;
      }
    }

    setUpdatingStatus(true);
    try {
      const res = await updateOrderStatus(orderId, newStatus);
      const updated = res || { orderStatus: newStatus };
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, ...updated, orderStatus: newStatus } : o));
      if (selectedOrder && selectedOrder._id === orderId) {
        setSelectedOrder(prev => ({ ...prev, ...updated, orderStatus: newStatus }));
      }
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: isRTL ? 'تم تحديث حالة الطلب بنجاح' : 'Order status updated successfully',
        showConfirmButton: false,
        timer: 2000
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: isRTL ? 'خطأ' : 'Error',
        text: err.response?.data?.message || (isRTL ? 'تعذر تحديث حالة الطلب' : 'Failed to update order status')
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSubmitReturn = async (e) => {
    e.preventDefault();
    if (!returnModalOrder) return;
    setSubmittingReturn(true);
    try {
      const outCost = Math.max(0, Math.round(Number(returnForm.outboundShippingCost) || 0));
      const retCost = Math.max(0, Math.round(Number(returnForm.returnShippingCost) || 0));
      const totalCharge = outCost + retCost;

      const res = await updateOrderStatus(returnModalOrder._id, {
        orderStatus: 'returned_from_shipping',
        outboundShippingCost: outCost,
        returnShippingCost: retCost,
        actualOutboundShippingCost: outCost,
        actualReturnShippingCost: retCost,
        returnReason: returnForm.returnReason,
        paymentAccountId: returnForm.paymentAccountId || null,
        notes: returnForm.notes
      });

      const updated = res || {
        ...returnModalOrder,
        orderStatus: 'returned_from_shipping',
        actualOutboundShippingCost: outCost,
        actualReturnShippingCost: retCost,
        realShippingCost: outCost,
        returnDetails: {
          isReturned: true,
          returnedAt: new Date(),
          outboundShippingFee: outCost,
          returnShippingFee: retCost,
          totalReturnShippingCost: totalCharge,
          returnReason: returnForm.returnReason,
          restockStatus: 'not_inspected',
          shippingExpenseRecorded: totalCharge > 0
        }
      };

      setOrders(prev => prev.map(o => o._id === returnModalOrder._id ? { ...o, ...updated } : o));
      if (selectedOrder && selectedOrder._id === returnModalOrder._id) {
        setSelectedOrder(prev => ({ ...prev, ...updated }));
      }

      setReturnModalOrder(null);
      Swal.fire({
        icon: 'success',
        title: isRTL ? 'تم تسجيل المرتجع ومصروف الشحن' : 'Return and shipping expense recorded',
        text: isRTL 
          ? `تم تعيين حالة الطلب إلى "مرتجع من الشحن"، وإدراج مصاريف الشحن (${totalCharge} ج.م) كمصروف في الحسابات دون المساس بالمخزون حتى الفحص.`
          : `Order status set to "Returned from Shipping", carrier charges (${totalCharge} EGP) recorded under Shipping Expenses.`
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: isRTL ? 'خطأ' : 'Error',
        text: err.response?.data?.message || (isRTL ? 'تعذر تسجيل بيانات المرتجع' : 'Failed to record return details')
      });
    } finally {
      setSubmittingReturn(false);
    }
  };

  const handleConfirmRestock = async (order, outcome) => {
    const isReusable = outcome === 'reusable';
    const result = await Swal.fire({
      title: isReusable ? 'تأكيد سلامة المنتجات واسترجاع السائل' : 'تسجيل تلف المنتجات المسترجعة',
      text: isReusable 
        ? 'هل تم فحص زجاجات العطر والتأكد من أنها سليمة ومغلقة تماماً؟ سيتم إعادة السائل الفعلي إلى رصيد Finished Liquid وتسجيل حركة RETURN بالمخزون.'
        : 'هل الزجاجات تالفة أو مفتوحة؟ سيتم تسجيل تلف الشحنة واستبعادها ولن يتم إضافتها للمخزون.',
      input: 'text',
      inputPlaceholder: 'ملاحظات الفحص والمعاينة (اختياري)...',
      icon: isReusable ? 'question' : 'warning',
      showCancelButton: true,
      confirmButtonText: isReusable ? 'تأكيد واسترجاع للمخزون' : 'تأكيد تسجيل التلف واستبعادها',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: isReusable ? '#174F43' : '#DC2626'
    });

    if (!result.isConfirmed) return;

    setInspectingRestock(true);
    try {
      const updated = await confirmReturnRestock(order._id, {
        inspectionOutcome: outcome,
        inspectionNotes: result.value || ''
      });

      setOrders(prev => prev.map(o => o._id === order._id ? { ...o, ...updated } : o));
      if (selectedOrder && selectedOrder._id === order._id) {
        setSelectedOrder(prev => ({ ...prev, ...updated }));
      }

      Swal.fire({
        icon: 'success',
        title: isReusable ? 'تم استرجاع السائل للمخزون بنجاح' : 'تم توثيق تلف المرتجع',
        text: isReusable 
          ? 'تمت إضافة السائل للمخزون وتسجيل حركة في سجل المخزون.' 
          : 'تم توثيق التلف دون التأثير على المخزون.'
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'خطأ',
        text: err.response?.data?.message || 'تعذر إتمام عملية الفحص والاسترجاع'
      });
    } finally {
      setInspectingRestock(false);
    }
  };

  const handleOpenRefundModal = (order) => {
    setRefundModalOrder(order);
    setRefundForm({
      refundAmount: order.total || 0,
      cashAccountId: order.cashAccount || (cashAccounts[0]?._id || ''),
      notes: 'استرداد كامل لقيمة الطلب بعد رفض الاستلام وارتجاع الشحنة'
    });
  };

  const handleSubmitRefund = async (e) => {
    e.preventDefault();
    if (!refundModalOrder) return;
    setSubmittingRefund(true);
    try {
      const updated = await processReturnRefund(refundModalOrder._id, refundForm);
      setOrders(prev => prev.map(o => o._id === refundModalOrder._id ? { ...o, ...updated } : o));
      if (selectedOrder && selectedOrder._id === refundModalOrder._id) {
        setSelectedOrder(prev => ({ ...prev, ...updated }));
      }
      setRefundModalOrder(null);
      Swal.fire({
        icon: 'success',
        title: 'تم استرداد المبلغ بنجاح',
        text: `تم خصم ${refundForm.refundAmount} ج.م من الخزينة المحددة وتسجيل حركة الاسترداد.`
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'خطأ',
        text: err.response?.data?.message || 'تعذر معالجة الاسترداد'
      });
    } finally {
      setSubmittingRefund(false);
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
        confirmButtonColor: '#174F43',
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
        customerName: createFormData.customerName?.trim() || 'عميل M20',
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
        confirmButtonColor: '#174F43',
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
    returned_from_shipping: orders.filter(o => o.orderStatus === 'returned_from_shipping').length,
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
    <div className="space-y-6 text-right font-['Cairo',sans-serif]">
      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#174F43] to-[#0F3830] text-white flex items-center justify-center shadow-md shadow-[#174F43]/10">
              <Truck size={20} strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-[#174F43] tracking-tight">
                إدارة الطلبات والشحنات والفواتير
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                إنشاء طلبات يدوية، التحقق الفوري من إيصالات الدفع، إدارة المرتجعات، وإصدار الفواتير وبوالص الشحن.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleOpenCreateOrder}
            className="px-4 py-2.5 rounded-xl bg-[#174F43] hover:bg-[#0F3830] text-white text-xs font-bold flex items-center gap-2 transition-all shadow-sm hover:shadow active:scale-95"
          >
            <Plus size={16} />
            <span>إنشاء طلب يدوي جديد</span>
          </button>

          <button
            onClick={fetchOrdersAndAccounts}
            className="p-2.5 rounded-xl border border-slate-200 bg-white/80 backdrop-blur hover:bg-slate-50 text-slate-700 transition-all duration-150 shadow-xs"
            title="تحديث"
          >
            <RefreshCw size={14} strokeWidth={1.7} className={loading ? 'animate-spin text-[#174F43]' : ''} />
          </button>
        </div>
      </div>

      {/* Status Filter Cards with Glass & Glow */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        {[
          { key: 'all', label: 'الكل', count: statusCounts.all, icon: FileText },
          { key: 'pending', label: 'قيد المراجعة', count: statusCounts.pending, icon: Clock, color: 'text-amber-600' },
          { key: 'confirmed', label: 'تم التأكيد', count: statusCounts.confirmed, icon: CheckCircle2, color: 'text-[#174F43]' },
          { key: 'processing', label: 'جاري التجهيز', count: statusCounts.processing, icon: RefreshCw, color: 'text-[#FF9D00]' },
          { key: 'shipped', label: 'جاري الشحن', count: statusCounts.shipped, icon: Truck, color: 'text-sky-600' },
          { key: 'delivered', label: 'تم التوصيل', count: statusCounts.delivered, icon: CheckCircle2, color: 'text-[#174F43]' },
          { key: 'returned_from_shipping', label: 'مرتجع شحن', count: statusCounts.returned_from_shipping, icon: RotateCcw, color: 'text-amber-800' },
          { key: 'cancelled', label: 'ملغي', count: statusCounts.cancelled, icon: XCircle, color: 'text-rose-600' },
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
                  ? 'bg-[#174F43] text-white border-[#174F43] shadow-lg shadow-[#174F43]/20 scale-[1.02]' 
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
            className="w-full bg-[#F8FAFC] border border-slate-200 focus:border-[#174F43] rounded-xl px-4 py-2.5 pr-10 text-xs outline-none transition-all focus:bg-white focus:shadow-inner"
          />
          <Search size={16} className="text-slate-400 absolute right-3.5 top-3" />
        </div>

        <div className="text-xs text-slate-500 font-medium w-full sm:w-auto text-left flex items-center gap-3">
          <span>النتائج المعروضة: <strong>{filteredOrders.length}</strong> طلب</span>
          {selectedStatus !== 'all' && (
            <button
              onClick={() => { setSelectedStatus('all'); setSearchParams({}); }}
              className="text-[#174F43] font-semibold hover:underline"
            >
              إلغاء الفلترة
            </button>
          )}
        </div>
      </div>

      {/* Orders Table */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-500 bg-white/60 rounded-2xl border border-slate-200/60">
          <RefreshCw size={24} className="animate-spin text-[#174F43] mx-auto mb-2" />
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
                      <td className="p-3.5 font-mono font-bold text-[#174F43]">
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
                            <Train size={12} /> {order.metroPickup?.stationNameAr || order.metroPickup?.stationName || (isRTL ? 'محطة مترو' : 'Metro Station')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700">
                            <Home size={12} className="text-slate-400" />
                            <span>{formatGovernorate(order.shippingAddress?.governorate, isRTL) || (isRTL ? 'توصيل منزلي' : 'Home Delivery')}</span>
                          </span>
                        )}
                      </td>

                      {/* Items */}
                      <td className="p-3.5">
                        <span className="text-xs font-semibold text-slate-800">
                          {order.items?.length || 0} {isRTL ? 'عطر' : 'Items'}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate max-w-[150px]">
                          {order.items?.map(i => `${i.productName} (${i.size})`).join(', ')}
                        </span>
                      </td>

                      {/* Payment */}
                      <td className="p-3.5">
                        <div className="space-y-1">
                          {renderPaymentMethodBadge(order.paymentMethod, isPaid, isRTL)}
                          {hasProof && (
                            <button
                              onClick={() => setZoomReceiptUrl(order.paymentScreenshot || order.paymentProofUrl)}
                              className="text-[10px] text-indigo-600 hover:underline flex items-center gap-0.5 font-bold"
                            >
                              <Eye size={10} /> {isRTL ? 'معاينة الإيصال' : 'View Proof'}
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
                          <option value="returned_from_shipping">مرتجع من الشحن</option>
                          <option value="cancelled">ملغي</option>
                        </select>

                        {order.orderStatus === 'returned_from_shipping' && (
                          <div className="mt-1 flex flex-col gap-0.5 text-[10px]">
                            {order.returnDetails?.totalReturnShippingCost > 0 && (
                              <span className="font-mono text-amber-900 font-bold">
                                شحن: {order.returnDetails.totalReturnShippingCost} ج.م
                              </span>
                            )}
                            {order.returnDetails?.restockStatus === 'inspected_restocked' ? (
                              <span className="text-emerald-700 font-semibold">✓ تم استرجاع المخزون</span>
                            ) : order.returnDetails?.restockStatus === 'inspected_damaged_discarded' ? (
                              <span className="text-rose-600 font-semibold">✕ تالف / مستبعد</span>
                            ) : (
                              <span className="text-amber-700 font-medium">بانتظار الفحص</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-[#174F43] hover:text-white text-slate-700 transition-colors"
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
                <div className="w-8 h-8 rounded-lg bg-[#174F43]/10 text-[#174F43] flex items-center justify-center">
                  <ShoppingBag size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#174F43]">إنشاء طلب جديد يدوياً (Manual Order)</h2>
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
                <span className="font-extrabold text-[#174F43] text-xs flex items-center gap-1.5">
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
                      className="w-full h-9 bg-white border border-slate-200 rounded-xl px-3 text-xs outline-none focus:border-[#174F43]"
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
                      className="w-full h-9 bg-white border border-slate-200 rounded-xl px-3 text-xs font-mono outline-none focus:border-[#174F43]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">رقم هاتف إضافي (اختياري)</label>
                    <input
                      type="tel"
                      value={createFormData.customerPhone2}
                      onChange={(e) => setCreateFormData({ ...createFormData, customerPhone2: e.target.value })}
                      placeholder="011xxxxxxxx"
                      className="w-full h-9 bg-white border border-slate-200 rounded-xl px-3 text-xs font-mono outline-none focus:border-[#174F43]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">البريد الإلكتروني (اختياري)</label>
                    <input
                      type="email"
                      value={createFormData.customerEmail}
                      onChange={(e) => setCreateFormData({ ...createFormData, customerEmail: e.target.value })}
                      placeholder="customer@gmail.com"
                      className="w-full h-9 bg-white border border-slate-200 rounded-xl px-3 text-xs outline-none focus:border-[#174F43]"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Delivery & Shipping Details */}
              <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-[#174F43] text-xs flex items-center gap-1.5">
                    <Truck size={15} />
                    <span>{isRTL ? 'طريقة التوصيل والعنوان' : 'Delivery Method & Address'}</span>
                  </span>

                  <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setCreateFormData({
                        ...createFormData,
                        deliveryMethod: 'home_delivery',
                        shipping: getGovernorateRate(createFormData.shippingAddress.governorate) || 65
                      })}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        createFormData.deliveryMethod === 'home_delivery' ? 'bg-[#174F43] text-white shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      {isRTL ? 'توصيل منزلي' : 'Home Delivery'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreateFormData({ ...createFormData, deliveryMethod: 'metro_pickup', shipping: 0 })}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        createFormData.deliveryMethod === 'metro_pickup' ? 'bg-purple-700 text-white shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      {isRTL ? 'استلام محطة مترو' : 'Metro Pickup'}
                    </button>
                  </div>
                </div>

                {createFormData.deliveryMethod === 'home_delivery' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">{isRTL ? 'المحافظة *' : 'Governorate *'}</label>
                      <select
                        value={createFormData.shippingAddress.governorate}
                        onChange={(e) => {
                          const selGov = e.target.value;
                          const rate = getGovernorateRate(selGov);
                          setCreateFormData(prev => ({
                            ...prev,
                            shipping: rate,
                            shippingAddress: { ...prev.shippingAddress, governorate: selGov }
                          }));
                        }}
                        className="w-full h-9 bg-white border border-slate-200 rounded-xl px-3 text-xs outline-none focus:border-[#174F43]"
                      >
                        {EGYPT_GOVERNORATES.map(gov => (
                          <option key={gov.id} value={isRTL ? gov.nameAr : gov.nameEn}>
                            {isRTL ? `${gov.nameAr} (${gov.defaultRate} ج.م)` : `${gov.nameEn} (${gov.defaultRate} EGP)`}
                          </option>
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
                        className="w-full h-9 bg-white border border-slate-200 rounded-xl px-3 text-xs outline-none focus:border-[#174F43]"
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
                        className="w-full h-9 bg-white border border-slate-200 rounded-xl px-3 text-xs outline-none focus:border-[#174F43]"
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
                        className="w-full h-9 bg-white border border-slate-200 rounded-xl px-3 text-xs outline-none focus:border-[#174F43]"
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
                        className="w-full h-9 bg-white border border-slate-200 rounded-xl px-3 text-xs outline-none focus:border-[#174F43]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Section 3: Ordered Items Builder */}
              <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <span className="font-extrabold text-[#174F43] text-xs flex items-center gap-1.5">
                    <Tag size={15} />
                    <span>العطور والمنتجات المطلوبة (Order Items)</span>
                  </span>

                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="px-3 py-1 bg-[#174F43] hover:bg-[#0F3830] text-white rounded-xl text-[11px] font-bold flex items-center gap-1 transition-colors shadow-2xs"
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
                          className="w-full h-8 bg-white border border-slate-200 rounded-lg px-2 text-xs font-bold outline-none focus:border-[#174F43]"
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
                  <span className="font-extrabold text-[#174F43] text-xs flex items-center gap-1.5">
                    <Wallet size={15} />
                    <span>إعدادات السداد وحالة الطلب</span>
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">{isRTL ? 'طريقة الدفع' : 'Payment Method'}</label>
                      <select
                        value={createFormData.paymentMethod}
                        onChange={(e) => setCreateFormData({ ...createFormData, paymentMethod: e.target.value })}
                        className="w-full h-8 bg-white border border-slate-200 rounded-lg px-2 text-xs outline-none"
                      >
                        <option value="cash_on_delivery">{isRTL ? 'عند الاستلام' : 'Cash on Delivery (COD)'}</option>
                        <option value="vodafone_cash">{isRTL ? 'فودافون كاش' : 'Vodafone Cash'}</option>
                        <option value="instapay">{isRTL ? 'إنستاباي' : 'InstaPay'}</option>
                        <option value="card">{isRTL ? 'بطاقة بنكية / فيزا' : 'Bank Card / Visa'}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">{isRTL ? 'حالة السداد' : 'Payment Status'}</label>
                      <select
                        value={createFormData.paymentStatus}
                        onChange={(e) => setCreateFormData({ ...createFormData, paymentStatus: e.target.value })}
                        className="w-full h-8 bg-white border border-slate-200 rounded-lg px-2 text-xs font-bold outline-none"
                      >
                        <option value="pending">{isRTL ? 'معلق' : 'Pending'}</option>
                        <option value="paid">{isRTL ? 'مدفوع بالكامل' : 'Paid in Full'}</option>
                      </select>
                    </div>
                  </div>

                  {createFormData.paymentStatus === 'paid' && (
                    <div>
                      <label className="block text-[11px] font-bold text-emerald-800 mb-1">{isRTL ? 'إيداع المبلغ في الخزينة / الحساب:' : 'Deposit to Treasury Account:'}</label>
                      <select
                        value={createFormData.cashAccountId}
                        onChange={(e) => setCreateFormData({ ...createFormData, cashAccountId: e.target.value })}
                        className="w-full h-8 bg-white border border-emerald-300 rounded-lg px-2 text-xs font-bold outline-none text-emerald-900"
                      >
                        <option value="">{isRTL ? '-- الحساب الافتراضي --' : '-- Default Account --'}</option>
                        {cashAccounts.map(acc => (
                          <option key={acc._id} value={acc._id}>
                            {acc.name} ({acc.type}) - {isRTL ? 'رصيد:' : 'Balance:'} {acc.balance?.toLocaleString()} {isRTL ? 'ج.م' : 'EGP'}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">{isRTL ? 'حالة الطلب الافتتاحية' : 'Initial Order Status'}</label>
                    <select
                      value={createFormData.orderStatus}
                      onChange={(e) => setCreateFormData({ ...createFormData, orderStatus: e.target.value })}
                      className="w-full h-8 bg-white border border-slate-200 rounded-lg px-2 text-xs font-bold outline-none"
                    >
                      <option value="confirmed">{isRTL ? 'تم التأكيد' : 'Confirmed'}</option>
                      <option value="pending">{isRTL ? 'قيد المراجعة' : 'Pending Review'}</option>
                      <option value="processing">{isRTL ? 'جاري التجهيز' : 'Processing'}</option>
                    </select>
                  </div>
                </div>

                {/* Financial Summary Calculation */}
                <div className="p-4 bg-[#F8FAFC] border border-slate-200 rounded-2xl flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <span className="font-extrabold text-[#174F43] text-xs block pb-1 border-b border-slate-200">
                      {isRTL ? 'ملخص الحساب والفاتورة' : 'Order Financial Summary'}
                    </span>

                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>{isRTL ? 'مجموع المنتجات:' : 'Products Subtotal:'}</span>
                      <strong className="font-mono">{createOrderSubtotal.toLocaleString()} {isRTL ? 'ج.م' : 'EGP'}</strong>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span>{isRTL ? 'مصاريف الشحن (ج.م):' : 'Shipping Fee (EGP):'}</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={createFormData.shipping}
                        onChange={(e) => setCreateFormData({ ...createFormData, shipping: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
                        className="w-20 h-7 bg-white border border-slate-200 rounded-lg px-2 text-xs font-mono font-bold text-center outline-none"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-emerald-700">{isRTL ? 'خصم إضافي (ج.م):' : 'Discount (EGP):'}</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={createFormData.discount}
                        onChange={(e) => setCreateFormData({ ...createFormData, discount: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
                        className="w-20 h-7 bg-white border border-slate-200 rounded-lg px-2 text-xs font-mono font-bold text-center outline-none text-emerald-700"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200/90 flex items-center justify-between">
                    <span className="font-extrabold text-xs text-[#174F43]">{isRTL ? 'المبلغ الإجمالي النهائي:' : 'Total Amount:'}</span>
                    <strong className="text-base font-black text-[#174F43] font-mono">
                      {createOrderTotal.toLocaleString()} {isRTL ? 'ج.م' : 'EGP'}
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
                  className="px-6 py-2 bg-[#174F43] text-white rounded-xl hover:bg-[#0F3830] h-10 font-bold disabled:opacity-50 shadow-sm"
                >
                  {creatingOrder ? 'جاري إنشاء الطلب...' : 'تأكيد وحفظ الطلب'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ORDER DETAILS MODAL (PREMIUM ATELIER REDESIGN) */}
      {selectedOrder && !printMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 rtl bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-3xl bg-white rounded-3xl border border-slate-200/90 shadow-2xl z-10 max-h-[92vh] flex flex-col overflow-hidden font-['Cairo',sans-serif]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200/80 bg-[#F8FAFC] flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#174F43] to-[#174F43] text-white flex items-center justify-center shadow-sm">
                  <ShoppingBag size={20} strokeWidth={1.7} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-extrabold text-[#174F43] font-mono tracking-tight">
                      طلب #{selectedOrder.orderNumber}
                    </h2>
                    {/* Status Badge */}
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusConfig[selectedOrder.orderStatus]?.bg || 'bg-slate-100'} ${statusConfig[selectedOrder.orderStatus]?.color || 'text-slate-700'} ${statusConfig[selectedOrder.orderStatus]?.border || 'border-slate-200'}`}>
                      {statusConfig[selectedOrder.orderStatus]?.[isRTL ? 'labelAr' : 'labelEn'] || selectedOrder.orderStatus}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                    <Clock size={12} className="text-slate-400" />
                    <span>{isRTL ? 'تاريخ ووقت الطلب:' : 'Order Date & Time:'}</span>
                    <span className="font-sans font-bold text-slate-700">
                      {new Date(selectedOrder.createdAt).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </p>
                </div>
              </div>

              {/* Action Buttons in Header */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrint('shipping')}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                  title={isRTL ? 'طباعة بوليصة شحن الشحنة' : 'Print Shipping Slip'}
                >
                  <Truck size={14} className="text-[#174F43]" />
                  <span>{isRTL ? 'بوليصة الشحن' : 'Shipping Slip'}</span>
                </button>

                <button
                  onClick={() => handlePrint('invoice')}
                  className="px-3.5 py-1.5 rounded-xl bg-[#174F43] hover:bg-[#0F3830] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                  title={isRTL ? 'طباعة فاتورة حرارية 10×15 سم مع QR Code' : 'Print Thermal Invoice 10x15cm'}
                >
                  <Printer size={14} />
                  <span>{isRTL ? 'فاتورة 10×15' : 'Invoice 10x15'}</span>
                </button>

                <button 
                  onClick={() => setSelectedOrder(null)} 
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 space-y-5 text-xs overflow-y-auto flex-1">
              
              {/* Order Status Control Strip */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-[#174F43] text-xs">{isRTL ? 'تحديث مرحلة الطلب:' : 'Update Order Status:'}</span>
                  <select
                    value={selectedOrder.orderStatus}
                    onChange={(e) => handleStatusChange(selectedOrder._id, e.target.value)}
                    disabled={updatingStatus}
                    className="h-8 bg-white border border-slate-300 rounded-xl px-2.5 text-xs font-bold text-slate-800 outline-none focus:border-[#174F43] shadow-2xs"
                  >
                    <option value="pending">{isRTL ? 'قيد الانتظار والمراجعة' : 'Pending Review'}</option>
                    <option value="confirmed">{isRTL ? 'تم التأكيد من الأتيليه' : 'Confirmed by Atelier'}</option>
                    <option value="processing">{isRTL ? 'جاري التجهيز والتعبئة' : 'Processing & Packaging'}</option>
                    <option value="shipped">{isRTL ? 'تم التسليم لمندوب الشحن' : 'Shipped / Dispatched'}</option>
                    <option value="delivered">{isRTL ? 'تم التوصيل للعميل بنجاح' : 'Delivered Successfully'}</option>
                    <option value="returned_from_shipping">{isRTL ? 'مرتجع من الشحن' : 'Returned from Shipping'}</option>
                    <option value="cancelled">{isRTL ? 'ملغي' : 'Cancelled'}</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-[11px]">حالة السداد:</span>
                  {selectedOrder.paymentStatus === 'paid' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 size={12} /> تم الدفع بنجاح
                    </span>
                  ) : selectedOrder.paymentStatus === 'refunded' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                      <Undo2 size={12} /> مسترد للعميل
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                      <Clock size={12} /> معلق / بانتظار التأكيد
                    </span>
                  )}
                </div>
              </div>

              {/* RETURNED FROM SHIPPING MANAGEMENT CARD */}
              {(selectedOrder.orderStatus === 'returned_from_shipping' || selectedOrder.returnDetails?.isReturned) && (
                <div className="p-4 rounded-2xl border border-amber-300 bg-amber-50/70 space-y-4 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-amber-200">
                    <div className="flex items-center gap-2 text-amber-950 font-bold text-xs">
                      <RotateCcw size={16} className="text-amber-800" />
                      <span>إدارة المرتجع ومصاريف الشحن والفحص</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenReturnModal(selectedOrder)}
                      className="px-3 py-1 bg-white hover:bg-amber-100 text-amber-900 font-bold rounded-xl border border-amber-300 shadow-2xs text-[11px] transition-all flex items-center gap-1.5"
                    >
                      <span>تعديل مصاريف الشحن</span>
                    </button>
                  </div>

                  {/* 1. Shipping Charges Breakdown */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-white p-3 rounded-xl border border-amber-200 text-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-500 font-medium block">شحن ذهاباً للعميل:</span>
                      <strong className="text-xs font-mono text-slate-900">
                        {selectedOrder.returnDetails?.outboundShippingFee ?? 0} ج.م
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-medium block">شحن عودة / إياب:</span>
                      <strong className="text-xs font-mono text-slate-900">
                        {selectedOrder.returnDetails?.returnShippingFee ?? 0} ج.م
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-amber-800 font-semibold block">إجمالي تكلفة الشحن على الشركة:</span>
                      <strong className="text-xs font-mono text-amber-900 font-black">
                        {selectedOrder.returnDetails?.totalReturnShippingCost ?? ((selectedOrder.returnDetails?.outboundShippingFee || 0) + (selectedOrder.returnDetails?.returnShippingFee || 0))} ج.م
                      </strong>
                    </div>
                  </div>

                  {/* Return Reason & Finance Expense Indicator */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-700 bg-amber-100/60 p-2.5 rounded-xl border border-amber-200/90">
                    <div>
                      <span className="font-semibold text-amber-950">سبب الارتجاع: </span>
                      <span>{selectedOrder.returnDetails?.returnReason || 'رفض الاستلام / تعذر التوصيل'}</span>
                    </div>

                    <div className="flex items-center gap-1 font-semibold text-emerald-800 bg-white/90 px-2 py-0.5 rounded-lg border border-emerald-300">
                      <Check size={12} className="text-emerald-700" />
                      <span>مسجل كمصروف شحن ونقل رسمي في المالية (يُخصم من صافي الربح)</span>
                    </div>
                  </div>

                  {/* 2. Physical Inspection & Inventory Restocking Section */}
                  <div className="p-3 bg-white rounded-xl border border-amber-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-[11px] flex items-center gap-1.5">
                        <Archive size={14} className="text-[#174F43]" />
                        <span>حالة الفحص الفعلي واسترجاع المخزون:</span>
                      </span>

                      {selectedOrder.returnDetails?.restockStatus === 'inspected_restocked' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 size={12} /> تم الفحص واسترجاع السائل للمخزون بنجاح
                        </span>
                      ) : selectedOrder.returnDetails?.restockStatus === 'inspected_damaged_discarded' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                          <XCircle size={12} /> تم الفحص: منتجات تالفة وتم استبعادها (لم تُضف للمخزون)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                          <Clock size={12} /> قيد انتظار الفحص الفعلي والمعاينة
                        </span>
                      )}
                    </div>

                    <p className="text-[10px] text-slate-500 leading-relaxed font-light">
                      * التزاماً بقواعد الجودة، لا يتم استرجاع السائل تلقائياً لمجرد تغيير حالة الطلب، بل بعد استلام المنتجات وفحصها والتأكد من أنها مغلقة تماماً وسليمة.
                    </p>

                    {selectedOrder.returnDetails?.restockStatus !== 'inspected_restocked' && selectedOrder.returnDetails?.restockStatus !== 'inspected_damaged_discarded' && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleConfirmRestock(selectedOrder, 'reusable')}
                          disabled={inspectingRestock}
                          className="px-3.5 py-1.5 bg-[#174F43] hover:bg-[#0F3830] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
                        >
                          <Check size={14} />
                          <span>تأكيد فحص واسترجاع العطور للمخزون</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleConfirmRestock(selectedOrder, 'damaged')}
                          disabled={inspectingRestock}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-xl text-xs border border-rose-200 transition-all disabled:opacity-50"
                        >
                          <X size={14} />
                          <span>تسجيل تلف الشحنة (غير صالحة)</span>
                        </button>
                      </div>
                    )}

                    {selectedOrder.returnDetails?.inspectionNotes && (
                      <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200 mt-1">
                        <strong>ملاحظات الفحص:</strong> {selectedOrder.returnDetails.inspectionNotes}
                      </p>
                    )}
                  </div>

                  {/* 3. Customer Refund Section if Payment Was Collected */}
                  {selectedOrder.paymentStatus === 'paid' && (
                    <div className="p-3 bg-[#174F43]/10 rounded-xl border border-[#174F43]/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <span className="font-bold text-[#174F43] text-xs block">
                          تم تحصيل قيمة الطلب مسبقاً ({selectedOrder.total?.toLocaleString()} ج.م)
                        </span>
                        <span className="text-[10px] text-slate-600">
                          نظراً لارتجاع الشحنة، يمكنك تسجيل استرداد المبلغ وخصمه من الخزينة.
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenRefundModal(selectedOrder)}
                        className="px-3.5 py-1.5 bg-[#174F43] hover:bg-[#0F3830] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all shrink-0"
                      >
                        <Undo2 size={14} className="text-[#FF9D00]" />
                        <span>معالجة استرداد المبلغ للعميل</span>
                      </button>
                    </div>
                  )}

                  {selectedOrder.paymentStatus === 'refunded' && (
                    <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs text-emerald-900 font-medium">
                      <span>✓ تم استرداد مبلغ {selectedOrder.returnDetails?.refundAmount || selectedOrder.total} ج.م للعميل بنجاح.</span>
                      {selectedOrder.returnDetails?.refundNotes && (
                        <span className="text-[10px] text-emerald-700 font-normal">({selectedOrder.returnDetails.refundNotes})</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Payment Verification Card */}
              {selectedOrder.paymentStatus !== 'paid' ? (
                <div className="p-4 rounded-2xl border border-amber-200/90 bg-amber-50/60 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-amber-950 font-extrabold text-xs">
                      <AlertCircle size={16} className="text-amber-600" />
                      <span>تأكيد السداد والتحقق من إشعار الدفع اليدوي</span>
                    </div>

                    {(selectedOrder.paymentScreenshot || selectedOrder.paymentProofUrl) && (
                      <button
                        type="button"
                        onClick={() => setZoomReceiptUrl(selectedOrder.paymentScreenshot || selectedOrder.paymentProofUrl)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 text-indigo-700 font-bold rounded-xl border border-indigo-200 shadow-2xs text-[11px] transition-all"
                      >
                        <ZoomIn size={14} />
                        <span>معاينة وتكبير إشعار التحويل</span>
                      </button>
                    )}
                  </div>

                  {/* Payment Proof Preview if present */}
                  {(selectedOrder.paymentScreenshot || selectedOrder.paymentProofUrl) && (
                    <div className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-amber-200">
                      <img
                        src={selectedOrder.paymentScreenshot || selectedOrder.paymentProofUrl}
                        alt="إيصال التحويل"
                        onClick={() => setZoomReceiptUrl(selectedOrder.paymentScreenshot || selectedOrder.paymentProofUrl)}
                        className="w-14 h-14 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity shrink-0"
                      />
                      <div className="flex-1 space-y-0.5 text-[11px]">
                        <p className="font-bold text-slate-800">مرفق إشعار تحويل من العميل</p>
                        {selectedOrder.paymentSenderPhone && (
                          <p className="text-slate-600">رقم المحفظة المحوّل منها: <strong className="font-mono text-[#174F43]">{selectedOrder.paymentSenderPhone}</strong></p>
                        )}
                        <p className="text-indigo-600 font-medium cursor-pointer hover:underline" onClick={() => setZoomReceiptUrl(selectedOrder.paymentScreenshot || selectedOrder.paymentProofUrl)}>
                          اضغط لتكبير الصورة وفحص تفاصيل العملية
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Verify Payment Action Bar */}
                  <div className="flex flex-col sm:flex-row gap-2 items-center pt-1">
                    <select
                      value={selectedCashAccountId}
                      onChange={(e) => setSelectedCashAccountId(e.target.value)}
                      className="w-full sm:flex-1 h-9 bg-white border border-amber-300 rounded-xl px-3 text-xs outline-none focus:border-[#174F43] font-medium"
                    >
                      <option value="">-- اختر خزينة / حساب التحويل المالي للإيداع --</option>
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
              ) : (
                <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/70 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-xs">
                    <CheckCircle2 size={17} className="text-emerald-700" />
                    <span>تم التحقق من الدفع وتأكيد السداد الكامل ({selectedOrder.total?.toLocaleString()} ج.م)</span>
                  </div>
                  {(selectedOrder.paymentScreenshot || selectedOrder.paymentProofUrl) && (
                    <button
                      type="button"
                      onClick={() => setZoomReceiptUrl(selectedOrder.paymentScreenshot || selectedOrder.paymentProofUrl)}
                      className="text-xs text-emerald-800 font-bold hover:underline flex items-center gap-1"
                    >
                      <Eye size={13} /> عرض إشعار السداد
                    </button>
                  )}
                </div>
              )}

              {/* Customer & Delivery Information Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Customer Card */}
                <div className="p-4 bg-slate-50/90 border border-slate-200/90 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                    <span className="font-extrabold text-[#174F43] text-xs flex items-center gap-1.5">
                      <User size={15} />
                      <span>بيانات العميل (Customer Profile)</span>
                    </span>
                    {selectedOrder.customer?.isFirst100 && (
                      <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 font-bold px-2 py-0.5 rounded-full">
                        نادي الـ 100 الأوائل ⭐
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 text-slate-700 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">الاسم الكامل:</span>
                      <strong className="text-slate-900 font-bold text-sm">
                        {selectedOrder.customer?.name || 'عميل M20'}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">رقم الموبايل الأساسي:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 dir-ltr">
                          {selectedOrder.customerPhone || selectedOrder.customer?.phone}
                        </span>
                        <a 
                          href={`tel:${selectedOrder.customerPhone || selectedOrder.customer?.phone}`} 
                          className="p-1 rounded-md bg-white border border-slate-200 text-slate-600 hover:text-[#174F43]"
                          title="اتصال"
                        >
                          <Phone size={12} />
                        </a>
                        <a 
                          href={`https://wa.me/20${(selectedOrder.customerPhone || selectedOrder.customer?.phone || '').replace(/^0/, '')}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="p-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                          title="واتساب"
                        >
                          <MessageSquare size={12} />
                        </a>
                      </div>
                    </div>

                    {selectedOrder.customerPhone2 && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">رقم موبايل ثاني:</span>
                        <span className="font-mono font-bold text-slate-800 dir-ltr">{selectedOrder.customerPhone2}</span>
                      </div>
                    )}

                    {selectedOrder.customerEmail && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">البريد الإلكتروني:</span>
                        <span className="font-sans text-slate-800 font-medium">{selectedOrder.customerEmail}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                      <span className="text-slate-500">طريقة الدفع:</span>
                      {renderPaymentMethodBadge(selectedOrder.paymentMethod, selectedOrder.paymentStatus === 'paid')}
                    </div>
                  </div>
                </div>

                {/* Delivery & Shipping Card */}
                <div className="p-4 bg-slate-50/90 border border-slate-200/90 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                    <span className="font-extrabold text-[#174F43] text-xs flex items-center gap-1.5">
                      {selectedOrder.deliveryMethod === 'metro_pickup' ? <Train size={15} /> : <Home size={15} />}
                      <span>الشحن والتوصيل (Fulfillment)</span>
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      selectedOrder.deliveryMethod === 'metro_pickup'
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}>
                      {selectedOrder.deliveryMethod === 'metro_pickup' ? (isRTL ? 'استلام محطة مترو' : 'Metro Pickup') : (isRTL ? 'توصيل للمنزل' : 'Home Delivery')}
                    </span>
                  </div>

                  <div className="space-y-2 text-slate-700 text-xs">
                    {selectedOrder.deliveryMethod === 'metro_pickup' ? (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">{isRTL ? 'محطة المترو:' : 'Metro Station:'}</span>
                          <strong className="text-[#174F43] font-bold">
                            {selectedOrder.metroPickup?.stationNameAr || selectedOrder.metroPickup?.stationName || (isRTL ? 'محطة مترو' : 'Metro Station')}
                          </strong>
                        </div>
                        {selectedOrder.metroPickup?.line && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">{isRTL ? 'الخط:' : 'Line:'}</span>
                            <span className="text-slate-800 font-medium">{selectedOrder.metroPickup?.line}</span>
                          </div>
                        )}
                        <div className="p-2 bg-white rounded-xl border border-slate-200 text-slate-600 text-[11px] leading-relaxed">
                          {selectedOrder.metroPickup?.pickupNote || (isRTL ? 'سيتم التواصل مع العميل لتحديد موعد ومكان المقابلة في المحطة.' : 'Customer will be contacted for meeting point.')}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">{isRTL ? 'المحافظة والمدينة:' : 'Governorate & City:'}</span>
                          <strong className="text-slate-900 font-bold">
                            {formatGovernorate(selectedOrder.shippingAddress?.governorate, isRTL)} • {selectedOrder.shippingAddress?.city || '-'}
                          </strong>
                        </div>

                        <div>
                          <span className="text-slate-500 block mb-0.5">{isRTL ? 'العنوان بالتفصيل:' : 'Full Address:'}</span>
                          <p className="text-slate-800 font-semibold bg-white p-2 rounded-xl border border-slate-200 leading-snug">
                            {selectedOrder.shippingAddress?.street}
                            {selectedOrder.shippingAddress?.buildingNumber && ` (${isRTL ? 'مبنى' : 'Bldg'} ${selectedOrder.shippingAddress.buildingNumber})`}
                            {selectedOrder.shippingAddress?.floor && ` - ${isRTL ? 'دور' : 'Fl.'} ${selectedOrder.shippingAddress.floor}`}
                            {selectedOrder.shippingAddress?.apartment && ` - ${isRTL ? 'شقة' : 'Apt.'} ${selectedOrder.shippingAddress.apartment}`}
                          </p>
                        </div>

                        {selectedOrder.shippingAddress?.deliveryNotes && (
                          <div>
                            <span className="text-slate-400 text-[10px] block">{isRTL ? 'ملاحظات / علامات مميزة:' : 'Delivery Notes:'}</span>
                            <p className="text-slate-600 text-[11px] italic bg-slate-100 p-1.5 rounded-lg border border-slate-200/80">
                              {selectedOrder.shippingAddress.deliveryNotes}
                            </p>
                          </div>
                        )}

                        {/* Carrier & Outbound Cost Configuration */}
                        <div className="pt-2.5 border-t border-slate-200/80 mt-2 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 text-[11px] font-medium">
                              {isRTL ? 'رسوم الشحن على العميل:' : 'Customer Shipping Fee:'}
                            </span>
                            <span className="font-mono font-bold text-slate-900">
                              {(selectedOrder.shippingFeeCharged ?? selectedOrder.shipping ?? 0) === 0 ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[11px]">
                                  <Check size={11} /> {isRTL ? '0 ج.م (شحن مجاني)' : '0 EGP (Free Shipping)'}
                                </span>
                              ) : (
                                `${Math.round(selectedOrder.shippingFeeCharged ?? selectedOrder.shipping ?? 0)} ${isRTL ? 'ج.م' : 'EGP'}`
                              )}
                            </span>
                          </div>

                          {selectedOrder.shippingDiscount > 0 && (
                            <div className="flex items-center justify-between text-[11px] text-emerald-700 font-semibold">
                              <span>{isRTL ? 'خصم الشحن المطبق:' : 'Shipping Promo Discount:'}</span>
                              <span className="font-mono">-{Math.round(selectedOrder.shippingDiscount)} {isRTL ? 'ج.م' : 'EGP'}</span>
                            </div>
                          )}

                          <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-1.5 shadow-2xs">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <Truck size={13} className="text-[#174F43]" />
                                <span className="text-slate-800 font-bold text-[11px]">
                                  {isRTL ? 'تكلفة الشحن الفعلية للشركة (مندوب الشحن):' : 'Carrier Cost Paid by M20:'}
                                </span>
                              </div>
                              {!editingCarrierCost && (
                                <button
                                  type="button"
                                  onClick={() => setEditingCarrierCost(true)}
                                  className="text-[10px] text-[#174F43] font-bold hover:underline"
                                >
                                  {isRTL ? 'تعديل التكلفة' : 'Edit Cost'}
                                </button>
                              )}
                            </div>

                            {editingCarrierCost ? (
                              <div className="flex items-center gap-2 pt-1">
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={carrierCostInput}
                                  onChange={(e) => setCarrierCostInput(e.target.value)}
                                  className="w-24 h-8 bg-slate-50 border border-slate-300 rounded-lg px-2 text-xs font-mono font-bold text-center outline-none focus:border-[#174F43]"
                                  placeholder="65"
                                />
                                <span className="text-xs text-slate-500 font-mono">{isRTL ? 'ج.م' : 'EGP'}</span>
                                <button
                                  type="button"
                                  onClick={handleSaveCarrierCost}
                                  disabled={savingCarrierCost}
                                  className="px-3 py-1.5 bg-[#174F43] text-white rounded-lg text-xs font-bold hover:bg-[#0F3830] transition-colors disabled:opacity-50 flex items-center gap-1"
                                >
                                  {savingCarrierCost ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
                                  <span>{isRTL ? 'حفظ' : 'Save'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCarrierCostInput(Math.round(Number(selectedOrder.actualOutboundShippingCost ?? selectedOrder.realShippingCost ?? getGovernorateRate(selectedOrder.shippingAddress?.governorate) ?? 65)));
                                    setEditingCarrierCost(false);
                                  }}
                                  className="px-2.5 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-xs hover:bg-slate-50"
                                >
                                  {isRTL ? 'إلغاء' : 'Cancel'}
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-mono font-black text-slate-900 text-sm">
                                  {Math.round(Number(selectedOrder.actualOutboundShippingCost ?? selectedOrder.realShippingCost ?? getGovernorateRate(selectedOrder.shippingAddress?.governorate) ?? 65))} {isRTL ? 'ج.م' : 'EGP'}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {isRTL ? '(يُقيد كمصروف شحن ونقل في الأرباح والخسائر)' : '(Recorded under Shipping Expenses in P&L)'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

              </div>

              {/* Order Products & Items Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-[#174F43] text-xs flex items-center gap-1.5">
                    <ShoppingBag size={15} />
                    <span>منتجات الطلب ({selectedOrder.items?.length || 0} عطور)</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">الأسعار تشمل الضرائب والمصنعية</span>
                </div>

                <div className="border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-[#F8FAFC] border-b border-slate-200 font-bold text-slate-600">
                      <tr>
                        <th className="p-3">العطر / المنتج</th>
                        <th className="p-3 text-center">الحجم</th>
                        <th className="p-3 text-center">سعر الوحدة</th>
                        <th className="p-3 text-center">الكمية</th>
                        <th className="p-3 text-left">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {(selectedOrder.items || []).map((item, idx) => {
                        const imgSrc = getItemImage(item);
                        return (
                          <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                <img
                                  src={imgSrc}
                                  alt={item.productName}
                                  className="w-12 h-12 object-contain rounded-xl border border-slate-200 bg-white p-1 shrink-0 shadow-2xs"
                                  onError={(e) => { e.target.onerror = null; e.target.src = '/img/product.png'; }}
                                />
                                <div>
                                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{item.productName}</h4>
                                  <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                                    SKU: {item.variantSKU || '-'}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <span className="inline-block px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 font-bold text-[11px] font-mono">
                                {item.size}
                              </span>
                            </td>
                            <td className="p-3 text-center font-mono font-semibold text-slate-800">
                              {item.price?.toLocaleString()} ج.م
                            </td>
                            <td className="p-3 text-center">
                              <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 font-bold font-mono text-slate-900">
                                {item.quantity}
                              </span>
                            </td>
                            <td className="p-3 text-left font-mono font-bold text-[#174F43] text-xs sm:text-sm">
                              {(item.price * item.quantity).toLocaleString()} ج.م
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Totals Breakdown */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <span className="font-extrabold text-[#174F43] text-xs block pb-1 border-b border-slate-200/80">
                  {isRTL ? 'ملخص الحسابات والمبالغ' : 'Financial Summary'}
                </span>

                <div className="flex justify-between text-slate-600 text-xs">
                  <span>{isRTL ? 'المجموع الفرعي للمنتجات:' : 'Products Subtotal:'}</span>
                  <span className="font-mono font-bold text-slate-900">{selectedOrder.subtotal?.toLocaleString()} {isRTL ? 'ج.م' : 'EGP'}</span>
                </div>

                {selectedOrder.discount > 0 && (
                  <div className="flex justify-between text-emerald-700 text-xs font-semibold">
                    <span>{isRTL ? 'الخصم المطبق (كوبون / عرض):' : 'Applied Discount:'}</span>
                    <span className="font-mono">-{selectedOrder.discount?.toLocaleString()} {isRTL ? 'ج.م' : 'EGP'}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-600 text-xs">
                  <span>{isRTL ? 'رسوم التوصيل والشحن (المحصلة من العميل):' : 'Shipping Fee Charged:'}</span>
                  <span className="font-mono font-bold text-slate-900">
                    {(selectedOrder.shippingFeeCharged ?? selectedOrder.shipping ?? selectedOrder.metroPickupFee ?? 0) === 0 ? (
                      <span className="text-emerald-700 font-bold">{isRTL ? 'شحن مجاني (0 ج.م)' : 'Free Shipping (0 EGP)'}</span>
                    ) : (
                      `${Math.round(selectedOrder.shippingFeeCharged ?? selectedOrder.shipping ?? selectedOrder.metroPickupFee)} ${isRTL ? 'ج.م' : 'EGP'}`
                    )}
                  </span>
                </div>

                {selectedOrder.shippingDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700 text-xs font-semibold">
                    <span>{isRTL ? 'خصم الشحن المباشر (كوبون):' : 'Shipping Promo Discount:'}</span>
                    <span className="font-mono">-{Math.round(selectedOrder.shippingDiscount)} {isRTL ? 'ج.م' : 'EGP'}</span>
                  </div>
                )}

                <div className="flex justify-between pt-2.5 border-t border-slate-200/90 text-sm font-black text-[#174F43]">
                  <span className="text-sm">{isRTL ? 'المبلغ الإجمالي النهائي المطلوب:' : 'Total Amount Due:'}</span>
                  <span className="font-mono text-base">{selectedOrder.total?.toLocaleString()} {isRTL ? 'ج.م' : 'EGP'}</span>
                </div>
              </div>

              {/* Order Status History Audit Trail */}
              {selectedOrder.statusHistory && selectedOrder.statusHistory.length > 0 && (
                <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200 space-y-2.5">
                  <span className="font-extrabold text-[#174F43] text-xs block pb-1 border-b border-slate-200">
                    {isRTL ? 'سجل تتبع ومراحل الطلب' : 'Status Audit History'}
                  </span>
                  <div className="space-y-2 pt-1">
                    {selectedOrder.statusHistory.map((h, idx) => (
                      <div key={idx} className="flex items-start justify-between text-xs border-r-2 border-[#174F43] pr-2.5 py-0.5">
                        <div>
                          <div className="flex items-center gap-1.5 font-bold text-slate-800">
                            <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] ${statusConfig[h.status]?.bg || 'bg-slate-100'} ${statusConfig[h.status]?.color || 'text-slate-800'}`}>
                              {statusConfig[h.status]?.[isRTL ? 'labelAr' : 'labelEn'] || h.status}
                            </span>
                            {h.changedBy && (
                              <span className="text-[10px] text-slate-400 font-normal">{isRTL ? `بواسطة: ${h.changedBy}` : `By: ${h.changedBy}`}</span>
                            )}
                          </div>
                          {h.note && <p className="text-[11px] text-slate-600 mt-0.5">{h.note}</p>}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                          {new Date(h.changedAt).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-200 bg-[#F8FAFC] flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-400 font-medium">
                معرف الطلب الداخلي: {selectedOrder._id}
              </span>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors"
              >
                إغلاق النافذة
              </button>
            </div>

          </div>
        </div>
      )}

      {/* RETURN FROM SHIPPING MODAL */}
      {returnModalOrder && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-amber-500/10 border-b border-amber-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800">
                  <RotateCcw size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-amber-950">
                    تسجيل شحنة مرتجعة وتكاليف الشحن
                  </h3>
                  <span className="text-[11px] font-mono text-amber-800 font-semibold block">
                    طلب رقم #{returnModalOrder.orderNumber} • العميل: {returnModalOrder.customer?.name || returnModalOrder.customerPhone || 'عميل M20'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReturnModalOrder(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitReturn} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-amber-950 leading-relaxed text-[11px]">
                <p className="font-bold flex items-center gap-1.5 mb-1 text-amber-900">
                  <AlertCircle size={14} />
                  <span>تنبيه القواعد المالية المتبعة:</span>
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-amber-900/90 text-[10.5px]">
                  <li>تتحمل دار M20 تكاليف الشحن الفعلية لشركة الشحن عند رفض العميل الاستلام.</li>
                  <li>تُسجل هذه الرسوم تلقائياً في المالية كمصروف نقل وتشغيل (تُخصم من صافي الربح ولا تُضاف لتكلفة تصنيع المنتجات).</li>
                  <li>لا يتم استرجاع المخزون تلقائياً حتى استلام المنتجات المرتجعة فعلياً وفحص سلامتها.</li>
                </ul>
              </div>

              {/* Shipping Charges Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isRTL ? 'تكلفة الشحن ذهاباً للعميل (ج.م) *' : 'Outbound Carrier Cost (EGP) *'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={returnForm.outboundShippingCost}
                    onChange={(e) => setReturnForm({ ...returnForm, outboundShippingCost: e.target.value })}
                    className="w-full h-9 bg-white border border-slate-300 rounded-xl px-3 text-xs font-mono font-bold outline-none focus:border-[#174F43]"
                    placeholder="65"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">{isRTL ? 'رسوم التوصيل الصادرة للعنوان' : 'Outbound delivery fee paid to courier'}</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isRTL ? 'تكلفة الشحن إياباً / عودة للمخزن (ج.م) *' : 'Return Carrier Cost (EGP) *'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={returnForm.returnShippingCost}
                    onChange={(e) => setReturnForm({ ...returnForm, returnShippingCost: e.target.value })}
                    className="w-full h-9 bg-white border border-slate-300 rounded-xl px-3 text-xs font-mono font-bold outline-none focus:border-[#174F43]"
                    placeholder="65"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">{isRTL ? 'إذا كانت شركة الشحن تحاسب على العودة' : 'If carrier charges return fee'}</span>
                </div>
              </div>

              {/* Total Calculation Display */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-700">{isRTL ? 'إجمالي تكلفة الشحن المتكبدة على M20:' : 'Total Carrier Shipping Cost:'}</span>
                <span className="font-mono font-black text-sm text-rose-700">
                  {Math.round((Number(returnForm.outboundShippingCost) || 0) + (Number(returnForm.returnShippingCost) || 0)).toLocaleString()} {isRTL ? 'ج.م' : 'EGP'}
                </span>
              </div>

              {/* Return Reason */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isRTL ? 'سبب الارتجاع *' : 'Return Reason *'}
                </label>
                <select
                  value={returnForm.returnReason}
                  onChange={(e) => setReturnForm({ ...returnForm, returnReason: e.target.value })}
                  className="w-full h-9 bg-white border border-slate-300 rounded-xl px-3 text-xs outline-none focus:border-[#174F43] font-medium"
                >
                  <option value={isRTL ? 'رفض العميل الاستلام' : 'Customer Refused Delivery'}>
                    {isRTL ? 'رفض العميل الاستلام عند وصول المندوب' : 'Customer refused delivery upon courier arrival'}
                  </option>
                  <option value={isRTL ? 'تعذر التواصل مع العميل أو الهاتف مغلق' : 'Customer Unreachable / Phone Off'}>
                    {isRTL ? 'تعذر التواصل مع العميل أو الهاتف مغلق' : 'Customer unreachable or phone off'}
                  </option>
                  <option value={isRTL ? 'عنوان غير دقيق أو خارج نطاق التغطية' : 'Invalid Address or Out of Coverage'}>
                    {isRTL ? 'عنوان غير دقيق أو خارج نطاق التغطية' : 'Invalid address or out of delivery zone'}
                  </option>
                  <option value={isRTL ? 'طلب العميل الإلغاء بعد خروج الشحنة' : 'Customer Cancelled After Dispatch'}>
                    {isRTL ? 'طلب العميل الإلغاء بعد خروج الشحنة' : 'Customer cancelled after dispatch'}
                  </option>
                  <option value={isRTL ? 'تأخر شركة الشحن في التسليم' : 'Courier Delay'}>
                    {isRTL ? 'تأخر شركة الشحن ورغبة العميل في الإلغاء' : 'Courier delayed and customer refused'}
                  </option>
                  <option value={isRTL ? 'سبب آخر' : 'Other Reason'}>
                    {isRTL ? 'سبب آخر (موضح بالملاحظات)' : 'Other reason (specified in notes)'}
                  </option>
                </select>
              </div>

              {/* Cash Account for Shipping Expense */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  الخزينة / حساب الدفع لسداد مصاريف الشحن
                </label>
                <select
                  value={returnForm.paymentAccountId}
                  onChange={(e) => setReturnForm({ ...returnForm, paymentAccountId: e.target.value })}
                  className="w-full h-9 bg-white border border-slate-300 rounded-xl px-3 text-xs outline-none focus:border-[#174F43] font-medium"
                >
                  <option value="">-- اختياري: سداد لاحق / غير مخصوم فوراً من الخزينة --</option>
                  {cashAccounts.map(acc => (
                    <option key={acc._id} value={acc._id}>
                      {acc.name} ({acc.type}) - رصيد: {acc.balance?.toLocaleString()} ج.م
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 mt-0.5 block">في حال تم خصم الرسوم نقداً أو من محفظة شركة الشحن</span>
              </div>

              {/* Inspection / Courier Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ملاحظات إضافية أو تقرير المندوب
                </label>
                <textarea
                  rows="2"
                  value={returnForm.notes}
                  onChange={(e) => setReturnForm({ ...returnForm, notes: e.target.value })}
                  placeholder="ملاحظات شركة الشحن، حالة الطرد الخارجي، إلخ..."
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs outline-none focus:border-[#174F43]"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setReturnModalOrder(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-bold text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submittingReturn}
                  className="px-5 py-2 bg-[#174F43] hover:bg-[#0F3830] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                >
                  {submittingReturn ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                  <span>حفظ وتسجيل الشحنة المرتجعة</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOMER REFUND MODAL */}
      {refundModalOrder && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#174F43]/10 border-b border-[#174F43]/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#174F43]/15 flex items-center justify-center text-[#174F43]">
                  <Undo2 size={18} className="text-[#FF9D00]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#174F43]">
                    معالجة استرداد المبلغ للعميل (Refund)
                  </h3>
                  <span className="text-[11px] font-mono text-slate-600 font-semibold block">
                    طلب رقم #{refundModalOrder.orderNumber} • المبلغ المحصل: {refundModalOrder.total?.toLocaleString()} ج.م
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRefundModalOrder(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitRefund} className="p-6 space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed text-[11.5px]">
                نظراً لارتجاع الشحنة بعد تحصيل قيمتها مسبقاً، سيتم صرف المبلغ وإرجاعه للعميل وخصمه تلقائياً من الخزينة المحددة وتسجيل قيد استرداد مالي.
              </p>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  مبلغ الاسترداد (ج.م) *
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  max={refundModalOrder.total}
                  required
                  value={refundForm.refundAmount}
                  onChange={(e) => setRefundForm({ ...refundForm, refundAmount: e.target.value })}
                  className="w-full h-9 bg-white border border-slate-300 rounded-xl px-3 text-xs font-mono font-bold outline-none focus:border-[#174F43]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  الخزينة / الحساب المالي المراد الصرف منه *
                </label>
                <select
                  required
                  value={refundForm.cashAccountId}
                  onChange={(e) => setRefundForm({ ...refundForm, cashAccountId: e.target.value })}
                  className="w-full h-9 bg-white border border-slate-300 rounded-xl px-3 text-xs outline-none focus:border-[#174F43] font-medium"
                >
                  <option value="">-- اختر الخزينة أو المحفظة --</option>
                  {cashAccounts.map(acc => (
                    <option key={acc._id} value={acc._id}>
                      {acc.name} ({acc.type}) - رصيد: {acc.balance?.toLocaleString()} ج.م
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ملاحظات أو رقم معاملة التحويل (إن وجد)
                </label>
                <textarea
                  rows="2"
                  value={refundForm.notes}
                  onChange={(e) => setRefundForm({ ...refundForm, notes: e.target.value })}
                  placeholder="رقم مرجع إنستاباي، فودافون كاش، إلخ..."
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs outline-none focus:border-[#174F43]"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setRefundModalOrder(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-bold text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submittingRefund}
                  className="px-5 py-2 bg-[#174F43] hover:bg-[#0F3830] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                >
                  {submittingRefund ? <RefreshCw size={14} className="animate-spin text-[#FF9D00]" /> : <Check size={14} className="text-[#FF9D00]" />}
                  <span>تأكيد خصم وصرف الاسترداد</span>
                </button>
              </div>
            </form>
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
              className="px-4 py-2 bg-[#174F43] text-white font-bold rounded-xl text-xs flex items-center gap-2"
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
              <div style={{ textAlign: 'center', borderBottom: '1.5px solid #174F43', paddingBottom: '6px', marginBottom: '8px' }}>
                <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#174F43', letterSpacing: '1px' }}>M20</h1>
                <p style={{ margin: 0, fontSize: '8px', textTransform: 'uppercase', color: '#64748B' }}>HAUTE PARFUMERIE • ATELIER DU CAIRE</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '11px', fontWeight: 'bold' }}>فاتورة طلب رقم #{selectedOrder.orderNumber}</p>
                <p style={{ margin: 0, fontSize: '8px', color: '#64748B' }}>{new Date(selectedOrder.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              </div>

              {/* Customer Box */}
              <div style={{ backgroundColor: '#F8FAFC', padding: '6px', borderRadius: '4px', marginBottom: '8px', fontSize: '9.5px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span><strong>العميل:</strong> {selectedOrder.customer?.name || 'عميل M20'}</span>
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
                    <span><strong>العنوان:</strong> {formatGovernorate(selectedOrder.shippingAddress?.governorate, isRTL)} - {selectedOrder.shippingAddress?.city} - {selectedOrder.shippingAddress?.street}</span>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #CBD5E1', paddingTop: '4px', fontWeight: '900', fontSize: '12px', color: '#174F43' }}>
                  <span>الإجمالي النهائي:</span>
                  <span>{selectedOrder.total?.toLocaleString()} ج.م</span>
                </div>
              </div>

              {/* QR Code Verification Box */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #E2E8F0', padding: '6px', borderRadius: '6px' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 'bold', fontSize: '9px', color: '#174F43' }}>امسح للتحقق ومتابعة الشحنة</p>
                  <p style={{ margin: '2px 0 0 0', fontSize: '8px', color: '#64748B' }}>m20fragrance.com/track-order</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '7.5px', color: '#94A3B8' }}>شكراً لاختياركم دار عطور M20</p>
                </div>
                <div style={{ padding: '3px', backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '4px' }}>
                  <QRCodeSVG 
                    value={`https://m20fragrance.com/track-order?order=${selectedOrder.orderNumber}`} 
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
                border: '2px solid #174F43'
              }}
            >
              {/* Shipping Label Top */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #174F43', paddingBottom: '6px', marginBottom: '8px' }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#174F43' }}>M20 PARFUMS</h1>
                  <p style={{ margin: 0, fontSize: '8px', textTransform: 'uppercase', color: '#64748B' }}>Fragile • Luxury Goods</p>
                </div>
                <div style={{ textAlign: 'left', fontWeight: 'bold', fontSize: '13px', color: '#174F43' }}>
                  بوليصة شحن
                </div>
              </div>

              {/* Receiver Info */}
              <div style={{ border: '1.5px solid #174F43', padding: '8px', borderRadius: '6px', marginBottom: '8px', backgroundColor: '#F8FAFC' }}>
                <span style={{ display: 'inline-block', backgroundColor: '#174F43', color: '#FFFFFF', fontSize: '8px', fontWeight: 'bold', padding: '1px 5px', borderRadius: '2px', marginBottom: '4px' }}>
                  المرسل إليه (المستلم)
                </span>
                <p style={{ margin: '2px 0', fontSize: '13px', fontWeight: 'bold', color: '#174F43' }}>
                  {selectedOrder.customer?.name || 'عميل M20'}
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
                    <p style={{ margin: 0, fontSize: '11px', fontWeight: 'bold', color: '#174F43' }}>
                      تسليم محطة مترو: {selectedOrder.metroPickup?.stationNameAr || selectedOrder.metroPickup?.stationName}
                    </p>
                  ) : (
                    <p style={{ margin: 0, fontSize: '11px', lineHeight: '1.4' }}>
                      <strong>العنوان:</strong> {formatGovernorate(selectedOrder.shippingAddress?.governorate, isRTL)} - {selectedOrder.shippingAddress?.city} - {selectedOrder.shippingAddress?.street} (مبنى: {selectedOrder.shippingAddress?.buildingNumber || '-'})
                      {selectedOrder.shippingAddress?.deliveryNotes && ` [ملاحظات: ${selectedOrder.shippingAddress?.deliveryNotes}]`}
                    </p>
                  )}
                </div>
              </div>

              {/* COD / Payment Notice */}
              <div style={{ border: '2px dashed #174F43', padding: '6px', textAlign: 'center', marginBottom: '8px', borderRadius: '6px', backgroundColor: selectedOrder.paymentStatus === 'paid' ? '#ECFDF5' : '#FEF3C7' }}>
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
                  <p style={{ margin: '2px 0 0 0' }}>المرسل: دار M20 للعطور • القاهرة</p>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <QRCodeSVG value={`https://m20fragrance.com/track-order?order=${selectedOrder.orderNumber}`} size={38} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

