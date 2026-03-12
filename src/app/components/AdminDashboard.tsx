import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../../supabase";
import {
    LogOut, Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
    BarChart2, Package, Link, X, Check, Globe
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

interface City {
    id: string;
    name: string;
    emoji: string;
    is_active: boolean;
    created_at: string;
}

const CATEGORIES = ['accommodation', 'transport', 'tours', 'activities'];
const CATEGORY_LABELS: Record<string, string> = {
    accommodation: '숙소', transport: '교통', tours: '투어', activities: '액티비티'
};

const EMPTY_ITEM_FORM = {
    id: '', city: '', category: 'accommodation',
    name: '', description: '', price: 0, image: '', affiliate_link: '', is_active: true
};

const EMPTY_CITY_FORM = { id: '', name: '', emoji: '🌏', is_active: true };

type Tab = 'items' | 'cities' | 'stats';

export function AdminDashboard() {
    const navigate = useNavigate();
    const [tab, setTab] = useState<Tab>('items');

    // 품목 상태
    const [items, setItems] = useState<TravelItem[]>([]);
    const [itemsLoading, setItemsLoading] = useState(true);
    const [showItemForm, setShowItemForm] = useState(false);
    const [editingItem, setEditingItem] = useState<TravelItem | null>(null);
    const [itemForm, setItemForm] = useState(EMPTY_ITEM_FORM);
    const [savingItem, setSavingItem] = useState(false);
    const [filterCity, setFilterCity] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');
    const [sortBy, setSortBy] = useState<'created_at' | 'click_count'>('created_at');

    // 도시 상태
    const [cities, setCities] = useState<City[]>([]);
    const [citiesLoading, setCitiesLoading] = useState(true);
    const [showCityForm, setShowCityForm] = useState(false);
    const [editingCity, setEditingCity] = useState<City | null>(null);
    const [cityForm, setCityForm] = useState(EMPTY_CITY_FORM);
    const [savingCity, setSavingCity] = useState(false);

    // 인증 확인
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) navigate('/admin');
        });
    }, []);

    // 도시 로드
    const fetchCities = async () => {
        setCitiesLoading(true);
        const { data } = await supabase.from('cities').select('*').order('created_at', { ascending: true });
        setCities(data || []);
        setCitiesLoading(false);
    };

    // 품목 로드
    const fetchItems = async () => {
        setItemsLoading(true);
        const { data } = await supabase.from('items').select('*').order(sortBy, { ascending: false });
        setItems(data || []);
        setItemsLoading(false);
    };

    useEffect(() => { fetchCities(); fetchItems(); }, []);
    useEffect(() => { fetchItems(); }, [sortBy]);

    // 로그아웃
    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/admin');
    };

    // ── 도시 관리 ──
    const openCreateCityForm = () => {
        setEditingCity(null);
        setCityForm(EMPTY_CITY_FORM);
        setShowCityForm(true);
    };

    const openEditCityForm = (city: City) => {
        setEditingCity(city);
        setCityForm({ id: city.id, name: city.name, emoji: city.emoji, is_active: city.is_active });
        setShowCityForm(true);
    };

    const handleSaveCity = async () => {
        if (!cityForm.name || !cityForm.id) return alert('ID와 이름은 필수입니다.');
        setSavingCity(true);

        if (editingCity) {
            await supabase.from('cities').update({
                name: cityForm.name,
                emoji: cityForm.emoji,
                is_active: cityForm.is_active,
            }).eq('id', editingCity.id);
        } else {
            await supabase.from('cities').insert({
                id: cityForm.id.toLowerCase().replace(/\s+/g, '-'),
                name: cityForm.name,
                emoji: cityForm.emoji,
                is_active: cityForm.is_active,
            });
        }

        setSavingCity(false);
        setShowCityForm(false);
        fetchCities();
    };

    const handleDeleteCity = async (id: string) => {
        if (!confirm(`'${id}' 도시를 삭제하면 관련 품목도 모두 삭제됩니다. 계속할까요?`)) return;
        await supabase.from('items').delete().eq('city', id);
        await supabase.from('cities').delete().eq('id', id);
        fetchCities();
        fetchItems();
    };

    const handleToggleCity = async (city: City) => {
        await supabase.from('cities').update({ is_active: !city.is_active }).eq('id', city.id);
        fetchCities();
    };

    // ── 품목 관리 ──
    const openCreateItemForm = () => {
        setEditingItem(null);
        setItemForm({ ...EMPTY_ITEM_FORM, city: cities[0]?.id || '' });
        setShowItemForm(true);
    };

    const openEditItemForm = (item: TravelItem) => {
        setEditingItem(item);
        setItemForm({
            id: item.id, city: item.city, category: item.category,
            name: item.name, description: item.description, price: item.price,
            image: item.image, affiliate_link: item.affiliate_link || '', is_active: item.is_active,
        });
        setShowItemForm(true);
    };

    const handleSaveItem = async () => {
        if (!itemForm.name || !itemForm.price) return alert('이름과 가격은 필수입니다.');
        setSavingItem(true);

        const payload = {
            city: itemForm.city,
            category: itemForm.category,
            name: itemForm.name,
            description: itemForm.description,
            price: Number(itemForm.price),
            image: itemForm.image,
            affiliate_link: itemForm.affiliate_link || null,
            is_active: itemForm.is_active,
        };

        if (editingItem) {
            await supabase.from('items').update(payload).eq('id', editingItem.id);
        } else {
            await supabase.from('items').insert({ id: `${itemForm.category}-${Date.now()}`, ...payload });
        }

        setSavingItem(false);
        setShowItemForm(false);
        fetchItems();
    };

    const handleDeleteItem = async (id: string) => {
        if (!confirm('정말 삭제하시겠어요?')) return;
        await supabase.from('items').delete().eq('id', id);
        fetchItems();
    };

    const handleToggleItem = async (item: TravelItem) => {
        await supabase.from('items').update({ is_active: !item.is_active }).eq('id', item.id);
        fetchItems();
    };

    // 필터
    const filteredItems = items.filter(item => {
        if (filterCity !== 'all' && item.city !== filterCity) return false;
        if (filterCategory !== 'all' && item.category !== filterCategory) return false;
        return true;
    });

    // 통계
    const totalClicks = items.reduce((sum, i) => sum + i.click_count, 0);
    const topItems = [...items].sort((a, b) => b.click_count - a.click_count).slice(0, 5);
    const cityLabels = Object.fromEntries(cities.map(c => [c.id, c.name]));

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
                        <LogOut className="w-3.5 h-3.5" /> 로그아웃
                    </button>
                </div>

                {/* 탭 */}
                <div className="max-w-5xl mx-auto px-4 flex gap-1">
                    {[
                        { id: 'items', label: '품목 관리', icon: Package },
                        { id: 'cities', label: '나라/도시 관리', icon: Globe },
                        { id: 'stats', label: '클릭 통계', icon: BarChart2 },
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id as Tab)}
                            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                                tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
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
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                            <select
                                value={filterCity}
                                onChange={e => setFilterCity(e.target.value)}
                                className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white"
                            >
                                <option value="all">전체 도시</option>
                                {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
                                    onClick={openCreateItemForm}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5" /> 품목 추가
                                </button>
                            </div>
                        </div>

                        {itemsLoading ? (
                            <div className="space-y-2">
                                {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filteredItems.map(item => (
                                    <div key={item.id} className={`bg-white rounded-xl border p-4 flex items-center gap-3 ${!item.is_active ? 'opacity-50' : ''}`}>
                                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                            {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">
                          {cityLabels[item.city] || item.city}
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
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <button onClick={() => handleToggleItem(item)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                                                {item.is_active ? <ToggleRight className="w-5 h-5 text-blue-500" /> : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                                            </button>
                                            <button onClick={() => openEditItemForm(item)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                                                <Pencil className="w-4 h-4 text-gray-500" />
                                            </button>
                                            <button onClick={() => handleDeleteItem(item.id)} className="p-1.5 hover:bg-red-50 rounded-lg">
                                                <Trash2 className="w-4 h-4 text-red-400" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {filteredItems.length === 0 && (
                                    <div className="text-center py-12 text-gray-400 text-sm">해당 조건의 품목이 없습니다.</div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ── 나라/도시 관리 탭 ── */}
                {tab === 'cities' && (
                    <div>
                        <div className="flex justify-end mb-4">
                            <button
                                onClick={openCreateCityForm}
                                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors"
                            >
                                <Plus className="w-3.5 h-3.5" /> 나라/도시 추가
                            </button>
                        </div>

                        {citiesLoading ? (
                            <div className="space-y-2">
                                {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {cities.map(city => (
                                    <div key={city.id} className={`bg-white rounded-xl border p-4 flex items-center gap-3 ${!city.is_active ? 'opacity-50' : ''}`}>
                                        <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-2xl flex-shrink-0">
                                            {city.emoji}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-900">{city.name}</p>
                                            <p className="text-xs text-gray-400">ID: {city.id} · 품목 {items.filter(i => i.city === city.id).length}개</p>
                                        </div>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <button onClick={() => handleToggleCity(city)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                                                {city.is_active ? <ToggleRight className="w-5 h-5 text-blue-500" /> : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                                            </button>
                                            <button onClick={() => openEditCityForm(city)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                                                <Pencil className="w-4 h-4 text-gray-500" />
                                            </button>
                                            <button onClick={() => handleDeleteCity(city.id)} className="p-1.5 hover:bg-red-50 rounded-lg">
                                                <Trash2 className="w-4 h-4 text-red-400" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {cities.length === 0 && (
                                    <div className="text-center py-12 text-gray-400 text-sm">등록된 도시가 없습니다.</div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ── 통계 탭 ── */}
                {tab === 'stats' && (
                    <div>
                        <div className="grid grid-cols-3 gap-3 mb-6">
                            {[
                                { label: '전체 품목', value: items.length },
                                { label: '활성 품목', value: items.filter(i => i.is_active).length },
                                { label: '총 클릭수', value: totalClicks },
                            ].map(card => (
                                <div key={card.label} className="bg-white rounded-xl border p-4 text-center">
                                    <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                                    <p className="text-xs text-gray-500 mt-1">{card.label}</p>
                                </div>
                            ))}
                        </div>

                        <div className="bg-white rounded-xl border p-4 mb-3">
                            <h2 className="text-sm font-bold text-gray-900 mb-4">🏆 클릭 TOP 5</h2>
                            <div className="space-y-3">
                                {topItems.map((item, index) => (
                                    <div key={item.id} className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        index === 0 ? 'bg-yellow-100 text-yellow-700' :
                            index === 1 ? 'bg-gray-100 text-gray-600' :
                                index === 2 ? 'bg-orange-100 text-orange-600' : 'bg-gray-50 text-gray-400'
                    }`}>{index + 1}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 line-clamp-1">{item.name}</p>
                                            <p className="text-xs text-gray-400">{cityLabels[item.city] || item.city} · {CATEGORY_LABELS[item.category]}</p>
                                        </div>
                                        <p className="text-sm font-bold text-blue-600 flex-shrink-0">{item.click_count}회</p>
                                    </div>
                                ))}
                                {topItems.length === 0 && <p className="text-sm text-gray-400 text-center py-4">아직 클릭 데이터가 없습니다.</p>}
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border p-4">
                            <h2 className="text-sm font-bold text-gray-900 mb-4">🌏 도시별 클릭수</h2>
                            <div className="space-y-3">
                                {cities.map(city => {
                                    const cityClicks = items.filter(i => i.city === city.id).reduce((sum, i) => sum + i.click_count, 0);
                                    const pct = totalClicks > 0 ? Math.round((cityClicks / totalClicks) * 100) : 0;
                                    return (
                                        <div key={city.id}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-medium text-gray-700">{city.emoji} {city.name}</span>
                                                <span className="text-xs text-gray-500">{cityClicks}회 ({pct}%)</span>
                                            </div>
                                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 도시 추가/수정 모달 */}
            {showCityForm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm">
                        <div className="flex items-center justify-between px-5 py-4 border-b">
                            <h2 className="text-base font-bold">{editingCity ? '도시 수정' : '나라/도시 추가'}</h2>
                            <button onClick={() => setShowCityForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
                        </div>
                        <div className="px-5 py-4 space-y-4">
                            {!editingCity && (
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">ID (영문, 변경 불가) *</label>
                                    <input
                                        value={cityForm.id}
                                        onChange={e => setCityForm({...cityForm, id: e.target.value})}
                                        placeholder="jeju, singapore, bali..."
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            )}
                            <div>
                                <label className="text-xs font-semibold text-gray-600 mb-1 block">도시명 *</label>
                                <input
                                    value={cityForm.name}
                                    onChange={e => setCityForm({...cityForm, name: e.target.value})}
                                    placeholder="제주, 싱가포르, 발리..."
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600 mb-1 block">이모지 국기</label>
                                <input
                                    value={cityForm.emoji}
                                    onChange={e => setCityForm({...cityForm, emoji: e.target.value})}
                                    placeholder="🇰🇷"
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="flex items-center justify-between py-1">
                                <div>
                                    <p className="text-sm font-medium text-gray-900">활성화</p>
                                    <p className="text-xs text-gray-400">비활성화 시 사용자에게 노출되지 않습니다</p>
                                </div>
                                <button
                                    onClick={() => setCityForm({...cityForm, is_active: !cityForm.is_active})}
                                    className={`w-11 h-6 rounded-full transition-colors relative ${cityForm.is_active ? 'bg-blue-600' : 'bg-gray-200'}`}
                                >
                                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${cityForm.is_active ? 'left-5' : 'left-0.5'}`} />
                                </button>
                            </div>
                        </div>
                        <div className="px-5 py-4 border-t flex gap-2">
                            <button onClick={() => setShowCityForm(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium">취소</button>
                            <button onClick={handleSaveCity} disabled={savingCity} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                                {savingCity ? '저장 중...' : editingCity ? '수정 완료' : '추가하기'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 품목 추가/수정 모달 */}
            {showItemForm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between px-5 py-4 border-b">
                            <h2 className="text-base font-bold">{editingItem ? '품목 수정' : '품목 추가'}</h2>
                            <button onClick={() => setShowItemForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
                        </div>
                        <div className="px-5 py-4 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">도시</label>
                                    <select
                                        value={itemForm.city}
                                        onChange={e => setItemForm({...itemForm, city: e.target.value})}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                                    >
                                        {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">카테고리</label>
                                    <select
                                        value={itemForm.category}
                                        onChange={e => setItemForm({...itemForm, category: e.target.value})}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                                    >
                                        {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600 mb-1 block">품목명 *</label>
                                <input value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})}
                                       placeholder="5성급 럭셔리 호텔 (3박)"
                                       className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600 mb-1 block">설명</label>
                                <input value={itemForm.description} onChange={e => setItemForm({...itemForm, description: e.target.value})}
                                       placeholder="인피니티 풀 & 조식 포함, 시암 지역"
                                       className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600 mb-1 block">가격 (₩) *</label>
                                <input type="number" value={itemForm.price} onChange={e => setItemForm({...itemForm, price: Number(e.target.value)})}
                                       placeholder="450000"
                                       className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600 mb-1 block">이미지 URL</label>
                                <input value={itemForm.image} onChange={e => setItemForm({...itemForm, image: e.target.value})}
                                       placeholder="https://images.unsplash.com/..."
                                       className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600 mb-1 block flex items-center gap-1">
                                    <Link className="w-3 h-3" /> 제휴 링크
                                </label>
                                <input value={itemForm.affiliate_link} onChange={e => setItemForm({...itemForm, affiliate_link: e.target.value})}
                                       placeholder="https://agoda.com/..."
                                       className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div className="flex items-center justify-between py-1">
                                <div>
                                    <p className="text-sm font-medium text-gray-900">활성화</p>
                                    <p className="text-xs text-gray-400">비활성화 시 사용자에게 노출되지 않습니다</p>
                                </div>
                                <button
                                    onClick={() => setItemForm({...itemForm, is_active: !itemForm.is_active})}
                                    className={`w-11 h-6 rounded-full transition-colors relative ${itemForm.is_active ? 'bg-blue-600' : 'bg-gray-200'}`}
                                >
                                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${itemForm.is_active ? 'left-5' : 'left-0.5'}`} />
                                </button>
                            </div>
                        </div>
                        <div className="px-5 py-4 border-t flex gap-2">
                            <button onClick={() => setShowItemForm(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium">취소</button>
                            <button onClick={handleSaveItem} disabled={savingItem} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                                {savingItem ? '저장 중...' : editingItem ? '수정 완료' : '추가하기'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}