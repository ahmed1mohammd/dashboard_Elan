import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Package, 
  Edit3, 
  Trash2, 
  Upload, 
  X, 
  AlertCircle, 
  Loader2,
  RefreshCw,
  Image as ImageIcon,
  Sparkles,
  Layers,
  Box,
  CheckCircle2,
  Tag,
  ArrowUpDown,
  ExternalLink
} from 'lucide-react';
import { 
  getProducts, 
  createProduct, 
  updateProduct, 
  deleteProduct, 
  uploadImageToCloudinary 
} from '../services/api';
import { showSuccess, showError, showConfirm, showToast } from '../utils/swal';

const FIXED_SIZES = ['30ml', '50ml', '100ml'];

const initialProductState = {
  name: '',
  shortDescription: '',
  description: '',
  gender: 'MEN',
  notes: {
    top: [],
    heart: [],
    base: []
  },
  variants: [
    { size: '30ml', price: 850, compareAtPrice: 1100, oldPrice: 1100 },
    { size: '50ml', price: 1450, compareAtPrice: 1800, oldPrice: 1800 },
    { size: '100ml', price: 2200, compareAtPrice: 2800, oldPrice: 2800 }
  ],
  mainImage: { url: '', publicId: '', alt: '' },
  hoverImage: { url: '', publicId: '', alt: '' },
  pyramidImage: { url: '', publicId: '', alt: '' },
  packagingImage: { url: '', publicId: '', alt: '' },
  featured: false,
  active: true
};

