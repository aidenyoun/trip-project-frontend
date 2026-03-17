import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { ArrowLeft, Check, MapPin, Plus, Minus, Calendar, X } from "lucide-react";
import { supabase } from "../../supabase";
import { useLanguage } from "../LanguageContext";

interface TravelItem {
  id: string; city: string; category: string; name: string;
  price: number; image: string; description: string;
  affiliate_link: string | null; group_id: string | null;
}
interface ItemGroup {
  id: string; city: string; category: string; name: string;
  description: string; image: string; is_active: boolean;
}
interface ItemTranslation { item_id: string; lang: string; name: string; description: string; }
interface City { id: string; name: string; emoji: string; is_active: boolean; }

const STEP_IDS = ['accommodation', 'transport', 'tours', 'activities'] as const;
type StepId = typeof STEP_IDS[number];
const QUANTITY_CATEGORIES: StepId[] = ['accommodation', 'transport', 'tours', 'activities'];
type Phase = 'selectCity' | 'selectItems';
type SortOption = 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc';

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
function FlagImage({ emoji, className }: { emoji: string; className?: string }) {
  const url = emojiToFlagUrl(emoji);
  if (url) return <img src={url} alt={emoji} className={className} style={{ objectFit: 'cover', borderRadius: 4 }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />;
  return <span className="text-3xl">{emoji}</span>;
}
function calcNights(start: string, end: string): number {
  if (!start || !end) return 0;
  return Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)));
}
function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export function StepCalculator() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  const [phase, setPhase] = useState<Phase>('selectCity');
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [travelStartDate, setTravelStartDate] = useState('');
  const [travelEndDate, setTravelEndDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [allItems, setAllItems] = useState<TravelItem[]>([]);
  const [groups, setGroups] = useState<ItemGroup[]>([]);
  const [monthlyPriceMap, setMonthlyPriceMap] = useState<Record<string, Record<number, number>>>({});
  const [translationMap, setTranslationMap] = useState<Record<string, { name: string; description: string }>>({});
  const [loading, setLoading] = useState(true);
  const [sortOption, setSortOption] = useState<SortOption>('name_asc');

  const currentMonth = new Date().getMonth() + 1;

  useEffect(() => {
    supabase.from('cities').select('*').eq('is_active', true).order('created_at', { ascending: true })
        .then(({ data }) => setCities(data || []));
  }, []);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const [{ data: items }, { data: translations }, { data: monthlyPrices }, { data: grps }] = await Promise.all([
        supabase.from('items').select('*').eq('is_active', true),
        language !== 'ko'
            ? supabase.from('item_translations').select('item_id, lang, name, description').eq('lang', language)
            : Promise.resolve({ data: [] }),
        supabase.from('item_monthly_prices').select('item_id, month, price'),
        supabase.from('item_groups').select('*').eq('is_active', true),
      ]);
      setAllItems(items || []);
      setGroups(grps || []);
      const tMap: Record<string, { name: string; description: string }> = {};
      (translations as ItemTranslation[] || []).forEach(tr => { tMap[tr.item_id] = { name: tr.name, description: tr.description }; });
      setTranslationMap(tMap);
      const mpMap: Record<string, Record<number, number>> = {};
      (monthlyPrices || []).forEach((r: any) => {
        if (!mpMap[r.item_id]) mpMap[r.item_id] = {};
        mpMap[r.item_id][r.month] = r.price;
      });
      setMonthlyPriceMap(mpMap);
      setLoading(false);
    };
    fetchAll();
  }, [language]);

  const getEffectivePrice = (item: TravelItem) => monthlyPriceMap[item.id]?.[currentMonth] ?? item.price;
  const getItemText = (item: TravelItem) => { const tr = translationMap[item.id]; return { name: tr?.name || item.name, description: tr?.description || item.description }; };
  const languageLocale = language === 'ko' ? 'ko-KR' : language === 'ja' ? 'ja-JP' : 'en-US';

  const nights = calcNights(travelStartDate, travelEndDate);
  const hasDateRange = !!(travelStartDate && travelEndDate);
  const currentCategory = STEP_IDS[currentStep];
  const isQuantityCategory = QUANTITY_CATEGORIES.includes(currentCategory);
  const stepLabel = (id: StepId) => t(`step.${id}`);
  const getStepHeading = () => {
    const cat = stepLabel(currentCategory); const city = selectedCity?.name || '';
    if (language === 'en') return `Select your ${cat} in ${city}`;
    if (language === 'ja') return `${city}の${cat}を選択`;
    return `${city}의 ${cat} 선택`;
  };

  const getBadgeText = () => {
    if (currentCategory === 'accommodation') return t('calc.nights_badge');
    if (currentCategory === 'transport') return t('calc.persons_badge');
    if (currentCategory === 'tours') return t('calc.persons_badge'); // 👥 인원수 조절 가능
    return t('calc.tickets_badge');
  };

  const getStepDesc = () => {
    if (currentCategory === 'accommodation') return hasDateRange && nights > 0 ? t('calc.accommodation_desc_auto').replace('{n}', String(nights)) : t('calc.accommodation_desc');
    if (currentCategory === 'transport') return t('calc.transport_desc');
    if (currentCategory === 'tours') return t('calc.tours_desc');
    return t('calc.activities_desc');
  };
  const getUnitLabel = (category: string, qty: number) => {
    if (category === 'accommodation') return t('calc.unit_night').replace('{n}', String(qty));
    if (category === 'transport') return t('calc.unit_person').replace('{n}', String(qty));
    if (category === 'tours') return t('calc.unit_person').replace('{n}', String(qty)); // 투어도 인원수
    return t('calc.unit_ticket').replace('{n}', String(qty));
  };

  const handleCitySelect = (city: City) => { setSelectedCity(city); setSelectedItems(new Set()); setItemQuantities({}); setCurrentStep(0); setPhase('selectItems'); };
  const clearDates = () => { setTravelStartDate(''); setTravelEndDate(''); setShowDatePicker(false); };

  const toggleItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
      const newQty = { ...itemQuantities }; delete newQty[itemId]; setItemQuantities(newQty);
    } else {
      newSelected.add(itemId);
      if (isQuantityCategory) { setItemQuantities(prev => ({ ...prev, [itemId]: 1 })); }
    }
    setSelectedItems(newSelected);
  };

  // 그룹 내 라디오 선택
  const selectGroupItem = (itemId: string, groupId: string) => {
    const groupItemIds = allItems.filter(i => i.group_id === groupId).map(i => i.id);
    const newSelected = new Set(selectedItems);
    const mergedQty = { ...itemQuantities };
    groupItemIds.forEach(id => { newSelected.delete(id); delete mergedQty[id]; });
    newSelected.add(itemId);
    mergedQty[itemId] = mergedQty[itemId] || 1;
    setSelectedItems(newSelected);
    setItemQuantities(mergedQty);
  };

  const changeQuantity = (itemId: string, delta: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = (itemQuantities[itemId] || 1) + delta;
    if (next <= 0) { const ns = new Set(selectedItems); ns.delete(itemId); setSelectedItems(ns); const nq = { ...itemQuantities }; delete nq[itemId]; setItemQuantities(nq); }
    else setItemQuantities(prev => ({ ...prev, [itemId]: next }));
  };

  const baseFilteredItems = allItems.filter(item => item.city === selectedCity?.id && item.category === currentCategory);
  const filteredItems = useMemo(() => {
    const sorted = [...baseFilteredItems];
    sorted.sort((a, b) => {
      const nameDiff = getItemText(a).name.localeCompare(getItemText(b).name, languageLocale);
      const priceDiff = getEffectivePrice(a) - getEffectivePrice(b);

      if (sortOption === 'price_asc') return priceDiff !== 0 ? priceDiff : nameDiff;
      if (sortOption === 'price_desc') return priceDiff !== 0 ? -priceDiff : nameDiff;
      if (sortOption === 'name_desc') return -nameDiff;
      return nameDiff;
    });
    return sorted;
  }, [baseFilteredItems, sortOption, languageLocale, translationMap, monthlyPriceMap, currentMonth]);
  const selectedItemsInCurrentCategory = filteredItems.filter(item => selectedItems.has(item.id));

  const { grouped: groupedMap, standalone } = useMemo(() => {
    const grouped: Record<string, TravelItem[]> = {};
    const standalone: TravelItem[] = [];
    filteredItems.forEach(item => { if (item.group_id) { if (!grouped[item.group_id]) grouped[item.group_id] = []; grouped[item.group_id].push(item); } else standalone.push(item); });
    return { grouped, standalone };
  }, [filteredItems]);

  const currentGroups = useMemo(() => groups.filter(g => g.city === selectedCity?.id && g.category === currentCategory), [groups, selectedCity, currentCategory]);

  const priceRange = useMemo(() => {
    if (filteredItems.length === 0) return { min: 0, max: 0 };
    const items2calc = selectedItemsInCurrentCategory.length > 0 ? selectedItemsInCurrentCategory : filteredItems;
    const prices = items2calc.map(item => { const ep = getEffectivePrice(item); const qty = itemQuantities[item.id] || 1; return ep * (isQuantityCategory && selectedItems.has(item.id) ? qty : 1); });
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [selectedItemsInCurrentCategory, filteredItems, itemQuantities, isQuantityCategory, selectedItems, monthlyPriceMap, currentMonth]);

  const handleNext = () => {
    if (currentStep < STEP_IDS.length - 1) { setCurrentStep(currentStep + 1); window.scrollTo(0, 0); }
    else {
      const list = allItems.filter(item => selectedItems.has(item.id)).map(item => { const { name, description } = getItemText(item); const ep = getEffectivePrice(item); return { ...item, name, description, price: ep, quantity: itemQuantities[item.id] || 1 }; });
      const total = list.reduce((sum, i) => sum + i.price * i.quantity, 0);
      localStorage.setItem('selectedItems', JSON.stringify(list));
      localStorage.setItem('totalPrice', total.toString());
      localStorage.setItem('selectedCity', selectedCity?.id || '');
      localStorage.setItem('selectedCityName', selectedCity?.name || '');
      localStorage.setItem('travelStartDate', travelStartDate);
      localStorage.setItem('travelEndDate', travelEndDate);
      navigate(`/${language}/kakao-preview`);
    }
  };
  const handleBack = () => {
    if (phase === 'selectItems' && currentStep === 0) { setPhase('selectCity'); setSelectedCity(null); }
    else if (currentStep > 0) { setCurrentStep(currentStep - 1); window.scrollTo(0, 0); }
    else navigate(`/${language}`);
  };
  const canProceed = selectedItemsInCurrentCategory.length > 0;
  const totalSelectedAccommodationNights = useMemo(
    () => selectedItemsInCurrentCategory.reduce((sum, item) => sum + (itemQuantities[item.id] || 1), 0),
    [selectedItemsInCurrentCategory, itemQuantities],
  );
  const isAccommodationShortage = () => currentCategory === 'accommodation' && hasDateRange && nights > 0 && totalSelectedAccommodationNights < nights;

  // ── 나라 선택 ──
  if (phase === 'selectCity') {
    const today = new Date().toISOString().split('T')[0];
    return (
        <div className="min-h-screen bg-white">
          <div className="bg-white sticky top-0 z-20 shadow-sm border-b border-gray-100">
            <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
              <button onClick={() => navigate(`/${language}`)} className="p-1.5 hover:bg-gray-100 rounded-full"><ArrowLeft className="w-4 h-4" /></button>
              <div><h1 className="text-sm font-semibold">{t('calc.title')}</h1><p className="text-xs text-gray-400">{t('calc.step_by_step')}</p></div>
            </div>
          </div>
          <div className="max-w-2xl mx-auto px-4 py-8">
            <div className="mb-8 text-center">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3"><MapPin className="w-6 h-6 text-blue-600" /></div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">{t('city.title')}</h2>
              <p className="text-sm text-gray-500">{t('city.subtitle')}</p>
            </div>
            {/* 날짜 */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-700">{t('date.travel_schedule')}</span>
                  <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{t('date.optional')}</span>
                </div>
                {hasDateRange ? (
                    <button onClick={clearDates} className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-500"><X className="w-3 h-3" /> {t('date.reset')}</button>
                ) : (
                    <button onClick={() => setShowDatePicker(!showDatePicker)} className="text-[11px] text-blue-500 hover:text-blue-600 font-medium">{showDatePicker ? t('date.close') : t('date.enter_date')}</button>
                )}
              </div>
              {hasDateRange ? (
                  <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-blue-900">{formatDate(travelStartDate)} ~ {formatDate(travelEndDate)}</p>
                      <p className="text-xs text-blue-600 mt-0.5">{t('date.nights_auto').replace('{n}', String(nights))}</p>
                    </div>
                    <button onClick={clearDates} className="p-1.5 hover:bg-blue-100 rounded-full"><X className="w-4 h-4 text-blue-400" /></button>
                  </div>
              ) : showDatePicker ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">{t('date.departure')}</label>
                        <input type="date" min={today} value={travelStartDate} onChange={e => { setTravelStartDate(e.target.value); if (travelEndDate && e.target.value > travelEndDate) setTravelEndDate(''); }} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-400 focus:border-transparent" />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">{t('date.return')}</label>
                        <input type="date" min={travelStartDate || today} value={travelEndDate} onChange={e => setTravelEndDate(e.target.value)} disabled={!travelStartDate} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-400 disabled:opacity-40 disabled:cursor-not-allowed" />
                      </div>
                    </div>
                    {travelStartDate && travelEndDate && (
                        <div className="bg-blue-50 rounded-xl px-3 py-2 text-center">
                          <p className="text-xs text-blue-600 font-medium">{formatDate(travelStartDate)} ~ {formatDate(travelEndDate)} · <span className="font-bold">{t('calc.unit_night').replace('{n}', String(nights))}</span></p>
                        </div>
                    )}
                    {travelStartDate && !travelEndDate && <p className="text-[11px] text-gray-400 text-center">{t('date.select_return')}</p>}
                  </div>
              ) : (
                  <div onClick={() => setShowDatePicker(true)} className="border border-dashed border-gray-200 rounded-2xl px-4 py-3 flex items-center gap-3 cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-all group">
                    <Calendar className="w-5 h-5 text-gray-300 group-hover:text-blue-400 flex-shrink-0" />
                    <p className="text-xs text-gray-400 group-hover:text-blue-500">{t('date.hint')}</p>
                  </div>
              )}
            </div>
            {/* 도시 */}
            {cities.length === 0 ? (
                <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
            ) : (
                <div className="space-y-3">
                  {cities.map(city => (
                      <button key={city.id} onClick={() => handleCitySelect(city)} className="w-full flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-2xl hover:border-blue-400 hover:shadow-md transition-all text-left group">
                        <div className="w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center"><FlagImage emoji={city.emoji} className="w-10 h-10" /></div>
                        <div className="flex-1">
                          <p className="text-base font-semibold text-gray-900">{city.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{t('step.accommodation')} · {t('step.transport')} · {t('step.tours')} · {t('step.activities')}{hasDateRange && <span className="text-blue-400 font-medium"> · {t('calc.unit_night').replace('{n}', String(nights))}</span>}</p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-blue-600 flex items-center justify-center transition-colors"><ArrowLeft className="w-4 h-4 rotate-180 text-gray-400 group-hover:text-white" /></div>
                      </button>
                  ))}
                </div>
            )}
            <p className="text-center text-[11px] text-gray-400 mt-8 leading-relaxed">{t('calc.disclaimer')}</p>
          </div>
        </div>
    );
  }

  // ── 품목 선택 ──
  return (
      <div className="min-h-screen bg-white pb-28">
        <div className="bg-white sticky top-0 z-20 shadow-sm border-b border-gray-100">
          <div className="max-w-2xl mx-auto px-4 pt-3 pb-2">
            <div className="flex items-center gap-2 mb-3">
              <button onClick={handleBack} className="p-1.5 hover:bg-gray-100 rounded-full"><ArrowLeft className="w-4 h-4" /></button>
              <div className="flex-1 min-w-0">
                <h1 className="text-sm font-semibold leading-tight truncate flex items-center gap-1.5">
                  {selectedCity && <span className="inline-flex w-5 h-5 rounded overflow-hidden flex-shrink-0"><FlagImage emoji={selectedCity.emoji} className="w-5 h-5" /></span>}
                  {selectedCity?.name} {t('calc.title')}
                  {hasDateRange && <span className="ml-1 text-[10px] text-blue-400 font-normal">{formatDate(travelStartDate)}~{formatDate(travelEndDate)}</span>}
                </h1>
                <p className="text-xs text-gray-400">{t('calc.step_by_step')}</p>
              </div>
              <button onClick={() => { setPhase('selectCity'); setSelectedCity(null); }} className="flex-shrink-0 text-[10px] text-blue-600 border border-blue-200 px-2 py-1 rounded-lg hover:bg-blue-50">{t('city.change')}</button>
            </div>
            <div className="flex items-center justify-between">
              {STEP_IDS.map((id, index) => {
                const isActive = index === currentStep; const isCompleted = index < currentStep;
                return (
                    <div key={id} className="flex items-center flex-1">
                      <div className="flex flex-col items-center flex-1 cursor-pointer group" onClick={() => { setCurrentStep(index); window.scrollTo(0, 0); }}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all mb-1 ${isActive ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md scale-110' : isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400 group-hover:bg-gray-300'}`}>{isCompleted ? <Check className="w-3.5 h-3.5" /> : <span>{index + 1}</span>}</div>
                        <div className={`text-[10px] text-center leading-tight ${isActive ? 'text-blue-600 font-semibold' : isCompleted ? 'text-green-600' : 'text-gray-400'}`}>{stepLabel(id)}</div>
                      </div>
                      {index < STEP_IDS.length - 1 && <div className="flex-shrink-0 w-6 mb-4"><div className={`h-0.5 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`} /></div>}
                    </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-5">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">STEP {currentStep + 1}</span>
              <span className="text-xs text-gray-400">/ {STEP_IDS.length}</span>
              {isQuantityCategory && <span className="text-[10px] text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full font-medium">{getBadgeText()}</span>}
              {currentCategory === 'accommodation' && hasDateRange && nights > 0 && <span className="text-[10px] text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full font-medium">{t('calc.nights_auto').replace('{n}', String(nights))}</span>}
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">{getStepHeading()}</h2>
            <p className="text-sm text-gray-500">{getStepDesc()}</p>
            <div className="mt-3">
              <span className="text-[11px] text-gray-400">{t('calc.sort_by')}</span>
              <div className="mt-1 grid grid-cols-2 gap-1.5">
                <button onClick={() => setSortOption('name_asc')} className={`px-2.5 py-1.5 text-xs rounded-md transition-colors ${sortOption === 'name_asc' ? 'bg-blue-50 text-blue-600 border border-blue-200 font-semibold' : 'bg-gray-100 text-gray-500 hover:text-gray-700 border border-transparent'}`}>
                  {t('calc.sort_name_asc')}
                </button>
                <button onClick={() => setSortOption('name_desc')} className={`px-2.5 py-1.5 text-xs rounded-md transition-colors ${sortOption === 'name_desc' ? 'bg-blue-50 text-blue-600 border border-blue-200 font-semibold' : 'bg-gray-100 text-gray-500 hover:text-gray-700 border border-transparent'}`}>
                  {t('calc.sort_name_desc')}
                </button>
                <button onClick={() => setSortOption('price_asc')} className={`px-2.5 py-1.5 text-xs rounded-md transition-colors ${sortOption === 'price_asc' ? 'bg-blue-50 text-blue-600 border border-blue-200 font-semibold' : 'bg-gray-100 text-gray-500 hover:text-gray-700 border border-transparent'}`}>
                  {t('calc.sort_price_asc')}
                </button>
                <button onClick={() => setSortOption('price_desc')} className={`px-2.5 py-1.5 text-xs rounded-md transition-colors ${sortOption === 'price_desc' ? 'bg-blue-50 text-blue-600 border border-blue-200 font-semibold' : 'bg-gray-100 text-gray-500 hover:text-gray-700 border border-transparent'}`}>
                  {t('calc.sort_price_desc')}
                </button>
              </div>
            </div>
          </div>

          {loading ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="bg-gray-100 rounded-xl h-24 animate-pulse" />)}</div>
          ) : filteredItems.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">
                {t('calc.placeholder')}
                <button onClick={handleNext} className="block mx-auto mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm">{t('calc.next')}</button>
              </div>
          ) : (
              <div className="space-y-4 pb-6">
                {/* 그룹 비교 카드 */}
                {currentGroups.map(group => {
                  const gItems = groupedMap[group.id] || [];
                  if (gItems.length === 0) return null;
                  const selectedInGroup = gItems.find(i => selectedItems.has(i.id));
                  return (
                      <div key={group.id} className={`bg-white rounded-2xl border-2 overflow-hidden transition-all ${selectedInGroup ? 'border-blue-400 shadow-md ring-2 ring-blue-100' : 'border-gray-200 hover:border-gray-300'}`}>
                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-black text-gray-900">{group.name}</p>
                            {group.description && <p className="text-[11px] text-gray-400 mt-0.5">{group.description}</p>}
                          </div>
                          <span className="text-[10px] text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full font-bold">업체 비교</span>
                        </div>
                        <div className="divide-y divide-gray-50">
                          {gItems.map(item => {
                            const isSelected = selectedItems.has(item.id);
                            const ep = getEffectivePrice(item);
                            const { name, description } = getItemText(item);
                            const hasOverride = monthlyPriceMap[item.id]?.[currentMonth] !== undefined && monthlyPriceMap[item.id][currentMonth] !== item.price;
                            return (
                                <div key={item.id} onClick={() => selectGroupItem(item.id, group.id)} className={`flex items-center gap-3 p-3 cursor-pointer transition-all ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                                  <div className="w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100"><ImageWithFallback src={item.image} alt={name} className="w-full h-full object-cover" /></div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 line-clamp-1">{name}</p>
                                    <p className="text-[11px] text-gray-500 line-clamp-1">{description}</p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <p className="text-sm font-bold text-blue-600">₩{ep.toLocaleString()}</p>
                                      {hasOverride && <span className="text-[9px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-bold">{currentMonth}월</span>}
                                    </div>
                                  </div>
                                  <div className="flex-shrink-0" onClick={e => e.stopPropagation()}>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300'}`}>{isSelected && <div className="w-2 h-2 bg-white rounded-full" />}</div>
                                  </div>
                                </div>
                            );
                          })}
                        </div>
                        {selectedInGroup && isQuantityCategory && (
                            <div className="px-4 py-3 bg-blue-50 border-t border-blue-100">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-xs text-blue-700 font-bold">{getItemText(selectedInGroup).name}</p>
                                  <p className="text-[11px] text-blue-500">{getUnitLabel(currentCategory, itemQuantities[selectedInGroup.id] || 1)} {t('calc.basis')}</p>
                                </div>
                                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                  <button onClick={e => changeQuantity(selectedInGroup.id, -1, e)} className="w-7 h-7 rounded-full bg-blue-200 hover:bg-blue-300 flex items-center justify-center active:scale-90"><Minus className="w-3.5 h-3.5 text-blue-700" /></button>
                                  <span className="w-8 text-center text-sm font-black text-blue-700">{itemQuantities[selectedInGroup.id] || 1}</span>
                                  <button onClick={e => changeQuantity(selectedInGroup.id, +1, e)} className="w-7 h-7 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center active:scale-90"><Plus className="w-3.5 h-3.5 text-white" /></button>
                                  <span className="text-xs font-bold text-blue-700 ml-1">= ₩{(getEffectivePrice(selectedInGroup) * (itemQuantities[selectedInGroup.id] || 1)).toLocaleString()}</span>
                                </div>
                              </div>
                              {isAccommodationShortage() && (
                                  <p className="mt-2 rounded-md border border-red-100 bg-red-50 px-2 py-1 text-[11px] text-red-500">
                                    {t('calc.accommodation_nights_warning').replace('{n}', String(nights))}
                                  </p>
                              )}
                            </div>
                        )}
                      </div>
                  );
                })}

                {/* 단독 품목 */}
                {standalone.map(item => {
                  const isSelected = selectedItems.has(item.id);
                  const quantity = itemQuantities[item.id] || 1;
                  const ep = getEffectivePrice(item);
                  const totalItemPrice = ep * (isSelected ? quantity : 1);
                  const { name, description } = getItemText(item);
                  const hasOverride = monthlyPriceMap[item.id]?.[currentMonth] !== undefined && monthlyPriceMap[item.id][currentMonth] !== item.price;
                  return (
                      <div key={item.id} onClick={() => toggleItem(item.id)} className={`bg-white rounded-xl overflow-hidden border transition-all cursor-pointer hover:shadow-md ${isSelected ? 'border-blue-500 shadow-sm ring-2 ring-blue-100' : 'border-gray-200 hover:border-gray-300'}`}>
                        <div className="flex items-center gap-3 p-3">
                          <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100"><ImageWithFallback src={item.image} alt={name} className="w-full h-full object-cover" /></div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-gray-900 mb-0.5 line-clamp-1">{name}</h3>
                            <p className="text-xs text-gray-500 mb-1 line-clamp-1">{description}</p>
                            <div className="flex items-baseline gap-1.5">
                              <p className="text-base font-semibold text-blue-600">₩{(isSelected ? totalItemPrice : ep).toLocaleString()}</p>
                              {isSelected && quantity > 1 && <span className="text-[11px] text-gray-400">(₩{ep.toLocaleString()} × {getUnitLabel(currentCategory, quantity)})</span>}
                              {hasOverride && !isSelected && <span className="text-[9px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-bold">{currentMonth}월</span>}
                            </div>
                          </div>
                          <div className="flex-shrink-0" onClick={e => e.stopPropagation()}>
                            {isQuantityCategory ? (
                                isSelected ? (
                                    <div className="flex items-center gap-1">
                                      <button onClick={e => changeQuantity(item.id, -1, e)} className="w-7 h-7 rounded-full bg-blue-100 hover:bg-blue-200 flex items-center justify-center active:scale-90"><Minus className="w-3.5 h-3.5 text-blue-600" /></button>
                                      <span className="w-6 text-center text-sm font-bold text-blue-700">{quantity}</span>
                                      <button onClick={e => changeQuantity(item.id, +1, e)} className="w-7 h-7 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center active:scale-90"><Plus className="w-3.5 h-3.5 text-white" /></button>
                                    </div>
                                ) : (
                                    <button onClick={e => { e.stopPropagation(); toggleItem(item.id); }} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-blue-500 flex items-center justify-center transition-colors group/btn active:scale-90"><Plus className="w-4 h-4 text-gray-400 group-hover/btn:text-white" /></button>
                                )
                            ) : (
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300'}`}>{isSelected && <Check className="w-3 h-3 text-white" />}</div>
                            )}
                          </div>
                        </div>
                        {isSelected && isQuantityCategory && (
                            <div className="px-3 pb-2.5">
                              <div className="bg-blue-50 rounded-lg px-3 py-1.5 flex items-center justify-between">
                                <span className="text-[11px] text-blue-600 font-medium">{getUnitLabel(currentCategory, quantity)} {t('calc.basis')}{currentCategory === 'accommodation' && hasDateRange && quantity === nights && <span className="ml-1 text-blue-400">({t('calc.date_basis')})</span>}</span>
                                <span className="text-[11px] text-blue-700 font-bold">{t('calc.total_cost_label')} ₩{totalItemPrice.toLocaleString()}</span>
                              </div>
                              {isAccommodationShortage() && (
                                  <p className="mt-1.5 rounded-md border border-red-100 bg-red-50 px-2.5 py-1.5 text-[11px] text-red-500">
                                    {t('calc.accommodation_nights_warning').replace('{n}', String(nights))}
                                  </p>
                              )}
                            </div>
                        )}
                      </div>
                  );
                })}

                {isAccommodationShortage() && (
                    <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2">
                      <p className="text-xs text-red-500">{t('calc.accommodation_nights_warning').replace('{n}', String(nights))}</p>
                    </div>
                )}

                <button onClick={handleNext} className="w-full mt-4 py-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center gap-2 group hover:bg-gray-100 transition-all active:scale-[0.98]">
                  <span className="text-sm font-semibold text-gray-600 group-hover:text-blue-600">{canProceed ? t('calc.next_step_label') : t('calc.skip')}</span>
                  <ArrowLeft className="w-4 h-4 rotate-180 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                </button>
              </div>
          )}
          <p className="text-[11px] text-gray-400 text-center mt-6 leading-relaxed">{t('calc.disclaimer')}</p>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-10">
          <div className="max-w-2xl mx-auto px-4 py-3">
            <div className="flex items-center justify-center gap-2 mb-2">
              <p className="text-xs text-gray-400">{t('calc.budget')}</p>
              <p className="text-sm font-semibold text-gray-800">{priceRange.min === priceRange.max ? `₩${priceRange.min.toLocaleString()}` : `₩${priceRange.min.toLocaleString()} ~ ₩${priceRange.max.toLocaleString()}`}</p>
            </div>
            <button onClick={handleNext} className={`w-full py-3 rounded-xl text-white text-sm font-medium transition-all shadow-md active:scale-[0.99] ${!canProceed ? 'bg-gray-400 hover:bg-gray-500' : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'}`}>
              {currentStep < STEP_IDS.length - 1 ? (canProceed ? `${t('calc.next')}: ${stepLabel(STEP_IDS[currentStep + 1])}` : t('calc.skip')) : t('calc.complete')}
            </button>
          </div>
        </div>
      </div>
  );
}
