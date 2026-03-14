import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, ExternalLink, Calendar } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { supabase } from "../../supabase";
import { useLanguage } from "../LanguageContext";

declare global {
  interface Window { Kakao: any; }
}

interface TravelItem {
  id: string;
  category: string;
  name: string;
  price: number;
  image: string;
  description: string;
  affiliate_link: string | null;
  quantity: number;
}

const CATEGORY_ORDER = ['accommodation', 'transport', 'tours', 'activities'];

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function calcNights(start: string, end: string): number {
  if (!start || !end) return 0;
  return Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)));
}

export function KakaoPreview() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  const [selectedItems, setSelectedItems] = useState<TravelItem[]>([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [selectedCityName, setSelectedCityName] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [travelStartDate, setTravelStartDate] = useState('');
  const [travelEndDate, setTravelEndDate] = useState('');
  const [sharing, setSharing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [shareId, setShareId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const params = new URLSearchParams(window.location.search);
      const sId = params.get('share');

      if (sId) {
        try {
          const { data, error } = await supabase.from('shares').select('*').eq('id', sId).single();
          if (error) throw error;
          if (data) {
            setSelectedItems((data.selected_items as TravelItem[]).map(i => ({ ...i, quantity: i.quantity || 1 })));
            setTotalPrice(data.total_price);
            setSelectedCityName(data.city_name);
            setSelectedCity(data.city_id);
            setTravelStartDate(data.travel_start_date || '');
            setTravelEndDate(data.travel_end_date || '');
            setShareId(sId);
          }
        } catch {
          alert('만료되었거나 잘못된 공유 링크입니다.');
        }
      } else {
        const items = localStorage.getItem('selectedItems');
        const price = localStorage.getItem('totalPrice');
        const city = localStorage.getItem('selectedCity');
        const cityName = localStorage.getItem('selectedCityName');
        const startDate = localStorage.getItem('travelStartDate') || '';
        const endDate = localStorage.getItem('travelEndDate') || '';

        if (items && price && city && cityName) {
          const parsedItems: TravelItem[] = JSON.parse(items).map((i: any) => ({ ...i, quantity: i.quantity || 1 }));
          const total = parseInt(price);
          setSelectedItems(parsedItems);
          setTotalPrice(total);
          setSelectedCity(city);
          setSelectedCityName(cityName);
          setTravelStartDate(startDate);
          setTravelEndDate(endDate);

          try {
            const { data } = await supabase.from('shares').insert({
              selected_items: parsedItems,
              total_price: total,
              city_name: cityName,
              city_id: city,
              travel_start_date: startDate || null,
              travel_end_date: endDate || null,
            }).select().single();
            if (data) setShareId(data.id);
          } catch (e) {
            console.error('Share ID 생성 실패:', e);
          }
        }
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    const kakaoKey = import.meta.env.VITE_KAKAO_JS_KEY;
    if (window.Kakao && !window.Kakao.isInitialized()) window.Kakao.init(kakaoKey);
  }, []);

  const getUnitLabel = (category: string, qty: number): string => {
    if (category === 'accommodation') return t('calc.unit_night').replace('{n}', String(qty));
    if (category === 'transport') return t('calc.unit_person').replace('{n}', String(qty));
    return t('calc.unit_ticket').replace('{n}', String(qty));
  };

  const handleAffiliateClick = async (item: TravelItem) => {
    await supabase.from('clicks').insert({
      item_id: item.id,
      session_id: sessionStorage.getItem('session_id') || crypto.randomUUID(),
    });
    await supabase.rpc('increment_click_count', { item_id: item.id });
    if (item.affiliate_link) window.open(item.affiliate_link, '_blank');
  };

  const handleKakaoShare = () => {
    if (!window.Kakao?.isInitialized()) { alert('카카오 SDK 초기화 중입니다. 잠시 후 다시 시도해주세요.'); return; }
    if (!shareId) { alert(t('preview.loading')); return; }

    setSharing(true);
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/${language}/kakao-preview?share=${shareId}`;
    const hasDate = !!(travelStartDate && travelEndDate);
    const nights = calcNights(travelStartDate, travelEndDate);
    const dateText = hasDate ? ` (${formatDate(travelStartDate)}~${formatDate(travelEndDate)})` : '';

    try {
      window.Kakao.Share.sendDefault({
        objectType: 'list',
        headerTitle: `✈️ ${selectedCityName} ${t('preview.title')}${dateText}`,
        headerLink: { mobileWebUrl: shareUrl, webUrl: shareUrl },
        contents: selectedItems.slice(0, 3).map(item => ({
          title: item.name,
          description: `${item.description} · ₩${(item.price * item.quantity).toLocaleString()}${item.quantity > 1 ? ` (${getUnitLabel(item.category, item.quantity)})` : ''}`,
          imageUrl: (item.image && item.image.startsWith('http'))
              ? item.image
              : 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80',
          link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
        })),
        buttons: [
          { title: t('preview.view_all'), link: { mobileWebUrl: shareUrl, webUrl: shareUrl } },
          { title: t('hero.button'), link: { mobileWebUrl: `${baseUrl}/${language}/step-calculator`, webUrl: `${baseUrl}/${language}/step-calculator` } },
        ],
      });
    } catch (e) {
      console.error('카카오 공유 실패:', e);
      alert('공유 중 오류가 발생했습니다.');
    } finally {
      setSharing(false);
    }
  };

  if (loading) {
    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
    );
  }

  if (selectedItems.length === 0) {
    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 text-center max-w-md">
            <p className="text-gray-600 mb-4">{t('calc.placeholder')}</p>
            <button onClick={() => navigate(`/${language}/step-calculator`)} className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">
              {t('preview.recalc')}
            </button>
          </div>
        </div>
    );
  }

  const hasDateRange = !!(travelStartDate && travelEndDate);
  const nights = calcNights(travelStartDate, travelEndDate);
  const groupedItems = CATEGORY_ORDER
      .map(cat => ({ category: cat, label: t(`step.${cat}`), items: selectedItems.filter(i => i.category === cat) }))
      .filter(g => g.items.length > 0);

  return (
      <div className="min-h-screen bg-gray-100">
        <div className="bg-white sticky top-0 z-10 shadow-sm">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <button onClick={() => navigate(`/${language}/step-calculator`)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base font-semibold">{t('preview.title')}</h1>
              <p className="text-xs text-gray-500">{t('preview.subtitle')}</p>
            </div>
          </div>
        </div>

        <div className="max-w-md mx-auto p-4">
          <div className="bg-white rounded-t-3xl shadow-xl overflow-hidden">
            {/* 카카오 헤더 */}
            <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3C6.5 3 2 6.58 2 11c0 2.5 1.5 4.7 3.8 6.2-.2.8-.8 2.8-1 3.2-.1.3 0 .5.1.6.1.1.3.2.5.1.5-.1 3.5-2.3 4.1-2.7.5.1 1 .1 1.5.1 5.5 0 10-3.6 10-8s-4.5-8-10-8z" />
                </svg>
              </div>
              <div className="flex-1 text-white">
                <h2 className="text-sm font-semibold">{selectedCityName} {t('preview.bot_name')}</h2>
                <p className="text-xs opacity-90">{t('preview.planner')}</p>
              </div>
            </div>

            <div className="bg-[#FEE500] p-4">
              <div className="mb-3">
                <div className="bg-white rounded-2xl rounded-tl-sm p-3 inline-block max-w-[85%] shadow-md">
                  <p className="text-sm text-gray-800">{t('preview.greeting')}</p>
                </div>
              </div>

              {/* 견적 카드 */}
              <div className="mb-3">
                <div className="bg-white rounded-2xl rounded-tl-sm overflow-hidden shadow-xl max-w-[95%]">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <h3 className="text-base font-semibold text-gray-900 mb-1">✈️ {selectedCityName} {t('preview.itinerary')}</h3>
                    {hasDateRange && (
                        <div className="flex items-center gap-1.5 mb-2">
                          <Calendar className="w-3.5 h-3.5 text-blue-400" />
                          <span className="text-xs text-blue-600 font-medium">
                        {formatDate(travelStartDate)} ~ {formatDate(travelEndDate)} · {t('calc.unit_night').replace('{n}', String(nights))}
                      </span>
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{t('preview.total')}</span>
                      <span className="text-lg font-bold text-orange-600">₩{totalPrice.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="divide-y divide-gray-100">
                    {groupedItems.map(group => (
                        <div key={group.category}>
                          <div className="px-4 py-1.5 bg-gray-50">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{group.label}</span>
                          </div>
                          {group.items.map(item => (
                              <div
                                  key={item.id}
                                  onClick={() => handleAffiliateClick(item)}
                                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors"
                              >
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-medium text-gray-900 mb-0.5 line-clamp-1">{item.name}</h4>
                                  {item.quantity > 1 ? (
                                      <p className="text-[11px] text-gray-400 mb-0.5">
                                        ₩{item.price.toLocaleString()} × {getUnitLabel(item.category, item.quantity)}
                                      </p>
                                  ) : (
                                      <p className="text-xs text-gray-500 mb-0.5 line-clamp-1">{item.description}</p>
                                  )}
                                  <p className="text-sm font-semibold text-blue-600">₩{(item.price * item.quantity).toLocaleString()}</p>
                                </div>
                                <div className="w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                                  <ImageWithFallback src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                </div>
                              </div>
                          ))}
                        </div>
                    ))}
                  </div>

                  <div className="px-4 py-3 border-t border-gray-100">
                    <button
                        onClick={() => selectedItems.forEach(item => handleAffiliateClick(item))}
                        className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-sm flex items-center justify-center gap-2 shadow-md"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>{t('preview.book_now')}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <div className="bg-white rounded-2xl rounded-tl-sm p-3 inline-block max-w-[85%] shadow-md">
                  <p className="text-sm text-gray-800 whitespace-pre-line">{t('preview.click_guide')}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-b-3xl shadow-xl px-5 py-4">
            <p className="text-[10px] text-gray-400 text-center mb-3 leading-relaxed">{t('calc.disclaimer')}</p>
            <div className="flex gap-2">
              <button onClick={() => navigate(`/${language}/step-calculator`)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium">
                {t('preview.recalc')}
              </button>
              <button onClick={handleKakaoShare} disabled={sharing} className="flex-1 py-2.5 bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 rounded-xl shadow-md text-sm font-medium disabled:opacity-50">
                {sharing ? '...' : t('preview.share')}
              </button>
            </div>
          </div>
        </div>
      </div>
  );
}