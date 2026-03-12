import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { ArrowLeft, Check } from "lucide-react";

interface TravelItem {
  id: string;
  city: string;
  category: string;
  name: string;
  price: number;
  image: string;
  description: string;
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

const TRAVEL_ITEMS: TravelItem[] = [
  // Bangkok Items
  // ACCOMMODATION
  {
    id: "hotel-5star-bkk",
    city: "bangkok",
    category: "accommodation",
    name: "5성급 럭셔리 호텔 (3박)",
    price: 450000,
    image: "https://images.unsplash.com/photo-1646974400439-321c4a9240b9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBob3RlbCUyMHJvb20lMjBCYW5na29rJTIwbW9kZXJufGVufDF8fHx8MTc3MzI3OTQ5M3ww&ixlib=rb-4.1.0&q=80&w=1080",
    description: "인피니티 풀 & 조식 포함, 시암 지역"
  },
  {
    id: "hotel-4star-bkk",
    city: "bangkok",
    category: "accommodation",
    name: "4성급 부티크 호텔 (3박)",
    price: 320000,
    image: "https://images.unsplash.com/photo-1646974400439-321c4a9240b9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBob3RlbCUyMHJvb20lMjBCYW5na29rJTIwbW9kZXJufGVufDF8fHx8MTc3MzI3OTQ5M3ww&ixlib=rb-4.1.0&q=80&w=1080",
    description: "수영장 포함, 수쿰윗 역 근처"
  },

  // TRANSPORT
  {
    id: "airport-limo-bkk",
    city: "bangkok",
    category: "transport",
    name: "공항 리무진 서비스",
    price: 85000,
    image: "https://images.unsplash.com/photo-1771248647341-9d8f567b051d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcmVtaXVtJTIwdmFuJTIwdHJhbnNwb3J0YXRpb24lMjBsdXh1cnl8ZW58MXx8fHwxNzczMjgzMjUyfDA&ixlib=rb-4.1.0&q=80&w=1080",
    description: "호텔 픽업&드랍, 고급 세단"
  },
  {
    id: "bts-pass-bkk",
    city: "bangkok",
    category: "transport",
    name: "BTS 3일 무제한 패스",
    price: 35000,
    image: "https://images.unsplash.com/photo-1542382257-80dedb725088?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxza3l0cmFpbiUyMHN1YndheXxlbnwxfHx8fDE3NzMyODc1Njh8MA&ixlib=rb-4.1.0&q=80&w=1080",
    description: "BTS 스카이트레인 무제한 이용"
  },

  // TOURS
  {
    id: "night-tour-bkk",
    city: "bangkok",
    category: "tours",
    name: "방콕 나이트 투어",
    price: 85000,
    image: "https://images.unsplash.com/photo-1734069956282-aabac27c33bf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxCYW5na29rJTIwbmlnaHQlMjBtYXJrZXQlMjBzdHJlZXQlMjBmb29kfGVufDF8fHx8MTc3MzI3OTQ5NHww&ixlib=rb-4.1.0&q=80&w=1080",
    description: "야시장 & 야경 크루즈, 디너 포함"
  },

  // ACTIVITIES
  {
    id: "thai-massage-bkk",
    city: "bangkok",
    category: "activities",
    name: "태국 전통 마사지 & 스파",
    price: 55000,
    image: "https://images.unsplash.com/photo-1596178060671-7a80dc8059ea?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxUaGFpJTIwbWFzc2FnZSUyMHNwYSUyMHdlbGxuZXNzfGVufDF8fHx8MTc3MzI3OTQ5NXww&ixlib=rb-4.1.0&q=80&w=1080",
    description: "2시간 프리미엄 힐링 코스"
  },

  // Da Nang Items
  {
    id: "hotel-5star-dn",
    city: "danang",
    category: "accommodation",
    name: "5성급 비치 리조트 (3박)",
    price: 420000,
    image: "https://images.unsplash.com/photo-1723515087351-51d2fa9e642d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxEYSUyME5hbmclMjBWaWV0bmFtJTIwYmVhY2glMjByZXNvcnR8ZW58MXx8fHwxNzczMjgzMjUxfDA&ixlib=rb-4.1.0&q=80&w=1080",
    description: "오션뷰 & 프라이빗 비치, 올인클루시브"
  },
  {
    id: "premium-van-dn",
    city: "danang",
    category: "transport",
    name: "16인승 프리미엄 밴 (공항 픽업)",
    price: 95000,
    image: "https://images.unsplash.com/photo-1771248647341-9d8f567b051d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcmVtaXVtJTIwdmFuJTIwdHJhbnNwb3J0YXRpb24lMjBsdXh1cnl8ZW58MXx8fHwxNzczMjgzMjUyfDA&ixlib=rb-4.1.0&q=80&w=1080",
    description: "럭셔리 차량, 에어컨 완비"
  },
  {
    id: "cable-car-dn",
    city: "danang",
    category: "tours",
    name: "바나힐 케이블카 & 테마파크",
    price: 68000,
    image: "https://images.unsplash.com/photo-1613313274321-a41a1b61233c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYWJsZSUyMGNhciUyMG1vdW50YWluJTIwdmlldyUyMFZpZXRuYW18ZW58MXx8fHwxNzczMjgzMjUzfDA&ixlib=rb-4.1.0&q=80&w=1080",
    description: "골든 브릿지 & 테마파크 입장권"
  },
  {
    id: "massage-dn",
    city: "danang",
    category: "activities",
    name: "베트남 전통 마사지",
    price: 45000,
    image: "https://images.unsplash.com/photo-1596178060671-7a80dc8059ea?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxUaGFpJTIwbWFzc2FnZSUyMHNwYSUyMHdlbGxuZXNzfGVufDF8fHx8MTc3MzI3OTQ5NXww&ixlib=rb-4.1.0&q=80&w=1080",
    description: "90분 풀 바디 마사지"
  },

  // Tokyo Items
  {
    id: "hotel-tokyo-shinjuku",
    city: "tokyo",
    category: "accommodation",
    name: "신주쿠 그레이서리 호텔 (3박)",
    price: 580000,
    image: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxUb2t5byUyMGhvdGVsJTIwcm9vbXxlbnwxfHx8fDE3NzMyOTM0NTR8MA&ixlib=rb-4.1.0&q=80&w=1080",
    description: "고질라 헤드 뷰, 역세권"
  },
  {
    id: "hotel-tokyo-ryokan",
    city: "tokyo",
    category: "accommodation",
    name: "도심 속 전통 료칸 (3박)",
    price: 750000,
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyeW9rYW4lMjBqYXBhbiUyMGhvdGVsJTIwdHJhZGl0aW9uYWx8ZW58MXx8fHwxNzczMjkzNDU1fDA&ixlib=rb-4.1.0&q=80&w=1080",
    description: "온천 및 가이세키 요리 포함"
  },
  {
    id: "suica-pass-tokyo",
    city: "tokyo",
    category: "transport",
    name: "웰컴 스이카 (Welcome Suica)",
    price: 35000,
    image: "https://images.unsplash.com/photo-1510253406560-63664797099e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxKYXBhbiUyMHRyYWluJTIwcGFzc3xlbnwxfHx8fDE3NzMyOTM0NTZ8MA&ixlib=rb-4.1.0&q=80&w=1080",
    description: "도쿄 지하철 무제한 & 충전식 카드"
  },
  {
    id: "skyliner-tokyo",
    city: "tokyo",
    category: "transport",
    name: "나리타 스카이라이너 (왕복)",
    price: 48000,
    image: "https://images.unsplash.com/photo-1532551400262-e6e23253b754?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxKYXBhbiUyMGhpZ2glMjBzcGVlZCUyMHRyYWluJTIwc2hpbmthbnNlbnxlbnwxfHx8fDE3NzMyOTM0NTZ8MA&ixlib=rb-4.1.0&q=80&w=1080",
    description: "나리타 공항 - 시내 36분 주파"
  },
  {
    id: "disney-tokyo",
    city: "tokyo",
    category: "tours",
    name: "도쿄 디즈니랜드 1일권",
    price: 95000,
    image: "https://images.unsplash.com/photo-1545129139-1beb780cf337?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaXNuZXlsYW5kJTIwdG9reW98ZW58MXx8fHwxNzczMjkzNDU2fDA&ixlib=rb-4.1.0&q=80&w=1080",
    description: "꿈과 희망의 나라 디즈니랜드 입장권"
  },
  {
    id: "teamlab-tokyo",
    city: "tokyo",
    category: "tours",
    name: "팀랩 플래닛 도쿄 (teamLab)",
    price: 38000,
    image: "https://images.unsplash.com/photo-1550985543-f47f547499aa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZWFtbGFiJTIwcGxhbmV0cyUyMHRva3lvfGVufDF8fHx8MTc3MzI5MzQ1N3ww&ixlib=rb-4.1.0&q=80&w=1080",
    description: "디지털 아트 박물관 체험형 전시"
  },
  {
    id: "omakase-tokyo",
    city: "tokyo",
    category: "activities",
    name: "긴자 스시 오마카세",
    price: 250000,
    image: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdXNoaSUyMG9tYWthc2UlMjBkaW5uZXJ8ZW58MXx8fHwxNzczMjkzNDU3fDA&ixlib=rb-4.1.0&q=80&w=1080",
    description: "현지 장인이 쥐어주는 프리미엄 스시"
  },
  {
    id: "shibuya-sky-tokyo",
    city: "tokyo",
    category: "activities",
    name: "시부야 스카이 전망대",
    price: 22000,
    image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxTaGlidXlhJTIwU2t5JTIwdmlld3xlbnwxfHx8fDE3NzMyOTM0NTd8MA&ixlib=rb-4.1.0&q=80&w=1080",
    description: "시부야 최상층 야경 및 포토존"
  },
];

export function StepCalculator() {
  const navigate = useNavigate();
  const [selectedCity, setSelectedCity] = useState('bangkok');
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

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

  const filteredItems = TRAVEL_ITEMS.filter(
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
      const selectedItemsList = TRAVEL_ITEMS.filter(item => selectedItems.has(item.id));
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
          {/* 스텝 타이틀 */}
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

          {/* 품목 리스트 */}
          <div className="space-y-3">
            {filteredItems.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>No items available in this category.</p>
                </div>
            ) : (
                filteredItems.map(item => {
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
                          {/* 썸네일 */}
                          <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                            <ImageWithFallback
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover"
                            />
                          </div>

                          {/* 내용 */}
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

                          {/* 체크박스 */}
                          <div className="flex-shrink-0">
                            <div
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                    isSelected
                                        ? 'bg-blue-500 border-blue-500'
                                        : 'bg-white border-gray-300'
                                }`}
                            >
                              {isSelected && (
                                  <Check className="w-3 h-3 text-white" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                  );
                })
            )}
          </div>
        </div>

        {/* 하단 고정 푸터 — 컴팩트 */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-10">
          <div className="max-w-2xl mx-auto px-4 py-3">
            {/* 예산 표시 — 인라인으로 작게 */}
            <div className="flex items-center justify-center gap-2 mb-2">
              <p className="text-xs text-gray-400">Estimated Budget</p>
              <p className="text-sm font-semibold text-gray-800">
                {selectedItemsInCurrentCategory.length > 0 ? (
                    priceRange.min === priceRange.max ? (
                        `₩${priceRange.min.toLocaleString()}`
                    ) : (
                        `₩${priceRange.min.toLocaleString()} ~ ₩${priceRange.max.toLocaleString()}`
                    )
                ) : (
                    `₩${priceRange.min.toLocaleString()} ~ ₩${priceRange.max.toLocaleString()}`
                )}
              </p>
            </div>

            {/* Next 버튼 */}
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