import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { supabase } from "../../supabase";

declare global {
  interface Window {
    Kakao: any;
  }
}

interface TravelItem {
  id: string;
  category: string;
  name: string;
  price: number;
  image: string;
  description: string;
  affiliate_link: string | null;
}

export function KakaoPreview() {
  const navigate = useNavigate();
  const [selectedItems, setSelectedItems] = useState<TravelItem[]>([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [selectedCityName, setSelectedCityName] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    const items = localStorage.getItem('selectedItems');
    const price = localStorage.getItem('totalPrice');
    const city = localStorage.getItem('selectedCity');
    const cityName = localStorage.getItem('selectedCityName');

    if (items) setSelectedItems(JSON.parse(items));
    if (price) setTotalPrice(parseInt(price));
    if (city) setSelectedCity(city);
    if (cityName) setSelectedCityName(cityName);
  }, []);

  // 카카오 SDK 초기화
  useEffect(() => {
    const kakaoKey = import.meta.env.VITE_KAKAO_JS_KEY;
    const initKakao = () => {
      if (window.Kakao && !window.Kakao.isInitialized()) {
        window.Kakao.init(kakaoKey);
      }
    };
    if (window.Kakao) {
      initKakao();
    } else {
      const script = document.querySelector('script[src*="kakao_js_sdk"]') as HTMLScriptElement;
      if (script) {
        script.addEventListener('load', initKakao);
        return () => script.removeEventListener('load', initKakao);
      }
    }
  }, []);

  // 제휴링크 클릭 — Supabase 통계 기록
  const handleAffiliateClick = async (item: TravelItem) => {
    await supabase.from('clicks').insert({
      item_id: item.id,
      session_id: sessionStorage.getItem('session_id') || crypto.randomUUID(),
    });
    await supabase.rpc('increment_click_count', { item_id: item.id });

    if (item.affiliate_link) {
      window.open(item.affiliate_link, '_blank');
    }
  };

  // 카카오톡 공유
  const handleKakaoShare = () => {
    if (!window.Kakao?.isInitialized()) {
      alert('카카오 SDK가 로드되지 않았습니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    setSharing(true);
    const baseUrl = window.location.origin;
    
    // 선택된 아이템들을 텍스트 리스트로 변환 (최대 5개)
    const itemsText = selectedItems
      .slice(0, 5)
      .map(item => `• ${item.name}`)
      .join('\n');
    
    const moreText = selectedItems.length > 5 ? `\n...외 ${selectedItems.length - 5}개 항목 더보기` : '';
    const mainItem = selectedItems[0];
    
    // 이미지 URL이 없거나 상대 경로인 경우 기본 이미지 사용
    const imageUrl = (mainItem?.image && mainItem.image.startsWith('http')) 
      ? mainItem.image 
      : 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80';

    try {
      console.log('카카오 공유 시도:', {
        baseUrl,
        itemsCount: selectedItems.length,
        cityName: selectedCityName
      });

      window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: `✈️ ${selectedCityName} 여행 견적서`,
          description: `${itemsText}${moreText}\n\n총 예상 비용: ₩${totalPrice.toLocaleString()}`,
          imageUrl: imageUrl,
          link: {
            mobileWebUrl: baseUrl + '/kakao-preview',
            webUrl: baseUrl + '/kakao-preview',
          },
        },
        buttons: [
          {
            title: '상세 견적 보기',
            link: {
              mobileWebUrl: baseUrl + '/kakao-preview',
              webUrl: baseUrl + '/kakao-preview',
            },
          },
          {
            title: '나도 견적 받기',
            link: {
              mobileWebUrl: baseUrl + '/step-calculator',
              webUrl: baseUrl + '/step-calculator',
            },
          },
        ],
      });
    } catch (e) {
      console.error('카카오 공유 실패:', e);
      alert('공유 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setSharing(false);
    }
  };

  if (selectedItems.length === 0) {
    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 text-center max-w-md">
            <p className="text-gray-600 mb-4">선택된 항목이 없습니다.</p>
            <button
                onClick={() => navigate('/step-calculator')}
                className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
            >
              견적 계산기로 돌아가기
            </button>
          </div>
        </div>
    );
  }

  return (
      <div className="min-h-screen bg-gray-100">
        {/* 헤더 */}
        <div className="bg-white sticky top-0 z-10 shadow-sm">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <button onClick={() => navigate('/step-calculator')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base font-semibold">카카오톡 견적서 미리보기</h1>
              <p className="text-xs text-gray-500">이렇게 전송됩니다</p>
            </div>
          </div>
        </div>

        {/* 카카오톡 미리보기 */}
        <div className="max-w-md mx-auto p-4">
          <div className="bg-white rounded-t-3xl shadow-xl overflow-hidden">
            {/* 채팅 헤더 */}
            <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3C6.5 3 2 6.58 2 11c0 2.5 1.5 4.7 3.8 6.2-.2.8-.8 2.8-1 3.2-.1.3 0 .5.1.6.1.1.3.2.5.1.5-.1 3.5-2.3 4.1-2.7.5.1 1 .1 1.5.1 5.5 0 10-3.6 10-8s-4.5-8-10-8z"/>
                </svg>
              </div>
              <div className="flex-1 text-white">
                <h2 className="text-sm font-semibold">{selectedCityName} 여행 견적 봇</h2>
                <p className="text-xs opacity-90">맞춤 여행 플래너</p>
              </div>
            </div>

            {/* 채팅 메시지 */}
            <div className="bg-[#FEE500] p-4">
              <div className="mb-3">
                <div className="bg-white rounded-2xl rounded-tl-sm p-3 inline-block max-w-[85%] shadow-md">
                  <p className="text-sm text-gray-800">
                    안녕하세요! 😊<br />선택하신 여행 견적서를 보내드립니다.
                  </p>
                </div>
              </div>

              {/* 견적 카드 */}
              <div className="mb-3">
                <div className="bg-white rounded-2xl rounded-tl-sm overflow-hidden shadow-xl max-w-[95%]">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <h3 className="text-base font-semibold text-gray-900 mb-1">
                      ✈️ Your {selectedCityName} Itinerary
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">총 예상 비용</span>
                      <span className="text-lg font-bold text-orange-600">₩{totalPrice.toLocaleString()}</span>
                    </div>
                    {/* 가격 면책 문구 */}
                    <p className="text-[10px] text-gray-400 mt-1">
                      * 날짜·시즌에 따라 실제 가격이 달라질 수 있습니다
                    </p>
                  </div>

                  {/* 품목 리스트 — 클릭 시 제휴링크 이동 */}
                  <div className="divide-y divide-gray-100">
                    {selectedItems.slice(0, 3).map((item) => (
                        <div
                            key={item.id}
                            onClick={() => handleAffiliateClick(item)}
                            className={`flex items-center gap-3 px-4 py-3 transition-colors active:bg-gray-100 ${
                                item.affiliate_link ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'
                            }`}
                        >
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 mb-0.5 line-clamp-1">{item.name}</h4>
                            <p className="text-xs text-gray-500 mb-1 line-clamp-1">{item.description}</p>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-blue-600">₩{item.price.toLocaleString()}</p>
                              {item.affiliate_link && (
                                  <span className="text-[10px] text-blue-400 flex items-center gap-0.5">
                              <ExternalLink className="w-2.5 h-2.5" /> 예약하기
                            </span>
                              )}
                            </div>
                          </div>
                          <div className="w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                            <ImageWithFallback src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          </div>
                        </div>
                    ))}

                    {selectedItems.length > 3 && (
                        <div className="px-4 py-2 bg-gray-50 text-center">
                          <p className="text-xs text-gray-500">+ {selectedItems.length - 3}개 항목 더보기</p>
                        </div>
                    )}
                  </div>

                  {/* 전체보기 버튼 */}
                  <div className="px-4 py-3 border-t border-gray-100">
                    <button
                        onClick={() => selectedItems.forEach(item => handleAffiliateClick(item))}
                        className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-sm flex items-center justify-center gap-2 hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md active:scale-[0.98]"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>View All Details</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <div className="bg-white rounded-2xl rounded-tl-sm p-3 inline-block max-w-[85%] shadow-md">
                  <p className="text-sm text-gray-800">
                    위 항목을 클릭하면<br />예약 페이지로 바로 이동해요! ✨
                  </p>
                </div>
              </div>

              <div>
                <div className="bg-white rounded-2xl rounded-tl-sm p-3 inline-block max-w-[85%] shadow-md">
                  <p className="text-sm text-gray-800">
                    궁금한 점이 있으시면<br />언제든 문의해주세요! 😊
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 하단 버튼 */}
          <div className="bg-white rounded-b-3xl shadow-xl px-5 py-4">
            <p className="text-xs text-gray-500 text-center mb-1">
              실제 카카오톡으로 이와 같은 형태의{' '}
              <span className="text-orange-600 font-medium">맞춤 견적서</span>가 전송됩니다.
            </p>
            <p className="text-[10px] text-gray-400 text-center mb-3">
              * 공유된 메시지의 각 항목 클릭 시 예약 페이지로 바로 이동됩니다
            </p>
            <div className="flex gap-2">
              <button
                  onClick={() => navigate('/step-calculator')}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                다시 계산하기
              </button>
              <button
                  onClick={handleKakaoShare}
                  disabled={sharing}
                  className="flex-1 py-2.5 bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 rounded-xl hover:from-yellow-500 hover:to-yellow-600 transition-all shadow-md text-sm font-medium disabled:opacity-50"
              >
                {sharing ? '전송 중...' : '카카오톡 공유 📤'}
              </button>
            </div>
          </div>
        </div>
      </div>
  );
}