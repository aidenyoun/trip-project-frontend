import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../../supabase";
import * as XLSX from 'xlsx';
import {
    LogOut, Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
    BarChart2, Package, Link, X, Check, Globe, FileUp, Download,
    Info, AlertCircle, Image, Loader2, RefreshCw
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

const EXCEL_HEADER_MAP: Record<string, string> = {
    '도시 ID': 'city', '카테고리': 'category', '품목명': 'name', '설명': 'description',
    '가격': 'price', '이미지 URL': 'image', '제휴 링크': 'affiliate_link', '활성화(Y/N)': 'is_active'
};

const EMPTY_ITEM_FORM = {
    id: '', city: '', category: 'accommodation',
    name: '', description: '', price: 0, image: '', affiliate_link: '', is_active: true
};
const EMPTY_CITY_FORM = { id: '', name: '', emoji: '🌏', is_active: true };

type Tab = 'items' | 'cities' | 'stats';

// ── 이미지 URL → Supabase Storage 업로드 ──
const BUCKET = 'item-images';

async function uploadImageToStorage(imageUrl: string, itemId: string): Promise<string> {
    if (!imageUrl || !imageUrl.startsWith('http')) return imageUrl;
    try {
        const { data, error } = await supabase.functions.invoke('upload-image', {
            body: { imageUrl, itemId }
        });
        if (error) throw error;
        return data.url || imageUrl;
    } catch (e) {
        console.warn('이미지 업로드 실패, 원본 유지:', e);
        return imageUrl;
    }
}

export function AdminDashboard() {
    const navigate = useNavigate();
    const [tab, setTab] = useState<Tab>('items');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [items, setItems] = useState<TravelItem[]>([]);
    const [itemsLoading, setItemsLoading] = useState(true);
    const [showItemForm, setShowItemForm] = useState(false);
    const [editingItem, setEditingItem] = useState<TravelItem | null>(null);
    const [itemForm, setItemForm] = useState(EMPTY_ITEM_FORM);
    const [savingItem, setSavingItem] = useState(false);
    const [filterCity, setFilterCity] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');
    const [sortBy, setSortBy] = useState<'created_at' | 'click_count'>('created_at');
    const [isBulkUploading, setIsBulkUploading] = useState(false);
    const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number; label?: string } | null>(null);
    const [showExcelHelp, setShowExcelHelp] = useState(false);

    const [cities, setCities] = useState<City[]>([]);
    const [citiesLoading, setCitiesLoading] = useState(true);
    const [showCityForm, setShowCityForm] = useState(false);
    const [editingCity, setEditingCity] = useState<City | null>(null);
    const [cityForm, setCityForm] = useState(EMPTY_CITY_FORM);
    const [savingCity, setSavingCity] = useState(false);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) navigate('/admin');
        });
    }, []);

    const fetchCities = async () => {
        setCitiesLoading(true);
        const { data } = await supabase.from('cities').select('*').order('created_at', { ascending: true });
        setCities(data || []);
        setCitiesLoading(false);
    };

    const fetchItems = async () => {
        setItemsLoading(true);
        const { data } = await supabase.from('items').select('*').order(sortBy, { ascending: false });
        setItems(data || []);
        setItemsLoading(false);
    };

    useEffect(() => { fetchCities(); fetchItems(); }, []);
    useEffect(() => { fetchItems(); }, [sortBy]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/admin');
    };

    // ── 기존 외부 링크 이미지 일괄 마이그레이션 ──
    const handleMigrateImages = async () => {
        const externalItems = items.filter(
            item => item.image && item.image.startsWith('http') && !item.image.includes('supabase')
        );

        if (externalItems.length === 0) {
            alert('✅ 모든 이미지가 이미 서버에 저장되어 있습니다!');
            return;
        }

        if (!confirm(`외부 링크 이미지 ${externalItems.length}개를 서버로 이전합니다.\n시간이 다소 걸릴 수 있습니다. 계속할까요?`)) return;

        setIsBulkUploading(true);
        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < externalItems.length; i++) {
            const item = externalItems[i];
            setBulkProgress({ current: i + 1, total: externalItems.length, label: item.name });

            const newUrl = await uploadImageToStorage(item.image, item.id);

            if (newUrl !== item.image) {
                // URL이 바뀐 경우 = 성공 → DB 업데이트
                const { error } = await supabase.from('items').update({ image: newUrl }).eq('id', item.id);
                if (error) { failCount++; } else { successCount++; }
            } else {
                // URL 그대로 = 실패
                failCount++;
            }
        }

        setIsBulkUploading(false);
        setBulkProgress(null);
        await fetchItems();

        alert(`이미지 이전 완료!\n✅ 성공: ${successCount}개\n❌ 실패(원본 유지): ${failCount}개`);
    };

    // ── 도시 관리 ──
    const openCreateCityForm = () => { setEditingCity(null); setCityForm(EMPTY_CITY_FORM); setShowCityForm(true); };
    const openEditCityForm = (city: City) => {
        setEditingCity(city);
        setCityForm({ id: city.id, name: city.name, emoji: city.emoji, is_active: city.is_active });
        setShowCityForm(true);
    };
    const handleSaveCity = async () => {
        if (!cityForm.name || !cityForm.id) return alert('ID와 이름은 필수입니다.');
        setSavingCity(true);
        if (editingCity) {
            await supabase.from('cities').update({ name: cityForm.name, emoji: cityForm.emoji, is_active: cityForm.is_active }).eq('id', editingCity.id);
        } else {
            await supabase.from('cities').insert({ id: cityForm.id.toLowerCase().replace(/\s+/g, '-'), name: cityForm.name, emoji: cityForm.emoji, is_active: cityForm.is_active });
        }
        setSavingCity(false); setShowCityForm(false); fetchCities();
    };
    const handleDeleteCity = async (id: string) => {
        if (!confirm(`'${id}' 도시를 삭제하면 관련 품목도 모두 삭제됩니다.`)) return;
        await supabase.from('items').delete().eq('city', id);
        await supabase.from('cities').delete().eq('id', id);
        fetchCities(); fetchItems();
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
        setItemForm({ id: item.id, city: item.city, category: item.category, name: item.name, description: item.description, price: item.price, image: item.image, affiliate_link: item.affiliate_link || '', is_active: item.is_active });
        setShowItemForm(true);
    };
    const handleSaveItem = async () => {
        if (!itemForm.name || !itemForm.price) return alert('이름과 가격은 필수입니다.');
        setSavingItem(true);
        const itemId = editingItem?.id || `${itemForm.category}-${Date.now()}`;
        let finalImageUrl = itemForm.image;
        if (itemForm.image && itemForm.image.startsWith('http') && !itemForm.image.includes('supabase')) {
            finalImageUrl = await uploadImageToStorage(itemForm.image, itemId);
        }
        const payload = { city: itemForm.city, category: itemForm.category, name: itemForm.name, description: itemForm.description, price: Number(itemForm.price), image: finalImageUrl, affiliate_link: itemForm.affiliate_link || null, is_active: itemForm.is_active };
        if (editingItem) { await supabase.from('items').update(payload).eq('id', editingItem.id); }
        else { await supabase.from('items').insert({ id: itemId, ...payload }); }
        setSavingItem(false); setShowItemForm(false); fetchItems();
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

    // ── 엑셀 샘플 다운로드 ──
    const handleDownloadSample = () => {
        const sampleData = [
            { '도시 ID': 'tokyo', '카테고리': 'accommodation', '품목명': '도쿄 럭셔리 호텔', '설명': '신주쿠역 도보 5분, 조식 포함', '가격': 300000, '이미지 URL': 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26', '제휴 링크': 'https://www.agoda.com', '활성화(Y/N)': 'Y' },
            { '도시 ID': 'jeju', '카테고리': 'transport', '품목명': '전기차 렌트 (24시간)', '설명': '보험 포함, 완전 자차', '가격': 45000, '이미지 URL': '', '제휴 링크': '', '활성화(Y/N)': 'Y' }
        ];
        const ws = XLSX.utils.json_to_sheet(sampleData);
        ws['!cols'] = [{ wch: 10 }, { wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 12 }, { wch: 30 }, { wch: 30 }, { wch: 12 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "품목업로드양식");
        XLSX.writeFile(wb, "여행품목_업로드_양식.xlsx");
    };

    // ── 엑셀 대량 업로드 ──
    const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsBulkUploading(true); setBulkProgress(null);
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const wb = XLSX.read(evt.target?.result, { type: 'binary' });
                const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]) as any[];
                if (rows.length === 0) { alert('업로드할 데이터가 없습니다.'); return; }
                const parsedItems = rows.map((row, index) => {
                    const item: any = { id: `${row['카테고리'] || 'item'}-${Date.now()}-${index}` };
                    Object.entries(EXCEL_HEADER_MAP).forEach(([kr, en]) => {
                        let value = row[kr];
                        if (en === 'price') value = Number(value) || 0;
                        if (en === 'is_active') value = String(value).toUpperCase() === 'Y';
                        if (en === 'affiliate_link') value = value || null;
                        item[en] = value;
                    });
                    return item;
                });
                const invalidRow = parsedItems.find(i => !i.city || !i.category || !i.name);
                if (invalidRow) { alert('도시 ID, 카테고리, 품목명은 필수입니다.'); return; }
                setBulkProgress({ current: 0, total: parsedItems.length });
                const itemsWithImages = [];
                for (let i = 0; i < parsedItems.length; i++) {
                    const item = parsedItems[i];
                    setBulkProgress({ current: i + 1, total: parsedItems.length, label: item.name });
                    if (item.image && item.image.startsWith('http')) {
                        item.image = await uploadImageToStorage(item.image, item.id);
                    }
                    itemsWithImages.push(item);
                }
                const { error } = await supabase.from('items').insert(itemsWithImages);
                if (error) throw error;
                alert(`✅ ${itemsWithImages.length}개 품목 업로드 완료!`);
                fetchItems();
            } catch (err) {
                console.error(err);
                alert('업로드 오류. 엑셀 형식을 확인해주세요.');
            } finally {
                setIsBulkUploading(false); setBulkProgress(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsBinaryString(file);
    };

    const filteredItems = items.filter(item => {
        if (filterCity !== 'all' && item.city !== filterCity) return false;
        if (filterCategory !== 'all' && item.category !== filterCategory) return false;
        return true;
    });
    const externalImageCount = items.filter(i => i.image && i.image.startsWith('http') && !i.image.includes('supabase')).length;
    const totalClicks = items.reduce((sum, i) => sum + i.click_count, 0);
    const topItems = [...items].sort((a, b) => b.click_count - a.click_count).slice(0, 5);
    const cityLabels = Object.fromEntries(cities.map(c => [c.id, c.name]));

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
                <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white"><Package className="w-5 h-5" /></div>
                        <div>
                            <h1 className="text-base font-bold text-gray-900 leading-tight">Trip Project 관리자</h1>
                            <p className="text-[10px] text-gray-400 font-medium tracking-wider uppercase">Admin Dashboard</p>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                        <LogOut className="w-3.5 h-3.5" /> 로그아웃
                    </button>
                </div>
                <div className="max-w-5xl mx-auto px-4 flex gap-1">
                    {[{ id: 'items', label: '품목 관리', icon: Package }, { id: 'cities', label: '나라/도시 관리', icon: Globe }, { id: 'stats', label: '클릭 통계', icon: BarChart2 }].map(t => (
                        <button key={t.id} onClick={() => setTab(t.id as Tab)}
                                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                            <t.icon className={`w-4 h-4 ${tab === t.id ? 'text-blue-600' : 'text-gray-400'}`} />
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-6">
                {tab === 'items' && (
                    <div className="space-y-4">

                        {/* ── 외부 링크 이미지 경고 + 일괄 이전 버튼 ── */}
                        {externalImageCount > 0 && !isBulkUploading && (
                            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center gap-4">
                                <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0" />
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-orange-900">
                                        외부 링크 이미지 {externalImageCount}개가 있습니다
                                    </p>
                                    <p className="text-xs text-orange-700 mt-0.5">
                                        네이버, 인스타 등 외부 이미지는 차단될 수 있습니다. 서버로 이전하면 안정적으로 표시됩니다.
                                    </p>
                                </div>
                                <button
                                    onClick={handleMigrateImages}
                                    className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-bold hover:bg-orange-600 transition-all active:scale-95 shadow-md"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    지금 이전하기
                                </button>
                            </div>
                        )}

                        {/* 진행 상황 바 (업로드 & 마이그레이션 공용) */}
                        {isBulkUploading && bulkProgress && (
                            <div className="bg-white border border-blue-200 rounded-2xl p-4">
                                <div className="flex items-center gap-3 mb-3">
                                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-900">
                                            이미지 서버 저장 중... ({bulkProgress.current}/{bulkProgress.total})
                                        </p>
                                        {bulkProgress.label && (
                                            <p className="text-xs text-gray-400 truncate">{bulkProgress.label}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                         style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }} />
                                </div>
                                <p className="text-xs text-gray-400 text-right mt-1">
                                    {Math.round((bulkProgress.current / bulkProgress.total) * 100)}%
                                </p>
                            </div>
                        )}

                        {/* 엑셀 안내 */}
                        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
                            <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                    <h3 className="text-sm font-bold text-blue-900">대량 업로드 가이드</h3>
                                    <button onClick={() => setShowExcelHelp(!showExcelHelp)} className="text-xs text-blue-600 font-medium hover:underline">
                                        {showExcelHelp ? '닫기' : '자세히 보기'}
                                    </button>
                                </div>
                                <p className="text-xs text-blue-700">
                                    엑셀 업로드 시 이미지가 <span className="font-bold">자동으로 서버에 저장</span>됩니다. 네이버, 인스타 등 외부 링크도 모두 가능합니다.
                                </p>
                                {showExcelHelp && (
                                    <div className="mt-3 pt-3 border-t border-blue-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs font-bold text-blue-800 mb-1">✅ 필수 입력값</p>
                                            <ul className="text-[11px] text-blue-700 space-y-1 list-disc ml-4">
                                                <li><strong>도시 ID</strong>: 영문 소문자 (예: tokyo)</li>
                                                <li><strong>카테고리</strong>: accommodation / transport / tours / activities</li>
                                                <li><strong>품목명</strong>: 사용자에게 보여질 상품명</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-blue-800 mb-1">🖼️ 이미지 안내</p>
                                            <ul className="text-[11px] text-blue-700 space-y-1 list-disc ml-4">
                                                <li>네이버, 인스타 등 <strong>외부 링크 모두 가능</strong></li>
                                                <li>업로드 시 자동으로 서버 URL로 변환</li>
                                                <li>이미지 수만큼 처리 시간 소요</li>
                                            </ul>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 필터 & 액션 버튼 */}
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-2 py-1.5 shadow-sm">
                                <select value={filterCity} onChange={e => setFilterCity(e.target.value)} className="text-xs font-medium text-gray-600 bg-transparent border-none focus:ring-0 cursor-pointer">
                                    <option value="all">모든 도시</option>
                                    {cities.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
                                </select>
                                <div className="w-[1px] h-3 bg-gray-200" />
                                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="text-xs font-medium text-gray-600 bg-transparent border-none focus:ring-0 cursor-pointer">
                                    <option value="all">모든 카테고리</option>
                                    {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                                </select>
                            </div>
                            <div className="ml-auto flex items-center gap-2">
                                <input type="file" ref={fileInputRef} onChange={handleBulkUpload} accept=".xlsx,.xls" className="hidden" />
                                <div className="flex items-center p-1 bg-gray-100 rounded-xl">
                                    <button onClick={handleDownloadSample} className="flex items-center gap-1.5 px-3 py-1.5 text-gray-600 rounded-lg text-xs font-bold hover:bg-white hover:shadow-sm transition-all">
                                        <Download className="w-3.5 h-3.5 text-gray-400" /> 양식 다운로드
                                    </button>
                                    <button onClick={() => fileInputRef.current?.click()} disabled={isBulkUploading}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-green-600 rounded-lg text-xs font-bold shadow-sm hover:text-green-700 transition-all disabled:opacity-50">
                                        {isBulkUploading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 처리 중...</> : <><FileUp className="w-3.5 h-3.5" /> 엑셀 업로드</>}
                                    </button>
                                </div>
                                <button onClick={openCreateItemForm} className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-md transition-all active:scale-95">
                                    <Plus className="w-4 h-4" /> 품목 추가
                                </button>
                            </div>
                        </div>

                        {itemsLoading ? (
                            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
                        ) : (
                            <div className="space-y-2">
                                {filteredItems.map(item => (
                                    <div key={item.id} className={`bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 hover:border-blue-200 hover:shadow-md transition-all group ${!item.is_active ? 'opacity-50 grayscale' : ''}`}>
                                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0 border border-gray-100">
                                            {item.image
                                                ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                                : <div className="w-full h-full flex items-center justify-center text-gray-300"><Image className="w-6 h-6" /></div>
                                            }
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">{cityLabels[item.city] || item.city}</span>
                                                <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold">{CATEGORY_LABELS[item.category]}</span>
                                                {item.image && (
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${item.image.includes('supabase') ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-500'}`}>
                                                        {item.image.includes('supabase') ? '✓ 서버' : '⚠ 외부'}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm font-bold text-gray-900 line-clamp-1">{item.name}</p>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-sm text-blue-600 font-extrabold italic">₩{item.price.toLocaleString()}</span>
                                                <div className="flex items-center gap-1 text-[11px] text-gray-400"><BarChart2 className="w-3 h-3" /> {item.click_count}회</div>
                                                {item.affiliate_link && <span className="text-[10px] text-blue-400 flex items-center gap-0.5"><Link className="w-3 h-3" /> 링크</span>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleToggleItem(item)} className="p-2 hover:bg-gray-100 rounded-xl">
                                                {item.is_active ? <ToggleRight className="w-6 h-6 text-blue-500" /> : <ToggleLeft className="w-6 h-6 text-gray-300" />}
                                            </button>
                                            <button onClick={() => openEditItemForm(item)} className="p-2 hover:bg-blue-50 rounded-xl"><Pencil className="w-4 h-4 text-blue-600" /></button>
                                            <button onClick={() => handleDeleteItem(item.id)} className="p-2 hover:bg-red-50 rounded-xl"><Trash2 className="w-4 h-4 text-red-500" /></button>
                                        </div>
                                    </div>
                                ))}
                                {filteredItems.length === 0 && (
                                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                                        <AlertCircle className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                                        <p className="text-sm text-gray-400 font-medium">해당 조건에 맞는 품목이 없습니다.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {tab === 'cities' && (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <div className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-xs text-gray-500 font-medium">
                                총 <span className="text-blue-600 font-bold">{cities.length}개</span>의 도시
                            </div>
                            <button onClick={openCreateCityForm} className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-md transition-all active:scale-95">
                                <Plus className="w-4 h-4" /> 나라/도시 추가
                            </button>
                        </div>
                        {citiesLoading ? (
                            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {cities.map(city => (
                                    <div key={city.id} className={`bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 group hover:border-blue-200 hover:shadow-md transition-all ${!city.is_active ? 'opacity-50 grayscale' : ''}`}>
                                        <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center text-3xl flex-shrink-0">{city.emoji}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-bold text-gray-900">{city.name}</p>
                                                <span className={`w-1.5 h-1.5 rounded-full ${city.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                                            </div>
                                            <p className="text-[11px] text-gray-400 mt-0.5">
                                                <span className="bg-gray-100 px-1.5 py-0.5 rounded mr-1">ID: {city.id}</span>
                                                품목 {items.filter(i => i.city === city.id).length}개
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleToggleCity(city)} className="p-2 hover:bg-gray-100 rounded-xl">
                                                {city.is_active ? <ToggleRight className="w-6 h-6 text-blue-500" /> : <ToggleLeft className="w-6 h-6 text-gray-300" />}
                                            </button>
                                            <button onClick={() => openEditCityForm(city)} className="p-2 hover:bg-blue-50 rounded-xl"><Pencil className="w-4 h-4 text-blue-600" /></button>
                                            <button onClick={() => handleDeleteCity(city.id)} className="p-2 hover:bg-red-50 rounded-xl"><Trash2 className="w-4 h-4 text-red-500" /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {tab === 'stats' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {[{ label: '전체 품목', value: items.length, color: 'text-gray-900', bg: 'bg-white' }, { label: '활성 품목', value: items.filter(i => i.is_active).length, color: 'text-green-600', bg: 'bg-green-50' }, { label: '총 클릭수', value: totalClicks, color: 'text-blue-600', bg: 'bg-blue-50' }].map(card => (
                                <div key={card.label} className={`${card.bg} rounded-2xl border border-gray-100 p-5 shadow-sm`}>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-tight mb-1">{card.label}</p>
                                    <p className={`text-3xl font-black ${card.color}`}>{card.value.toLocaleString()}</p>
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
                                <h2 className="text-base font-black text-gray-900 flex items-center gap-2 mb-6"><BarChart2 className="w-5 h-5 text-blue-500" /> 클릭 TOP 5 품목</h2>
                                <div className="space-y-4">
                                    {topItems.map((item, index) => (
                                        <div key={item.id} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-gray-50">
                                            <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 ${index === 0 ? 'bg-yellow-400 text-white' : index === 1 ? 'bg-gray-200 text-gray-600' : index === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-400'}`}>{index + 1}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-gray-900 line-clamp-1">{item.name}</p>
                                                <p className="text-[11px] text-gray-400">{cityLabels[item.city]} · {CATEGORY_LABELS[item.category]}</p>
                                            </div>
                                            <p className="text-base font-black text-blue-600">{item.click_count}</p>
                                        </div>
                                    ))}
                                    {topItems.length === 0 && <p className="text-sm text-gray-400 text-center py-10">데이터가 없습니다.</p>}
                                </div>
                            </div>
                            <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
                                <h2 className="text-base font-black text-gray-900 flex items-center gap-2 mb-6"><Globe className="w-5 h-5 text-green-500" /> 도시별 클릭 비중</h2>
                                <div className="space-y-5">
                                    {cities.map(city => {
                                        const cityClicks = items.filter(i => i.city === city.id).reduce((sum, i) => sum + i.click_count, 0);
                                        const pct = totalClicks > 0 ? Math.round((cityClicks / totalClicks) * 100) : 0;
                                        return (
                                            <div key={city.id}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs font-bold text-gray-700">{city.emoji} {city.name}</span>
                                                    <span className="text-[11px] text-gray-500 font-bold">{cityClicks}회 ({pct}%)</span>
                                                </div>
                                                <div className="h-3 bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                                                    <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 도시 모달 */}
            {showCityForm && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b">
                            <h2 className="text-lg font-black text-gray-900">{editingCity ? '도시 수정' : '새 도시 추가'}</h2>
                            <button onClick={() => setShowCityForm(false)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-400" /></button>
                        </div>
                        <div className="px-6 py-6 space-y-5">
                            {!editingCity && (
                                <div>
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5 block">도시 ID (영문)</label>
                                    <input value={cityForm.id} onChange={e => setCityForm({...cityForm, id: e.target.value})} placeholder="tokyo, jeju-do"
                                           className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500" />
                                </div>
                            )}
                            <div>
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5 block">도시명</label>
                                <input value={cityForm.name} onChange={e => setCityForm({...cityForm, name: e.target.value})} placeholder="도쿄, 제주"
                                       className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5 block">이모지 국기</label>
                                <input value={cityForm.emoji} onChange={e => setCityForm({...cityForm, emoji: e.target.value})} placeholder="🇯🇵"
                                       className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-xl font-bold focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                                <div>
                                    <p className="text-sm font-bold text-gray-900">활성화</p>
                                    <p className="text-[10px] text-gray-400">사용자 화면에 노출됩니다</p>
                                </div>
                                <button onClick={() => setCityForm({...cityForm, is_active: !cityForm.is_active})}
                                        className={`w-12 h-6 rounded-full transition-all relative ${cityForm.is_active ? 'bg-blue-600' : 'bg-gray-300'}`}>
                                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all ${cityForm.is_active ? 'left-6' : 'left-0.5'}`} />
                                </button>
                            </div>
                        </div>
                        <div className="px-6 py-5 border-t flex gap-3">
                            <button onClick={() => setShowCityForm(false)} className="flex-1 py-3 text-gray-500 text-sm font-bold hover:bg-gray-50 rounded-2xl">취소</button>
                            <button onClick={handleSaveCity} disabled={savingCity} className="flex-1 py-3 bg-blue-600 text-white rounded-2xl text-sm font-black hover:bg-blue-700 disabled:opacity-50 active:scale-95">
                                {savingCity ? '저장 중...' : editingCity ? '수정 완료' : '도시 추가'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 품목 모달 */}
            {showItemForm && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
                            <h2 className="text-lg font-black text-gray-900">{editingItem ? '품목 수정' : '새 품목 등록'}</h2>
                            <button onClick={() => setShowItemForm(false)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-400" /></button>
                        </div>
                        <div className="px-6 py-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider block ml-1">도시</label>
                                    <select value={itemForm.city} onChange={e => setItemForm({...itemForm, city: e.target.value})}
                                            className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500">
                                        {cities.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider block ml-1">카테고리</label>
                                    <select value={itemForm.category} onChange={e => setItemForm({...itemForm, category: e.target.value})}
                                            className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500">
                                        {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider block ml-1">품목명 *</label>
                                <input value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} placeholder="상품명"
                                       className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider block ml-1">설명</label>
                                <textarea value={itemForm.description} onChange={e => setItemForm({...itemForm, description: e.target.value})} rows={2}
                                          placeholder="상품 간략 설명"
                                          className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 resize-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider block ml-1">가격 (₩) *</label>
                                    <input type="number" value={itemForm.price} onChange={e => setItemForm({...itemForm, price: Number(e.target.value)})}
                                           className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-black focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider block ml-1">사용 여부</label>
                                    <button onClick={() => setItemForm({...itemForm, is_active: !itemForm.is_active})}
                                            className={`w-full h-[46px] rounded-2xl flex items-center justify-center gap-2 font-bold text-sm border-2 transition-all ${itemForm.is_active ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-gray-50 text-gray-400 border-transparent'}`}>
                                        {itemForm.is_active ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                        {itemForm.is_active ? '활성화됨' : '비활성'}
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-4 pt-2 border-t border-gray-100">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider block ml-1 flex items-center gap-1.5">
                                        <Image className="w-3.5 h-3.5" /> 이미지 URL
                                        <span className="text-[10px] text-blue-500 font-normal">저장 시 자동으로 서버에 복사됩니다</span>
                                    </label>
                                    <input value={itemForm.image} onChange={e => setItemForm({...itemForm, image: e.target.value})}
                                           placeholder="https://... (외부 링크 가능)"
                                           className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-xs font-medium focus:ring-2 focus:ring-blue-500" />
                                    {itemForm.image?.startsWith('http') && (
                                        <img src={itemForm.image} alt="미리보기" className="w-full h-32 object-cover rounded-xl mt-2"
                                             onError={e => (e.currentTarget.style.display = 'none')} />
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider block ml-1 flex items-center gap-1.5">
                                        <Link className="w-3.5 h-3.5 text-blue-500" /> 제휴 링크
                                    </label>
                                    <input value={itemForm.affiliate_link} onChange={e => setItemForm({...itemForm, affiliate_link: e.target.value})}
                                           placeholder="예약 페이지 주소"
                                           className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-xs font-medium focus:ring-2 focus:ring-blue-500" />
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-5 border-t bg-gray-50 flex gap-3 sticky bottom-0 z-10">
                            <button onClick={() => setShowItemForm(false)} className="flex-1 py-3 text-gray-500 text-sm font-bold hover:bg-white rounded-2xl">취소</button>
                            <button onClick={handleSaveItem} disabled={savingItem} className="flex-1 py-3 bg-blue-600 text-white rounded-2xl text-sm font-black hover:bg-blue-700 disabled:opacity-50 active:scale-95">
                                {savingItem ? '이미지 저장 중...' : editingItem ? '수정 완료' : '품목 등록'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}