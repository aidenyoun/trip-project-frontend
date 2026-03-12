import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { ArrowLeft, Check } from "lucide-react";
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

const CITIES = [
  { id: 'bangkok', name: '방콕', emoji: '🇹🇭' },
  { id: 'danang', name: '다낭', emoji: '🇻🇳' },
  { id: 'tokyo', name: '도쿄', emoji: '🇯🇵' },
];

const STEPS = [
  { id: 'accommodation', name: 'Accommodation', icon: '🏨', label: '숙소' },
  { id: 'transport', name: 'Transport', icon: '🚗', label: '교통' },
  { id: 'tours', name: 'Tours', icon: '🎫', label: '투어' },
  { id: 'activities', name: 'Activities', icon: '💆', label: '액티비티' },
];

export function StepCalculator() {
  const navigate = useNavigate();
  const [selectedCity, setSelectedCity] = useState('bangkok');
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [allItems, setAllItems] = useState<TravelItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Supabase에서 전체 데이터 한 번만 로드
  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      const { data, error } = await supabase
          .from('items')
          .select('*')
          .eq('is_active', true);

      if (error) {
        console.error('데이터 로드 실패:', error);
      } else {
        setAllItems(data || []);
      }
      setLoading(false);
    };

    fetchItems();
  }, []);

  const currentCategory = STEPS[currentStep].id;
  const currentStepInfo = STEPS[currentStep];

  const handleCityChange = (cityId: string) => {
    setSelectedCity(cityId);
    setSelectedItems(new Set());
    setCurrentStep(0);
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
      item => item.city === selectedCity && item.category === currentCategory
  );

  const selectedItemsInCurrentCategory = filteredItems.filter(item =>
      selectedItems.has(item.id)
  );

  const priceRange = useMemo(() => {
    if (filteredItems.length === 0) return { min: 0, max: 0 };

    const itemsToCalculate = selectedItemsInCurrentCategory.length > 0
        ? selectedItemsInCurrentCategory
        : filteredItems;

    const prices = itemsToCalculate.map(item => item.price);
    return {
      min: Math.min(...prices),
      max: Math.max(...prices)
    };
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
      localStorage.setItem('selectedCity', selectedCity);

      navigate('/kakao-preview');
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    } else {
      navigate('/');
    }
  };

  const canProceed = selectedItemsInCurrentCategory.length > 0;

  return (
      <div className="min-h-screen bg-white pb-28">
        {/* Header — 모바일 컴팩트 */}
        <div className="bg-white sticky top-0 z-20 shadow-sm border-b border-gray-100">
          <div className="max-w-2xl mx-auto px-4 pt-3 pb-2">

            {/* 타이틀 행 */}
            <div className="flex items-center gap-2 mb-3">
              <button
                  onClick={handleBack}
                  className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="flex-1">
                <h1 className="text-sm font-semibold leading-tight">Travel Budget Calculator</h1>
                <p className="text-xs text-gray-400">Step-by-step planner</p>
              </div>
            </div>

            {/* 도시 선택 */}
            <div className="mb-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 px-0.5">
                Choose Destination
              </p>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                {CITIES.map((city) => (
                    <button
                        key={city.id}
                        onClick={() => handleCityChange(city.id)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-full whitespace-nowrap transition-all border text-xs ${
                            selectedCity === city.id
                                ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                    >
                      <span>{city.emoji}</span>
                      <span className="font-medium">{city.name}</span>
                    </button>
                ))}
              </div>
            </div>

            {/* 스텝 바 */}
            <div className="flex items-center justify-between">
              {STEPS.map((step, index) => {
                const isActive = index === currentStep;
                const isCompleted = index < currentStep;

                return (
                    <div key={step.id} className="flex items-center flex-1">
                      <div className="flex flex-col items-center flex-1">
                        <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all mb-1 ${
                                isActive
                                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md scale-110'
                                    : isCompleted
                                        ? 'bg-green-500 text-white'
                                        : 'bg-gray-200 text-gray-400'
                            }`}
                        >
                          {isCompleted ? (
                              <Check className="w-3.5 h-3.5" />
                          ) : (
                              <span>{index + 1}</span>
                          )}
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
              Select your {currentStepInfo.name} in {CITIES.find(c => c.id === selectedCity)?.name}
            </h2>
            <p className="text-sm text-gray-500">
              {currentCategory === 'accommodation' && 'Multiple choices allowed for comparison'}
              {currentCategory === 'transport' && 'Choose one or more transport options'}
              {currentCategory === 'tours' && 'Add all tours you want to experience'}
              {currentCategory === 'activities' && 'Pick activities to enjoy'}
            </p>
          </div>

          {/* 로딩 스켈레톤 */}
          {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-gray-100 rounded-xl h-24 animate-pulse" />
                ))}
              </div>
          ) : filteredItems.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No items available in this category.</p>
              </div>
          ) : (
              <div className="space-y-3">
                {filteredItems.map(item => {
                  const isSelected = selectedItems.has(item.id);
                  return (
                      <div
                          key={item.id}
                          onClick={() => toggleItem(item.id)}
                          className={`bg-white rounded-xl overflow-hidden border transition-all cursor-pointer hover:shadow-md ${
                              isSelected
                                  ? 'border-blue-500 shadow-sm ring-2 ring-blue-100'
                                  : 'border-gray-200 hover:border-gray-300'
                          }`}
                      >
                        <div className="flex items-center gap-3 p-3">
                          <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                            <ImageWithFallback
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-gray-900 mb-0.5 line-clamp-1">
                              {item.name}
                            </h3>
                            <p className="text-xs text-gray-500 mb-1.5 line-clamp-1">
                              {item.description}
                            </p>
                            <p className="text-base font-semibold text-blue-600">
                              ₩{item.price.toLocaleString()}
                            </p>
                          </div>
                          <div className="flex-shrink-0">
                            <div
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                    isSelected
                                        ? 'bg-blue-500 border-blue-500'
                                        : 'bg-white border-gray-300'
                                }`}
                            >
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                          </div>
                        </div>
                      </div>
                  );
                })}
              </div>
          )}
        </div>

        {/* 하단 고정 푸터 */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-10">
          <div className="max-w-2xl mx-auto px-4 py-3">
            <div className="flex items-center justify-center gap-2 mb-2">
              <p className="text-xs text-gray-400">Estimated Budget</p>
              <p className="text-sm font-semibold text-gray-800">
                {selectedItemsInCurrentCategory.length > 0 ? (
                    priceRange.min === priceRange.max
                        ? `₩${priceRange.min.toLocaleString()}`
                        : `₩${priceRange.min.toLocaleString()} ~ ₩${priceRange.max.toLocaleString()}`
                ) : (
                    `₩${priceRange.min.toLocaleString()} ~ ₩${priceRange.max.toLocaleString()}`
                )}
              </p>
            </div>

            <button
                onClick={handleNext}
                disabled={!canProceed}
                className={`w-full py-3 rounded-xl text-white text-sm font-medium transition-all ${
                    !canProceed
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 active:scale-[0.99] shadow-md'
                }`}
            >
              {currentStep < STEPS.length - 1
                  ? `Next Step: ${STEPS[currentStep + 1].name}`
                  : 'Complete & View Summary'}
            </button>

            {!canProceed && (
                <p className="text-xs text-center text-gray-400 mt-1">
                  Please select at least one item to continue
                </p>
            )}
          </div>
        </div>
      </div>
  );
}