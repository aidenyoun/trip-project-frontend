import { useNavigate } from "react-router";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Calculator, Sparkles, MapPin, Share2, CreditCard, ChevronRight, Check } from "lucide-react";

export function BlogPost() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Hero Section */}
      <div className="relative h-[500px] w-full overflow-hidden">
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1920&q=80"
          alt="Travel Planning"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-slate-50 flex flex-col items-center justify-center text-center px-6">
          <div className="bg-blue-600/90 backdrop-blur-sm text-white text-[10px] font-bold px-3 py-1 rounded-full mb-4 tracking-widest uppercase animate-bounce">
            Smart Travel Budget Planner
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 drop-shadow-lg leading-tight">
            내 여행의 예산,<br />
            <span className="text-blue-400">1분 만에</span> 확인하세요
          </h1>
          <p className="text-white/90 text-sm md:text-lg mb-8 max-w-md font-medium">
            숙소부터 액티비티까지, 클릭 몇 번으로 완성하는<br /> 
            나만의 맞춤형 여행 견적서
          </p>
          <button 
            onClick={() => navigate('/step-calculator')}
            className="group bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-blue-600/30 transition-all active:scale-95 flex items-center gap-2"
          >
            지금 견적 시작하기
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 -mt-12 relative z-10 pb-24">
        {/* Step Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
          {[
            { 
              icon: MapPin, 
              title: "여행지 선택", 
              desc: "떠나고 싶은 도시를 선택하세요",
              color: "text-red-500",
              bg: "bg-red-50"
            },
            { 
              icon: CreditCard, 
              title: "품목 담기", 
              desc: "숙소, 투어, 맛집을 골라담으세요",
              color: "text-blue-500",
              bg: "bg-blue-50"
            },
            { 
              icon: Share2, 
              title: "결과 공유", 
              desc: "카톡으로 친구에게 견적을 보내세요",
              color: "text-yellow-500",
              bg: "bg-yellow-50"
            },
          ].map((step, i) => (
            <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center group hover:shadow-md transition-shadow">
              <div className={`w-12 h-12 ${step.bg} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <step.icon className={`w-6 h-6 ${step.color}`} />
              </div>
              <h3 className="font-bold text-slate-900 mb-1">{step.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>

        {/* Info Section 1 */}
        <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-sm border border-slate-100 mb-8 overflow-hidden relative">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4 text-blue-600">
              <Sparkles className="w-5 h-5 fill-current" />
              <span className="text-sm font-bold uppercase tracking-wider">Why Use Our Planner?</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-6 leading-tight">
              여행 계획의 번거로움,<br />
              <span className="text-blue-600 underline underline-offset-8">데이터 기반</span>으로 해결하세요
            </h2>
            <div className="space-y-6 text-slate-600 mb-8">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1">
                  <Check className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">최신 가격 정보</p>
                  <p className="text-sm">현지 물가를 반영한 실시간 예상 가격을 제공합니다.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1">
                  <Check className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">합리적인 비교 선택</p>
                  <p className="text-sm">여러 호텔과 투어 옵션을 비교하며 내 예산에 꼭 맞는 여행을 만드세요.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1">
                  <Check className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">간편한 예약 연결</p>
                  <p className="text-sm">견적서에서 마음에 드는 상품을 바로 예약 페이지로 연결해 드립니다.</p>
                </div>
              </div>
            </div>
          </div>
          {/* Subtle Background Decor */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
        </div>

        {/* Stats / Proof Section */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-slate-900 rounded-[32px] p-8 text-center">
            <p className="text-blue-400 text-3xl font-black mb-1">100+</p>
            <p className="text-slate-400 text-xs font-medium">검증된 여행 품목</p>
          </div>
          <div className="bg-blue-600 rounded-[32px] p-8 text-center">
            <p className="text-white text-3xl font-black mb-1">FREE</p>
            <p className="text-blue-100 text-xs font-medium">무료 견적 서비스</p>
          </div>
        </div>

        {/* Final CTA Card */}
        <div 
          onClick={() => navigate('/step-calculator')}
          className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[40px] p-10 text-center cursor-pointer transform transition-all hover:scale-[1.01] active:scale-[0.99] shadow-2xl shadow-blue-600/20 group"
        >
          <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Calculator className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-white mb-4">
            어디로 떠나고 싶으신가요?
          </h2>
          <p className="text-blue-100 mb-8 max-w-sm mx-auto">
            지금 바로 일본, 태국, 베트남 등 인기 여행지의<br /> 
            맞춤 견적서를 받아보세요.
          </p>
          <div className="inline-flex items-center gap-2 bg-white text-blue-600 px-10 py-4 rounded-2xl font-black text-lg group-hover:bg-blue-50 transition-colors">
            무료 견적서 만들기
            <ChevronRight className="w-5 h-5" />
          </div>
        </div>

        {/* Footer info */}
        <p className="mt-12 text-center text-[11px] text-slate-400 leading-relaxed">
          Trip Project는 사용자의 합리적인 여행 계획을 돕기 위해 최선을 다하고 있습니다.<br />
          표시되는 가격은 참고용이며, 실제 예약 시점에 따라 변동될 수 있습니다.
        </p>
      </div>
    </div>
  );
}
