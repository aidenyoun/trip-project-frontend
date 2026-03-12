import { useNavigate } from "react-router";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Calculator, Sparkles } from "lucide-react";

export function BlogPost() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      {/* Header Image */}
      <div className="w-full h-[300px] relative overflow-hidden">
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1768393483296-249efa2f7ad5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxCYW5na29rJTIwR3JhbmQlMjBQYWxhY2UlMjB0ZW1wbGUlMjB0cm9waWNhbHxlbnwxfHx8fDE3NzMyNzk0OTN8MA&ixlib=rb-4.1.0&q=80&w=1080"
          alt="방콕 왕궁"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Blog Content */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-3xl mb-4">방콕 여행 완벽 가이드 🇹🇭</h1>
        
        <div className="text-gray-700 space-y-4 mb-8">
          <p>
            안녕하세요! 이번 포스팅에서는 방콕 여행을 계획하시는 분들을 위해 
            꼭 가봐야 할 명소와 맛집, 그리고 여행 꿀팁을 소개해드리려고 합니다.
          </p>

          <h2 className="text-2xl mt-6 mb-3">🏛️ 1. 왕궁 (Grand Palace)</h2>
          <p>
            방콕의 대표적인 관광지인 왕궁은 태국의 역사와 문화를 한눈에 볼 수 있는 곳입니다. 
            화려한 금빛 건축물과 정교한 조각들이 인상적이며, 에메랄드 사원도 함께 관람할 수 있습니다.
          </p>

          <h2 className="text-2xl mt-6 mb-3">🏨 2. 숙소 추천</h2>
          <p>
            방콕에는 다양한 등급의 호텔이 있습니다. 고급 호텔부터 저렴한 게스트하우스까지 
            예산에 맞춰 선택할 수 있으며, 특히 수쿰윗 지역과 시암 지역이 여행자들에게 인기가 많습니다.
          </p>

          <h2 className="text-2xl mt-6 mb-3">🌃 3. 야시장과 나이트 투어</h2>
          <p>
            방콕의 밤은 낮보다 더욱 화려합니다. 짜뚜짝 야시장, 아시아티크, 탈랏롯파이 등 
            다양한 야시장에서 쇼핑과 먹거리를 즐기고, 차오프라야 강 야경 크루즈도 추천드립니다.
          </p>

          <h2 className="text-2xl mt-6 mb-3">🍜 4. 현지 음식</h2>
          <p>
            팟타이, 똠얌꿍, 카오팟, 망고 스티키라이스 등 태국의 다양한 음식을 맛보세요. 
            길거리 음식도 안전하고 맛있으니 꼭 도전해보시길 바랍니다!
          </p>

          <h2 className="text-2xl mt-6 mb-3">💆 5. 스파 & 마사지</h2>
          <p>
            태국식 마사지는 방콕 여행의 필수 코스입니다. 합리적인 가격에 
            수준 높은 마사지를 경험할 수 있으며, 여행의 피로를 풀기에 최고입니다.
          </p>

          <p className="mt-6">
            이 외에도 방콕에는 수많은 볼거리와 즐길거리가 있습니다. 
            여행 일정과 예산을 미리 계획하시면 더욱 알찬 여행이 될 것입니다!
          </p>
        </div>

        {/* CTA Banner */}
        <div 
          className="sticky bottom-0 left-0 right-0 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl shadow-2xl p-6 cursor-pointer transform transition-all hover:scale-[1.02] active:scale-[0.98] border-2 border-amber-200"
          onClick={() => navigate('/step-calculator')}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span className="text-xs text-amber-700 font-semibold">맞춤형 여행 플래너</span>
              </div>
              <h3 className="text-lg text-gray-900">
                1분만에 방콕 여행 총 예산 계산하기
              </h3>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white text-center py-4 rounded-xl shadow-lg">
            <p className="text-lg">
              <span className="inline-block mr-2">✨</span>
              무료로 나만의 여행 견적 받기
              <span className="inline-block ml-2">→</span>
            </p>
          </div>

          <p className="text-xs text-center text-gray-500 mt-3">
            숙소 → 교통 → 투어 → 액티비티를 단계별로 선택
          </p>
        </div>
      </div>
    </div>
  );
}