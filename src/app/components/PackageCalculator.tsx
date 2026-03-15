import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { ArrowLeft, Check, Calendar, X, ChevronRight, Gift, Users, Sparkles, MapPin, ExternalLink } from "lucide-react";
import { supabase } from "../../supabase";
import { useLanguage } from "../LanguageContext";

interface City {
  id: string;
  name: string;
  emoji: string;
  is_active: boolean;
}

interface TravelItem {
  id: string;
  city: string;
  category: string;
  name: string;
  price: number;
  image: string;
  description: string;
  affiliate_link: string | null;
}

interface TravelPackage {
  id: string;
  city: string;
  name: string;
  description: string;
  theme_who: string[];
  theme_style: string[];
  is_active: boolean;
}

const THEME_WHO = [
  { id: 'family',    emoji: '👨‍👩‍👧‍👦', label: '가족 여행', sublabel: '어린이 포함' },
  { id: 'parents',   emoji: '👴👵', label: '부모님 효도', sublabel: '편안한 여행' },
  { id: 'couple',    emoji: '👫', label: '친구 / 연인', sublabel: '신나는 여행' },
  { id: 'honeymoon', emoji: '💍', label: '신혼여행',    sublabel: '로맨틱 여행' },
  { id: 'solo',      emoji: '🧑', label: '혼자 여행',   sublabel: '자유로운 여행' },
];

const THEME_STYLE = [
  { id: 'luxury', emoji: '✨', label: '럭셔리',  sublabel: '프리미엄 경험' },
  { id: 'normal', emoji: '⚖️', label: '보통',    sublabel: '합리적인 선택' },
  { id: 'budget', emoji: '💰', label: '가성비',  sublabel: '알뜰하게 즐기기' },
];

const CATEGORY_LABELS: Record<string, string> = {
  accommodation: '🏨 숙소',
  transport: '🚐 교통',
  tours: '🎯 투어',
  activities: '🎟 액티비티',
};
const CATEGORY_ORDER = ['accommodation', 'transport', 'tours', 'activities'];

function emojiToFlagUrl(emoji: string): string | null {
  try {
    const points = [...emoji].map(c => c.codePointAt(0) ?? 0);
    if (points.length === 2 && points[0] >= 0x1F1E6 && points[0] <= 0x1F1FF) {
      const a = String.fromCharCode(points[0] - 0x1F1E6 + 65);
      const b = String.fromCharCode(points[1] - 0x1F1E6 + 65);
      return `https://flagcdn.com/w40/${(a + b).toLowerCase()}.png`;
    }
  } catch {}
  return null;
}

