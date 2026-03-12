import { useState } from "react";
import { useNavigate } from "react-router";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { ArrowLeft, Check, ChevronDown } from "lucide-react";
import { Switch } from "./ui/switch";

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
];

const CATEGORIES = [
  { id: 'all', name: '전체', icon: '🌟' },
  { id: 'accommodation', name: '숙소', icon: '🏨' },
  { id: 'transport', name: '교통', icon: '🚗' },
  { id: 'tours', name: '투어 & 티켓', icon: '🎫' },
  { id: 'activities', name: '액티비티', icon: '💆' },
];

const TRAVEL_ITEMS: TravelItem[] = [
  // Bangkok Items
  {
    id: "hotel-5star-bkk",
    city: "bangkok",
    category: "accommodation",
    name: "5성급 럭셔리 호텔 (3박)",
    price: 450000,
    image: "https://images.unsplash.com/photo-1646974400439-321c4a9240b9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBob3RlbCUyMHJvb20lMjBCYW5na29rJTIwbW9kZXJufGVufDF8fHx8MTc3MzI3OTQ5M3ww&ixlib=rb-4.1.0&q=80&w=1080",
    description: "수영장 & 조식 포함"
  },
  {
    id: "hotel-3star-bkk",
    city: "bangkok",
    category: "accommodation",
    name: "3성급 호텔 (3박)",
    price: 180000,
    image: "https://images.unsplash.com/photo-1646974400439-321c4a9240b9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBob3RlbCUyMHJvb20lMjBCYW5na29rJTIwbW9kZXJufGVufDF8fHx8MTc3MzI3OTQ5M3ww&ixlib=rb-4.1.0&q=80&w=1080",
    description: "깔끔한 시설, 교통 편리"
  },
  {
    id: "night-tour-bkk",
    city: "bangkok",
    category: "tours",
    name: "방콕 나이트 투어",
    price: 85000,
    image: "https://images.unsplash.com/photo-1734069956282-aabac27c33bf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxCYW5na29rJTIwbmlnaHQlMjBtYXJrZXQlMjBzdHJlZXQlMjBmb29kfGVufDF8fHx8MTc3MzI3OTQ5NHww&ixlib=rb-4.1.0&q=80&w=1080",
    description: "야시장 & 야경 크루즈"
  },
  {
    id: "floating-market-bkk",
    city: "bangkok",
    category: "tours",
    name: "수상시장 투어",
    price: 65000,
    image: "https://images.unsplash.com/photo-1642391326157-5ec6935dd7c0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxUaGFpbGFuZCUyMGZsb2F0aW5nJTIwbWFya2V0JTIwYm9hdCUyMHRvdXJ8ZW58MXx8fHwxNzczMjc5NDk0fDA&ixlib=rb-4.1.0&q=80&w=1080",
    description: "보트 투어 & 현지 시장"
  },
  {
    id: "rooftop-bar-bkk",
    city: "bangkok",
    category: "activities",
    name: "루프탑 바 디너",
    price: 120000,
    image: "https://images.unsplash.com/photo-1647319646105-d53d1c481d5a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxCYW5na29rJTIwcm9vZnRvcCUyMGJhciUyMHNreWxpbmUlMjBzdW5zZXR8ZW58MXx8fHwxNzczMjc5NDk1fDA&ixlib=rb-4.1.0&q=80&w=1080",
    description: "스카이 바 디너 코스"
  },
  {
    id: "thai-massage-bkk",
    city: "bangkok",
    category: "activities",
    name: "태국 전통 마사지 & 스파",
    price: 55000,
    image: "https://images.unsplash.com/photo-1596178060671-7a80dc8059ea?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxUaGFpJTIwbWFzc2FnZSUyMHNwYSUyMHdlbGxuZXNzfGVufDF8fHx8MTc3MzI3OTQ5NXww&ixlib=rb-4.1.0&q=80&w=1080",
    description: "2시간 프리미엄 코스"
  },
  // Da Nang Items
  {
    id: "hotel-5star-dn",
    city: "danang",
    category: "accommodation",
    name: "5성급 비치 리조트 (3박)",
    price: 420000,
    image: "https://images.unsplash.com/photo-1723515087351-51d2fa9e642d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxEYSUyME5hbmclMjBWaWV0bmFtJTIwYmVhY2glMjByZXNvcnR8ZW58MXx8fHwxNzczMjgzMjUxfDA&ixlib=rb-4.1.0&q=80&w=1080",
    description: "오션뷰 & 프라이빗 비치"
  },
  {
    id: "hotel-3star-dn",
    city: "danang",
    category: "accommodation",
    name: "3성급 호텔 (3박)",
    price: 150000,
    image: "https://images.unsplash.com/photo-1723515087351-51d2fa9e642d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxEYSUyME5hbmclMjBWaWV0bmFtJTIwYmVhY2glMjByZXNvcnR8ZW58MXx8fHwxNzczMjgzMjUxfDA&ixlib=rb-4.1.0&q=80&w=1080",
    description: "깔끔한 시설, 해변 근처"
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
    id: "scooter-rental-dn",
    city: "danang",
    category: "transport",
    name: "스쿠터 렌탈 (3일)",
    price: 45000,
    image: "https://images.unsplash.com/photo-1765030689181-fa299cd404ea?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzY29vdGVyJTIwbW90b3JjeWNsZSUyMHJlbnRhbCUyMEFzaWF8ZW58MXx8fHwxNzczMjgzMjUzfDA&ixlib=rb-4.1.0&q=80&w=1080",
    description: "자유로운 이동, 헬멧 포함"
  },
  {
    id: "vip-fast-track-dn",
    city: "danang",
    category: "tours",
    name: "VIP Fast Track (공항 출입국)",
    price: 75000,
    image: "https://images.unsplash.com/photo-1733773874642-4393bf44b227?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxWSVAlMjBhaXJwb3J0JTIwZmFzdCUyMHRyYWNrJTIwbG91bmdlfGVufDF8fHx8MTc3MzI4MzI1Mnww&ixlib=rb-4.1.0&q=80&w=1080",
    description: "빠른 출입국 수속"
  },
  {
    id: "cable-car-dn",
    city: "danang",
    category: "tours",
    name: "바나힐 케이블카 & 테마파크",
    price: 68000,
    image: "https://images.unsplash.com/photo-1613313274321-a41a1b61233c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYWJsZSUyMGNhciUyMG1vdW50YWluJTIwdmlldyUyMFZpZXRuYW18ZW58MXx8fHwxNzczMjgzMjUzfDA&ixlib=rb-4.1.0&q=80&w=1080",
    description: "골든 브릿지 & 입장권"
  },
  {
    id: "yacht-tour-dn",
    city: "danang",
    category: "tours",
    name: "프라이빗 요트 투어",
    price: 280000,
    image: "https://images.unsplash.com/photo-1697413818075-cb0f170cfce1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcml2YXRlJTIweWFjaHQlMjB0b3VyJTIwdHJvcGljYWx8ZW58MXx8fHwxNzczMjgzMjUzfDA&ixlib=rb-4.1.0&q=80&w=1080",
    description: "4시간, 스노클링 포함"
  },
];