export default function ProductsPage() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterGender, setFilterGender] = useState('ALL');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(initialProductState);
  const [submitting, setSubmitting] = useState(false);
  
  // Notes helpers
  const [topNotesStr, setTopNotesStr] = useState('');
  const [heartNotesStr, setHeartNotesStr] = useState('');
  const [baseNotesStr, setBaseNotesStr] = useState('');

  // Image Uploading State map for 4 roles
  const [uploadingRole, setUploadingRole] = useState(null);

  const fetchProductsList = async () => {
    setLoading(true);
    try {
      const data = await getProducts();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductsList();
    if (searchParams.get('action') === 'new') {
      handleOpenNew();
    }
  }, []);

  const handleOpenNew = () => {
    setEditingId(null);
    setFormData(initialProductState);
    setTopNotesStr('البرغموت, الفلفل الوردي, الزعفران');
    setHeartNotesStr('الورد الجوري, الياسمين, القهوة');
    setBaseNotesStr('العود الملكي, العنبر الداكن, الفانيليا, المسك');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (product) => {
    setEditingId(product._id);
    
    // Map variants ensuring 30ml, 50ml, 100ml
    const vMap = {};
    (product.variants || []).forEach(v => {
      if (v && v.size) vMap[v.size.toLowerCase()] = v;
    });

    const normalizedVariants = FIXED_SIZES.map(s => {
      const ext = vMap[s.toLowerCase()] || {};
      const curPrice = ext.price || ext.sellingPrice || 0;
      const oldPr = ext.compareAtPrice !== undefined ? ext.compareAtPrice : (ext.oldPrice !== undefined ? ext.oldPrice : '');
      return {
        size: s,
        price: curPrice,
        compareAtPrice: oldPr,
        oldPrice: oldPr
      };
    });

    // Extract images by explicit role
    const getRoleImg = (roleName) => {
      if (product[roleName] && product[roleName].url) {
        return { url: product[roleName].url, publicId: product[roleName].publicId || '', alt: product[roleName].alt || '' };
      }
      const foundInArr = (product.images || []).find(i => i.role === roleName || (roleName === 'mainImage' && i.role === 'main') || (roleName === 'hoverImage' && i.role === 'hover') || (roleName === 'pyramidImage' && i.role === 'pyramid') || (roleName === 'packagingImage' && i.role === 'packaging'));
      if (foundInArr) {
        return { url: foundInArr.url, publicId: foundInArr.publicId || '', alt: foundInArr.alt || '' };
      }
      return { url: '', publicId: '', alt: '' };
    };

    setFormData({
      name: product.name || '',
      shortDescription: product.shortDescription || '',
      description: product.description || '',
      gender: (product.gender || 'MEN').toUpperCase() === 'WOMEN' ? 'WOMEN' : 'MEN',
      notes: product.notes || { top: [], heart: [], base: [] },
      variants: normalizedVariants,
      mainImage: getRoleImg('mainImage'),
      hoverImage: getRoleImg('hoverImage'),
      pyramidImage: getRoleImg('pyramidImage'),
      packagingImage: getRoleImg('packagingImage'),
      featured: !!product.featured,
      active: product.active !== undefined ? product.active : true
    });

    setTopNotesStr((product.notes?.top || []).join(', '));
    setHeartNotesStr((product.notes?.heart || []).join(', '));
    setBaseNotesStr((product.notes?.base || []).join(', '));
    setIsModalOpen(true);
  };

  const handleSingleImageUpload = async (e, roleKey) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingRole(roleKey);
    try {
      const res = await uploadImageToCloudinary(file);
      const url = res.secure_url || res.url;
      const publicId = res.public_id || res.publicId || '';
      
      setFormData(prev => ({
        ...prev,
        [roleKey]: {
          url,
          publicId,
          alt: `${prev.name || 'عطر'} - ${roleKey}`
        }
      }));
      showToast('تم رفع الصورة بنجاح');
    } catch (err) {
      console.error('Image upload failed:', err);
      // Fallback to local object URL for preview
      const localUrl = URL.createObjectURL(file);
      setFormData(prev => ({
        ...prev,
        [roleKey]: {
          url: localUrl,
          publicId: '',
          alt: file.name
        }
      }));
      showToast('تم اختيار الصورة');
    } finally {
      setUploadingRole(null);
    }
  };

  const handleImageUrlChange = (roleKey, urlVal) => {
    setFormData(prev => ({
      ...prev,
      [roleKey]: {
        ...prev[roleKey],
        url: urlVal.trim()
      }
    }));
  };

  const handleRemoveImage = (roleKey) => {
    setFormData(prev => ({
      ...prev,
      [roleKey]: { url: '', publicId: '', alt: '' }
    }));
  };

  const handleVariantPriceChange = (sizeName, field, value) => {
    setFormData(prev => {
      const updated = prev.variants.map(v => {
        if (v.size === sizeName) {
          const numVal = value === '' ? '' : Math.max(0, Number(value));
          if (field === 'price') {
            return { ...v, price: numVal };
          }
          if (field === 'compareAtPrice' || field === 'oldPrice') {
            return { ...v, compareAtPrice: numVal, oldPrice: numVal };
          }
        }
        return v;
      });
      return { ...prev, variants: updated };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showError('بيانات ناقصة', 'يرجى إدخال اسم العطر');
      return;
    }

    if (!formData.mainImage?.url) {
      showError('صورة ناقصة', 'يرجى تحديد الصورة الرئيسية للمنتج (Main Image)');
      return;
    }

    setSubmitting(true);

    const payload = {
      name: formData.name.trim(),
      shortDescription: formData.shortDescription.trim(),
      description: formData.description.trim() || formData.shortDescription.trim(),
      gender: formData.gender,
      notes: {
        top: topNotesStr.split(',').map(s => s.trim()).filter(Boolean),
        heart: heartNotesStr.split(',').map(s => s.trim()).filter(Boolean),
        base: baseNotesStr.split(',').map(s => s.trim()).filter(Boolean)
      },
      variants: formData.variants.map(v => ({
        size: v.size,
        price: Number(v.price) || 0,
        compareAtPrice: v.compareAtPrice && Number(v.compareAtPrice) > 0 ? Number(v.compareAtPrice) : null,
        oldPrice: v.compareAtPrice && Number(v.compareAtPrice) > 0 ? Number(v.compareAtPrice) : null,
        stock: 999
      })),
      mainImage: formData.mainImage,
      hoverImage: formData.hoverImage,
      pyramidImage: formData.pyramidImage,
      packagingImage: formData.packagingImage,
      featured: formData.featured,
      active: formData.active
    };

    try {
      if (editingId) {
        await updateProduct(editingId, payload);
        showSuccess('تم التحديث بنجاح', 'تم تحديث بيانات العطر والأسعار والصور بنجاح');
      } else {
        await createProduct(payload);
        showSuccess('تمت الإضافة بنجاح', 'تم تسجيل العطر الفاخر الجديد بنجاح');
      }

      setIsModalOpen(false);
      fetchProductsList();
    } catch (err) {
      showError('خطأ أثناء الحفظ', err.response?.data?.message || 'تعذر حفظ العطر');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (product) => {
    const confirmed = await showConfirm(
      'تأكيد الحذف',
      `هل أنت متأكد من حذف عطر "${product.name}" نهائياً من المتجر؟`,
      'نعم، احذف',
      'إلغاء'
    );
    if (!confirmed) return;

    try {
      await deleteProduct(product._id);
      showToast('تم حذف العطر بنجاح');
      fetchProductsList();
    } catch (err) {
      showError('تعذر الحذف', err.response?.data?.message || 'تعذر حذف العطر');
    }
  };

  const filteredProducts = products.filter(p => {
    const matchSearch = (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
                        (p.shortDescription || '').toLowerCase().includes(search.toLowerCase());
    const g = (p.gender || 'MEN').toUpperCase();
    const matchGender = filterGender === 'ALL' || g === filterGender;
    return matchSearch && matchGender;
  });

  return (
    <div className="space-y-6 text-right font-['Tajawal',sans-serif]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#03204E] to-[#083375] text-white flex items-center justify-center shadow-md shadow-[#03204E]/10">
              <Package size={20} strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-[#03204E] tracking-tight">
                كتالوج العطور والمنتجات التامة (Products)
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                إدارة العطور الفاخرة، الأحجام الثابتة (30ml / 50ml / 100ml)، الأسعار المشطوبة، والصور الـ 4 المخصصة.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleOpenNew}
            className="px-4 py-2.5 rounded-xl bg-[#03204E] hover:bg-[#02183b] text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-sm hover:shadow active:scale-95"
          >
            <Plus size={16} />
            <span>إضافة عطر جديد</span>
          </button>

          <button
            onClick={fetchProductsList}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-xs"
            title="تحديث"
          >
            <RefreshCw size={14} strokeWidth={1.7} className={loading ? 'animate-spin text-[#03204E]' : ''} />
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search size={15} className="absolute right-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو الوصف..."
            className="w-full h-9 pr-9 pl-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#03204E]"
          />
        </div>

        {/* Gender Filter Toggle */}
        <div className="flex items-center gap-1.5 self-stretch sm:self-auto bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setFilterGender('ALL')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              filterGender === 'ALL' ? 'bg-white text-[#03204E] shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            الكل ({products.length})
          </button>
          <button
            onClick={() => setFilterGender('MEN')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              filterGender === 'MEN' ? 'bg-[#03204E] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            رجالي (MEN)
          </button>
          <button
            onClick={() => setFilterGender('WOMEN')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              filterGender === 'WOMEN' ? 'bg-rose-700 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            نسائي (WOMEN)
          </button>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200/80">
            <div className="flex items-center justify-center gap-3">
              <div className="w-6 h-6 border-2 border-[#03204E] border-t-transparent rounded-full animate-spin"></div>
              <span className="font-semibold text-xs">جاري تحميل كتالوج العطور...</span>
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200/80 p-6">
            <Package size={36} className="mx-auto text-slate-300 mb-2" strokeWidth={1.5} />
            <p className="font-bold text-slate-700 text-sm">لا توجد عطور مطابقة للبحث</p>
            <p className="text-xs text-slate-400 mt-1">اضغط على "إضافة عطر جديد" لإضافة عطر بالصور والأسعار المحدثة.</p>
          </div>
        ) : (
          filteredProducts.map((product) => {
            const isMen = (product.gender || 'MEN').toUpperCase() === 'MEN';
            const mainImg = product.mainImage?.url || product.images?.find(i => i.role === 'main')?.url || product.images?.[0]?.url || '/img/product.png';
            const hoverImg = product.hoverImage?.url || product.images?.find(i => i.role === 'hover')?.url || '/img/Story.png';
            const pyramidImg = product.pyramidImage?.url || product.images?.find(i => i.role === 'pyramid')?.url;
            const packagingImg = product.packagingImage?.url || product.images?.find(i => i.role === 'packaging')?.url;

            return (
              <div key={product._id} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group">
                <div>
                  {/* Top Image Box with Hover Transition */}
                  <div className="relative aspect-4/3 bg-[#F8FAFC] border-b border-slate-100 p-4 flex items-center justify-center overflow-hidden">
                    <img
                      src={mainImg}
                      alt={product.name}
                      className="w-full h-full object-contain transition-opacity duration-300 group-hover:opacity-0"
                      onError={(e) => { e.target.onerror = null; e.target.src = '/img/product.png'; }}
                    />
                    {hoverImg && (
                      <img
                        src={hoverImg}
                        alt={`${product.name} hover`}
                        className="absolute inset-0 w-full h-full object-contain p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      />
                    )}

                    {/* Gender Badge */}
                    <span className={`absolute top-3 right-3 px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider ${
                      isMen ? 'bg-[#03204E] text-white' : 'bg-rose-600 text-white'
                    }`}>
                      {isMen ? 'MEN • رجالي' : 'WOMEN • نسائي'}
                    </span>

                    {/* Image Roles Indicator Dots */}
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded-full text-[9px] text-white">
                      <span>4 صور</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Main Image" />
                      {hoverImg && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" title="Hover Image" />}
                      {pyramidImg && <div className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Pyramid Image" />}
                      {packagingImg && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" title="Packaging Image" />}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-extrabold text-sm text-[#03204E] line-clamp-1">{product.name}</h3>
                      <p className="text-xs text-slate-500 font-light mt-0.5 line-clamp-2 leading-relaxed">
                        {product.shortDescription || product.description || 'عطر فاخر مصنوع بتركيز استثنائي.'}
                      </p>
                    </div>

                    {/* Olfactory Notes Preview */}
                    {product.notes && (product.notes.top?.length > 0 || product.notes.heart?.length > 0 || product.notes.base?.length > 0) && (
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-[11px]">
                        {product.notes.top?.length > 0 && (
                          <div className="flex items-center gap-1 text-slate-600 truncate">
                            <span className="font-bold text-[#03204E] shrink-0">القمة:</span>
                            <span className="truncate">{product.notes.top.join(', ')}</span>
                          </div>
                        )}
                        {product.notes.heart?.length > 0 && (
                          <div className="flex items-center gap-1 text-slate-600 truncate">
                            <span className="font-bold text-[#03204E] shrink-0">القلب:</span>
                            <span className="truncate">{product.notes.heart.join(', ')}</span>
                          </div>
                        )}
                        {product.notes.base?.length > 0 && (
                          <div className="flex items-center gap-1 text-slate-600 truncate">
                            <span className="font-bold text-[#03204E] shrink-0">القاعدة:</span>
                            <span className="truncate">{product.notes.base.join(', ')}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Sizes & Prices Matrix */}
                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      {FIXED_SIZES.map(sz => {
                        const variant = (product.variants || []).find(v => v.size?.toLowerCase() === sz.toLowerCase()) || {};
                        const price = variant.price || 0;
                        const oldPrice = variant.compareAtPrice || variant.oldPrice;

                        return (
                          <div key={sz} className="p-2 bg-white rounded-xl border border-slate-200/90 text-center">
                            <span className="font-extrabold text-[11px] text-[#03204E] block">{sz}</span>
                            {oldPrice && oldPrice > price && (
                              <span className="text-[10px] text-slate-400 line-through block -mt-0.5">
                                {oldPrice} ج.م
                              </span>
                            )}
                            <span className="text-xs font-black text-slate-900 font-mono block">
                              {price} ج.م
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500">
                    {product.active !== false ? '🟢 معروض بالمتجر' : '⚪ مخفي'}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(product)}
                      className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1 transition-colors shadow-2xs"
                    >
                      <Edit3 size={13} className="text-[#03204E]" />
                      <span>تعديل العطر</span>
                    </button>

                    <button
                      onClick={() => handleDelete(product)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="حذف"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Product Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 rtl bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-3xl bg-white rounded-3xl border border-slate-200 shadow-2xl z-10 max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200/80 bg-[#F8FAFC] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#03204E]/10 text-[#03204E] flex items-center justify-center">
                  <Package size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#03204E]">
                    {editingId ? `تعديل العطر: ${formData.name}` : 'إضافة عطر فاخر جديد'}
                  </h2>
                  <p className="text-[11px] text-slate-400">إدارة تفاصيل العطر، النوتات، الأحجام الثابتة، والصور الـ 4</p>
                </div>
              </div>

              <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6 text-xs overflow-y-auto flex-1">
              {/* Section 1: Basic Info */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  {/* Product Name */}
                  <div className="sm:col-span-8">
                    <label className="block font-bold text-slate-700 mb-1">اسم العطر الفاخر (Product Name) *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="مثال: ÉLAN Signature Noir"
                      className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3.5 text-xs font-bold outline-none focus:border-[#03204E]"
                    />
                  </div>

                  {/* Gender Selector (MEN / WOMEN) */}
                  <div className="sm:col-span-4">
                    <label className="block font-bold text-slate-700 mb-1">القسم / الجنس (Gender) *</label>
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl h-10">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, gender: 'MEN' })}
                        className={`h-full text-xs font-bold rounded-lg transition-all flex items-center justify-center ${
                          formData.gender === 'MEN' ? 'bg-[#03204E] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        MEN (رجالي)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, gender: 'WOMEN' })}
                        className={`h-full text-xs font-bold rounded-lg transition-all flex items-center justify-center ${
                          formData.gender === 'WOMEN' ? 'bg-rose-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        WOMEN (نسائي)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Short Description */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">الوصف المختصر (Short Description)</label>
                  <textarea
                    rows="2"
                    value={formData.shortDescription}
                    onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                    placeholder="وصف تسويقي جذاب يظهر على كروت المنتجات وتفاصيل العطر..."
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs outline-none focus:border-[#03204E]"
                  />
                </div>
              </div>

              {/* Section 2: Fragrance Notes */}
              <div className="p-4 bg-[#F8FAFC] border border-slate-200 rounded-2xl space-y-3">
                <span className="font-extrabold text-[#03204E] text-xs flex items-center gap-1.5">
                  <Sparkles size={15} />
                  <span>الهرم العطري والنوتات (Fragrance Notes)</span>
                </span>
                <p className="text-[11px] text-slate-400 font-medium">اكتب النوتات مفصولة بفواصل (مثال: البرغموت, الفلفل الوردي)</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">1. مقدمة العطر (Top Notes)</label>
                    <input
                      type="text"
                      value={topNotesStr}
                      onChange={(e) => setTopNotesStr(e.target.value)}
                      placeholder="البرغموت, الفلفل الوردي"
                      className="w-full h-9 bg-white border border-slate-200 rounded-xl px-3 text-xs outline-none focus:border-[#03204E]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">2. قلب العطر (Heart Notes)</label>
                    <input
                      type="text"
                      value={heartNotesStr}
                      onChange={(e) => setHeartNotesStr(e.target.value)}
                      placeholder="الياسمين, الورد الجوري"
                      className="w-full h-9 bg-white border border-slate-200 rounded-xl px-3 text-xs outline-none focus:border-[#03204E]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">3. قاعدة العطر (Base Notes)</label>
                    <input
                      type="text"
                      value={baseNotesStr}
                      onChange={(e) => setBaseNotesStr(e.target.value)}
                      placeholder="العود, العنبر, المسك"
                      className="w-full h-9 bg-white border border-slate-200 rounded-xl px-3 text-xs outline-none focus:border-[#03204E]"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Sizes & Pricing (Fixed 30ml, 50ml, 100ml) */}
              <div className="p-4 bg-white border border-slate-200/90 rounded-2xl space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="font-extrabold text-[#03204E] text-xs flex items-center gap-1.5">
                    <Tag size={15} />
                    <span>الأسعار والأحجام الثابتة (30ml / 50ml / 100ml)</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">كوبونات الخصم تُطبق دائماً على سعر البيع الفعلي</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {FIXED_SIZES.map(sz => {
                    const variant = formData.variants.find(v => v.size === sz) || { price: 0, compareAtPrice: '' };
                    return (
                      <div key={sz} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-xs text-[#03204E]">{sz}</span>
                          <span className="text-[10px] bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-600 font-mono font-bold">
                            ثابت
                          </span>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">سعر البيع الفعلي (ج.م) *</label>
                          <input
                            type="number"
                            required
                            min="0"
                            value={variant.price}
                            onChange={(e) => handleVariantPriceChange(sz, 'price', e.target.value)}
                            placeholder="400"
                            className="w-full h-9 bg-white border border-slate-200 rounded-xl px-2.5 text-xs font-mono font-bold outline-none focus:border-[#03204E]"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-400 mb-1">السعر المشطوب / العرض (اختياري)</label>
                          <input
                            type="number"
                            min="0"
                            value={variant.compareAtPrice || ''}
                            onChange={(e) => handleVariantPriceChange(sz, 'compareAtPrice', e.target.value)}
                            placeholder="مثال: 500"
                            className="w-full h-9 bg-white border border-slate-200 rounded-xl px-2.5 text-xs font-mono text-slate-500 outline-none focus:border-[#03204E]"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 4: Exactly 4 Defined Image Inputs */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <span className="font-extrabold text-[#03204E] text-xs flex items-center gap-1.5">
                    <ImageIcon size={15} />
                    <span>صور العطر الأربعة المخصصة (4 Defined Product Images)</span>
                  </span>
                  <span className="text-[11px] text-slate-400">كل صورة مخصصة لموضع محدد بالمتجر</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Slot 1: Main Product Image */}
                  <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-[#03204E] flex items-center gap-1">
                        <span>1. الصورة الرئيسية (Main Image) *</span>
                      </span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md">
                        الافتراضية
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400">زجاجة العطر النقية في الكتالوج وكروت المنتجات</p>

                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center overflow-hidden shrink-0">
                        {formData.mainImage?.url ? (
                          <img src={formData.mainImage.url} alt="Main Preview" className="w-full h-full object-contain" />
                        ) : (
                          <ImageIcon size={20} className="text-slate-300" />
                        )}
                      </div>

                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <label className="flex-1 cursor-pointer">
                            <span className="w-full h-8 bg-white border border-slate-200 hover:bg-slate-100 text-[#03204E] rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs">
                              {uploadingRole === 'mainImage' ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                              <span>رفع صورة من الجهاز</span>
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleSingleImageUpload(e, 'mainImage')}
                            />
                          </label>

                          {formData.mainImage?.url && (
                            <button
                              type="button"
                              onClick={() => handleRemoveImage('mainImage')}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                              title="حذف"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>

                        <input
                          type="text"
                          value={formData.mainImage?.url || ''}
                          onChange={(e) => handleImageUrlChange('mainImage', e.target.value)}
                          placeholder="أو ضع رابط الصورة المباشر هنا..."
                          className="w-full h-7 bg-white border border-slate-200 rounded-lg px-2 text-[10px] font-mono outline-none focus:border-[#03204E]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Slot 2: Hover Image */}
                  <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-[#03204E]">
                        2. صورة التفاعل (Hover Image)
                      </span>
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-md">
                        عند المرور
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400">تظهر بسلاسة عند تمرير الماوس فوق كارت العطر</p>

                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center overflow-hidden shrink-0">
                        {formData.hoverImage?.url ? (
                          <img src={formData.hoverImage.url} alt="Hover Preview" className="w-full h-full object-contain" />
                        ) : (
                          <Sparkles size={20} className="text-slate-300" />
                        )}
                      </div>

                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <label className="flex-1 cursor-pointer">
                            <span className="w-full h-8 bg-white border border-slate-200 hover:bg-slate-100 text-[#03204E] rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs">
                              {uploadingRole === 'hoverImage' ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                              <span>رفع صورة من الجهاز</span>
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleSingleImageUpload(e, 'hoverImage')}
                            />
                          </label>

                          {formData.hoverImage?.url && (
                            <button
                              type="button"
                              onClick={() => handleRemoveImage('hoverImage')}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                              title="حذف"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>

                        <input
                          type="text"
                          value={formData.hoverImage?.url || ''}
                          onChange={(e) => handleImageUrlChange('hoverImage', e.target.value)}
                          placeholder="أو ضع رابط الصورة المباشر..."
                          className="w-full h-7 bg-white border border-slate-200 rounded-lg px-2 text-[10px] font-mono outline-none focus:border-[#03204E]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Slot 3: Fragrance Pyramid Image */}
                  <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-[#03204E]">
                        3. صورة الهرم العطري (Pyramid Image)
                      </span>
                      <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-md">
                        تفاصيل النوتات
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400">تظهر في معرض صور العطر لشرح المكونات</p>

                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center overflow-hidden shrink-0">
                        {formData.pyramidImage?.url ? (
                          <img src={formData.pyramidImage.url} alt="Pyramid Preview" className="w-full h-full object-contain" />
                        ) : (
                          <Layers size={20} className="text-slate-300" />
                        )}
                      </div>

                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <label className="flex-1 cursor-pointer">
                            <span className="w-full h-8 bg-white border border-slate-200 hover:bg-slate-100 text-[#03204E] rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs">
                              {uploadingRole === 'pyramidImage' ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                              <span>رفع صورة من الجهاز</span>
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleSingleImageUpload(e, 'pyramidImage')}
                            />
                          </label>

                          {formData.pyramidImage?.url && (
                            <button
                              type="button"
                              onClick={() => handleRemoveImage('pyramidImage')}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                              title="حذف"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>

                        <input
                          type="text"
                          value={formData.pyramidImage?.url || ''}
                          onChange={(e) => handleImageUrlChange('pyramidImage', e.target.value)}
                          placeholder="أو ضع رابط الصورة المباشر..."
                          className="w-full h-7 bg-white border border-slate-200 rounded-lg px-2 text-[10px] font-mono outline-none focus:border-[#03204E]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Slot 4: Packaging Image */}
                  <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-[#03204E]">
                        4. صورة التغليف الفاخر (Packaging Image)
                      </span>
                      <span className="text-[10px] bg-cyan-100 text-cyan-800 font-bold px-2 py-0.5 rounded-md">
                        الباكيدج
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400">تظهر في المعرض لعرض العلبة الفاخرة والكيس</p>

                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center overflow-hidden shrink-0">
                        {formData.packagingImage?.url ? (
                          <img src={formData.packagingImage.url} alt="Packaging Preview" className="w-full h-full object-contain" />
                        ) : (
                          <Box size={20} className="text-slate-300" />
                        )}
                      </div>

                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <label className="flex-1 cursor-pointer">
                            <span className="w-full h-8 bg-white border border-slate-200 hover:bg-slate-100 text-[#03204E] rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs">
                              {uploadingRole === 'packagingImage' ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                              <span>رفع صورة من الجهاز</span>
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleSingleImageUpload(e, 'packagingImage')}
                            />
                          </label>

                          {formData.packagingImage?.url && (
                            <button
                              type="button"
                              onClick={() => handleRemoveImage('packagingImage')}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                              title="حذف"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>

                        <input
                          type="text"
                          value={formData.packagingImage?.url || ''}
                          onChange={(e) => handleImageUrlChange('packagingImage', e.target.value)}
                          placeholder="أو ضع رابط الصورة المباشر..."
                          className="w-full h-7 bg-white border border-slate-200 rounded-lg px-2 text-[10px] font-mono outline-none focus:border-[#03204E]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 font-semibold h-10"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-[#03204E] text-white rounded-xl hover:bg-[#02183b] h-10 font-bold disabled:opacity-50 shadow-sm"
                >
                  {submitting ? 'جاري الحفظ...' : editingId ? 'تحديث العطر' : 'حفظ ونشر العطر'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
