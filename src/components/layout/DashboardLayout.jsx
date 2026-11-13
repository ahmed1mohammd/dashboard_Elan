import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  BarChart3, Truck, DollarSign, Package, Users, Tag, Image, 
  Store, LogOut, Menu, X, ChevronLeft, ChevronRight, FlaskConical, Layers,
  Receipt, Wallet, FileSpreadsheet, History, Sparkles, Globe, Droplets, Target
} from 'lucide-react';

export default function DashboardLayout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { lang, dir, isRTL, toggleLang, setLang, t } = useLanguage();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Primary 4 Core Daily Sections + Orders
  const primaryMenuItems = [
    { path: '/finance', label: t('nav.financeOverview', 'Finance Overview'), icon: DollarSign },
    { path: '/purchases', label: t('nav.purchases', 'Purchase Invoices'), icon: Receipt },
    { path: '/inventory/raw-materials', label: t('nav.rawMaterials', 'Raw Materials Inventory'), icon: FlaskConical },
    { path: '/inventory/finished-liquid', label: t('nav.finishedLiquid', 'Finished Liquid Inventory'), icon: Droplets },
    { path: '/orders', label: t('nav.orders', 'Orders & Shipments'), icon: Truck },
  ];

  // Secondary & Advanced
  const secondaryMenuItems = [
    { path: '/', label: t('nav.overview', 'Overview & Analytics'), icon: BarChart3 },
    { path: '/products', label: t('nav.products', 'Products & Finished Stock'), icon: Package },
    { path: '/formulas', label: t('nav.formulas', 'Perfume Formulas'), icon: Layers },
    { path: '/expenses', label: t('nav.expenses', 'Operating Expenses'), icon: DollarSign },
    { path: '/finance/cash-accounts', label: t('nav.cashAccounts', 'Treasuries & Accounts'), icon: Wallet },
    { path: '/inventory/movements', label: t('nav.movements', 'Stock Movement Logs'), icon: History },
    { path: '/users', label: t('nav.users', 'Customer Logs & Activity'), icon: Users },
    { path: '/coupons', label: t('nav.coupons', 'Coupons & Discounts'), icon: Tag },
    { path: '/offers', label: t('nav.offers', 'Bundles & Special Offers'), icon: Sparkles },
    { path: '/marketing', label: t('nav.marketing', 'Marketing & Ads Analytics'), icon: Target },
    { path: '/cms', label: t('nav.cms', 'Storefront CMS & Banners'), icon: Image },
  ];

  return (
    <div 
      dir={dir} 
      className={`h-screen w-screen bg-[#F8FAFC] text-slate-800 flex flex-col md:flex-row ${
        isRTL ? "font-['Cairo',sans-serif]" : "font-sans"
      } overflow-hidden`}
    >
      
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex flex-col w-64 h-full bg-[#174F43] text-white shrink-0 ${
        isRTL ? 'border-l border-white/10' : 'border-r border-white/10'
      } z-20 select-none`}>
        
        {/* Brand Header */}
        <div className="h-20 flex items-center justify-between px-4 border-b border-white/10 bg-[#0F3830] shrink-0">
          <Link to="/" className="inline-flex items-center bg-[#F4F3EF] px-2.5 py-1 rounded-sm shadow-xs">
            <img 
              src="/img/m20-logo-emerald.png" 
              alt="M20 Fine Fragrances" 
              className="h-9 sm:h-10 w-auto object-contain transition-transform duration-150 hover:scale-105"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/img/m20-logo.png';
              }}
            />
          </Link>
          <div className="flex items-center gap-1.5">
            {/* Language Switcher Button in Header */}
            <div className="flex items-center bg-black/20 rounded p-0.5 border border-white/10 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-1.5 py-0.5 rounded transition-all ${
                  lang === 'en'
                    ? 'bg-[#FF9D00] text-black shadow-xs font-bold'
                    : 'text-white/70 hover:text-white'
                }`}
                title="Switch to English"
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLang('ar')}
                className={`px-1.5 py-0.5 rounded transition-all ${
                  lang === 'ar'
                    ? 'bg-[#FF9D00] text-black shadow-xs font-bold'
                    : 'text-white/70 hover:text-white'
                }`}
                title="التحويل للغة العربية"
              >
                AR
              </button>
            </div>
            <span className="text-[10px] uppercase tracking-wider bg-[#FF9D00]/20 text-[#FF9D00] font-bold px-1.5 py-0.5 rounded border border-[#FF9D00]/40">
              Admin
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-3 space-y-4 overflow-y-auto">
          {/* Core Daily Operations */}
          <div>
            <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-white/50">
              {lang === 'ar' ? 'العمليات اليومية الأساسية' : 'Daily Operations'}
            </div>
            <div className="space-y-1">
              {primaryMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-sm text-xs font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-[#0F3830] text-[#FF9D00] font-bold shadow-xs border-r-3 border-[#FF9D00] rtl:border-r-0 rtl:border-l-3'
                        : 'text-slate-200 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon size={16} strokeWidth={1.8} className={isActive ? "text-[#FF9D00] shrink-0" : "text-white shrink-0"} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {isActive && (
                      isRTL ? <ChevronLeft size={14} className="text-[#FF9D00] shrink-0" /> : <ChevronRight size={14} className="text-[#FF9D00] shrink-0" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Secondary System & Storefront */}
          <div className="pt-2 border-t border-white/10">
            <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-white/40">
              {lang === 'ar' ? 'إدارة المتجر والنظام' : 'Store & System'}
            </div>
            <div className="space-y-0.5">
              {secondaryMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center justify-between px-3 py-2 rounded-sm text-[11px] font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-[#0F3830] text-[#FF9D00] font-semibold border-r-2 border-[#FF9D00] rtl:border-r-0 rtl:border-l-2'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon size={14} strokeWidth={1.5} className={isActive ? "text-[#FF9D00] shrink-0" : "text-white/70 shrink-0"} />
                      <span className="truncate">{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-white/10 bg-[#0F3830] space-y-2 shrink-0">
          <a
            href="http://localhost:5173"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-sm text-xs font-medium bg-white/10 hover:bg-white/15 text-white transition-colors duration-150 border border-white/10"
          >
            <Store size={14} strokeWidth={1.5} />
            <span>{t('nav.previewStore', 'Preview M20 Store')}</span>
          </a>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-8 h-8 rounded-sm bg-white/10 text-white font-bold text-xs flex items-center justify-center shrink-0 border border-white/15">
                {user?.name ? user.name[0].toUpperCase() : 'M'}
              </div>
              <div className="truncate">
                <p className="text-xs font-medium text-white truncate">{user?.name || t('nav.administrator', 'Administrator')}</p>
                <p className="text-[10px] text-slate-400 font-mono truncate">{user?.phone || 'admin@m20fragrance.com'}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title={t('nav.logout', 'Logout')}
              className="p-1.5 rounded-sm text-slate-400 hover:text-red-300 transition-colors duration-150"
            >
              <LogOut size={16} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Topbar */}
      <header className="md:hidden sticky top-0 z-40 bg-white text-slate-800 px-4 h-18 flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 rounded-sm text-slate-700 hover:bg-slate-100"
            aria-label="Open menu"
          >
            <Menu size={20} strokeWidth={1.5} />
          </button>
          <Link to="/" className="flex items-center">
            <img 
              src="/img/m20-logo-emerald.png" 
              alt="M20 Fine Fragrances" 
              className="h-9 sm:h-10 w-auto object-contain drop-shadow-xs"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/img/m20-logo.png';
              }}
            />
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile Language Switcher */}
          <button
            onClick={toggleLang}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-xs font-bold text-[#174F43] border border-slate-200 transition-colors"
            title="Toggle Language"
          >
            <Globe size={13} />
            <span>{lang === 'en' ? 'AR' : 'EN'}</span>
          </button>

          <a
            href="http://localhost:5173"
            target="_blank"
            rel="noreferrer"
            className="p-1.5 rounded-sm text-slate-600 hover:text-[#FF9D00]"
            title={t('nav.previewStore', 'Preview M20 Store')}
          >
            <Store size={18} strokeWidth={1.5} />
          </a>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-sm text-slate-600 hover:text-red-500"
            title={t('nav.logout', 'Logout')}
          >
            <LogOut size={18} strokeWidth={1.5} />
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className={`fixed inset-0 z-50 md:hidden flex ${isRTL ? 'rtl' : 'ltr'}`}>
          <div 
            className="fixed inset-0 bg-black/40 transition-opacity duration-150"
            onClick={() => setMobileMenuOpen(false)} 
          />

          <div className={`relative w-4/5 max-w-xs bg-[#174F43] text-white h-full flex flex-col z-10 ${
            isRTL ? 'border-l border-white/10' : 'border-r border-white/10'
          }`}>
            <div className="h-20 flex items-center justify-between px-4 border-b border-white/10 bg-[#0F3830]">
              <Link to="/" onClick={() => setMobileMenuOpen(false)} className="inline-flex items-center bg-[#F4F3EF] px-2.5 py-1 rounded-sm shadow-xs">
                <img 
                  src="/img/m20-logo-emerald.png" 
                  alt="M20 Fine Fragrances" 
                  className="h-9 sm:h-10 w-auto object-contain"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/img/m20-logo.png';
                  }}
                />
              </Link>
              <button 
                onClick={() => setMobileMenuOpen(false)} 
                className="p-1.5 rounded-sm text-white/80 hover:text-white"
              >
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>

            <nav className="flex-1 py-3 px-2 space-y-4 overflow-y-auto">
              <div>
                <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-white/50">
                  {lang === 'ar' ? 'العمليات الأساسية' : 'Daily Operations'}
                </div>
                <div className="space-y-1">
                  {primaryMenuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-sm text-xs font-medium transition-all duration-150 ${
                          isActive
                            ? 'bg-[#0F3830] text-[#FF9D00] font-bold border-r-3 border-[#FF9D00] rtl:border-r-0 rtl:border-l-3'
                            : 'text-slate-200 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon size={16} strokeWidth={1.8} className={isActive ? "text-[#FF9D00]" : "text-white"} />
                          <span>{item.label}</span>
                        </div>
                        {isActive && (isRTL ? <ChevronLeft size={14} className="text-[#FF9D00]" /> : <ChevronRight size={14} className="text-[#FF9D00]" />)}
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-white/10">
                <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-white/40">
                  {lang === 'ar' ? 'إدارة المتجر والنظام' : 'Store & System'}
                </div>
                <div className="space-y-0.5">
                  {secondaryMenuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center justify-between px-3 py-2 rounded-sm text-[11px] font-medium transition-all duration-150 ${
                          isActive
                            ? 'bg-[#0F3830] text-[#FF9D00] font-semibold border-r-2 border-[#FF9D00] rtl:border-r-0 rtl:border-l-2'
                            : 'text-slate-300 hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon size={14} strokeWidth={1.5} className={isActive ? "text-[#FF9D00]" : "text-white/70"} />
                          <span>{item.label}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </nav>

            <div className="p-3 border-t border-white/10 bg-[#0F3830] space-y-2">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-sm bg-white/10 text-white font-medium text-xs"
              >
                <LogOut size={14} strokeWidth={1.5} />
                <span>{t('nav.logout', 'Logout')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-y-auto overflow-x-hidden pb-6">
        <header className="hidden md:flex h-14 bg-white border-b border-slate-200 items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#15803d]"></span>
            <span className="text-xs text-slate-600">{t('nav.serverOnline', 'Server Online')}</span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="text-slate-500">{t('nav.welcome', 'Welcome,')}</span>
              <span className="font-semibold text-[#174F43]">{user?.name || t('nav.administrator', 'Administrator')}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-[1200px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