export function Calculator() {
  const navigate = useNavigate();
  const [selectedCity, setSelectedCity] = useState('bangkok');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  const toggleItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      // 같은 도시의 같은 카테고리의 다른 항목 제거 (숙소는 하나만 선택 가능)
      const item = TRAVEL_ITEMS.find(i => i.id === itemId);
      if (item?.category === "accommodation") {
        TRAVEL_ITEMS
          .filter(i => i.category === "accommodation" && i.city === item.city)
          .forEach(i => newSelected.delete(i.id));
      }
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const filteredItems = TRAVEL_ITEMS.filter(item => {
    if (item.city !== selectedCity) return false;
    if (selectedCategory === 'all') return true;
    return item.category === selectedCategory;
  });

  const totalPrice = TRAVEL_ITEMS
    .filter(item => selectedItems.has(item.id))
    .reduce((sum, item) => sum + item.price, 0);

  const selectedItemsList = TRAVEL_ITEMS.filter(item => selectedItems.has(item.id));

  const handleSendToKakao = () => {
    if (selectedItems.size === 0) return;
    
    localStorage.setItem('selectedItems', JSON.stringify(selectedItemsList));
    localStorage.setItem('totalPrice', totalPrice.toString());
    localStorage.setItem('selectedCity', selectedCity);
    
    navigate('/kakao-preview');
  };

  const currentCity = CITIES.find(c => c.id === selectedCity);

  return (
    <div className="min-h-screen bg-gray-50 pb-40">
      {/* Header */}
      <div className="bg-white sticky top-0 z-20 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button 
            onClick={() => navigate('/')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl">여행 예산 계산기</h1>
            <p className="text-sm text-gray-500">맞춤 여행 플래너</p>
          </div>
        </div>

        {/* City Selector - Pill Shaped */}
        <div className="max-w-2xl mx-auto px-4 pb-4">
          <div className="relative">
            <button
              onClick={() => setShowCityDropdown(!showCityDropdown)}
              className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-full px-5 py-3 flex items-center justify-between hover:border-blue-300 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{currentCity?.emoji}</span>
                <div className="text-left">
                  <p className="text-xs text-gray-500">여행지 선택</p>
                  <p className="text-base text-gray-900">{currentCity?.name}</p>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform ${showCityDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {showCityDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden z-30">
                {CITIES.map(city => (
                  <button
                    key={city.id}
                    onClick={() => {
                      setSelectedCity(city.id);
                      setShowCityDropdown(false);
                      setSelectedItems(new Set()); // Clear selections when changing city
                    }}
                    className={`w-full px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                      selectedCity === city.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <span className="text-2xl">{city.emoji}</span>
                    <span className="text-base text-gray-900">{city.name}</span>
                    {selectedCity === city.id && (
                      <Check className="w-5 h-5 text-blue-600 ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Category Tabs - Horizontal Scroll */}
        <div className="max-w-2xl mx-auto overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 px-4 pb-4">
            {CATEGORIES.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm transition-all ${
                  selectedCategory === category.id
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="mr-1.5">{category.icon}</span>
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>해당 카테고리에 상품이 없습니다.</p>
          </div>
        ) : (
          filteredItems.map(item => (
            <div
              key={item.id}
              className={`bg-white rounded-2xl overflow-hidden border-2 transition-all shadow-sm hover:shadow-md ${
                selectedItems.has(item.id)
                  ? 'border-blue-400 ring-2 ring-blue-100'
                  : 'border-gray-100'
              }`}
            >
              <div className="flex gap-4 p-4">
                {/* Thumbnail */}
                <div className="w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100">
                  <ImageWithFallback
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <h3 className="text-base text-gray-900 mb-1 line-clamp-1">
                        {item.name}
                      </h3>
                      <p className="text-xs text-gray-500 mb-2 line-clamp-1">
                        {item.description}
                      </p>
                      <p className="text-lg text-blue-600">
                        ₩{item.price.toLocaleString()}
                      </p>
                    </div>

                    {/* Toggle Switch */}
                    <div className="flex-shrink-0 pt-1">
                      <Switch
                        checked={selectedItems.has(item.id)}
                        onCheckedChange={() => toggleItem(item.id)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          {/* Total Price */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">총 예상 비용</p>
              <p className="text-2xl text-gray-900">
                ₩{totalPrice.toLocaleString()}
              </p>
            </div>
            <div className="text-sm text-gray-500">
              <Check className="w-4 h-4 inline mr-1" />
              {selectedItems.size}개 선택
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={handleSendToKakao}
            disabled={selectedItems.size === 0}
            className={`w-full py-4 rounded-2xl text-white text-base flex items-center justify-center gap-2 transition-all shadow-lg ${
              selectedItems.size === 0
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 active:scale-[0.98]'
            }`}
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3C6.5 3 2 6.58 2 11c0 2.5 1.5 4.7 3.8 6.2-.2.8-.8 2.8-1 3.2-.1.3 0 .5.1.6.1.1.3.2.5.1.5-.1 3.5-2.3 4.1-2.7.5.1 1 .1 1.5.1 5.5 0 10-3.6 10-8s-4.5-8-10-8z"/>
            </svg>
            <span className="text-gray-900">견적서 카톡으로 받기</span>
          </button>
        </div>
      </div>
    </div>
  );
}