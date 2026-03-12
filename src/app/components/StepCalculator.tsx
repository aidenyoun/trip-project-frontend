import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { ArrowLeft, Check, MapPin } from "lucide-react";
import { supabase } from "../../supabase";

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

interface City {
  id: string;
  name: string;
  emoji: string;
  is_active: boolean;
}

const STEPS = [
  { id: 'accommodation', name: 'Accommodation', label: '숙소' },
  { id: 'transport', name: 'Transport', label: '교통' },
  { id: 'tours', name: 'Tours', label: '투어' },
  { id: 'activities', name: 'Activities', label: '액티비티' },
];

type Phase = 'selectCity' | 'selectItems';

export function StepCalculator() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('selectCity');
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [allItems, setAllItems] = useState<TravelItem[]>([]);
  const [loading, setLoading] = useState(true);

  // 도시 로드
  useEffect(() => {
    const fetchCities = async () => {
      const { data } = await supabase
          .from('cities')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: true });
      setCities(data || []);
    };
    fetchCities();
  }, []);

  // 품목 로드
  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      const { data } = await supabase.from('items').select('*').eq('is_active', true);
      setAllItems(data || []);
      setLoading(false);
    };
    fetchItems();
  }, []);

  const currentCategory = STEPS[currentStep].id;
  const currentStepInfo = STEPS[currentStep];

  const handleCitySelect = (city: City) => {
    setSelectedCity(city);
    setSelectedItems(new Set());
    setCurrentStep(0);
    setPhase('selectItems');
  };

  const toggleItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const filteredItems = allItems.filter(
      item => item.city === selectedCity?.id && item.category === currentCategory
  );

  const selectedItemsInCurrentCategory = filteredItems.filter(item => selectedItems.has(item.id));

  const priceRange = useMemo(() => {
    if (filteredItems.length === 0) return { min: 0, max: 0 };
    const itemsToCalculate = selectedItemsInCurrentCategory.length > 0
        ? selectedItemsInCurrentCategory : filteredItems;
    const prices = itemsToCalculate.map(item => item.price);
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [selectedItemsInCurrentCategory, filteredItems]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
    } else {
      const selectedItemsList = allItems.filter(item => selectedItems.has(item.id));
      const totalPrice = selectedItemsList.reduce((sum, item) => sum + item.price, 0);
      localStorage.setItem('selectedItems', JSON.stringify(selectedItemsList));
      localStorage.setItem('totalPrice', totalPrice.toString());
      localStorage.setItem('selectedCity', selectedCity?.id || '');
      localStorage.setItem('selectedCityName', selectedCity?.name || '');
      navigate('/kakao-preview');
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
      navigate('/');
    }
  };

  const canProceed = selectedItemsInCurrentCategory.length > 0;

  // ── 나라 선택 화면 ──
  if (phase === 'selectCity') {
    return (
        <div className="min-h-screen bg-white">
          {/* 헤더 */}
          <div className="bg-white sticky top-0 z-20 shadow-sm border-b border-gray-100">
            <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
              <button onClick={() => navigate('/')} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h1 className="text-sm font-semibold">Travel Budget Calculator</h1>
                <p className="text-xs text-gray-400">Step-by-step planner</p>
              </div>
            </div>
          </div>

          <div className="max-w-2xl mx-auto px-4 py-8">
            <div className="mb-8 text-center">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <MapPin className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">어디로 떠나실 건가요?</h2>
              <p className="text-sm text-gray-500">여행지를 선택하면 맞춤 견적을 도와드릴게요</p>
            </div>

            {cities.length === 0 ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}
                </div>
            ) : (
                <div className="space-y-3">
                  {cities.map(city => (
                      <button
                          key={city.id}
                          onClick={() => handleCitySelect(city)}
                          className="w-full flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-2xl hover:border-blue-400 hover:shadow-md transition-all text-left group"
                      >
                        <span className="text-3xl">{city.emoji}</span>
                        <div className="flex-1">
                          <p className="text-base font-semibold text-gray-900">{city.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            숙소 · 교통 · 투어 · 액티비티 견적
                          </p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-blue-600 flex items-center justify-center transition-colors">
                          <ArrowLeft className="w-4 h-4 rotate-180 text-gray-400 group-hover:text-white transition-colors" />
                        </div>
                      </button>
                  ))}
                </div>
            )}

            {/* 가격 면책 문구 */}
            <p className="text-center text-[11px] text-gray-400 mt-8 leading-relaxed">
              * 표시된 금액은 참고용이며, 날짜·시즌·재고에 따라 달라질 수 있습니다.
            </p>
          </div>
        </div>
    );
  }

  // ── 품목 선택 화면 ──
  return (
      <div className="min-h-screen bg-white pb-28">
        <div className="bg-white sticky top-0 z-20 shadow-sm border-b border-gray-100">
          <div className="max-w-2xl mx-auto px-4 pt-3 pb-2">

            {/* 타이틀 */}
            <div className="flex items-center gap-2 mb-3">
              <button onClick={handleBack} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="flex-1">
                <h1 className="text-sm font-semibold leading-tight">
                  {selectedCity?.emoji} {selectedCity?.name} 여행 견적
                </h1>
                <p className="text-xs text-gray-400">Step-by-step planner</p>
              </div>
              {/* 나라 변경 버튼 */}
              <button
                  onClick={() => { setPhase('selectCity'); setSelectedCity(null); }}
                  className="text-[10px] text-blue-600 border border-blue-200 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
              >
                나라 변경
              </button>
            </div>

            {/* 스텝 바 */}
            <div className="flex items-center justify-between">
              {STEPS.map((step, index) => {
                const isActive = index === currentStep;
                const isCompleted = index < currentStep;
                return (
                    <div key={step.id} className="flex items-center flex-1">
                      <div 
                        className="flex flex-col items-center flex-1 cursor-pointer group"
                        onClick={() => {
                          setCurrentStep(index);
                          window.scrollTo(0, 0);
                        }}
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all mb-1 ${
                            isActive ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md scale-110'
                                : isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400 group-hover:bg-gray-300'
                        }`}>
                          {isCompleted ? <Check className="w-3.5 h-3.5" /> : <span>{index + 1}</span>}
                        </div>
                        <div className={`text-[10px] text-center leading-tight ${
                            isActive ? 'text-blue-600 font-semibold' : isCompleted ? 'text-green-600' : 'text-gray-400'
                        }`}>
                          {step.name}
                        </div>
                      </div>
                      {index < STEPS.length - 1 && (
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
            <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              STEP {currentStep + 1}
            </span>
              <span className="text-xs text-gray-400">/ {STEPS.length}</span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Select your {currentStepInfo.name} in {selectedCity?.name}
            </h2>
            <p className="text-sm text-gray-500">
              {currentCategory === 'accommodation' && 'Multiple choices allowed for comparison'}
              {currentCategory === 'transport' && 'Choose one or more transport options'}
              {currentCategory === 'tours' && 'Add all tours you want to experience'}
              {currentCategory === 'activities' && 'Pick activities to enjoy'}
            </p>
          </div>

          {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="bg-gray-100 rounded-xl h-24 animate-pulse" />)}
              </div>
          ) : filteredItems.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">
                이 카테고리에 등록된 항목이 없습니다.
                <button
                    onClick={handleNext}
                    className="block mx-auto mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm"
                >
                  다음 단계로 이동
                </button>
              </div>
          ) : (
              <div className="space-y-3 pb-6">
                {filteredItems.map(item => {
                  const isSelected = selectedItems.has(item.id);
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
                            <ImageWithFallback src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-gray-900 mb-0.5 line-clamp-1">{item.name}</h3>
                            <p className="text-xs text-gray-500 mb-1 line-clamp-1">{item.description}</p>
                            <p className="text-base font-semibold text-blue-600">₩{item.price.toLocaleString()}</p>
                          </div>
                          <div className="flex-shrink-0">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                isSelected ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                          </div>
                        </div>
                      </div>
                  );
                })}

                {/* 카테고리별 하단 넘김 버튼 */}
                <button
                    onClick={handleNext}
                    className="w-full mt-4 py-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center gap-2 group hover:bg-gray-100 transition-all active:scale-[0.98]"
                >
                  <span className="text-sm font-semibold text-gray-600 group-hover:text-blue-600 transition-colors">
                    {canProceed ? '선택 완료, 다음으로' : '이 단계 건너뛰기'}
                  </span>
                  <ArrowLeft className="w-4 h-4 rotate-180 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                </button>
              </div>
          )}

          {/* 가격 면책 문구 */}
          <p className="text-[11px] text-gray-400 text-center mt-6 leading-relaxed">
            * 표시된 금액은 참고용이며, 날짜·시즌·재고에 따라<br />실제 가격이 달라질 수 있습니다.
          </p>
        </div>

        {/* 하단 푸터 */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-10">
          <div className="max-w-2xl mx-auto px-4 py-3">
            <div className="flex items-center justify-center gap-2 mb-2">
              <p className="text-xs text-gray-400">Estimated Budget</p>
              <p className="text-sm font-semibold text-gray-800">
                {priceRange.min === priceRange.max
                    ? `₩${priceRange.min.toLocaleString()}`
                    : `₩${priceRange.min.toLocaleString()} ~ ₩${priceRange.max.toLocaleString()}`}
              </p>
            </div>
            <button
                onClick={handleNext}
                className={`w-full py-3 rounded-xl text-white text-sm font-medium transition-all shadow-md active:scale-[0.99] ${
                    !canProceed
                        ? 'bg-gray-400 hover:bg-gray-500'
                        : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'
                }`}
            >
              {currentStep < STEPS.length - 1 
                ? (canProceed ? `Next: ${STEPS[currentStep + 1].name}` : 'Skip to next step')
                : (canProceed ? 'Complete & View Summary' : 'Finish & View Summary')
              }
            </button>
          </div>
        </div>
      </div>
  );
}