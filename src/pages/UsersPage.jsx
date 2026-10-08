import React, { useState, useEffect } from 'react';
import { getUsers, createUser, updateUser, deleteUser } from '../services/api';
import { showSuccess, showError, showConfirm, showToast } from '../utils/swal';

import { 
  Users, 
  Search, 
  RefreshCw, 
  Copy, 
  Check, 
  MessageSquare, 
  UserPlus, 
  Trash2, 
  Edit3, 
  X, 
  Shield, 
  ShieldCheck, 
  KeyRound,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [selectedUser, setSelectedUser] = useState(null);

  // Form Fields
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    role: 'customer',
    isEmailVerified: true
  });

  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const fetchUsersList = async () => {
    setLoading(true);
    try {
      const usersData = await getUsers();
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersList();
  }, []);

  const handleCopyPhone = (phone, idx) => {
    navigator.clipboard.writeText(phone);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setSelectedUser(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      password: '',
      role: 'admin',
      isEmailVerified: true
    });
    setFormError('');
    setFormSuccess('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user) => {
    setModalMode('edit');
    setSelectedUser(user);
    setFormData({
      name: user.name || '',
      phone: user.phone || '',
      email: user.email || '',
      password: '',
      role: user.role || 'customer',
      isEmailVerified: Boolean(user.isEmailVerified)
    });
    setFormError('');
    setFormSuccess('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setFormSubmitting(true);

    try {
      if (modalMode === 'create') {
        await createUser({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim() || undefined,
          password: formData.password || undefined,
          role: formData.role,
          isEmailVerified: formData.isEmailVerified
        });
        setFormSuccess('تم إنشاء الحساب بنجاح.');
      } else {
        await updateUser(selectedUser._id, {
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim() || undefined,
          password: formData.password || undefined,
          role: formData.role,
          isEmailVerified: formData.isEmailVerified
        });
        setFormSuccess('تم تحديث بيانات الحساب بنجاح.');
      }

      await fetchUsersList();
      setTimeout(() => {
        setIsModalOpen(false);
      }, 800);
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'حدث خطأ أثناء حفظ الحساب.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteUser = async (id, name) => {
    const confirmed = await showConfirm('تأكيد حذف الحساب', `هل أنت متأكد من رغبتك في حذف حساب "${name}" نهائياً؟`, 'نعم، احذف', 'إلغاء');
    if (!confirmed) return;

    try {
      await deleteUser(id);
      showToast('تم حذف الحساب بنجاح');
      await fetchUsersList();
    } catch (err) {
      showError('فشل الحذف', err.response?.data?.message || 'فشل حذف الحساب.');
    }
  };

  const filteredUsers = users.filter(u => {
    const term = search.toLowerCase();
    const name = (u.name || '').toLowerCase();
    const phone = (u.phone || '').toLowerCase();
    const email = (u.email || '').toLowerCase();

    const matchesSearch = name.includes(term) || phone.includes(term) || email.includes(term);
    
    if (filterType === 'admins') return matchesSearch && (u.role === 'admin' || u.role === 'superadmin');
    if (filterType === 'customers') return matchesSearch && u.role === 'customer';
    if (filterType === 'purchased') return matchesSearch && (u.totalOrders || 0) > 0;
    if (filterType === 'founding') return matchesSearch && u.isFirst100;
    return matchesSearch;
  });

  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === 'admin' || u.role === 'superadmin').length,
    customers: users.filter(u => u.role === 'customer' || !u.role).length,
    purchased: users.filter(u => (u.totalOrders || 0) > 0).length,
    founding: users.filter(u => u.isFirst100).length,
  };

  return (
    <div className="space-y-6 text-right font-['Tajawal',sans-serif]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-[#03204E] flex items-center gap-2">
            <Users size={18} strokeWidth={1.5} className="text-[#03204E]" />
            <span>إدارة الحسابات والمستخدمين</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            إدارة حسابات المدراء (Super Admin & Admin) وسجلات العملاء وقوائم التواصل.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleOpenCreateModal}
            className="px-3.5 py-2 rounded-sm bg-[#03204E] hover:bg-[#02183b] text-white transition-colors duration-150 text-xs font-medium flex items-center justify-center gap-2"
          >
            <UserPlus size={14} strokeWidth={1.5} />
            <span>إضافة حساب جديد</span>
          </button>

          <button
            onClick={fetchUsersList}
            className="px-3.5 py-2 rounded-sm border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors duration-150 text-xs font-medium flex items-center justify-center gap-2"
            title="تحديث القائمة"
          >
            <RefreshCw size={14} strokeWidth={1.5} className={loading ? 'animate-spin' : ''} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {/* Filter cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setFilterType('all')}
          className={`p-3.5 rounded-sm border text-right transition-colors duration-150 ${
            filterType === 'all'
              ? 'bg-[#03204E] text-white border-[#03204E]'
              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
          }`}
        >
          <span className="text-xs block">جميع الحسابات</span>
          <b className="text-lg mt-1 block">{stats.total}</b>
        </button>

        <button
          onClick={() => setFilterType('admins')}
          className={`p-3.5 rounded-sm border text-right transition-colors duration-150 ${
            filterType === 'admins'
              ? 'bg-[#03204E] text-white border-[#03204E]'
              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
          }`}
        >
          <span className="text-xs block">المدراء والمسؤولين</span>
          <b className="text-lg mt-1 block">{stats.admins}</b>
        </button>

        <button
          onClick={() => setFilterType('customers')}
          className={`p-3.5 rounded-sm border text-right transition-colors duration-150 ${
            filterType === 'customers'
              ? 'bg-[#03204E] text-white border-[#03204E]'
              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
          }`}
        >
          <span className="text-xs block">العملاء</span>
          <b className="text-lg mt-1 block">{stats.customers}</b>
        </button>

        <button
          onClick={() => setFilterType('purchased')}
          className={`p-3.5 rounded-sm border text-right transition-colors duration-150 ${
            filterType === 'purchased'
              ? 'bg-[#03204E] text-white border-[#03204E]'
              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
          }`}
        >
          <span className="text-xs block">قاموا بالشراء</span>
          <b className="text-lg mt-1 block">{stats.purchased}</b>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-sm p-3.5 border border-slate-200">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="بحث بالاسم، الهاتف، أو البريد الإلكتروني..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#F8FAFC] border border-slate-200 focus:border-[#03204E] rounded-sm px-3.5 py-2 pr-9 text-xs outline-none transition-colors"
          />
          <Search size={14} className="text-slate-400 absolute right-3 top-2.5" />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-500 bg-white border border-slate-200 rounded-sm">
          جاري تحميل بيانات الحسابات...
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white rounded-sm p-10 text-center border border-slate-200 text-xs text-slate-500">
          لا توجد نتائج مطابقة لخيارات البحث.
        </div>
      ) : (
        <div className="bg-white rounded-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#F8FAFC] text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">اسم الحساب</th>
                  <th className="py-3 px-4">الصلاحية / الدور</th>
                  <th className="py-3 px-4">رقم الهاتف</th>
                  <th className="py-3 px-4">البريد الإلكتروني</th>
                  <th className="py-3 px-4">الطلبات</th>
                  <th className="py-3 px-4">تاريخ التسجيل</th>
                  <th className="py-3 px-4 text-left">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
                {filteredUsers.map((u, idx) => {
                  const hasOrders = (u.totalOrders || 0) > 0;
                  const cleanPhone = (u.phone || '').replace(/[^0-9]/g, '');

                  return (
                    <tr key={u._id || idx} className="hover:bg-slate-50 transition-colors duration-150">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-semibold text-slate-900">{u.name || 'مستخدم'}</p>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {u.userId || '-'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {u.role === 'superadmin' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-[#03204E] text-white text-[11px] font-medium">
                            <ShieldCheck size={12} />
                            <span>سوبر أدمن</span>
                          </span>
                        ) : u.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-slate-800 text-white text-[11px] font-medium">
                            <Shield size={12} />
                            <span>مسؤول (أدمن)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-slate-100 text-slate-700 text-[11px]">
                            <span>عميل</span>
                            {u.isFirst100 && <span className="text-amber-700 font-bold mr-1">• عضو تأسيس</span>}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-mono">
                          <span>{u.phone}</span>
                          <button
                            onClick={() => handleCopyPhone(u.phone, idx)}
                            className="p-1 text-slate-400 hover:text-slate-700"
                            title="نسخ الرقم"
                          >
                            {copiedIndex === idx ? <Check size={12} className="text-[#15803d]" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-600">
                        {u.email ? (
                          <div className="flex items-center gap-1">
                            <span>{u.email}</span>
                            {u.isEmailVerified && <CheckCircle2 size={12} className="text-emerald-600" title="مؤكد" />}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {hasOrders ? (
                          <span className="text-[11px] font-medium text-[#15803d]">
                            {u.totalOrders} طلب (EGP {u.totalSpent || 0})
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            لا توجد طلبات
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-500 font-mono">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('ar-EG') : '-'}
                      </td>

                      <td className="py-3 px-4 text-left">
                        <div className="flex items-center justify-end gap-1.5">
                          {cleanPhone && (
                            <a
                              href={`https://wa.me/2${cleanPhone}?text=${encodeURIComponent(`مرحباً ${u.name || ''}، معك إدارة ÉLAN.`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-sm border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors duration-150"
                              title="مراسلة واتساب"
                            >
                              <MessageSquare size={13} />
                            </a>
                          )}

                          <button
                            onClick={() => handleOpenEditModal(u)}
                            className="p-1.5 rounded-sm border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors duration-150"
                            title="تعديل الحساب والصلاحية"
                          >
                            <Edit3 size={13} />
                          </button>

                          <button
                            onClick={() => handleDeleteUser(u._id, u.name)}
                            className="p-1.5 rounded-sm border border-slate-200 hover:bg-rose-50 hover:text-rose-700 text-slate-400 transition-colors duration-150"
                            title="حذف الحساب"
                          >
                            <Trash2 size={13} />
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

      {/* CREATE / EDIT USER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-sm border border-slate-200 shadow-lg w-full max-w-md overflow-hidden text-right">
            
            {/* Modal Header */}
            <div className="bg-[#03204E] text-white p-4 flex items-center justify-between">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <UserPlus size={16} />
                <span>{modalMode === 'create' ? 'إنشاء حساب جديد بواسطة السوبر أدمن' : 'تعديل بيانات الحساب والصلاحية'}</span>
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/70 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleFormSubmit} className="p-5 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-sm flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
              {formSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-sm flex items-center gap-2">
                  <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {/* Name */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">
                  الاسم الكامل *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: أحمد محمد"
                  className="w-full bg-[#F8FAFC] border border-slate-300 focus:border-[#03204E] rounded-sm p-2.5 outline-none transition-colors"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">
                  رقم الهاتف *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="01xxxxxxxxx"
                  className="w-full bg-[#F8FAFC] border border-slate-300 focus:border-[#03204E] rounded-sm p-2.5 outline-none transition-colors font-mono"
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">
                  البريد الإلكتروني (اختياري)
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="admin@elan.com"
                  className="w-full bg-[#F8FAFC] border border-slate-300 focus:border-[#03204E] rounded-sm p-2.5 outline-none transition-colors font-mono"
                />
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">
                  {modalMode === 'create' ? 'كلمة المرور *' : 'تغيير كلمة المرور (اتركها فارغة للإبقاء على الحالية)'}
                </label>
                <input
                  type="password"
                  required={modalMode === 'create'}
                  minLength={4}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full bg-[#F8FAFC] border border-slate-300 focus:border-[#03204E] rounded-sm p-2.5 outline-none transition-colors font-mono"
                />
              </div>

              {/* Role Select */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">
                  نوع الحساب والصلاحية *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full bg-[#F8FAFC] border border-slate-300 focus:border-[#03204E] rounded-sm p-2.5 outline-none transition-colors"
                >
                  <option value="superadmin">سوبر أدمن (صلاحيات إدارية كاملة)</option>
                  <option value="admin">مسؤول / أدمن (إدارة المنتجات والطلبات)</option>
                  <option value="customer">عميل عادي</option>
                </select>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-sm transition-colors duration-150"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 bg-[#03204E] hover:bg-[#02183b] text-white rounded-sm transition-colors duration-150 font-medium flex items-center gap-1.5"
                >
                  {formSubmitting ? 'جاري الحفظ...' : modalMode === 'create' ? 'إنشاء الحساب' : 'حفظ التعديلات'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
