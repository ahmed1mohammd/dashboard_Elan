import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext(null);

export const translations = {
  en: {
    // Nav & Shell
    nav: {
      dashboardTitle: 'M20 Operations',
      adminBadge: 'Admin Suite',
      overview: 'Overview & Analytics',
      orders: 'Orders & Shipments',
      purchases: 'Purchase Invoices',
      rawMaterials: 'Raw Materials Inventory',
      finishedLiquid: 'Finished Liquid Inventory',
      financeOverview: 'Finance Overview',
      costSettings: 'Cost Defaults Settings',
      formulas: 'Perfume Formulas',
      batches: 'Production Batches (Internal)',
      products: 'Products & Finished Stock',
      expenses: 'Operating Expenses',
      cashAccounts: 'Treasuries & Payment Accounts',
      finance: 'Finance & P&L',
      reports: 'Profit & Operations Reports',
      movements: 'Stock Movement Logs',
      users: 'Customer Logs & Activity',
      coupons: 'Coupons & Discounts',
      offers: 'Bundles & Special Offers',
      marketing: 'Marketing & Ads Analytics',
      cms: 'Storefront & Shipping Settings',
      previewStore: 'Preview M20 Store',
      logout: 'Logout',
      serverOnline: 'Server Online',
      welcome: 'Welcome,',
      administrator: 'Administrator'
    },
    common: {
      search: 'Search...',
      filter: 'Filter',
      all: 'All',
      save: 'Save Changes',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      add: 'Add New',
      create: 'Create',
      export: 'Export CSV',
      print: 'Print',
      status: 'Status',
      actions: 'Actions',
      date: 'Date',
      total: 'Total',
      currency: 'EGP',
      loading: 'Loading data...',
      noData: 'No records found',
      confirmDelete: 'Are you sure you want to delete this item?',
      success: 'Saved successfully',
      error: 'An error occurred',
      details: 'Details',
      close: 'Close',
      phone: 'Phone',
      email: 'Email',
      address: 'Address',
      notes: 'Notes'
    },
    status: {
      pending: 'Pending',
      processing: 'Processing',
      shipped: 'Shipped',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
      paid: 'Paid',
      unpaid: 'Unpaid',
      in_stock: 'In Stock',
      low_stock: 'Low Stock',
      out_of_stock: 'Out of Stock'
    }
  },
  ar: {
    // Nav & Shell
    nav: {
      dashboardTitle: 'إدارة M20',
      adminBadge: 'لوحة التحكم',
      overview: 'نظرة عامة والتحليلات',
      orders: 'الطلبات والشحنات',
      purchases: 'فواتير المشتريات',
      rawMaterials: 'مخزون المواد الخام',
      finishedLiquid: 'مخزون العطور السائلة',
      financeOverview: 'نظرة عامة على المالية والأرباح',
      costSettings: 'إعدادات التكاليف الافتراضية',
      formulas: 'تركيبات العطور',
      batches: 'تشغيلات التصنيع (داخلي)',
      products: 'المنتجات والكتالوج',
      expenses: 'المصروفات التشغيلية',
      cashAccounts: 'الخزائن وحسابات الدفع',
      finance: 'المالية والأرباح',
      reports: 'تقارير الأرباح والتشغيل',
      movements: 'سجل حركات المخزون',
      users: 'سجل العملاء والنشاط',
      coupons: 'الكوبونات والخصومات',
      offers: 'العروض والباقات',
      marketing: 'تحليلات التسويق والإعلانات',
      cms: 'إعدادات المتجر والشحن',
      previewStore: 'معاينة متجر M20',
      logout: 'تسجيل الخروج',
      serverOnline: 'متصل بالخادم',
      welcome: 'مرحباً،',
      administrator: 'مدير النظام'
    },
    common: {
      search: 'بحث...',
      filter: 'تصفية',
      all: 'الكل',
      save: 'حفظ التعديلات',
      cancel: 'إلغاء',
      delete: 'حذف',
      edit: 'تعديل',
      add: 'إضافة جديد',
      create: 'إنشاء',
      export: 'تصدير CSV',
      print: 'طباعة',
      status: 'الحالة',
      actions: 'إجراءات',
      date: 'التاريخ',
      total: 'الإجمالي',
      currency: 'ج.م',
      loading: 'جاري تحميل البيانات...',
      noData: 'لا توجد سجلات',
      confirmDelete: 'هل أنت متأكد من الحذف؟',
      success: 'تم الحفظ بنجاح',
      error: 'حدث خطأ غير متوقع',
      details: 'التفاصيل',
      close: 'إغلاق',
      phone: 'رقم الهاتف',
      email: 'البريد الإلكتروني',
      address: 'العنوان',
      notes: 'ملاحظات'
    },
    status: {
      pending: 'قيد الانتظار',
      processing: 'قيد التجهيز',
      shipped: 'تم الشحن',
      delivered: 'تم التوصيل',
      cancelled: 'ملغي',
      paid: 'مدفوع',
      unpaid: 'غير مدفوع',
      in_stock: 'متوفر',
      low_stock: 'منخفض',
      out_of_stock: 'نفد المخزون'
    }
  }
};

export const LanguageProvider = ({ children }) => {
  // English is the STRICT default as requested
  const [lang, setLangState] = useState(() => {
    return localStorage.getItem('m20_dashboard_lang') || 'en';
  });

  const isRTL = lang === 'ar';
  const dir = isRTL ? 'rtl' : 'ltr';

  useEffect(() => {
    localStorage.setItem('m20_dashboard_lang', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    document.title = lang === 'ar' 
      ? 'M20 | لوحة التحكم والإدارة الفاخرة'
      : 'M20 | Management & Operations Suite';
  }, [lang, dir]);

  const setLang = (newLang) => {
    if (newLang === 'en' || newLang === 'ar') {
      setLangState(newLang);
    }
  };

  const toggleLang = () => {
    setLangState((prev) => (prev === 'en' ? 'ar' : 'en'));
  };

  const t = (path, fallback = '') => {
    if (!path) return fallback;
    const parts = path.split('.');
    let current = translations[lang];
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        // Fallback to English dictionary
        let fallbackVal = translations.en;
        for (const p of parts) {
          if (fallbackVal && typeof fallbackVal === 'object' && p in fallbackVal) {
            fallbackVal = fallbackVal[p];
          } else {
            return fallback || path;
          }
        }
        return fallbackVal || fallback || path;
      }
    }
    return current !== undefined ? current : (fallback || path);
  };

  const formatCurrency = (amount) => {
    const num = Number(amount) || 0;
    const formatted = num.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US');
    return lang === 'ar' ? `${formatted} ج.م` : `EGP ${formatted}`;
  };

  return (
    <LanguageContext.Provider
      value={{
        lang,
        dir,
        isRTL,
        setLang,
        toggleLang,
        t,
        formatCurrency,
        dict: translations[lang]
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
