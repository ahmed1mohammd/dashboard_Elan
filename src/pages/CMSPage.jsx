import React, { useState, useEffect } from 'react';
import { 
  Save, 
  Check, 
  Upload, 
  Trash2, 
  Sliders, 
  Sparkles, 
  PhoneCall, 
  BellRing, 
  Truck, 
  RotateCcw, 
  ShieldCheck, 
  MapPin, 
  Layers, 
  DollarSign 
} from 'lucide-react';
import { uploadImageToCloudinary, getAdminSettings, updateSettings } from '../services/api';
import { EGYPT_GOVERNORATES, TIER_DESCRIPTIONS } from '../data/egyptGovernorates';
import { useLanguage } from '../context/LanguageContext';
import { showSuccess, showWarning, showError, showToast } from '../utils/swal';

export default function CMSPage() {
  const { lang, isRTL, formatCurrency } = useLanguage();
  const [activeTab, setActiveTab] = useState('shipping'); // 'shipping' | 'banners' | 'contact'
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Slides
  const [slides, setSlides] = useState([
    { id: 1, image: '/img/offers.png', alt: 'M20 Special Offers', link: '/offers', active: true },
    { id: 2, image: '/img/hero.png', alt: 'M20 New Arrivals', link: '/shop', active: true },
    { id: 3, image: '/img/About.png', alt: 'M20 Fine Fragrances', link: '/about', active: true },
    { id: 4, image: '/img/Story.png', alt: 'M20 Story', link: '/shop', active: true },
  ]);

  // Announcement
  const [announcement, setAnnouncement] = useState({
    text: 'شحن مجاني للطلبات المؤهلة | عينات مجانية مع كل طلب',
    active: true
  });

  // Contact
  const [contact, setContact] = useState({
    whatsapp: '201132687324',
    instagram: 'https://instagram.com/m20.perfumes',
    facebook: 'https://facebook.com/m20.perfumes.eg',
    tiktok: 'https://tiktok.com/@m20.perfumes',
    phone: '01132687324'
  });

  // Shipping Rates (27 Governorates - Origin: Giza - Strict Whole Integers)
  const [shippingRates, setShippingRates] = useState(() => {
    const initial = {};
    EGYPT_GOVERNORATES.forEach((gov) => {
      initial[gov.nameEn] = gov.defaultRate;
    });
    return initial;
  });

  const [metroPickupFee, setMetroPickupFee] = useState(0);

  // Load saved settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const data = await getAdminSettings();
        if (data) {
          if (data.heroSlides && data.heroSlides.length > 0) {
            setSlides(data.heroSlides);
          }
          if (data.announcement) {
            setAnnouncement({
              text: data.announcement.text || 'شحن مجاني للطلبات المؤهلة | عينات مجانية مع كل طلب',
              active: data.announcement.active !== false
            });
          }
          if (data.socialMedia || data.whatsappNumber || data.supportPhone) {
            setContact({
              whatsapp: data.socialMedia?.whatsapp || data.whatsappNumber || '201132687324',
              phone: data.socialMedia?.phone || data.supportPhone || '01132687324',
              instagram: data.socialMedia?.instagram || 'https://instagram.com/m20.perfumes',
              facebook: data.socialMedia?.facebook || 'https://facebook.com/m20.perfumes.eg',
              tiktok: data.socialMedia?.tiktok || 'https://tiktok.com/@m20.perfumes'
            });
          }
          if (data.shipping) {
            if (data.shipping.metroPickupCustomerFee !== undefined) {
              setMetroPickupFee(Math.round(Number(data.shipping.metroPickupCustomerFee)));
            }
            if (data.shipping.governorateRates) {
              const loadedRates = {};
              const raw = data.shipping.governorateRates;
              EGYPT_GOVERNORATES.forEach((gov) => {
                let rate = gov.defaultRate;
                if (raw instanceof Map) {
                  if (raw.has(gov.nameEn)) rate = Math.round(Number(raw.get(gov.nameEn)));
                  else if (raw.has(gov.nameAr)) rate = Math.round(Number(raw.get(gov.nameAr)));
                } else if (typeof raw === 'object') {
                  if (raw[gov.nameEn] !== undefined) rate = Math.round(Number(raw[gov.nameEn]));
                  else if (raw[gov.nameAr] !== undefined) rate = Math.round(Number(raw[gov.nameAr]));
                }
                loadedRates[gov.nameEn] = rate;
              });
              setShippingRates(loadedRates);
            }
          }
        }
      } catch (err) {
        console.warn('Could not load settings from server, using defaults:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleRateChange = (govEn, val) => {
    const intVal = val === '' ? 0 : Math.max(0, Math.round(Number(val)));
    setShippingRates((prev) => ({
      ...prev,
      [govEn]: intVal
    }));
  };

  const handleResetToTierDefaults = () => {
    const defaults = {};
    EGYPT_GOVERNORATES.forEach((gov) => {
      defaults[gov.nameEn] = gov.defaultRate;
    });
    setShippingRates(defaults);
    setMetroPickupFee(0);
    showToast(
      lang === 'ar'
        ? 'تمت استعادة أسعار الشحن الأصلية للمحافظات الـ 27 بنجاح'
        : 'Restored origin (Giza) 27 governorate default tier rates'
    );
  };

  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const res = await uploadImageToCloudinary(file, 'm20/banners');
      const imageUrl = res?.secure_url || res?.url;
      const publicId = res?.public_id || res?.publicId || '';
      if (!imageUrl) {
        throw new Error('لم يتم استلام رابط الصورة من Cloudinary.');
      }

      const newSlide = {
        id: Date.now(),
        image: imageUrl,
        publicId,
        alt: file.name ? `M20 Banner - ${file.name}` : 'M20 Banner',
        link: '/offers',
        active: true
      };
      setSlides(prev => [...prev, newSlide]);
      showToast(lang === 'ar' ? 'تم رفع البانر بنجاح' : 'Banner uploaded successfully');
    } catch (err) {
      console.error('CMS banner upload failed:', err);
      showError(
        lang === 'ar' ? 'فشل رفع الصورة' : 'Image Upload Failed',
        err.response?.data?.message || err.message || (lang === 'ar' ? 'تعذر رفع البانر.' : 'Could not upload banner.')
      );
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeSlide = (id) => {
    if (slides.length <= 1) {
      showWarning(
        lang === 'ar' ? 'تنبيه' : 'Warning',
        lang === 'ar' ? 'يجب الإبقاء على بانر واحد على الأقل في السلايدر الرئيسي.' : 'Keep at least one active banner slide.'
      );
      return;
    }
    setSlides(prev => prev.filter(s => s.id !== id));
  };

  const toggleSlide = (id) => {
    setSlides(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s));
  };

  const updateSlideLink = (id, link) => {
    setSlides(prev => prev.map(s => s.id === id ? { ...s, link } : s));
  };

  const handleSave = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setSaving(true);

    try {
      // Map both English and Arabic keys with whole integer rates
      const ratesPayload = {};
      EGYPT_GOVERNORATES.forEach((gov) => {
        const rate = Math.round(Number(shippingRates[gov.nameEn] ?? gov.defaultRate));
        ratesPayload[gov.nameEn] = rate;
        ratesPayload[gov.nameAr] = rate;
        ratesPayload[gov.id] = rate;
      });
      ratesPayload['بور سعيد'] = Math.round(Number(shippingRates['Port Said'] ?? 80));

      const payload = {
        announcement,
        socialMedia: contact,
        heroSlides: slides,
        whatsappNumber: contact.whatsapp,
        supportPhone: contact.phone,
        shipping: {
          governorateRates: ratesPayload,
          realCostMap: ratesPayload,
          metroPickupCustomerFee: Math.round(Number(metroPickupFee || 0)),
          defaultCustomerRate: 75
        }
      };

      await updateSettings(payload);

      setSuccess(true);
      showSuccess(
        lang === 'ar' ? 'تم الحفظ بنجاح' : 'Settings Saved',
        lang === 'ar' ? 'تم تحديث أسعار الشحن وإعدادات المتجر وحفظها بقاعدة البيانات.' : 'Governorate shipping rates & store settings successfully updated.'
      );
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Settings save error:', err);
      showError(
        lang === 'ar' ? 'خطأ في الحفظ' : 'Save Error',
        err.response?.data?.message || (lang === 'ar' ? 'تعذر حفظ الإعدادات بقاعدة البيانات.' : 'Failed to save settings.')
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`space-y-6 ${isRTL ? "font-['Cairo',sans-serif] text-right" : "font-sans text-left"} pb-8`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-[#174F43] flex items-center gap-2">
            <Sliders size={20} strokeWidth={1.5} className="text-[#174F43]" />
            <span>{lang === 'ar' ? 'إعدادات المتجر والشحن' : 'Storefront & Shipping Settings'}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {lang === 'ar'
              ? 'تكوين أسعار شحن المحافظات الـ 27 (انطلاق من الجيزة - أرقام صحيحة)، السلايدر الرئيسي، وبيانات التواصل.'
              : 'Configure 27 governorate shipping rates (origin: Giza - whole EGP integers only), banners, and contact channels.'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-sm bg-[#174F43] hover:bg-[#0F3830] text-white text-xs font-semibold flex items-center gap-2 transition-all duration-150 h-9 self-start sm:self-auto disabled:opacity-50 shadow-sm cursor-pointer"
        >
          {success ? (
            <>
              <Check size={15} className="text-emerald-400" />
              <span>{lang === 'ar' ? 'تم الحفظ' : 'Saved'}</span>
            </>
          ) : (
            <>
              <Save size={15} />
              <span>{saving ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (lang === 'ar' ? 'حفظ التعديلات' : 'Save Settings')}</span>
            </>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('shipping')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'shipping'
              ? 'border-[#174F43] text-[#174F43]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Truck size={14} />
          <span>{lang === 'ar' ? 'أسعار شحن المحافظات (27 محافظة)' : 'Governorate Shipping Rates (27)'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('banners')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'banners'
              ? 'border-[#174F43] text-[#174F43]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles size={14} />
          <span>{lang === 'ar' ? 'السلايدر وشريط الإعلانات' : 'Banners & Announcements'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('contact')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'contact'
              ? 'border-[#174F43] text-[#174F43]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <PhoneCall size={14} />
          <span>{lang === 'ar' ? 'بيانات التواصل وروابط المتجر' : 'Contact & Social'}</span>
        </button>
      </div>

      {/* TAB 1: SHIPPING RATES CONFIGURATION */}
      {activeTab === 'shipping' && (
        <div className="space-y-6">
          {/* Top Info Banner & Reset Action */}
          <div className="bg-white rounded-sm border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-sm bg-[#174F43]/10 text-[#174F43] flex items-center justify-center shrink-0 mt-0.5">
                <MapPin size={18} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">
                  {lang === 'ar' ? 'نقطة الانطلاق: الجيزة (Giza Origin)' : 'Shipping Origin: Giza, Egypt'}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {lang === 'ar'
                    ? 'الأسعار محددة وفقاً لـ 6 مستويات جغرافية وبأرقام صحيحة فقط (بدون كسور عشرية). تستخدم في حساب رسوم العميل والتكلفة المسجلة لشركات الشحن.'
                    : 'Rates configured across 6 geographical tiers using strict whole EGP integers (no decimals). Used for checkout charging and carrier logistics recording.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleResetToTierDefaults}
              className="px-3 py-1.5 rounded-sm border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 self-start sm:self-auto"
            >
              <RotateCcw size={13} />
              <span>{lang === 'ar' ? 'استعادة أسعار المستويات الأصلية' : 'Reset to Giza Tier Defaults'}</span>
            </button>
          </div>

          {/* Metro Pickup Fee Setting */}
          <div className="bg-white rounded-sm border border-slate-200 p-4 shadow-xs flex items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-slate-800">
                {lang === 'ar' ? 'رسوم الاستلام من محطات المترو' : 'Metro Station Pickup Fee'}
              </h4>
              <p className="text-[11px] text-slate-500">
                {lang === 'ar' ? 'القيمة التي يتحملها العميل عند اختيار الاستلام من محطة مترو (افتراضي 0 ج.م)' : 'Customer charge when selecting Metro station pickup (default: 0 EGP)'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                step="1"
                value={metroPickupFee}
                onChange={(e) => setMetroPickupFee(Math.max(0, Math.round(Number(e.target.value))))}
                className="w-24 h-8 px-2 border border-slate-200 rounded-sm text-xs font-mono font-bold text-center outline-none focus:border-[#174F43]"
              />
              <span className="text-xs text-slate-500 font-semibold">{lang === 'ar' ? 'ج.م' : 'EGP'}</span>
            </div>
          </div>

          {/* 6 Tiers Grid */}
          {[1, 2, 3, 4, 5, 6].map((tierNum) => {
            const tierInfo = TIER_DESCRIPTIONS[tierNum];
            const govsInTier = EGYPT_GOVERNORATES.filter((g) => g.tier === tierNum);

            return (
              <div key={tierNum} className="bg-white rounded-sm border border-slate-200 overflow-hidden shadow-xs">
                {/* Tier Header */}
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-[#174F43] text-white">
                      Tier {tierNum}
                    </span>
                    <h3 className="text-xs font-bold text-slate-800">
                      {lang === 'ar' ? tierInfo.nameAr : tierInfo.nameEn}
                    </h3>
                  </div>

                  <span className="text-[11px] text-slate-500 font-mono font-semibold">
                    {lang === 'ar' ? `السعر الافتراضي: ${tierInfo.defaultRate} ج.م` : `Default: ${tierInfo.defaultRate} EGP`}
                  </span>
                </div>

                {/* Governorates Table */}
                <div className="divide-y divide-slate-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
                    {govsInTier.map((gov) => {
                      const currentVal = shippingRates[gov.nameEn] ?? gov.defaultRate;

                      return (
                        <div
                          key={gov.id}
                          className="flex items-center justify-between p-2.5 bg-[#F8FAFC] border border-slate-200/80 rounded-sm hover:border-slate-300 transition-colors"
                        >
                          <div>
                            <span className="text-xs font-bold text-slate-800 block">
                              {lang === 'ar' ? gov.nameAr : gov.nameEn}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {lang === 'ar' ? `المستوى ${gov.tier}` : `Tier ${gov.tier}`}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={currentVal}
                              onChange={(e) => handleRateChange(gov.nameEn, e.target.value)}
                              className="w-16 h-7 px-1.5 border border-slate-200 rounded-sm text-xs font-mono font-bold text-center bg-white outline-none focus:border-[#174F43]"
                            />
                            <span className="text-[11px] text-slate-500 font-medium">
                              {lang === 'ar' ? 'ج.م' : 'EGP'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: BANNERS & ANNOUNCEMENT */}
      {activeTab === 'banners' && (
        <div className="space-y-6">
          {/* Main Slider Section */}
          <div className="bg-white rounded-sm border border-slate-200 p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-sm font-semibold text-[#174F43] flex items-center gap-1.5">
                  <Sparkles size={16} className="text-[#174F43]" />
                  <span>{lang === 'ar' ? 'صور السلايدر الرئيسي (Hero Carousel)' : 'Hero Carousel Banners'}</span>
                </h2>
                <p className="text-xs text-slate-500">
                  {lang === 'ar' ? 'الصور المعروضة في أعلى الصفحة الرئيسية للمتجر.' : 'Active promotional slides displayed on the storefront home header.'}
                </p>
              </div>

              <label className="px-3 py-1.5 rounded-sm border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors">
                <Upload size={14} />
                <span>{uploading ? (lang === 'ar' ? 'جاري الرفع...' : 'Uploading...') : (lang === 'ar' ? 'إضافة صورة جديدة' : 'Add Image')}</span>
                <input type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {slides.map((slide) => (
                <div key={slide.id} className="border border-slate-200 rounded-sm overflow-hidden bg-[#F8FAFC] flex flex-col justify-between">
                  <div>
                    <div className="aspect-[16/9] bg-slate-200 relative">
                      <img src={slide.image} alt={slide.alt} className="w-full h-full object-cover" />
                      <span className="absolute top-2 right-2 text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded-sm font-medium">
                        {slide.active ? (lang === 'ar' ? 'نشط' : 'Active') : (lang === 'ar' ? 'معطل' : 'Inactive')}
                      </span>
                    </div>

                    <div className="p-3 space-y-2 text-xs">
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-0.5">{lang === 'ar' ? 'الرابط عند النقر' : 'Target Link'}</label>
                        <input
                          type="text"
                          value={slide.link || ''}
                          onChange={(e) => updateSlideLink(slide.id, e.target.value)}
                          placeholder="/offers"
                          className="w-full h-7 border border-slate-200 rounded-sm px-2 text-xs bg-white outline-none focus:border-[#174F43]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-2 border-t border-slate-200 bg-white flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => toggleSlide(slide.id)}
                      className={`text-[11px] font-medium ${slide.active ? 'text-amber-800' : 'text-emerald-800'}`}
                    >
                      {slide.active ? (lang === 'ar' ? 'تعطيل' : 'Deactivate') : (lang === 'ar' ? 'تفعيل' : 'Activate')}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSlide(slide.id)}
                      className="text-slate-400 hover:text-red-700"
                      title={lang === 'ar' ? 'حذف' : 'Delete'}
                    >
                      <Trash2 size={13} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Announcement Bar */}
          <div className="bg-white rounded-sm border border-slate-200 p-5 space-y-4 shadow-xs">
            <div className="pb-3 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-[#174F43] flex items-center gap-1.5">
                  <BellRing size={16} className="text-[#174F43]" />
                  <span>{lang === 'ar' ? 'شريط الإعلانات العلوي (Announcement Bar)' : 'Announcement Bar'}</span>
                </h2>
                <p className="text-xs text-slate-500">
                  {lang === 'ar' ? 'النص الترويجي المعروض في الشريط العلوي لكل صفحات المتجر.' : 'Top announcement banner text shown across all storefront pages.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="announcementActive"
                  checked={announcement.active}
                  onChange={(e) => setAnnouncement({ ...announcement, active: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-[#174F43] focus:ring-[#174F43]"
                />
                <label htmlFor="announcementActive" className="text-xs font-medium text-slate-700 cursor-pointer">
                  {announcement.active ? (lang === 'ar' ? 'مفعل' : 'Active') : (lang === 'ar' ? 'معطل' : 'Disabled')}
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {lang === 'ar' ? 'نص الإعلان' : 'Announcement Text'}
              </label>
              <input
                type="text"
                value={announcement.text}
                onChange={(e) => setAnnouncement({ ...announcement, text: e.target.value })}
                className="w-full h-9 border border-slate-200 rounded-sm px-3 text-xs bg-white outline-none focus:border-[#174F43]"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CONTACT & SOCIAL */}
      {activeTab === 'contact' && (
        <div className="bg-white rounded-sm border border-slate-200 p-5 space-y-4 shadow-xs">
          <div className="pb-3 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-[#174F43] flex items-center gap-1.5">
              <PhoneCall size={16} className="text-[#174F43]" />
              <span>{lang === 'ar' ? 'بيانات التواصل وحسابات السوشيال ميديا' : 'Contact Channels & Social Media'}</span>
            </h2>
            <p className="text-xs text-slate-500">
              {lang === 'ar' ? 'أرقام الواتساب والدعم الفني وروابط الحسابات الرسمية.' : 'Customer care numbers, official WhatsApp link, and social channels.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">{lang === 'ar' ? 'رقم الواتساب الرسمي (بدون +)' : 'WhatsApp Number (without +)'}</label>
              <input
                type="text"
                value={contact.whatsapp}
                onChange={(e) => setContact({ ...contact, whatsapp: e.target.value })}
                className="w-full h-9 border border-slate-200 rounded-sm px-3 text-xs font-mono outline-none focus:border-[#174F43]"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">{lang === 'ar' ? 'رقم هاتف الدعم الفني المباشر' : 'Customer Support Phone'}</label>
              <input
                type="text"
                value={contact.phone}
                onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                className="w-full h-9 border border-slate-200 rounded-sm px-3 text-xs font-mono outline-none focus:border-[#174F43]"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Instagram</label>
              <input
                type="text"
                value={contact.instagram}
                onChange={(e) => setContact({ ...contact, instagram: e.target.value })}
                className="w-full h-9 border border-slate-200 rounded-sm px-3 text-xs font-mono outline-none focus:border-[#174F43]"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">TikTok</label>
              <input
                type="text"
                value={contact.tiktok}
                onChange={(e) => setContact({ ...contact, tiktok: e.target.value })}
                className="w-full h-9 border border-slate-200 rounded-sm px-3 text-xs font-mono outline-none focus:border-[#174F43]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-medium text-slate-700 mb-1">Facebook</label>
              <input
                type="text"
                value={contact.facebook}
                onChange={(e) => setContact({ ...contact, facebook: e.target.value })}
                className="w-full h-9 border border-slate-200 rounded-sm px-3 text-xs font-mono outline-none focus:border-[#174F43]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
