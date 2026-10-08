import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  BarChart3, Truck, DollarSign, Package, Users, Tag, Image, 
  Store, LogOut, Menu, X, ChevronLeft, FlaskConical, Layers,
  Receipt, Wallet, FileSpreadsheet, History
} from 'lucide-react';

const menuItems = [
  { path: '/', label: 'الرئيسية والإحصائيات', icon: BarChart3 },
  { path: '/orders', label: 'الطلبات والشحنات', icon: Truck },
  { path: '/inventory/raw-materials', label: 'المواد الخام والزيوت (g)', icon: FlaskConical },
  { path: '/formulas', label: 'تركيبات العطور (Formulas)', icon: Layers },
  { path: '/batches', label: 'التشغيلات والإنتاج (Batches)', icon: Package },
  { path: '/products', label: 'المنتجات والمخزون التام', icon: Package },
  { path: '/purchases', label: 'مشتريات المواد الخام', icon: Receipt },
  { path: '/expenses', label: 'المصروفات التشغيلية', icon: DollarSign },
  { path: '/finance/cash-accounts', label: 'الخزائن وحسابات الدفع', icon: Wallet },
  { path: '/finance', label: 'الإدارة المالية و P&L', icon: DollarSign },
  { path: '/reports', label: 'تقارير الأرباح والتشغيل', icon: FileSpreadsheet },
  { path: '/inventory/movements', label: 'سجل حركات المخزون', icon: History },
  { path: '/users', label: 'سجل العملاء والنشاط', icon: Users },
  { path: '/coupons', label: 'الكوبونات والخصومات', icon: Tag },
  { path: '/cms', label: 'محتوى وبانرات المتجر', icon: Image },
];


export default function DashboardLayout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="h-screen w-screen bg-[#F8FAFC] text-slate-800 flex flex-col md:flex-row rtl font-['Tajawal',sans-serif] overflow-hidden">
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-60 h-full bg-[#03204E] text-white shrink-0 border-l border-white/10 z-20 select-none">
        
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-white/10 bg-[#02183b] shrink-0">
          <Link to="/" className="flex items-center gap-2">
            <span className="font-serif text-xl tracking-[0.2em] text-white">
              ÉLAN
            </span>
          </Link>
          <span className="text-[10px] uppercase bg-white/10 text-white font-medium px-2 py-0.5 rounded-sm border border-white/20">
            Admin
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-sm text-xs font-medium transition-colors duration-150 ${
                  isActive
                    ? 'bg-white/15 text-white'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={16} strokeWidth={1.5} className="text-white/80" />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronLeft size={14} className="text-white/70" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-white/10 bg-[#02183b] space-y-2 shrink-0">
          <a
            href="http://localhost:5173"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-sm text-xs font-medium bg-white/10 hover:bg-white/15 text-white transition-colors duration-150 border border-white/10"
          >
            <Store size={14} strokeWidth={1.5} />
            <span>معاينة متجر ÉLAN</span>
          </a>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-8 h-8 rounded-sm bg-white/10 text-white font-bold text-xs flex items-center justify-center shrink-0 border border-white/15">
                {user?.name ? user.name[0].toUpperCase() : 'A'}
              </div>
              <div className="truncate">
                <p className="text-xs font-medium text-white truncate">{user?.name || 'مدير النظام'}</p>
                <p className="text-[10px] text-slate-400 font-mono truncate">{user?.phone || '01000000001'}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="تسجيل الخروج"
              className="p-1.5 rounded-sm text-slate-400 hover:text-red-300 transition-colors duration-150"
            >
              <LogOut size={16} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Topbar */}
      <header className="md:hidden sticky top-0 z-40 bg-[#03204E] text-white px-4 h-14 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 rounded-sm text-white hover:bg-white/10"
            aria-label="Open menu"
          >
            <Menu size={18} strokeWidth={1.5} />
          </button>
          <Link to="/" className="flex items-center">
            <span className="font-serif text-lg tracking-[0.2em] text-white">
              ÉLAN
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="http://localhost:5173"
            target="_blank"
            rel="noreferrer"
            className="p-1.5 rounded-sm text-white/80 hover:text-white"
            title="المتجر"
          >
            <Store size={16} strokeWidth={1.5} />
          </a>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-sm text-white/80 hover:text-red-300"
            title="تسجيل الخروج"
          >
            <LogOut size={16} strokeWidth={1.5} />
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex rtl">
          <div 
            className="fixed inset-0 bg-black/40 transition-opacity duration-150"
            onClick={() => setMobileMenuOpen(false)} 
          />

          <div className="relative w-4/5 max-w-xs bg-[#03204E] text-white h-full flex flex-col z-10 border-l border-white/10">
            <div className="h-14 flex items-center justify-between px-4 border-b border-white/10 bg-[#02183b]">
              <span className="font-serif text-lg tracking-[0.2em] text-white">
                ÉLAN
              </span>
              <button 
                onClick={() => setMobileMenuOpen(false)} 
                className="p-1.5 rounded-sm text-slate-400 hover:text-white"
              >
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>

            <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-sm text-xs font-medium transition-colors duration-150 ${
                      isActive
                        ? 'bg-white/15 text-white'
                        : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon size={16} strokeWidth={1.5} className="text-white/80" />
                      <span>{item.label}</span>
                    </div>
                    {isActive && <ChevronLeft size={14} />}
                  </Link>
                );
              })}
            </nav>

            <div className="p-3 border-t border-white/10 bg-[#02183b] space-y-2">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-sm bg-white/10 text-white font-medium text-xs"
              >
                <LogOut size={14} strokeWidth={1.5} />
                <span>تسجيل الخروج</span>
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
            <span className="text-xs text-slate-600">متصل بالخادم</span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">مرحباً،</span>
            <span className="font-semibold text-[#03204E]">{user?.name || 'المدير'}</span>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-[1200px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
