import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../../supabase";
import {
    LogOut, Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
    BarChart2, Package, Link, ChevronDown, ChevronUp, X, Check
} from "lucide-react";

interface TravelItem {
    id: string;
    city: string;
    category: string;
    name: string;
    description: string;
    price: number;
    image: string;
    affiliate_link: string | null;
    click_count: number;
    is_active: boolean;
    created_at: string;
}

const CITIES = ['bangkok', 'danang', 'tokyo'];
const CATEGORIES = ['accommodation', 'transport', 'tours', 'activities'];
const CITY_LABELS: Record<string, string> = { bangkok: '방콕', danang: '다낭', tokyo: '도쿄' };
const CATEGORY_LABELS: Record<string, string> = {
    accommodation: '숙소', transport: '교통', tours: '투어', activities: '액티비티'
};

const EMPTY_FORM = {
    id: '', city: 'bangkok', category: 'accommodation',
    name: '', description: '', price: 0, image: '', affiliate_link: '', is_active: true
};

type Tab = 'items' | 'stats';

export function AdminDashboard() {
    const navigate = useNavigate();
    const [tab, setTab] = useState<Tab>('items');
    const [items, setItems] = useState<TravelItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState<TravelItem | null>(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [filterCity, setFilterCity] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');
    const [sortBy, setSortBy] = useState<'created_at' | 'click_count'>('created_at');

    // 인증 확인
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) navigate('/admin');
        });
    }, []);

    // 데이터 로드
    const fetchItems = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('items')
            .select('*')
            .order(sortBy, { ascending: false });
        setItems(data || []);
        setLoading(false);
    };

    useEffect(() => { fetchItems(); }, [sortBy]);

    // 로그아웃
    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/admin');
    };

    // 폼 열기
    const openCreateForm = () => {
        setEditingItem(null);
        setForm(EMPTY_FORM);
        setShowForm(true);
    };

    const openEditForm = (item: TravelItem) => {
        setEditingItem(item);
        setForm({
            id: item.id,
            city: item.city,
            category: item.category,
            name: item.name,
            description: item.description,
            price: item.price,
            image: item.image,
            affiliate_link: item.affiliate_link || '',
            is_active: item.is_active,
        });
        setShowForm(true);
    };

    // 저장 (추가 or 수정)
    const handleSave = async () => {
        if (!form.name || !form.price) return alert('이름과 가격은 필수입니다.');
        setSaving(true);

        const payload = {
            city: form.city,
            category: form.category,
            name: form.name,
            description: form.description,
            price: Number(form.price),
            image: form.image,
            affiliate_link: form.affiliate_link || null,
            is_active: form.is_active,
        };

        if (editingItem) {
            await supabase.from('items').update(payload).eq('id', editingItem.id);
        } else {
            const id = `${form.category}-${Date.now()}`;
            await supabase.from('items').insert({ id, ...payload });
        }

        setSaving(false);
        setShowForm(false);
        fetchItems();
    };

    // 삭제
    const handleDelete = async (id: string) => {
        if (!confirm('정말 삭제하시겠어요?')) return;
        await supabase.from('items').delete().eq('id', id);
        fetchItems();
    };

    // 활성/비활성 토글
    const handleToggle = async (item: TravelItem) => {
        await supabase.from('items').update({ is_active: !item.is_active }).eq('id', item.id);
        fetchItems();
    };

    // 필터링
    const filteredItems = items.filter(item => {
        if (filterCity !== 'all' && item.city !== filterCity) return false;
        if (filterCategory !== 'all' && item.category !== filterCategory) return false;
        return true;
    });

    // 통계
    const totalClicks = items.reduce((sum, i) => sum + i.click_count, 0);
    const activeItems = items.filter(i => i.is_active).length;
    const topItems = [...items].sort((a, b) => b.click_count - a.click_count).slice(0, 5);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* 헤더 */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
                <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div>
                        <h1 className="text-base font-bold text-gray-900">Trip Project 관리자</h1>
                        <p className="text-xs text-gray-400">Admin Dashboard</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        로그아웃
                    </button>
                </div>

                {/* 탭 */}
                <div className="max-w-5xl mx-auto px-4 flex gap-1">
                    {[
                        { id: 'items', label: '품목 관리', icon: Package },
                        { id: 'stats', label: '클릭 통계', icon: BarChart2 },
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id as Tab)}
                            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                                tab === t.id
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <t.icon className="w-4 h-4" />
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-6">

                {/* ── 품목 관리 탭 ── */}
                {tab === 'items' && (
                    <div>
                        {/* 상단 컨트롤 */}
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                            <select
                                value={filterCity}
                                onChange={e => setFilterCity(e.target.value)}
                                className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white"
                            >
                                <option value="all">전체 도시</option>
                                {CITIES.map(c => <option key={c} value={c}>{CITY_LABELS[c]}</option>)}
                            </select>

                            <select
                                value={filterCategory}
                                onChange={e => setFilterCategory(e.target.value)}
                                className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white"
                            >
                                <option value="all">전체 카테고리</option>
                                {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                            </select>

                            <select
                                value={sortBy}
                                onChange={e => setSortBy(e.target.value as any)}
                                className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white"
                            >
                                <option value="created_at">최신순</option>
                                <option value="click_count">클릭 많은 순</option>
                            </select>

                            <div className="ml-auto">
                                <button
                                    onClick={openCreateForm}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    품목 추가
                                </button>
                            </div>
                        </div>

                        {/* 품목 리스트 */}
                        {loading ? (
                            <div className="space-y-2">
                                {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filteredItems.map(item => (
                                    <div
                                        key={item.id}
                                        className={`bg-white rounded-xl border p-4 flex items-center gap-3 transition-opacity ${
                                            !item.is_active ? 'opacity-50' : ''
                                        }`}
                                    >
                                        {/* 이미지 */}
                                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                            {item.image && (
                                                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                            )}
                                        </div>

                                        {/* 내용 */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">
                          {CITY_LABELS[item.city]}
                        </span>
                                                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                          {CATEGORY_LABELS[item.category]}
                        </span>
                                            </div>
                                            <p className="text-sm font-medium text-gray-900 line-clamp-1">{item.name}</p>
                                            <div className="flex items-center gap-3 mt-0.5">
                                                <span className="text-xs text-blue-600 font-semibold">₩{item.price.toLocaleString()}</span>
                                                <span className="text-xs text-gray-400">클릭 {item.click_count}회</span>
                                                {item.affiliate_link && (
                                                    <span className="text-[10px] text-green-600 flex items-center gap-0.5">
                            <Link className="w-3 h-3" /> 링크 있음
                          </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* 액션 버튼 */}
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <button
                                                onClick={() => handleToggle(item)}
                                                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                                                title={item.is_active ? '비활성화' : '활성화'}
                                            >
                                                {item.is_active
                                                    ? <ToggleRight className="w-5 h-5 text-blue-500" />
                                                    : <ToggleLeft className="w-5 h-5 text-gray-400" />
                                                }
                                            </button>
                                            <button
                                                onClick={() => openEditForm(item)}
                                                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                                            >
                                                <Pencil className="w-4 h-4 text-gray-500" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4 text-red-400" />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {filteredItems.length === 0 && (
                                    <div className="text-center py-12 text-gray-400 text-sm">
                                        해당 조건의 품목이 없습니다.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ── 통계 탭 ── */}
                {tab === 'stats' && (
                    <div>
                        {/* 요약 카드 */}
                        <div className="grid grid-cols-3 gap-3 mb-6">
                            {[
                                { label: '전체 품목', value: items.length, color: 'blue' },
                                { label: '활성 품목', value: activeItems, color: 'green' },
                                { label: '총 클릭수', value: totalClicks, color: 'orange' },
                            ].map(card => (
                                <div key={card.label} className="bg-white rounded-xl border p-4 text-center">
                                    <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                                    <p className="text-xs text-gray-500 mt-1">{card.label}</p>
                                </div>
                            ))}
                        </div>

                        {/* 클릭 랭킹 */}
                        <div className="bg-white rounded-xl border p-4">
                            <h2 className="text-sm font-bold text-gray-900 mb-4">🏆 클릭 TOP 5</h2>
                            <div className="space-y-3">
                                {topItems.map((item, index) => (
                                    <div key={item.id} className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        index === 0 ? 'bg-yellow-100 text-yellow-700' :
                            index === 1 ? 'bg-gray-100 text-gray-600' :
                                index === 2 ? 'bg-orange-100 text-orange-600' :
                                    'bg-gray-50 text-gray-400'
                    }`}>
                      {index + 1}
                    </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 line-clamp-1">{item.name}</p>
                                            <p className="text-xs text-gray-400">{CITY_LABELS[item.city]} · {CATEGORY_LABELS[item.category]}</p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-sm font-bold text-blue-600">{item.click_count}회</p>
                                        </div>
                                    </div>
                                ))}

                                {topItems.length === 0 && (
                                    <p className="text-sm text-gray-400 text-center py-4">아직 클릭 데이터가 없습니다.</p>
                                )}
                            </div>
                        </div>

                        {/* 도시별 클릭 */}
                        <div className="bg-white rounded-xl border p-4 mt-3">
                            <h2 className="text-sm font-bold text-gray-900 mb-4">🌏 도시별 클릭수</h2>
                            <div className="space-y-3">
                                {CITIES.map(city => {
                                    const cityClicks = items
                                        .filter(i => i.city === city)
                                        .reduce((sum, i) => sum + i.click_count, 0);
                                    const pct = totalClicks > 0 ? Math.round((cityClicks / totalClicks) * 100) : 0;
                                    return (
                                        <div key={city}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-medium text-gray-700">{CITY_LABELS[city]}</span>
                                                <span className="text-xs text-gray-500">{cityClicks}회 ({pct}%)</span>
                                            </div>
                                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-blue-500 rounded-full transition-all"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 품목 추가/수정 모달 */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between px-5 py-4 border-b">
                            <h2 className="text-base font-bold">
                                {editingItem ? '품목 수정' : '품목 추가'}
                            </h2>
                            <button onClick={() => setShowForm(false)}>
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        <div className="px-5 py-4 space-y-4">
                            {/* 도시 + 카테고리 */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">도시</label>
                                    <select
                                        value={form.city}
                                        onChange={e => setForm({...form, city: e.target.value})}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                                    >
                                        {CITIES.map(c => <option key={c} value={c}>{CITY_LABELS[c]}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">카테고리</label>
                                    <select
                                        value={form.category}
                                        onChange={e => setForm({...form, category: e.target.value})}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                                    >
                                        {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* 이름 */}
                            <div>
                                <label className="text-xs font-semibold text-gray-600 mb-1 block">품목명 *</label>
                                <input
                                    value={form.name}
                                    onChange={e => setForm({...form, name: e.target.value})}
                                    placeholder="5성급 럭셔리 호텔 (3박)"
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* 설명 */}
                            <div>
                                <label className="text-xs font-semibold text-gray-600 mb-1 block">설명</label>
                                <input
                                    value={form.description}
                                    onChange={e => setForm({...form, description: e.target.value})}
                                    placeholder="인피니티 풀 & 조식 포함, 시암 지역"
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* 가격 */}
                            <div>
                                <label className="text-xs font-semibold text-gray-600 mb-1 block">가격 (₩) *</label>
                                <input
                                    type="number"
                                    value={form.price}
                                    onChange={e => setForm({...form, price: Number(e.target.value)})}
                                    placeholder="450000"
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* 이미지 URL */}
                            <div>
                                <label className="text-xs font-semibold text-gray-600 mb-1 block">이미지 URL</label>
                                <input
                                    value={form.image}
                                    onChange={e => setForm({...form, image: e.target.value})}
                                    placeholder="https://images.unsplash.com/..."
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* 제휴링크 */}
                            <div>
                                <label className="text-xs font-semibold text-gray-600 mb-1 block flex items-center gap-1">
                                    <Link className="w-3 h-3" /> 제휴 링크
                                </label>
                                <input
                                    value={form.affiliate_link}
                                    onChange={e => setForm({...form, affiliate_link: e.target.value})}
                                    placeholder="https://agoda.com/..."
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* 활성 여부 */}
                            <div className="flex items-center justify-between py-2">
                                <div>
                                    <p className="text-sm font-medium text-gray-900">활성화</p>
                                    <p className="text-xs text-gray-400">비활성화 시 사용자에게 노출되지 않습니다</p>
                                </div>
                                <button
                                    onClick={() => setForm({...form, is_active: !form.is_active})}
                                    className={`w-11 h-6 rounded-full transition-colors relative ${
                                        form.is_active ? 'bg-blue-600' : 'bg-gray-200'
                                    }`}
                                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                      form.is_active ? 'left-5' : 'left-0.5'
                  }`} />
                                </button>
                            </div>
                        </div>

                        <div className="px-5 py-4 border-t flex gap-2">
                            <button
                                onClick={() => setShowForm(false)}
                                className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                            >
                                {saving ? '저장 중...' : editingItem ? '수정 완료' : '추가하기'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}