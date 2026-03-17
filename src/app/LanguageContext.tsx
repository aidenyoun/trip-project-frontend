import React, { createContext, useContext, useState } from 'react';

type Language = 'ko' | 'en' | 'ja';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  ko: {
    // BlogPost (Main)
    'hero.badge': '스마트 여행 예산 플래너',
    'hero.title': '내 여행의 예산,\n1분 만에 확인하세요',
    'hero.subtitle': '숙소부터 액티비티까지, 클릭 몇 번으로 완성하는\n나만의 맞춤형 여행 견적서',
    'hero.button': '지금 견적 시작하기',
    'step1.title': '여행지 선택',
    'step1.desc': '떠나고 싶은 도시를 선택하세요',
    'step2.title': '품목 담기',
    'step2.desc': '숙소, 투어, 맛집을 골라담으세요',
    'step3.title': '결과 공유',
    'step3.desc': '카톡으로 친구에게 견적을 보내세요',
    'why.badge': '왜 이 플래너를 사용해야 하나요?',
    'why.title': '여행 계획의 번거로움,\n데이터 기반으로 해결하세요',
    'why.point1.title': '최신 가격 정보',
    'why.point1.desc': '현지 물가를 반영한 실시간 예상 가격을 제공합니다.',
    'why.point2.title': '합리적인 비교 선택',
    'why.point2.desc': '여러 호텔과 투어 옵션을 비교하며 내 예산에 꼭 맞는 여행을 만드세요.',
    'why.point3.title': '간편한 예약 연결',
    'why.point3.desc': '견적서에서 마음에 드는 상품을 바로 예약 페이지로 연결해 드립니다.',
    'stats.items': '검증된 여행 품목',
    'stats.free': '무료 견적 서비스',
    'cta.title': '어디로 떠나고 싶으신가요?',
    'cta.desc': '지금 바로 일본, 태국, 베트남 등 인기 여행지의\n맞춤 견적서를 받아보세요.',
    'cta.button': '무료 견적서 만들기',
    'footer.disclaimer': 'Trip Project는 사용자의 합리적인 여행 계획을 돕기 위해 최선을 다하고 있습니다.\n표시되는 가격은 참고용이며, 실제 예약 시점에 따라 변동될 수 있습니다.',

    // StepCalculator
    'step.accommodation': '숙소',
    'step.transport': '교통',
    'step.tours': '투어',
    'step.activities': '액티비티',
    'city.title': '어디로 떠나실 건가요?',
    'city.subtitle': '여행지를 선택하면 맞춤 견적을 도와드릴게요',
    'city.change': '나라 변경',
    'calc.title': '여행 예산 계산기',
    'calc.subtitle': '맞춤 여행 플래너',
    'calc.budget': '예상 예산',
    'calc.total_cost': '총 예상 비용',
    'calc.next': '다음 단계',
    'calc.skip': '이 단계 건너뛰기',
    'calc.complete': '견적 완료 및 결과 보기',
    'calc.placeholder': '이 카테고리에 등록된 항목이 없습니다.',
    'calc.multiple': '비교를 위해 여러 개 선택이 가능합니다',
    'calc.select_item': '최소 하나 이상의 항목을 선택해 주세요',
    'calc.next_step_label': '선택 완료, 다음으로',
    'calc.items_selected': '개 선택',
    'calc.get_kakao': '견적서 카톡으로 받기',
    'calc.step_by_step': '단계별 플래너',
    'calc.disclaimer': '* 표시된 금액은 참고용이며, 날짜·시즌·재고에 따라 달라질 수 있습니다.',

    // KakaoPreview
    'preview.title': '카카오톡 견적서 미리보기',
    'preview.subtitle': '이렇게 전송됩니다',
    'preview.bot_name': '여행 견적 봇',
    'preview.planner': '맞춤 여행 플래너',
    'preview.total': '총 예상 비용',
    'preview.view_all': '전체 상세 보기',
    'preview.click_guide': '위 항목을 클릭하면\n예약 페이지로 바로 이동해요! ✨',
    'preview.footer_msg': '실제 카카오톡으로 이와 같은 형태의 맞춤 견적서가 전송됩니다.',
    'preview.recalc': '다시 계산하기',
    'preview.share': '카카오톡 공유 📤',
    'preview.loading': '공유 링크를 생성 중입니다...',

    // Cities & Misc
    'city.tokyo': '도쿄',
    'city.osaka': '오사카',
    'city.fukuoka': '후쿠오카',
    'city.bangkok': '방콕',
    'city.danang': '다낭',
    'city.bali': '발리',
    'city.singapore': '싱가포르',
    'city.taipei': '타이베이',
    'city.sapporo': '삿포로',
    'city.jeju': '제주',
    'city.seoul': '서울',
    'misc.all': '전체',
    'misc.select_city': '여행지 선택',

    // 날짜 선택
    'date.travel_schedule': '여행 일정',
    'date.optional': '선택사항',
    'date.reset': '초기화',
    'date.enter_date': '날짜 입력하기',
    'date.close': '닫기',
    'date.departure': '출발일',
    'date.return': '귀국일',
    'date.hint': '날짜를 입력하면 숙박비를 자동으로 계산해드려요',
    'date.nights_auto': '총 {n}박 · 숙박비가 자동으로 계산됩니다',
    'date.select_return': '귀국일을 선택해주세요',

    // 개수 조절
    'calc.nights_badge': '🌙 박수 조절 가능',
    'calc.persons_badge': '👥 인원수 조절 가능',
    'calc.tickets_badge': '🎟 매수 조절 가능',
    'calc.nights_auto': '📅 여행 일정 {n}박',
    'calc.accommodation_desc': '박수를 조절해 숙박비를 계산해보세요',
    'calc.accommodation_desc_auto': '여행 일정은 {n}박입니다. 숙박 박수를 확인해 주세요',
    'calc.transport_desc': '인원수를 조절해 교통 비용을 계산해보세요',
    'calc.tours_desc': '경험하고 싶은 투어를 선택해보세요',
    'calc.activities_desc': '매수를 조절해 입장권 비용을 계산해보세요',
    'calc.unit_night': '{n}박',
    'calc.unit_person': '{n}명',
    'calc.unit_ticket': '{n}매',
    'calc.basis': '기준',
    'calc.date_basis': '날짜 기준',
    'calc.total_cost_label': '총',
    'calc.sort_by': '정렬',
    'calc.sort_name': '이름순',
    'calc.sort_price': '가격순',
    'calc.accommodation_nights_warning': '여행 일정은 {n}박입니다. 숙박 박수가 부족해요.',

    // KakaoPreview
    'preview.greeting': '안녕하세요! 😊\n선택하신 여행 견적서를 보내드립니다.',
    'preview.itinerary': '여행 견적서',
    'preview.book_now': '예약 페이지 바로가기',

  },
  en: {
    // BlogPost (Main)
    'hero.badge': 'Smart Travel Budget Planner',
    'hero.title': 'Check your travel budget\nin just 1 minute',
    'hero.subtitle': 'From accommodation to activities, create your own\npersonalized travel itinerary with a few clicks',
    'hero.button': 'Start Planning Now',
    'step1.title': 'Pick Destination',
    'step1.desc': 'Choose the city you want to visit',
    'step2.title': 'Add Items',
    'step2.desc': 'Select accommodation, tours, and food',
    'step3.title': 'Share Results',
    'step3.desc': 'Send the quote to friends via KakaoTalk',
    'why.badge': 'Why Use Our Planner?',
    'why.title': 'Solve travel planning hassles\nwith data-driven insights',
    'why.point1.title': 'Latest Price Info',
    'why.point1.desc': 'We provide real-time estimated prices reflecting local costs.',
    'why.point2.title': 'Smart Comparisons',
    'why.point2.desc': 'Compare various hotel and tour options to fit your budget.',
    'why.point3.title': 'Easy Booking',
    'why.point3.desc': 'Instantly connect to booking pages for items you like.',
    'stats.items': 'Verified Items',
    'stats.free': 'Free Service',
    'cta.title': 'Where do you want to go?',
    'cta.desc': 'Get personalized quotes for popular destinations\nlike Japan, Thailand, and Vietnam now.',
    'cta.button': 'Create Free Quote',
    'footer.disclaimer': 'Trip Project is dedicated to helping users plan their travels rationally.\nPrices shown are for reference and may vary at the time of booking.',

    // StepCalculator
    'step.accommodation': 'Accommodation',
    'step.transport': 'Transport',
    'step.tours': 'Tours',
    'step.activities': 'Activities',
    'city.title': 'Where are you going?',
    'city.subtitle': 'Select a destination and we will help you with a quote',
    'city.change': 'Change City',
    'calc.title': 'Travel Budget Calculator',
    'calc.subtitle': 'Custom Travel Planner',
    'calc.budget': 'Estimated Budget',
    'calc.total_cost': 'Total Estimated Cost',
    'calc.next': 'Next Step',
    'calc.skip': 'Skip this step',
    'calc.complete': 'Complete & View Results',
    'calc.placeholder': 'No items registered in this category.',
    'calc.multiple': 'Multiple choices allowed for comparison',
    'calc.select_item': 'Please select at least one item',
    'calc.next_step_label': 'Selection complete, Next',
    'calc.items_selected': 'items selected',
    'calc.get_kakao': 'Get Quote via KakaoTalk',
    'calc.step_by_step': 'Step-by-step planner',
    'calc.disclaimer': '* Prices shown are for reference and may vary by date, season, and availability.',

    // KakaoPreview
    'preview.title': 'KakaoTalk Itinerary Preview',
    'preview.subtitle': 'This is how it will be sent',
    'preview.bot_name': 'Travel Budget Bot',
    'preview.planner': 'Custom Travel Planner',
    'preview.total': 'Total Estimated Cost',
    'preview.view_all': 'View All Details',
    'preview.click_guide': 'Click items above to go\ndirectly to the booking page! ✨',
    'preview.footer_msg': 'A personalized quote like this will be sent via KakaoTalk.',
    'preview.recalc': 'Recalculate',
    'preview.share': 'Share on KakaoTalk 📤',
    'preview.loading': 'Generating share link...',

    // Cities & Misc
    'city.tokyo': 'Tokyo',
    'city.osaka': 'Osaka',
    'city.fukuoka': 'Fukuoka',
    'city.bangkok': 'Bangkok',
    'city.danang': 'Da Nang',
    'city.bali': 'Bali',
    'city.singapore': 'Singapore',
    'city.taipei': 'Taipei',
    'city.sapporo': 'Sapporo',
    'city.jeju': 'Jeju',
    'city.seoul': 'Seoul',
    'misc.all': 'All',
    'misc.select_city': 'Select Destination',

    // 날짜 선택
    'date.travel_schedule': 'Travel Schedule',
    'date.optional': 'Optional',
    'date.reset': 'Reset',
    'date.enter_date': 'Enter dates',
    'date.close': 'Close',
    'date.departure': 'Departure',
    'date.return': 'Return',
    'date.hint': 'Enter dates and we\'ll automatically calculate accommodation costs',
    'date.nights_auto': '{n} nights total · Accommodation costs will be calculated automatically',
    'date.select_return': 'Please select a return date',

    // 개수 조절
    'calc.nights_badge': '🌙 Nights adjustable',
    'calc.persons_badge': '👥 Persons adjustable',
    'calc.tickets_badge': '🎟 Tickets adjustable',
    'calc.nights_auto': '📅 Trip duration: {n} nights',
    'calc.accommodation_desc': 'Adjust the number of nights to calculate accommodation costs',
    'calc.accommodation_desc_auto': 'Your trip is {n} nights. Please review accommodation nights',
    'calc.transport_desc': 'Adjust the number of people to calculate transport costs',
    'calc.tours_desc': 'Select the tours you want to experience',
    'calc.activities_desc': 'Adjust ticket quantity to calculate activity costs',
    'calc.unit_night': '{n} nights',
    'calc.unit_person': '{n} people',
    'calc.unit_ticket': '{n} tickets',
    'calc.basis': 'basis',
    'calc.date_basis': 'by date',
    'calc.total_cost_label': 'Total',
    'calc.sort_by': 'Sort',
    'calc.sort_name': 'Name',
    'calc.sort_price': 'Price',
    'calc.accommodation_nights_warning': 'Your trip is {n} nights. Accommodation nights are currently short.',

    // KakaoPreview
    'preview.greeting': 'Hello! 😊\nHere is your personalized travel quote.',
    'preview.itinerary': 'Travel Quote',
    'preview.book_now': 'Go to Booking Page',

  },
  ja: {
    // BlogPost (Main)
    'hero.badge': 'スマート旅行予算プランナー',
    'hero.title': '私の旅行の予算、\n1분で確認してください',
    'hero.subtitle': '宿泊からアクティビ티까지, 클릭 몇 번으로 완성하는\n나만의 맞춤형 여행 견적서',
    'hero.button': '今すぐ見積もりを開始',
    'step1.title': '旅行先の選択',
    'step1.desc': '行きたい都市を選択してください',
    'step2.title': 'アイテムを追加',
    'step2.desc': '宿泊、ツアー、グルメを選んでください',
    'step3.title': '結果を共有',
    'step3.desc': 'カカオトークで友達に見積もりを送ってください',
    'why.badge': 'なぜこのプランナーを使うべきですか？',
    'why.title': '旅行計画の煩わしさ、\n데이터 기반으로 해결하세요',
    'why.point1.title': '最新の価格情報',
    'why.point1.desc': '現地の物価を反映したリアルタイムの予想価格を提供します。',
    'why.point2.title': '合理的な比較選択',
    'why.point2.desc': '複数のホテルやツアーのオプションを比較し、予算にぴった리의 여행을 만드세요.',
    'why.point3.title': '簡単な予約リンク',
    'why.point3.desc': '見積書からお気に入りの商品をすぐに予約ページにつなげます。',
    'stats.items': '検証済みの旅行アイテム',
    'stats.free': '無料見積もりサービス',
    'cta.title': 'どこへ行きたいですか？',
    'cta.desc': '今すぐ日本、タイ、ベトナムなどの人気旅行地の\nカスタム見積書を受け取ってください.',
    'cta.button': '無料で見積書を作成',
    'footer.disclaimer': 'Trip Projectはユーザーの合理的な旅行計画を助けるために最善を尽くしています。\n表示される価格は参考用であり、実際の予約時点によって変動する場合があります。',

    // StepCalculator
    'step.accommodation': '宿泊',
    'step.transport': '交通',
    'step.tours': 'ツアー',
    'step.activities': 'アクティビティ',
    'city.title': 'どこへ行かれますか？',
    'city.subtitle': '旅行先を選択するとカスタム見積もりをお手伝いします',
    'city.change': '国を変更',
    'calc.title': '旅行予算計算機',
    'calc.subtitle': 'カスタム旅行プランナー',
    'calc.budget': '予想予算',
    'calc.total_cost': '総予想費用',
    'calc.next': '次のステップ',
    'calc.skip': 'このステップをスキップ',
    'calc.complete': '見積もり完了と結果を見る',
    'calc.placeholder': 'このカテゴリーに登録されたアイテムはありません。',
    'calc.multiple': '比較のために複数選択が可能です',
    'calc.select_item': '少なくとも1つのアイテムを選択してください',
    'calc.next_step_label': '選択完了、次へ',
    'calc.items_selected': '個を選択',
    'calc.get_kakao': '見積書をカカオトークで受け取る',
    'calc.step_by_step': 'ステップバイステッププランナー',
    'calc.disclaimer': '* 表示されている金額は参考用であり、日付・シーズン・在庫によって異なる場合があります。',

    // KakaoPreview
    'preview.title': 'カ카オトーク見積書のプレビュー',
    'preview.subtitle': 'このように送信されます',
    'preview.bot_name': '旅行見積もりボット',
    'preview.planner': 'カスタム旅行プランナー',
    'preview.total': '総予想費用',
    'preview.view_all': '全ての詳細を見る',
    'preview.click_guide': '上の項目をクリックすると\n予約ページに直接移動します！ ✨',
    'preview.footer_msg': '実際のカカオトークには、このような形式のカスタム見積書가 전송됩니다.',
    'preview.recalc': '計算し直す',
    'preview.share': 'カカオトークで共有 📤',
    'preview.loading': '共有リンクを作成中です...',

    // Cities & Misc
    'city.tokyo': '東京',
    'city.osaka': '大阪',
    'city.fukuoka': '福岡',
    'city.bangkok': 'バンコク',
    'city.danang': 'ダナン',
    'city.bali': 'バリ',
    'city.singapore': 'シンガポール',
    'city.taipei': '台北',
    'city.sapporo': '札幌',
    'city.jeju': '済州',
    'city.seoul': 'ソウル',
    'misc.all': 'すべて',
    'misc.select_city': '旅行先を選択',

    // 날짜 선택
    'date.travel_schedule': '旅行日程',
    'date.optional': '任意',
    'date.reset': 'リセット',
    'date.enter_date': '日程を入力',
    'date.close': '閉じる',
    'date.departure': '出発日',
    'date.return': '帰国日',
    'date.hint': '日程を入力すると宿泊費を自動的に計算します',
    'date.nights_auto': '合計{n}泊・宿泊費が自動的に計算されます',
    'date.select_return': '帰国日を選択してください',

    // 개수 조절
    'calc.nights_badge': '🌙 泊数調整可能',
    'calc.persons_badge': '👥 人数調整可能',
    'calc.tickets_badge': '🎟 枚数調整可能',
    'calc.nights_auto': '📅 旅行日程 {n}泊',
    'calc.accommodation_desc': '泊数を調整して宿泊費を計算してください',
    'calc.accommodation_desc_auto': '旅行日程は{n}泊です。宿泊泊数をご確認ください',
    'calc.transport_desc': '人数を調整して交通費を計算してください',
    'calc.tours_desc': '体験したいツアーを選んでください',
    'calc.activities_desc': '枚数を調整してチケット費用を計算してください',
    'calc.unit_night': '{n}泊',
    'calc.unit_person': '{n}人',
    'calc.unit_ticket': '{n}枚',
    'calc.basis': '基準',
    'calc.date_basis': '日程基準',
    'calc.total_cost_label': '合計',
    'calc.sort_by': '並び替え',
    'calc.sort_name': '名前順',
    'calc.sort_price': '価格順',
    'calc.accommodation_nights_warning': '旅行日程は{n}泊です。宿泊泊数が不足しています。',

    // KakaoPreview
    'preview.greeting': 'こんにちは！ 😊\nお選びいただいた旅行見積書をお送りします。',
    'preview.itinerary': '旅行見積書',
    'preview.book_now': '予約ページへ',

  }
};


const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('app_lang');
    return (saved as Language) || 'ko';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app_lang', lang);
  };

  const t = (key: string): string => {
    return (translations[language] as any)[key] || key;
  };

  return (
      <LanguageContext.Provider value={{ language, setLanguage, t }}>
        {children}
      </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};