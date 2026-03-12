import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, ExternalLink, MapPin, Calendar, Users } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface TravelItem {
  id: string;
  category: string;
  name: string;
  price: number;
  image: string;
  description: string;
}

export function KakaoPreview() {
  const navigate = useNavigate();
  const [selectedItems, setSelectedItems] = useState<TravelItem[]>([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [selectedCity, setSelectedCity] = useState('bangkok');

  useEffect(() => {
    const items = localStorage.getItem('selectedItems');
    const price = localStorage.getItem('totalPrice');
    const city = localStorage.getItem('selectedCity');
    
    if (items) {
      setSelectedItems(JSON.parse(items));
    }
    if (price) {
      setTotalPrice(parseInt(price));
    }
    if (city) {
      setSelectedCity(city);
    }
  }, []);

  if (selectedItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-6 text-center max-w-md">
          <p className="text-gray-600 mb-4">선택된 항목이 없습니다.</p>
          <button
            onClick={() => navigate('/calculator')}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            견적 계산기로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const hotelItem = selectedItems.find(item => item.category === "숙소");
  const tourItems = selectedItems.filter(item => item.category === "투어");
  const activityItems = selectedItems.filter(item => item.category === "액티비티");

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button 
            onClick={() => navigate('/calculator')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl">카카오톡 견적서 미리보기</h1>
            <p className="text-sm text-gray-500">이렇게 전송됩니다</p>
          </div>
        </div>
      </div>

      {/* Mobile Phone Mockup */}
      <div className="max-w-md mx-auto p-6">
        {/* Chat Interface */}
        <div className="bg-white rounded-t-3xl shadow-xl overflow-hidden">
          {/* Chat Header */}
          <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3C6.5 3 2 6.58 2 11c0 2.5 1.5 4.7 3.8 6.2-.2.8-.8 2.8-1 3.2-.1.3 0 .5.1.6.1.1.3.2.5.1.5-.1 3.5-2.3 4.1-2.7.5.1 1 .1 1.5.1 5.5 0 10-3.6 10-8s-4.5-8-10-8z"/>
              </svg>
            </div>
            <div className="flex-1 text-white">
              <h2 className="text-base">방콕 여행 견적 봇</h2>
              <p className="text-xs opacity-90">맞춤 여행 플래너</p>
            </div>
          </div>

          {/* Chat Messages - KakaoTalk Yellow Background */}
          <div className="bg-[#FEE500] p-4 min-h-[600px]">
            {/* Bot Message */}
            <div className="mb-3">
              <div className="bg-white rounded-2xl rounded-tl-sm p-3 inline-block max-w-[85%] shadow-md">
                <p className="text-sm text-gray-800">
                  안녕하세요! 😊<br />
                  선택하신 여행 견적서를 보내드립니다.
                </p>
              </div>
            </div>

            {/* Rich Message Bubble - List Template */}
            <div className="mb-3">
              <div className="bg-white rounded-2xl rounded-tl-sm overflow-hidden shadow-xl max-w-[95%]">
                {/* Header with Title and Total Price */}
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="text-lg text-gray-900 mb-2">
                    {selectedCity === 'bangkok' ? '✈️ Your Bangkok Itinerary' : '✈️ Your Da Nang Itinerary'}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">총 예상 비용</span>
                    <span className="text-xl text-orange-600 font-medium">
                      ₩{totalPrice.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* List Items */}
                <div className="divide-y divide-gray-100">
                  {selectedItems.slice(0, 3).map((item, index) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer active:bg-gray-100"
                    >
                      {/* Left Content */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm text-gray-900 mb-1 line-clamp-1">
                          {item.name}
                        </h4>
                        <p className="text-xs text-gray-500 mb-2 line-clamp-1">
                          {item.description}
                        </p>
                        <p className="text-base text-blue-600">
                          ₩{item.price.toLocaleString()}
                        </p>
                      </div>

                      {/* Right Square Thumbnail */}
                      <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                        <ImageWithFallback
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  ))}

                  {/* Show more items indicator if there are more than 3 */}
                  {selectedItems.length > 3 && (
                    <div className="px-5 py-3 bg-gray-50 text-center">
                      <p className="text-xs text-gray-600">
                        + {selectedItems.length - 3}개 항목 더보기
                      </p>
                    </div>
                  )}
                </div>

                {/* Single CTA Button */}
                <div className="px-5 py-4 border-t border-gray-100">
                  <button className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-sm flex items-center justify-center gap-2 hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md active:scale-[0.98]">
                    <ExternalLink className="w-4 h-4" />
                    <span>View All Details</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Bot Follow-up Message */}
            <div className="mb-3">
              <div className="bg-white rounded-2xl rounded-tl-sm p-3 inline-block max-w-[85%] shadow-md">
                <p className="text-sm text-gray-800">
                  위 버튼을 눌러<br />
                  전체 일정과 예약 링크를 확인하세요! ✨
                </p>
              </div>
            </div>

            {/* Additional Info Message */}
            <div>
              <div className="bg-white rounded-2xl rounded-tl-sm p-3 inline-block max-w-[85%] shadow-md">
                <p className="text-sm text-gray-800">
                  궁금한 점이 있으시면<br />
                  언제든 문의해주세요! 😊
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Info Text */}
        <div className="bg-white rounded-b-3xl shadow-xl px-6 py-4 text-center">
          <p className="text-sm text-gray-600 mb-3">
            실제 카카오톡으로 이와 같은 형태의<br />
            <span className="text-orange-600">고품질 맞춤 견적서</span>가 전송됩니다.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/calculator')}
              className="flex-1 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
            >
              다시 계산하기
            </button>
            <button
              onClick={() => {
                alert('카카오톡 전송 기능은 백엔드 연동 후 사용 가능합니다.\n\nSpring Boot API를 통해 카카오톡 메시지 API와 연동하시면 됩니다.');
              }}
              className="flex-1 py-2.5 bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 rounded-lg hover:from-yellow-500 hover:to-yellow-600 transition-all shadow-md text-sm"
            >
              전송하기
            </button>
          </div>
        </div>
      </div>

      {/* Development Notes */}
      <div className="max-w-md mx-auto px-6 py-6">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="text-sm mb-2 text-blue-900">💡 개발 가이드</h3>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• 버튼 클릭 시 제휴 링크로 연결하도록 설정</li>
            <li>• Spring Boot에서 카카오톡 메시지 API 연동</li>
            <li>• Oracle DB에서 실시간 가격 정보 조회</li>
            <li>• 제휴 링크 추적을 위한 UTM 파라미터 추가</li>
            <li>• 고품질 호텔 이미지 자동 매칭 로직 구현</li>
          </ul>
        </div>
      </div>
    </div>
  );
}