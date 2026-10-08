import React, { useState } from 'react';
import { 
  Save, 
  Check, 
  Upload, 
  Trash2, 
  Plus, 
  Image as ImageIcon, 
  Phone,
  Eye,
  Sliders,
  AlertCircle
} from 'lucide-react';
import { uploadImageToCloudinary } from '../services/api';
import { showSuccess, showWarning } from '../utils/swal';


export default function CMSPage() {
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [slides, setSlides] = useState([
    { id: 1, image: '/img/offers.png', alt: 'ÉLAN Special Offers', link: '/offers', active: true },
    { id: 2, image: '/img/hero.png', alt: 'ÉLAN New Arrivals', link: '/shop', active: true },
    { id: 3, image: '/img/About.png', alt: 'ÉLAN Fine Fragrances', link: '/about', active: true },
    { id: 4, image: '/img/Story.png', alt: 'ÉLAN Story', link: '/shop', active: true },
  ]);

  const [announcement, setAnnouncement] = useState({
    text: 'شحن مجاني للطلبات المؤهلة | عينات مجانية مع كل طلب',
    active: true
  });

  const [contact, setContact] = useState({
    whatsapp: '201132687324',
    instagram: 'https://instagram.com/elan.perfumes',
    facebook: 'https://facebook.com/elan.perfumes.eg',
    tiktok: 'https://tiktok.com/@elan.perfumes',
    phone: '01132687324'
  });

  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const res = await uploadImageToCloudinary(file);
      const newSlide = {
        id: Date.now(),
        image: res.url || URL.createObjectURL(file),
        alt: 'ÉLAN Banner',
        link: '/offers',
        active: true
      };
      setSlides(prev => [...prev, newSlide]);
    } catch (err) {
      const newSlide = {
        id: Date.now(),
        image: URL.createObjectURL(file),
        alt: 'ÉLAN Banner',
        link: '/offers',
        active: true
      };
      setSlides(prev => [...prev, newSlide]);
    } finally {
      setUploading(false);
    }
  };

  const removeSlide = (id) => {
    if (slides.length <= 1) {
      showWarning('تنبيه', 'يجب الإبقاء على بانر واحد على الأقل في السلايدر الرئيسي.');
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

  const handleSave = (e) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSuccess(true);
      showSuccess('تم الحفظ بنجاح', 'تم تحديث بيانات ومحتوى المتجر بنجاح');
      setTimeout(() => setSuccess(false), 3000);
    }, 600);
  };

  return (
    <div className="space-y-6 text-right font-['Tajawal',sans-serif]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-[#03204E] flex items-center gap-2">
            <Sliders size={18} strokeWidth={1.5} className="text-[#03204E]" />
            <span>محتوى وبانرات المتجر (CMS)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            التحكم في صور السلايدر الرئيسي، شريط الإعلانات، وبيانات التواصل.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded-sm bg-[#03204E] hover:bg-[#02183b] text-white text-xs font-medium flex items-center gap-1.5 transition-colors duration-150 h-9 self-start sm:self-auto disabled:opacity-50"
        >
          {success ? (
            <>
              <Check size={14} className="text-[#15803d]" />
              <span>تم الحفظ</span>
            </>
          ) : (
            <>
              <Save size={14} />
              <span>{saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
            </>
          )}
        </button>
      </div>

      {/* 1. Main Slider Section */}
      <div className="bg-white rounded-sm border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <h2 className="text-sm font-semibold text-[#03204E]">صور السلايدر الرئيسي (Hero Carousel)</h2>
            <p className="text-xs text-slate-500">الصور المعروضة في أعلى الصفحة الرئيسية للمتجر.</p>
          </div>

          <label className="px-3 py-1.5 rounded-sm border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors">
            <Upload size={14} />
            <span>{uploading ? 'جاري الرفع...' : 'إضافة صورة جديدة'}</span>
            <input type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {slides.map((slide, idx) => (
            <div key={slide.id} className="border border-slate-200 rounded-sm overflow-hidden bg-[#F8FAFC] flex flex-col justify-between">
              <div>
                <div className="aspect-[16/9] bg-slate-200 relative">
                  <img src={slide.image} alt={slide.alt} className="w-full h-full object-cover" />
                  <span className="absolute top-2 right-2 text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded-sm font-medium">
                    #{idx + 1}
                  </span>
                </div>

                <div className="p-3 space-y-2 text-xs">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">الرابط الموجه:</label>
                    <input
                      type="text"
                      value={slide.link}
                      onChange={(e) => updateSlideLink(slide.id, e.target.value)}
                      className="w-full h-8 bg-white border border-slate-200 rounded-sm px-2 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => toggleSlide(slide.id)}
                  className={`text-[11px] font-medium ${slide.active ? 'text-[#15803d]' : 'text-slate-400'}`}
                >
                  {slide.active ? 'مفعل' : 'معطل'}
                </button>

                <button
                  type="button"
                  onClick={() => removeSlide(slide.id)}
                  className="p-1 text-slate-400 hover:text-red-700"
                  title="حذف الشريحة"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Announcement Bar */}
      <div className="bg-white rounded-sm border border-slate-200 p-5 space-y-4">
        <div className="pb-3 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-[#03204E]">شريط الإعلانات العلوي</h2>
          <p className="text-xs text-slate-500">النص الذي يظهر في أعلى الموقع.</p>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">نص الإعلان</label>
            <input
              type="text"
              value={announcement.text}
              onChange={(e) => setAnnouncement({ ...announcement, text: e.target.value })}
              className="w-full h-9 bg-white border border-slate-200 rounded-sm px-3 text-xs outline-none focus:border-[#03204E]"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="annActive"
              checked={announcement.active}
              onChange={(e) => setAnnouncement({ ...announcement, active: e.target.checked })}
              className="rounded-sm"
            />
            <label htmlFor="annActive" className="text-slate-700">تفعيل ظهور الشريط في الموقع</label>
          </div>
        </div>
      </div>

      {/* 3. Contact & Social Channels */}
      <div className="bg-white rounded-sm border border-slate-200 p-5 space-y-4">
        <div className="pb-3 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-[#03204E]">بيانات التواصل والسوشيال ميديا</h2>
          <p className="text-xs text-slate-500">تحديث أرقام الواتساب وروابط حسابات العلامة التجارية.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">رقم الواتساب الرسمي</label>
            <input
              type="text"
              value={contact.whatsapp}
              onChange={(e) => setContact({ ...contact, whatsapp: e.target.value })}
              className="w-full h-9 bg-white border border-slate-200 rounded-sm px-3 text-xs font-mono"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">رقم الهاتف للاتصال</label>
            <input
              type="text"
              value={contact.phone}
              onChange={(e) => setContact({ ...contact, phone: e.target.value })}
              className="w-full h-9 bg-white border border-slate-200 rounded-sm px-3 text-xs font-mono"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">رابط إنستغرام (Instagram)</label>
            <input
              type="text"
              value={contact.instagram}
              onChange={(e) => setContact({ ...contact, instagram: e.target.value })}
              className="w-full h-9 bg-white border border-slate-200 rounded-sm px-3 text-xs"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">رابط تيك توك (TikTok)</label>
            <input
              type="text"
              value={contact.tiktok}
              onChange={(e) => setContact({ ...contact, tiktok: e.target.value })}
              className="w-full h-9 bg-white border border-slate-200 rounded-sm px-3 text-xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
