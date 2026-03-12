import { useNavigate, useParams } from "react-router";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Calculator, Sparkles, MapPin, Share2, CreditCard, ChevronRight, Check, Globe } from "lucide-react";
import { useLanguage } from "../LanguageContext";

export function BlogPost() {
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
  const { t, language } = useLanguage();

  const handleStart = () => {
    navigate(`/${lang}/step-calculator`);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Hero Section */}
      <div className="relative h-[500px] w-full overflow-hidden">
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1920&q=80"
          alt="Travel Planning"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-slate-50 flex flex-col items-center justify-center text-center px-6">
          <div className="bg-blue-600/90 backdrop-blur-sm text-white text-[10px] font-bold px-3 py-1 rounded-full mb-4 tracking-widest uppercase animate-bounce">
            {t('hero.badge')}
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 drop-shadow-lg leading-tight whitespace-pre-line">
            {t('hero.title')}
          </h1>
          <p className="text-white/90 text-sm md:text-lg mb-8 max-w-md font-medium whitespace-pre-line">
            {t('hero.subtitle')}
          </p>
          <button 
            onClick={handleStart}
            className="group bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-blue-600/30 transition-all active:scale-95 flex items-center gap-2"
          >
            {t('hero.button')}
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 -mt-12 relative z-10 pb-24">
        {/* Step Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
          {[
            { 
              icon: MapPin, 
              title: t('step1.title'), 
              desc: t('step1.desc'),
              color: "text-red-500",
              bg: "bg-red-50"
            },
            { 
              icon: CreditCard, 
              title: t('step2.title'), 
              desc: t('step2.desc'),
              color: "text-blue-500",
              bg: "bg-blue-50"
            },
            { 
              icon: Share2, 
              title: t('step3.title'), 
              desc: t('step3.desc'),
              color: "text-yellow-500",
              bg: "bg-yellow-50"
            },
          ].map((step, i) => (
            <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center group hover:shadow-md transition-shadow">
              <div className={`w-12 h-12 ${step.bg} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <step.icon className={`w-6 h-6 ${step.color}`} />
              </div>
              <h3 className="font-bold text-slate-900 mb-1">{step.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>

        {/* Info Section 1 */}
        <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-sm border border-slate-100 mb-8 overflow-hidden relative">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4 text-blue-600">
              <Sparkles className="w-5 h-5 fill-current" />
              <span className="text-sm font-bold uppercase tracking-wider">{t('why.badge')}</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-6 leading-tight whitespace-pre-line">
              {t('why.title')}
            </h2>
            <div className="space-y-6 text-slate-600 mb-8">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1">
                  <Check className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">{t('why.point1.title')}</p>
                  <p className="text-sm">{t('why.point1.desc')}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1">
                  <Check className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">{t('why.point2.title')}</p>
                  <p className="text-sm">{t('why.point2.desc')}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1">
                  <Check className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">{t('why.point3.title')}</p>
                  <p className="text-sm">{t('why.point3.desc')}</p>
                </div>
              </div>
            </div>
          </div>
          {/* Subtle Background Decor */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
        </div>

        {/* Stats / Proof Section */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-slate-900 rounded-[32px] p-8 text-center">
            <p className="text-blue-400 text-3xl font-black mb-1">100+</p>
            <p className="text-slate-400 text-xs font-medium">{t('stats.items')}</p>
          </div>
          <div className="bg-blue-600 rounded-[32px] p-8 text-center">
            <p className="text-white text-3xl font-black mb-1">FREE</p>
            <p className="text-blue-100 text-xs font-medium">{t('stats.free')}</p>
          </div>
        </div>

        {/* Final CTA Card */}
        <div 
          onClick={handleStart}
          className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[40px] p-10 text-center cursor-pointer transform transition-all hover:scale-[1.01] active:scale-[0.99] shadow-2xl shadow-blue-600/20 group"
        >
          <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Calculator className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-white mb-4">
            {t('cta.title')}
          </h2>
          <p className="text-blue-100 mb-8 max-w-sm mx-auto whitespace-pre-line">
            {t('cta.desc')}
          </p>
          <div className="inline-flex items-center gap-2 bg-white text-blue-600 px-10 py-4 rounded-2xl font-black text-lg group-hover:bg-blue-50 transition-colors">
            {t('cta.button')}
            <ChevronRight className="w-5 h-5" />
          </div>
        </div>

        {/* Footer info */}
        <p className="mt-12 text-center text-[11px] text-slate-400 leading-relaxed whitespace-pre-line">
          {t('footer.disclaimer')}
        </p>
      </div>
    </div>
  );
}