function calcNights(start: string, end: string): number {
  if (!start || !end) return 0;
  return Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)));
}
function formatDate(s: string) {
  if (!s) return '';
  const d = new Date(s);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

type Step = 'city' | 'date' | 'who' | 'style' | 'result';

export function PackageCalculator() {
  const navigate = useNavigate();
  const { language } = useLanguage();

  const [step, setStep] = useState<Step>('city');
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedWho, setSelectedWho] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('');
  const [resultPackage, setResultPackage] = useState<TravelPackage | null>(null);
  const [packageItems, setPackageItems] = useState<TravelItem[]>([]);
  const [monthlyPriceMap, setMonthlyPriceMap] = useState<Record<string, Record<number, number>>>({});
  const [translationMap, setTranslationMap] = useState<Record<string, { name: string; description: string }>>({});
  const [loading, setLoading] = useState(false);
  const [noResult, setNoResult] = useState(false);

  const nights = calcNights(startDate, endDate);
  const hasDate = !!(startDate && endDate);
  const travelMonth = startDate ? new Date(startDate).getMonth() + 1 : null;

  useEffect(() => {
    supabase.from('cities').select('*').eq('is_active', true).order('created_at', { ascending: true })
      .then(({ data }) => setCities(data || []));
  }, []);

  const getEffectivePrice = (item: TravelItem) => {
    if (travelMonth && monthlyPriceMap[item.id]?.[travelMonth] !== undefined) {
      return monthlyPriceMap[item.id][travelMonth];
    }
    return item.price;
  };

  const getItemText = (item: TravelItem) => {
    const tr = translationMap[item.id];
    return { name: tr?.name || item.name, description: tr?.description || item.description };
  };

  const findPackage = async () => {
    if (!selectedCity || !selectedWho || !selectedStyle) return;
    setLoading(true);
    setNoResult(false);

    // 조건에 맞는 패키지 조회 (theme_who & theme_style 모두 포함)
    const { data: pkgData } = await supabase
      .from('packages')
      .select('*')
      .eq('city', selectedCity.id)
      .eq('is_active', true)
      .contains('theme_who', [selectedWho])
      .contains('theme_style', [selectedStyle])
      .limit(1)
      .single();

    if (!pkgData) {
      // 스타일만 맞는 것으로 fallback
      const { data: fallback } = await supabase
        .from('packages')
        .select('*')
        .eq('city', selectedCity.id)
        .eq('is_active', true)
        .contains('theme_style', [selectedStyle])
        .limit(1)
        .single();

      if (!fallback) { setNoResult(true); setLoading(false); setStep('result'); return; }
      setResultPackage(fallback);
      await loadPackageItems(fallback.id);
    } else {
      setResultPackage(pkgData);
      await loadPackageItems(pkgData.id);
    }

    setLoading(false);
    setStep('result');
  };

  const loadPackageItems = async (packageId: string) => {
    const { data: piData } = await supabase
      .from('package_items')
      .select('item_id, sort_order')
      .eq('package_id', packageId)
      .order('sort_order');
    const itemIds = (piData || []).map((r: any) => r.item_id);
    if (itemIds.length === 0) { setPackageItems([]); return; }

    const [itemsRes, monthlyRes, trRes] = await Promise.all([
      supabase.from('items').select('*').in('id', itemIds),
      supabase.from('item_monthly_prices').select('*').in('item_id', itemIds),
      language !== 'ko'
        ? supabase.from('item_translations').select('item_id, name, description').in('item_id', itemIds).eq('lang', language)
        : Promise.resolve({ data: [] }),
    ]);

    // sort_order 순서 유지
    const itemMap: Record<string, TravelItem> = {};
    (itemsRes.data || []).forEach((i: TravelItem) => { itemMap[i.id] = i; });
    const orderedItems = itemIds.map(id => itemMap[id]).filter(Boolean);
    setPackageItems(orderedItems);

    const priceMap: Record<string, Record<number, number>> = {};
    (monthlyRes.data || []).forEach((mp: any) => {
      if (!priceMap[mp.item_id]) priceMap[mp.item_id] = {};
      priceMap[mp.item_id][mp.month] = mp.price;
    });
    setMonthlyPriceMap(priceMap);

    const trMap: Record<string, { name: string; description: string }> = {};
    (trRes.data || []).forEach((tr: any) => { trMap[tr.item_id] = { name: tr.name, description: tr.description }; });
    setTranslationMap(trMap);
  };

  const handleGoToCustom = () => {
    // StepCalculator로 이동 (도시 유지)
    navigate(`/${language}/step-calculator`);
  };

  const handleAffiliateClick = async (item: TravelItem) => {
    await supabase.from('clicks').insert({
      item_id: item.id,
      session_id: sessionStorage.getItem('session_id') || crypto.randomUUID(),
    });
    await supabase.rpc('increment_click_count', { item_id: item.id });
    if (item.affiliate_link) window.open(item.affiliate_link, '_blank');
  };

  const handleShareKakao = () => {
    // KakaoPreview와 동일한 방식으로 localStorage에 저장 후 이동
    if (!resultPackage || packageItems.length === 0) return;
    const itemsWithQty = packageItems.map(item => ({
      ...item,
      name: getItemText(item).name,
      description: getItemText(item).description,
      price: getEffectivePrice(item),
      quantity: 1,
    }));
    const total = itemsWithQty.reduce((sum, i) => sum + i.price, 0);
    localStorage.setItem('selectedItems', JSON.stringify(itemsWithQty));
    localStorage.setItem('totalPrice', total.toString());
    localStorage.setItem('selectedCity', selectedCity?.id || '');
    localStorage.setItem('selectedCityName', selectedCity?.name || '');
    localStorage.setItem('travelStartDate', startDate);
    localStorage.setItem('travelEndDate', endDate);
    navigate(`/${language}/kakao-preview`);
  };

  // ── 공통 헤더 ──
  const Header = ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div className="bg-white sticky top-0 z-20 shadow-sm border-b border-gray-100">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
        <button onClick={() => step === 'city' ? navigate(`/${language}`) : setStep(
          step === 'date' ? 'city' : step === 'who' ? 'date' : step === 'style' ? 'who' : 'style'
        )} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-sm font-semibold">{title}</h1>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
      </div>
      {/* 진행 바 */}
      <div className="max-w-2xl mx-auto px-4 pb-3">
        <div className="flex items-center gap-1.5">
          {(['city','date','who','style','result'] as Step[]).map((s, i) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${
              ['city','date','who','style','result'].indexOf(step) >= i ? 'bg-blue-500' : 'bg-gray-200'
            }`} />
          ))}
        </div>
      </div>
    </div>
  );

  // ── STEP 1: 도시 선택 ──
  if (step === 'city') return (
    <div className="min-h-screen bg-white">
      <Header title="테마 패키지 추천" subtitle="맞춤 패키지를 찾아드려요" />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Gift className="w-7 h-7 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">어디로 떠나실 건가요?</h2>
          <p className="text-sm text-gray-500">몇 가지만 선택하면 딱 맞는 패키지를 추천해드려요</p>
        </div>
        <div className="space-y-3">
          {cities.map(city => {
            const flagUrl = emojiToFlagUrl(city.emoji);
            return (
              <button key={city.id} onClick={() => { setSelectedCity(city); setStep('date'); }}
                className="w-full flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-2xl hover:border-amber-400 hover:shadow-md transition-all text-left group">
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
                  {flagUrl ? <img src={flagUrl} alt="" className="w-10 h-10 object-cover" /> : <span className="text-2xl">{city.emoji}</span>}
                </div>
                <div className="flex-1">
                  <p className="text-base font-semibold text-gray-900">{city.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">테마 패키지 추천</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-amber-500 transition-colors" />
              </button>
            );
          })}
        </div>
        <div className="mt-8 p-4 bg-gray-50 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-700">직접 고르고 싶으신가요?</p>
            <p className="text-xs text-gray-400 mt-0.5">숙소, 투어를 하나씩 선택해요</p>
          </div>
          <button onClick={() => navigate(`/${language}/step-calculator`)}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-xs font-bold hover:border-blue-300 transition-all">
            직접 선택하기
          </button>
        </div>
      </div>
    </div>
  );

  // ── STEP 2: 날짜 선택 ──
  if (step === 'date') {
    const today = new Date().toISOString().split('T')[0];
    return (
      <div className="min-h-screen bg-white">
        <Header title={`${selectedCity?.name} 여행`} subtitle="언제 떠나시나요?" />
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-7 h-7 text-blue-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">여행 일정을 알려주세요</h2>
            <p className="text-sm text-gray-500">날짜에 맞는 가격으로 안내해드려요 <span className="text-gray-400">(선택사항)</span></p>
          </div>

          {hasDate ? (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-bold text-blue-900">{formatDate(startDate)} ~ {formatDate(endDate)}</p>
                <p className="text-xs text-blue-600 mt-0.5">총 {nights}박</p>
              </div>
              <button onClick={() => { setStartDate(''); setEndDate(''); }} className="p-1.5 hover:bg-blue-100 rounded-full">
                <X className="w-4 h-4 text-blue-400" />
              </button>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 mb-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">출발일</label>
                  <input type="date" min={today} value={startDate}
                    onChange={e => { setStartDate(e.target.value); if (endDate && e.target.value > endDate) setEndDate(''); }}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-400 focus:border-transparent" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">귀국일</label>
                  <input type="date" min={startDate || today} value={endDate}
                    onChange={e => setEndDate(e.target.value)} disabled={!startDate}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-400 focus:border-transparent disabled:opacity-40 disabled:cursor-not-allowed" />
                </div>
              </div>
              {startDate && endDate && (
                <div className="bg-blue-50 rounded-xl px-3 py-2 text-center">
                  <p className="text-xs text-blue-600 font-medium">{formatDate(startDate)} ~ {formatDate(endDate)} · <strong>{nights}박</strong></p>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button onClick={() => setStep('who')}
              className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.99]">
              {hasDate ? `${nights}박으로 계속하기` : '날짜 없이 계속하기'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── STEP 3: 누구와 ──
  if (step === 'who') return (
    <div className="min-h-screen bg-white pb-8">
      <Header title={`${selectedCity?.name} 여행`} subtitle="누구와 떠나시나요?" />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Users className="w-7 h-7 text-purple-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">누구와 떠나시나요?</h2>
          <p className="text-sm text-gray-500">동행에 맞는 최적의 패키지를 추천해드려요</p>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {THEME_WHO.map(w => (
            <button key={w.id} onClick={() => { setSelectedWho(w.id); setStep('style'); }}
              className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all hover:shadow-md ${
                selectedWho === w.id ? 'border-purple-500 bg-purple-50' : 'border-gray-200 bg-white hover:border-purple-300'
              }`}>
              <span className="text-3xl flex-shrink-0">{w.emoji}</span>
              <div>
                <p className="text-base font-bold text-gray-900">{w.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{w.sublabel}</p>
              </div>
              {selectedWho === w.id && <Check className="w-5 h-5 text-purple-500 ml-auto" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // ── STEP 4: 여행 스타일 ──
  if (step === 'style') return (
    <div className="min-h-screen bg-white pb-8">
      <Header title={`${selectedCity?.name} 여행`} subtitle="어떤 여행을 원하세요?" />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-7 h-7 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">어떤 스타일의 여행인가요?</h2>
          <p className="text-sm text-gray-500">예산과 스타일에 맞게 골라드려요</p>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {THEME_STYLE.map(s => (
            <button key={s.id} onClick={() => {
              setSelectedStyle(s.id);
              // 선택 즉시 검색 트리거
              setTimeout(() => {
                setSelectedStyle(s.id);
                findPackageWithStyle(s.id);
              }, 100);
            }}
              className={`flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition-all hover:shadow-md ${
                selectedStyle === s.id ? 'border-amber-500 bg-amber-50' : 'border-gray-200 bg-white hover:border-amber-300'
              }`}>
              <span className="text-4xl flex-shrink-0">{s.emoji}</span>
              <div className="flex-1">
                <p className="text-lg font-bold text-gray-900">{s.label}</p>
                <p className="text-sm text-gray-400 mt-0.5">{s.sublabel}</p>
              </div>
              {selectedStyle === s.id && <Check className="w-5 h-5 text-amber-500" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // style 탭에서 바로 검색하는 함수
  async function findPackageWithStyle(style: string) {
    if (!selectedCity || !selectedWho) return;
    setLoading(true); setNoResult(false);

    const { data: pkgData } = await supabase
      .from('packages').select('*').eq('city', selectedCity.id).eq('is_active', true)
      .contains('theme_who', [selectedWho]).contains('theme_style', [style]).limit(1).single();

    if (!pkgData) {
      const { data: fallback } = await supabase
        .from('packages').select('*').eq('city', selectedCity.id).eq('is_active', true)
        .contains('theme_style', [style]).limit(1).single();
      if (!fallback) { setNoResult(true); setLoading(false); setStep('result'); return; }
      setResultPackage(fallback);
      await loadPackageItems(fallback.id);
    } else {
      setResultPackage(pkgData);
      await loadPackageItems(pkgData.id);
    }
    setLoading(false); setStep('result');
  }

  // ── STEP 5: 결과 ──
  if (step === 'result') {
    if (loading) return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center shadow-lg animate-pulse">
          <Gift className="w-8 h-8 text-amber-500" />
        </div>
        <p className="text-sm font-semibold text-gray-600">딱 맞는 패키지를 찾고 있어요...</p>
      </div>
    );

    if (noResult) return (
      <div className="min-h-screen bg-gray-50">
        <Header title="추천 결과" />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <Gift className="w-8 h-8 text-gray-300" />
          </div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">아직 준비 중인 패키지예요</h2>
          <p className="text-sm text-gray-500 mb-8">직접 원하는 것들을 골라보실 수 있어요</p>
          <button onClick={handleGoToCustom} className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-md hover:bg-blue-700 transition-all">
            직접 선택하러 가기
          </button>
        </div>
      </div>
    );

    // 카테고리별 그룹핑
    const groupedItems: Record<string, TravelItem[]> = {};
    CATEGORY_ORDER.forEach(cat => {
      const catItems = packageItems.filter(i => i.category === cat);
      if (catItems.length > 0) groupedItems[cat] = catItems;
    });

    const totalPrice = packageItems.reduce((sum, item) => sum + getEffectivePrice(item), 0);
    const whoLabel = THEME_WHO.find(w => w.id === selectedWho)?.label || '';
    const styleLabel = THEME_STYLE.find(s => s.id === selectedStyle)?.label || '';

    return (
      <div className="min-h-screen bg-gray-50 pb-32">
        <Header title="추천 패키지" subtitle="딱 맞는 패키지를 찾았어요!" />

        <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
          {/* 패키지 헤더 카드 */}
          <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl p-6 text-white shadow-xl">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {whoLabel && <span className="text-[11px] bg-white/20 px-2.5 py-1 rounded-full font-bold">{whoLabel}</span>}
              {styleLabel && <span className="text-[11px] bg-white/20 px-2.5 py-1 rounded-full font-bold">{styleLabel}</span>}
              {hasDate && <span className="text-[11px] bg-white/20 px-2.5 py-1 rounded-full font-bold">📅 {nights}박</span>}
            </div>
            <h2 className="text-xl font-black mb-1">{resultPackage?.name}</h2>
            {resultPackage?.description && <p className="text-white/80 text-sm mb-4">{resultPackage.description}</p>}
            <div className="flex items-end gap-2">
              <p className="text-sm text-white/70">총 예상 비용</p>
              <p className="text-3xl font-black">₩{totalPrice.toLocaleString()}</p>
            </div>
          </div>

          {/* 품목 목록 */}
          {Object.entries(groupedItems).map(([cat, catItems]) => (
            <div key={cat} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
              <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                <span className="text-xs font-bold text-gray-500">{CATEGORY_LABELS[cat]}</span>
              </div>
              {catItems.map(item => {
                const { name, description } = getItemText(item);
                const price = getEffectivePrice(item);
                const monthlyApplied = travelMonth && monthlyPriceMap[item.id]?.[travelMonth] !== undefined;
                return (
                  <div key={item.id} onClick={() => handleAffiliateClick(item)}
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors border-b border-gray-50 last:border-0">
                    <div className="w-14 h-14 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100">
                      <ImageWithFallback src={item.image} alt={name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 line-clamp-1">{name}</p>
                      <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm font-bold text-blue-600">₩{price.toLocaleString()}</p>
                        {monthlyApplied && <span className="text-[10px] text-purple-500 bg-purple-50 px-1.5 py-0.5 rounded-full">{travelMonth}월 가격</span>}
                      </div>
                    </div>
                    {item.affiliate_link && <ExternalLink className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                  </div>
                );
              })}
            </div>
          ))}

          {/* 면책 문구 */}
          <p className="text-[11px] text-gray-400 text-center leading-relaxed">
            * 표시 금액은 참고용이며, 날짜·시즌·재고에 따라 달라질 수 있습니다.
          </p>
        </div>

        {/* 하단 버튼 */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-10">
          <div className="max-w-2xl mx-auto px-4 py-3 space-y-2">
            <button onClick={handleShareKakao}
              className="w-full py-3.5 bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 rounded-2xl font-black text-sm shadow-md active:scale-[0.99]">
              카카오톡으로 공유하기 📤
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={handleGoToCustom}
                className="py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200 transition-all">
                직접 수정하기
              </button>
              <button onClick={() => { setStep('who'); setSelectedWho(''); setSelectedStyle(''); }}
                className="py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200 transition-all">
                다시 추천받기
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
