import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { ArrowLeft, Check, MapPin, Plus, Minus, Calendar, X } from "lucide-react";
import { supabase } from "../../supabase";
import { useLanguage } from "../LanguageContext";

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

// item_translations 테이블 row 타입
interface ItemTranslation {
  item_id: string;
  lang: string;
  name: string;
  description: string;
}

interface City {
  id: string;
  name: string;
  emoji: string;
  is_active: boolean;
}

const STEP_IDS = ['accommodation', 'transport', 'tours', 'activities'] as const;
type StepId = typeof STEP_IDS[number];

const QUANTITY_CATEGORIES: StepId[] = ['accommodation', 'transport', 'activities'];

type Phase = 'selectCity' | 'selectItems';

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
  if (url) {
    return (
        <img
            src={url} alt={emoji} className={className}
            style={{ objectFit: 'cover', borderRadius: 4 }}
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
    );
  }
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
  // 번역 맵: item_id → { name, description }
  const [translationMap, setTranslationMap] = useState<Record<string, { name: string; description: string }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('cities').select('*').eq('is_active', true).order('created_at', { ascending: true })
        .then(({ data }) => setCities(data || []));
  }, []);

  // 품목 + 번역 동시 로드
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);

      const [{ data: items }, { data: translations }] = await Promise.all([
        supabase.from('items').select('*').eq('is_active', true),
        // ko는 items 테이블 원본을 그대로 쓰므로 ko가 아닐 때만 조회
        language !== 'ko'
            ? supabase.from('item_translations').select('item_id, lang, name, description').eq('lang', language)
            : Promise.resolve({ data: [] }),
      ]);

      setAllItems(items || []);

      // 번역 맵 구성
      const map: Record<string, { name: string; description: string }> = {};
      (translations as ItemTranslation[] || []).forEach(tr => {
        map[tr.item_id] = { name: tr.name, description: tr.description };
      });
      setTranslationMap(map);
      setLoading(false);
    };
    fetchAll();
  }, [language]); // 언어 바뀌면 재조회

  // 번역된 name/description 가져오기 (없으면 원본 fallback)
  const getItemText = (item: TravelItem) => {
    const tr = translationMap[item.id];
    return {
      name: tr?.name || item.name,
      description: tr?.description || item.description,
    };
  };

  const nights = calcNights(travelStartDate, travelEndDate);
  const hasDateRange = !!(travelStartDate && travelEndDate);

  const currentCategory = STEP_IDS[currentStep];
  const isQuantityCategory = QUANTITY_CATEGORIES.includes(currentCategory);

  const stepLabel = (id: StepId) => t(`step.${id}`);

  const getStepHeading = () => {
    const cat = stepLabel(currentCategory);
    const city = selectedCity?.name || '';
    if (language === 'en') return `Select your ${cat} in ${city}`;
    if (language === 'ja') return `${city}の${cat}を選択`;
    return `${city}의 ${cat} 선택`;
  };

  const getBadgeText = () => {
    if (currentCategory === 'accommodation') return t('calc.nights_badge');
    if (currentCategory === 'transport') return t('calc.persons_badge');
    return t('calc.tickets_badge');
  };

  const getStepDesc = () => {
    if (currentCategory === 'accommodation') {
      return hasDateRange && nights > 0
          ? t('calc.accommodation_desc_auto').replace('{n}', String(nights))
          : t('calc.accommodation_desc');
    }
    if (currentCategory === 'transport') return t('calc.transport_desc');
    if (currentCategory === 'tours') return t('calc.tours_desc');
    return t('calc.activities_desc');
  };

  const getUnitLabel = (category: string, qty: number) => {
    if (category === 'accommodation') return t('calc.unit_night').replace('{n}', String(qty));
    if (category === 'transport') return t('calc.unit_person').replace('{n}', String(qty));
    return t('calc.unit_ticket').replace('{n}', String(qty));
  };

  const handleCitySelect = (city: City) => {
    setSelectedCity(city);
    setSelectedItems(new Set());
    setItemQuantities({});
    setCurrentStep(0);
    setPhase('selectItems');
  };

  const clearDates = () => {
    setTravelStartDate('');
    setTravelEndDate('');
    setShowDatePicker(false);
  };

  const toggleItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
      const newQty = { ...itemQuantities };
      delete newQty[itemId];
      setItemQuantities(newQty);
    } else {
      newSelected.add(itemId);
      if (isQuantityCategory) {
        const defaultQty = currentCategory === 'accommodation' && nights > 0 ? nights : 1;
        setItemQuantities(prev => ({ ...prev, [itemId]: defaultQty }));
      }
    }
    setSelectedItems(newSelected);
  };

  const changeQuantity = (itemId: string, delta: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = (itemQuantities[itemId] || 1) + delta;
    if (next <= 0) {
      const newSelected = new Set(selectedItems);
      newSelected.delete(itemId);
      setSelectedItems(newSelected);
      const newQty = { ...itemQuantities };
      delete newQty[itemId];
      setItemQuantities(newQty);
    } else {
      setItemQuantities(prev => ({ ...prev, [itemId]: next }));
    }
  };

  const filteredItems = allItems.filter(
      item => item.city === selectedCity?.id && item.category === currentCategory
  );
  const selectedItemsInCurrentCategory = filteredItems.filter(item => selectedItems.has(item.id));

  const priceRange = useMemo(() => {
    if (filteredItems.length === 0) return { min: 0, max: 0 };
    const itemsToCalc = selectedItemsInCurrentCategory.length > 0 ? selectedItemsInCurrentCategory : filteredItems;
    const prices = itemsToCalc.map(item => {
      const qty = itemQuantities[item.id] || 1;
      return item.price * (isQuantityCategory && selectedItems.has(item.id) ? qty : 1);
    });
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [selectedItemsInCurrentCategory, filteredItems, itemQuantities, isQuantityCategory, selectedItems]);

  const handleNext = () => {
    if (currentStep < STEP_IDS.length - 1) {
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
    } else {
      // localStorage 저장 시 번역된 name/description도 함께 저장
      const selectedItemsList = allItems
          .filter(item => selectedItems.has(item.id))
          .map(item => {
            const { name, description } = getItemText(item);
            return { ...item, name, description, quantity: itemQuantities[item.id] || 1 };
          });
      const totalPrice = selectedItemsList.reduce((sum, item) => sum + item.price * item.quantity, 0);
      localStorage.setItem('selectedItems', JSON.stringify(selectedItemsList));
      localStorage.setItem('totalPrice', totalPrice.toString());
      localStorage.setItem('selectedCity', selectedCity?.id || '');
      localStorage.setItem('selectedCityName', selectedCity?.name || '');
      localStorage.setItem('travelStartDate', travelStartDate);
      localStorage.setItem('travelEndDate', travelEndDate);
      navigate(`/${language}/kakao-preview`);
    }
  };

  const handleBack = () => {
    if (phase === 'selectItems' && currentStep === 0) {
      setPhase('selectCity');
      setSelectedCity(null);
    } else if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    } else {
      navigate(`/${language}`);
    }
  };

  const canProceed = selectedItemsInCurrentCategory.length > 0;

  // ── 나라 선택 화면 ──
  if (phase === 'selectCity') {
    const today = new Date().toISOString().split('T')[0];

    return (
        <div className="min-h-screen bg-white">
          <div className="bg-white sticky top-0 z-20 shadow-sm border-b border-gray-100">
            <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
              <button onClick={() => navigate(`/${language}`)} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h1 className="text-sm font-semibold">{t('calc.title')}</h1>
                <p className="text-xs text-gray-400">{t('calc.step_by_step')}</p>
              </div>
            </div>
          </div>

          <div className="max-w-2xl mx-auto px-4 py-8">
            <div className="mb-8 text-center">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <MapPin className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">{t('city.title')}</h2>
              <p className="text-sm text-gray-500">{t('city.subtitle')}</p>
            </div>

            {/* 여행 일정 선택 */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-700">{t('date.travel_schedule')}</span>
                  <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{t('date.optional')}</span>
                </div>
                {hasDateRange ? (
                    <button onClick={clearDates} className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-500 transition-colors">
                      <X className="w-3 h-3" /> {t('date.reset')}
                    </button>
                ) : (
                    <button onClick={() => setShowDatePicker(!showDatePicker)} className="text-[11px] text-blue-500 hover:text-blue-600 font-medium transition-colors">
                      {showDatePicker ? t('date.close') : t('date.enter_date')}
                    </button>
                )}
              </div>

              {hasDateRange ? (
                  <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-blue-900">
                        {formatDate(travelStartDate)} ~ {formatDate(travelEndDate)}
                      </p>
                      <p className="text-xs text-blue-600 mt-0.5">
                        {t('date.nights_auto').replace('{n}', String(nights))}
                      </p>
                    </div>
                    <button onClick={clearDates} className="p-1.5 hover:bg-blue-100 rounded-full transition-colors">
                      <X className="w-4 h-4 text-blue-400" />
                    </button>
                  </div>
              ) : showDatePicker ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                          {t('date.departure')}
                        </label>
                        <input
                            type="date" min={today} value={travelStartDate}
                            onChange={e => { setTravelStartDate(e.target.value); if (travelEndDate && e.target.value > travelEndDate) setTravelEndDate(''); }}
                            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                          {t('date.return')}
                        </label>
                        <input
                            type="date" min={travelStartDate || today} value={travelEndDate}
                            onChange={e => setTravelEndDate(e.target.value)} disabled={!travelStartDate}
                            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-400 focus:border-transparent disabled:opacity-40 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                    {travelStartDate && travelEndDate && (
                        <div className="bg-blue-50 rounded-xl px-3 py-2 text-center">
                          <p className="text-xs text-blue-600 font-medium">
                            {formatDate(travelStartDate)} ~ {formatDate(travelEndDate)} · <span className="font-bold">{t('calc.unit_night').replace('{n}', String(nights))}</span>
                          </p>
                        </div>
                    )}
                    {travelStartDate && !travelEndDate && (
                        <p className="text-[11px] text-gray-400 text-center">{t('date.select_return')}</p>
                    )}
                  </div>
              ) : (
                  <div
                      onClick={() => setShowDatePicker(true)}
                      className="border border-dashed border-gray-200 rounded-2xl px-4 py-3 flex items-center gap-3 cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-all group"
                  >
                    <Calendar className="w-5 h-5 text-gray-300 group-hover:text-blue-400 flex-shrink-0 transition-colors" />
                    <p className="text-xs text-gray-400 group-hover:text-blue-500 transition-colors">{t('date.hint')}</p>
                  </div>
              )}
            </div>

            {/* 도시 목록 */}
            {cities.length === 0 ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}
                </div>
            ) : (
                <div className="space-y-3">
                  {cities.map(city => (
                      <button
                          key={city.id}
                          onClick={() => handleCitySelect(city)}
                          className="w-full flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-2xl hover:border-blue-400 hover:shadow-md transition-all text-left group"
                      >
                        <div className="w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                          <FlagImage emoji={city.emoji} className="w-10 h-10" />
                        </div>
                        <div className="flex-1">
                          <p className="text-base font-semibold text-gray-900">{city.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {t('step.accommodation')} · {t('step.transport')} · {t('step.tours')} · {t('step.activities')}
                            {hasDateRange && <span className="text-blue-400 font-medium"> · {t('calc.unit_night').replace('{n}', String(nights))}</span>}
                          </p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-blue-600 flex items-center justify-center transition-colors">
                          <ArrowLeft className="w-4 h-4 rotate-180 text-gray-400 group-hover:text-white transition-colors" />
                        </div>
                      </button>
                  ))}
                </div>
            )}

            <p className="text-center text-[11px] text-gray-400 mt-8 leading-relaxed">{t('calc.disclaimer')}</p>
          </div>
        </div>
    );
  }

  // ── 품목 선택 화면 ──
  return (
      <div className="min-h-screen bg-white pb-28">
        <div className="bg-white sticky top-0 z-20 shadow-sm border-b border-gray-100">
          <div className="max-w-2xl mx-auto px-4 pt-3 pb-2">
            <div className="flex items-center gap-2 mb-3">
              <button onClick={handleBack} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="flex-1 min-w-0">
                <h1 className="text-sm font-semibold leading-tight truncate flex items-center gap-1.5">
                  {selectedCity && (
                      <span className="inline-flex w-5 h-5 rounded overflow-hidden flex-shrink-0">
                    <FlagImage emoji={selectedCity.emoji} className="w-5 h-5" />
                  </span>
                  )}
                  {selectedCity?.name} {t('calc.title')}
                  {hasDateRange && (
                      <span className="ml-1 text-[10px] text-blue-400 font-normal">
                    {formatDate(travelStartDate)}~{formatDate(travelEndDate)}
                  </span>
                  )}
                </h1>
                <p className="text-xs text-gray-400">{t('calc.step_by_step')}</p>
              </div>
              <button
                  onClick={() => { setPhase('selectCity'); setSelectedCity(null); }}
                  className="flex-shrink-0 text-[10px] text-blue-600 border border-blue-200 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
              >
                {t('city.change')}
              </button>
            </div>

            {/* 스텝 바 */}
            <div className="flex items-center justify-between">
              {STEP_IDS.map((id, index) => {
                const isActive = index === currentStep;
                const isCompleted = index < currentStep;
                return (
                    <div key={id} className="flex items-center flex-1">
                      <div
                          className="flex flex-col items-center flex-1 cursor-pointer group"
                          onClick={() => { setCurrentStep(index); window.scrollTo(0, 0); }}
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all mb-1 ${
                            isActive ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md scale-110'
                                : isCompleted ? 'bg-green-500 text-white'
                                    : 'bg-gray-200 text-gray-400 group-hover:bg-gray-300'
                        }`}>
                          {isCompleted ? <Check className="w-3.5 h-3.5" /> : <span>{index + 1}</span>}
                        </div>
                        <div className={`text-[10px] text-center leading-tight ${
                            isActive ? 'text-blue-600 font-semibold' : isCompleted ? 'text-green-600' : 'text-gray-400'
                        }`}>
                          {stepLabel(id)}
                        </div>
                      </div>
                      {index < STEP_IDS.length - 1 && (
                          <div className="flex-shrink-0 w-6 mb-4">
                            <div className={`h-0.5 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`} />
                          </div>
                      )}
                    </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="max-w-2xl mx-auto px-4 py-5">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              STEP {currentStep + 1}
            </span>
              <span className="text-xs text-gray-400">/ {STEP_IDS.length}</span>
              {isQuantityCategory && (
                  <span className="text-[10px] text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full font-medium">
                {getBadgeText()}
              </span>
              )}
              {currentCategory === 'accommodation' && hasDateRange && nights > 0 && (
                  <span className="text-[10px] text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full font-medium">
                {t('calc.nights_auto').replace('{n}', String(nights))}
              </span>
              )}
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">{getStepHeading()}</h2>
            <p className="text-sm text-gray-500">{getStepDesc()}</p>
          </div>

          {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="bg-gray-100 rounded-xl h-24 animate-pulse" />)}
              </div>
          ) : filteredItems.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">
                {t('calc.placeholder')}
                <button onClick={handleNext} className="block mx-auto mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm">
                  {t('calc.next')}
                </button>
              </div>
          ) : (
              <div className="space-y-3 pb-6">
                {filteredItems.map(item => {
                  const isSelected = selectedItems.has(item.id);
                  const quantity = itemQuantities[item.id] || 1;
                  const totalItemPrice = item.price * (isSelected ? quantity : 1);
                  const { name, description } = getItemText(item); // ← DB 번역 적용

                  return (
                      <div
                          key={item.id}
                          onClick={() => toggleItem(item.id)}
                          className={`bg-white rounded-xl overflow-hidden border transition-all cursor-pointer hover:shadow-md ${
                              isSelected ? 'border-blue-500 shadow-sm ring-2 ring-blue-100' : 'border-gray-200 hover:border-gray-300'
                          }`}
                      >
                        <div className="flex items-center gap-3 p-3">
                          <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                            <ImageWithFallback src={item.image} alt={name} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-gray-900 mb-0.5 line-clamp-1">{name}</h3>
                            <p className="text-xs text-gray-500 mb-1 line-clamp-1">{description}</p>
                            <div className="flex items-baseline gap-1.5">
                              <p className="text-base font-semibold text-blue-600">
                                ₩{(isSelected ? totalItemPrice : item.price).toLocaleString()}
                              </p>
                              {isSelected && quantity > 1 && (
                                  <span className="text-[11px] text-gray-400">
                            (₩{item.price.toLocaleString()} × {getUnitLabel(currentCategory, quantity)})
                          </span>
                              )}
                            </div>
                          </div>

                          <div className="flex-shrink-0" onClick={e => e.stopPropagation()}>
                            {isQuantityCategory ? (
                                isSelected ? (
                                    <div className="flex items-center gap-1">
                                      <button onClick={e => changeQuantity(item.id, -1, e)} className="w-7 h-7 rounded-full bg-blue-100 hover:bg-blue-200 flex items-center justify-center transition-colors active:scale-90">
                                        <Minus className="w-3.5 h-3.5 text-blue-600" />
                                      </button>
                                      <span className="w-6 text-center text-sm font-bold text-blue-700">{quantity}</span>
                                      <button onClick={e => changeQuantity(item.id, +1, e)} className="w-7 h-7 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center transition-colors active:scale-90">
                                        <Plus className="w-3.5 h-3.5 text-white" />
                                      </button>
                                    </div>
                                ) : (
                                    <button onClick={e => { e.stopPropagation(); toggleItem(item.id); }} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-blue-500 flex items-center justify-center transition-colors group/btn active:scale-90">
                                      <Plus className="w-4 h-4 text-gray-400 group-hover/btn:text-white transition-colors" />
                                    </button>
                                )
                            ) : (
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300'}`}>
                                  {isSelected && <Check className="w-3 h-3 text-white" />}
                                </div>
                            )}
                          </div>
                        </div>

                        {isSelected && isQuantityCategory && (
                            <div className="px-3 pb-2.5">
                              <div className="bg-blue-50 rounded-lg px-3 py-1.5 flex items-center justify-between">
                        <span className="text-[11px] text-blue-600 font-medium">
                          {getUnitLabel(currentCategory, quantity)} {t('calc.basis')}
                          {currentCategory === 'accommodation' && hasDateRange && quantity === nights && (
                              <span className="ml-1 text-blue-400">({t('calc.date_basis')})</span>
                          )}
                        </span>
                                <span className="text-[11px] text-blue-700 font-bold">
                          {t('calc.total_cost_label')} ₩{totalItemPrice.toLocaleString()}
                        </span>
                              </div>
                            </div>
                        )}
                      </div>
                  );
                })}

                <button
                    onClick={handleNext}
                    className="w-full mt-4 py-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center gap-2 group hover:bg-gray-100 transition-all active:scale-[0.98]"
                >
              <span className="text-sm font-semibold text-gray-600 group-hover:text-blue-600 transition-colors">
                {canProceed ? t('calc.next_step_label') : t('calc.skip')}
              </span>
                  <ArrowLeft className="w-4 h-4 rotate-180 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                </button>
              </div>
          )}

          <p className="text-[11px] text-gray-400 text-center mt-6 leading-relaxed">{t('calc.disclaimer')}</p>
        </div>

        {/* 하단 푸터 */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-10">
          <div className="max-w-2xl mx-auto px-4 py-3">
            <div className="flex items-center justify-center gap-2 mb-2">
              <p className="text-xs text-gray-400">{t('calc.budget')}</p>
              <p className="text-sm font-semibold text-gray-800">
                {priceRange.min === priceRange.max
                    ? `₩${priceRange.min.toLocaleString()}`
                    : `₩${priceRange.min.toLocaleString()} ~ ₩${priceRange.max.toLocaleString()}`}
              </p>
            </div>
            <button
                onClick={handleNext}
                className={`w-full py-3 rounded-xl text-white text-sm font-medium transition-all shadow-md active:scale-[0.99] ${
                    !canProceed ? 'bg-gray-400 hover:bg-gray-500' : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'
                }`}
            >
              {currentStep < STEP_IDS.length - 1
                  ? (canProceed ? `${t('calc.next')}: ${stepLabel(STEP_IDS[currentStep + 1])}` : t('calc.skip'))
                  : t('calc.complete')
              }
            </button>
          </div>
        </div>
      </div>
  );
}