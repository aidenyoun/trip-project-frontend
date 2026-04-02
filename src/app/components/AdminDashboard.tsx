import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../../supabase";
import * as XLSX from 'xlsx';
import {
    LogOut, Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
    BarChart2, Package, Link, X, Check, Globe, FileUp, Download,
    Info, AlertCircle, Image, Loader2, RefreshCw, Layers, CalendarDays,
    Gift, Search, Users, Sparkles
} from "lucide-react";

interface TravelItem {
    id: string; city: string; category: string; name: string;
    description: string; price: number; image: string;
    affiliate_link: string | null; click_count: number;
    is_active: boolean; created_at: string; group_id: string | null;
}

interface ItemGroup {
    id: string; city: string; category: string; name: string;
    description: string; image: string; is_active: boolean; created_at: string;
}

interface City {
    id: string; name: string; emoji: string; country_code: string;
    is_active: boolean; created_at: string;
}

interface Country { code: string; name: string; emoji: string; }

interface TravelPackage {
    id: string;
    city: string;
    name: string;
    description: string;
    theme_who: string[];
    theme_style: string[];
    is_active: boolean;
    created_at: string;
}

const THEME_WHO = [
    { id: 'family',    label: '👨‍👩‍👧‍👦 가족 (어린이 포함)' },
    { id: 'parents',   label: '👴👵 부모님 모시고' },
    { id: 'couple',    label: '👫 친구 / 연인' },
    { id: 'honeymoon', label: '💍 신혼여행' },
    { id: 'solo',      label: '🧑 혼자' },
];
const THEME_STYLE = [
    { id: 'luxury', label: '✨ 럭셔리' },
    { id: 'normal', label: '⚖️ 보통' },
    { id: 'budget', label: '💰 가성비' },
];

const CATEGORIES = ['accommodation', 'transport', 'tours', 'activities'];
const CATEGORY_LABELS: Record<string, string> = {
    accommodation: '숙소', transport: '교통', tours: '투어', activities: '액티비티'
};
const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

const EMPTY_ITEM_FORM = {
    id: '', city: '', category: 'accommodation', name: '',
    description: '', price: 0, image: '', affiliate_link: '', is_active: true, group_id: ''
};
const EMPTY_GROUP_FORM = {
    id: '', city: '', category: 'tours', name: '', description: '', image: '', is_active: true
};
const EMPTY_CITY_FORM = { id: '', name: '', emoji: '🌏', country_code: '', is_active: true };

type Tab = 'items' | 'groups' | 'packages' | 'cities' | 'stats';

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
    // 월별 가격: month(1~12) → price (0이면 미설정)
    const [monthlyPrices, setMonthlyPrices] = useState<Record<number, number>>({});
    const [savingItem, setSavingItem] = useState(false);
    const [filterCity, setFilterCity] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');
    const [sortBy, setSortBy] = useState<'created_at' | 'click_count'>('created_at');
    const [isBulkUploading, setIsBulkUploading] = useState(false);
    const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number; label?: string } | null>(null);
    const [showExcelHelp, setShowExcelHelp] = useState(false);

    const [groups, setGroups] = useState<ItemGroup[]>([]);
    const [groupsLoading, setGroupsLoading] = useState(true);
    const [showGroupForm, setShowGroupForm] = useState(false);
    const [editingGroup, setEditingGroup] = useState<ItemGroup | null>(null);
    const [groupForm, setGroupForm] = useState(EMPTY_GROUP_FORM);
    const [savingGroup, setSavingGroup] = useState(false);

    const [cities, setCities] = useState<City[]>([]);
    const [citiesLoading, setCitiesLoading] = useState(true);
    const [showCityForm, setShowCityForm] = useState(false);
    const [editingCity, setEditingCity] = useState<City | null>(null);
    const [cityForm, setCityForm] = useState(EMPTY_CITY_FORM);
    const [savingCity, setSavingCity] = useState(false);
    const [countries, setCountries] = useState<Country[]>([]);

    const [translationStats, setTranslationStats] = useState({ total: 0, translated_en: 0, translated_ja: 0 });
    const [translating, setTranslating] = useState(false);
    const [translateProgress, setTranslateProgress] = useState<{ current: number; total: number; startTime: number } | null>(null);

    // ── 패키지 state ──
    const [packages, setPackages] = useState<TravelPackage[]>([]);
    const [packagesLoading, setPackagesLoading] = useState(true);
    const [showPackageForm, setShowPackageForm] = useState(false);
    const [editingPackage, setEditingPackage] = useState<TravelPackage | null>(null);
    const [packageForm, setPackageForm] = useState({
        id: '', city: '', name: '', description: '',
        theme_who: [] as string[], theme_style: [] as string[], is_active: true,
    });
    const [packageItemIds, setPackageItemIds] = useState<string[]>([]);
    const [savingPackage, setSavingPackage] = useState(false);
    const [pkgSearchText, setPkgSearchText] = useState('');
    const [pkgFilterCat, setPkgFilterCat] = useState('all');

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) navigate('/admin');
        });
    }, []);

    const fetchCities = async () => {
        setCitiesLoading(true);
        const { data: cityData } = await supabase.from('cities').select('*').order('created_at', { ascending: true });
        setCities(cityData || []);
        setCitiesLoading(false);
        const { data: countryData } = await supabase.from('countries').select('*').order('name');
        setCountries(countryData || []);
    };

    const fetchItems = async () => {
        setItemsLoading(true);
        const { data } = await supabase.from('items').select('*').order(sortBy, { ascending: false });
        setItems(data || []);
        setItemsLoading(false);
    };

    const fetchGroups = async () => {
        setGroupsLoading(true);
        const { data } = await supabase.from('item_groups').select('*').order('created_at', { ascending: false });
        setGroups(data || []);
        setGroupsLoading(false);
    };

    useEffect(() => { fetchCities(); fetchItems(); fetchGroups(); fetchPackages(); }, []);
    useEffect(() => { fetchItems(); }, [sortBy]);

    const fetchPackages = async () => {
        setPackagesLoading(true);
        const { data } = await supabase.from('packages').select('*').order('created_at', { ascending: false });
        setPackages(data || []);
        setPackagesLoading(false);
    };

    // 번역 통계
    useEffect(() => {
        const fetchStats = async () => {
            const { count: total } = await supabase.from('items').select('*', { count: 'exact', head: true });
            const { count: en } = await supabase.from('item_translations').select('*', { count: 'exact', head: true }).eq('lang', 'en');
            const { count: ja } = await supabase.from('item_translations').select('*', { count: 'exact', head: true }).eq('lang', 'ja');
            setTranslationStats({ total: total || 0, translated_en: en || 0, translated_ja: ja || 0 });
        };
        fetchStats();
    }, [items]);

    const handleLogout = async () => { await supabase.auth.signOut(); navigate('/admin'); };

    // ── 패키지 관리 ──
    const openCreatePackageForm = () => {
        setEditingPackage(null);
        setPackageForm({ id: '', city: cities[0]?.id || '', name: '', description: '', theme_who: [], theme_style: [], is_active: true });
        setPackageItemIds([]);
        setPkgSearchText(''); setPkgFilterCat('all');
        setShowPackageForm(true);
    };
    const openEditPackageForm = async (pkg: TravelPackage) => {
        setEditingPackage(pkg);
        setPackageForm({ id: pkg.id, city: pkg.city, name: pkg.name, description: pkg.description, theme_who: pkg.theme_who || [], theme_style: pkg.theme_style || [], is_active: pkg.is_active });
        const { data } = await supabase.from('package_items').select('item_id').eq('package_id', pkg.id).order('sort_order');
        setPackageItemIds((data || []).map((r: any) => r.item_id));
        setPkgSearchText(''); setPkgFilterCat('all');
        setShowPackageForm(true);
    };
    const toggleThemeTag = (arr: string[], val: string) =>
        arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];

    const handleSavePackage = async () => {
        if (!packageForm.name) return alert('패키지 이름은 필수입니다.');
        if (!editingPackage && !packageForm.id) return alert('패키지 ID는 필수입니다.');
        if (packageForm.theme_who.length === 0) return alert('누구와 여행인지 선택해주세요.');
        if (packageForm.theme_style.length === 0) return alert('여행 스타일을 선택해주세요.');
        if (packageItemIds.length === 0) return alert('최소 1개 이상의 품목을 선택해주세요.');
        setSavingPackage(true);
        const pkgId = editingPackage?.id || packageForm.id.toLowerCase().replace(/\s+/g, '-');
        const payload = { city: packageForm.city, name: packageForm.name, description: packageForm.description, theme_who: packageForm.theme_who, theme_style: packageForm.theme_style, is_active: packageForm.is_active };
        if (editingPackage) {
            await supabase.from('packages').update(payload).eq('id', pkgId);
        } else {
            await supabase.from('packages').insert({ id: pkgId, ...payload });
        }
        await supabase.from('package_items').delete().eq('package_id', pkgId);
        if (packageItemIds.length > 0) {
            await supabase.from('package_items').insert(packageItemIds.map((itemId, idx) => ({ package_id: pkgId, item_id: itemId, sort_order: idx })));
        }
        setSavingPackage(false); setShowPackageForm(false); fetchPackages();
    };
    const handleDeletePackage = async (id: string) => {
        if (!confirm('패키지를 삭제합니다. 포함된 품목은 유지됩니다.')) return;
        await supabase.from('package_items').delete().eq('package_id', id);
        await supabase.from('packages').delete().eq('id', id);
        fetchPackages();
    };
    const handleTogglePackage = async (pkg: TravelPackage) => {
        await supabase.from('packages').update({ is_active: !pkg.is_active }).eq('id', pkg.id);
        fetchPackages();
    };

    // ── 일괄 번역 ──
    const handleBatchTranslate = async () => {
        try {
            setTranslating(true);
            const { data: allItems } = await supabase.from('items').select('id');
            const { data: translated } = await supabase.from('item_translations').select('item_id, lang');
            const translatedMap = new Set(translated?.map(t => `${t.item_id}_${t.lang}`) || []);
            const untranslatedIds = (allItems || []).filter(item =>
                !translatedMap.has(`${item.id}_en`) || !translatedMap.has(`${item.id}_ja`)
            ).map(i => i.id);
            if (untranslatedIds.length === 0) { alert('번역할 항목이 없습니다.'); return; }

            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) {
                alert('로그인이 만료되었습니다. 다시 로그인 후 시도해주세요.');
                return;
            }

            const total = untranslatedIds.length;
            const startTime = Date.now();
            const CHUNK_SIZE = 5;
            let apiTranslated = 0;
            let apiSkipped = 0;

            for (let i = 0; i < untranslatedIds.length; i += CHUNK_SIZE) {
                const chunk = untranslatedIds.slice(i, i + CHUNK_SIZE);

                for (let j = 0; j < chunk.length; j++) {
                    const targetId = chunk[j];
                    setTranslateProgress({ current: Math.min(i + j + 1, total), total, startTime });

                    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/translate-items`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                        body: JSON.stringify({ item_id: targetId, item_ids: [targetId], ids: [targetId], langs: ['en', 'ja'] }),
                    });

                    if (!res.ok) {
                        const detail = await res.text();
                        throw new Error(`번역 함수 호출 실패 (${res.status}): ${detail}`);
                    }

                    const payload = await res.json().catch(() => ({} as any));
                    const translated = Number(payload?.translated_count ?? payload?.translated ?? payload?.success_count ?? 0) || 0;
                    const skipped = Number(payload?.skipped_count ?? payload?.skipped ?? 0) || 0;
                    apiTranslated += translated;
                    apiSkipped += skipped;
                }
            }

            const { count: en } = await supabase.from('item_translations').select('*', { count: 'exact', head: true }).eq('lang', 'en');
            const { count: ja } = await supabase.from('item_translations').select('*', { count: 'exact', head: true }).eq('lang', 'ja');
            setTranslationStats(prev => ({ ...prev, translated_en: en || 0, translated_ja: ja || 0 }));

            const beforeDone = Math.min(translationStats.translated_en, translationStats.translated_ja);
            const afterDone = Math.min(en || 0, ja || 0);
            const dbDelta = Math.max(0, afterDone - beforeDone);

            if (dbDelta === 0 && apiTranslated > 0) {
                alert(`⚠️ API 응답상 번역 ${apiTranslated}개 처리됐지만, 대시보드 집계는 증가하지 않았습니다. item_translations 조회 권한(RLS) 또는 함수 내부 저장 로직을 확인해주세요.`);
            } else if (dbDelta === 0 && apiTranslated === 0) {
                alert(`ℹ️ 번역 완료: 0개 (API skipped: ${apiSkipped}개). 이미 번역되었거나 함수가 항목을 건너뛴 상태일 수 있어요.`);
            } else {
                alert(`✅ 번역 완료: ${dbDelta}개 항목`);
            }
        } catch (err) {
            console.error(err);
            alert('번역 중 오류 발생 (함수 호출 실패 또는 권한 문제). 콘솔 로그를 확인해주세요.');
        }
        finally { setTranslating(false); setTranslateProgress(null); }
    };

    // ── 이미지 일괄 이전 ──
    const handleMigrateImages = async () => {
        const externalItems = items.filter(i => i.image && i.image.startsWith('http') && !i.image.includes('supabase'));
        if (externalItems.length === 0) { alert('✅ 모든 이미지가 이미 서버에 저장되어 있습니다!'); return; }
        if (!confirm(`외부 링크 이미지 ${externalItems.length}개를 서버로 이전합니다. 계속할까요?`)) return;
        setIsBulkUploading(true);
        let successCount = 0, failCount = 0;
        for (let i = 0; i < externalItems.length; i++) {
            const item = externalItems[i];
            setBulkProgress({ current: i + 1, total: externalItems.length, label: item.name });
            const newUrl = await uploadImageToStorage(item.image, item.id);
            if (newUrl !== item.image) {
                const { error } = await supabase.from('items').update({ image: newUrl }).eq('id', item.id);
                error ? failCount++ : successCount++;
            } else failCount++;
        }
        setIsBulkUploading(false); setBulkProgress(null);
        await fetchItems();
        alert(`이미지 이전 완료!\n✅ 성공: ${successCount}개\n❌ 실패: ${failCount}개`);
    };

    // ── 그룹 관리 ──
    const openCreateGroupForm = () => {
        setEditingGroup(null);
        setGroupForm({ ...EMPTY_GROUP_FORM, city: cities[0]?.id || '' });
        setShowGroupForm(true);
    };
    const openEditGroupForm = (g: ItemGroup) => {
        setEditingGroup(g);
        setGroupForm({ id: g.id, city: g.city, category: g.category, name: g.name, description: g.description, image: g.image, is_active: g.is_active });
        setShowGroupForm(true);
    };
    const handleSaveGroup = async () => {
        if (!groupForm.name || !groupForm.id) return alert('ID와 이름은 필수입니다.');
        setSavingGroup(true);
        if (editingGroup) {
            await supabase.from('item_groups').update({ name: groupForm.name, description: groupForm.description, image: groupForm.image, city: groupForm.city, category: groupForm.category, is_active: groupForm.is_active }).eq('id', editingGroup.id);
        } else {
            await supabase.from('item_groups').insert({ id: groupForm.id.toLowerCase().replace(/\s+/g, '-'), city: groupForm.city, category: groupForm.category, name: groupForm.name, description: groupForm.description, image: groupForm.image, is_active: groupForm.is_active });
        }
        setSavingGroup(false); setShowGroupForm(false); fetchGroups();
    };
    const handleDeleteGroup = async (id: string) => {
        if (!confirm(`그룹 삭제 시 소속 품목들의 그룹 연결이 해제됩니다.`)) return;
        await supabase.from('items').update({ group_id: null }).eq('group_id', id);
        await supabase.from('item_groups').delete().eq('id', id);
        fetchGroups(); fetchItems();
    };
    const handleToggleGroup = async (g: ItemGroup) => {
        await supabase.from('item_groups').update({ is_active: !g.is_active }).eq('id', g.id);
        fetchGroups();
    };

    // ── 도시 관리 ──
    const openCreateCityForm = () => { setEditingCity(null); setCityForm(EMPTY_CITY_FORM); setShowCityForm(true); };
    const openEditCityForm = (city: City) => {
        setEditingCity(city);
        setCityForm({ id: city.id, name: city.name, emoji: city.emoji, country_code: city.country_code, is_active: city.is_active });
        setShowCityForm(true);
    };
    const handleSaveCity = async () => {
        if (!cityForm.name || !cityForm.id) return alert('ID와 이름은 필수입니다.');
        setSavingCity(true);
        if (editingCity) {
            await supabase.from('cities').update({ name: cityForm.name, emoji: cityForm.emoji, country_code: cityForm.country_code, is_active: cityForm.is_active }).eq('id', editingCity.id);
        } else {
            await supabase.from('cities').insert({ id: cityForm.id.toLowerCase().replace(/\s+/g, '-'), name: cityForm.name, emoji: cityForm.emoji, country_code: cityForm.country_code, is_active: cityForm.is_active });
        }
        setSavingCity(false); setShowCityForm(false); fetchCities();
    };
    const handleDeleteCity = async (id: string) => {
        if (!confirm(`'${id}' 도시를 삭제하면 관련 품목도 모두 삭제됩니다.`)) return;
        const { data: cityItems } = await supabase.from('items').select('id').eq('city', id);
        const cityItemIds = (cityItems || []).map((item: { id: string }) => item.id);

        if (cityItemIds.length > 0) {
            await supabase.from('clicks').delete().in('item_id', cityItemIds);
            await supabase.from('item_monthly_prices').delete().in('item_id', cityItemIds);
            await supabase.from('package_items').delete().in('item_id', cityItemIds);
        }

        await supabase.from('items').delete().eq('city', id);
        await supabase.from('item_groups').delete().eq('city', id);
        await supabase.from('cities').delete().eq('id', id);
        fetchCities(); fetchItems(); fetchGroups();
    };
    const handleToggleCity = async (city: City) => {
        await supabase.from('cities').update({ is_active: !city.is_active }).eq('id', city.id);
        fetchCities();
    };

    // ── 품목 관리 ──
    const openCreateItemForm = () => {
        setEditingItem(null);
        setItemForm({ ...EMPTY_ITEM_FORM, city: cities[0]?.id || '' });
        setMonthlyPrices({});
        setShowItemForm(true);
    };
    const openEditItemForm = async (item: TravelItem) => {
        setEditingItem(item);
        setItemForm({ id: item.id, city: item.city, category: item.category, name: item.name, description: item.description, price: item.price, image: item.image, affiliate_link: item.affiliate_link || '', is_active: item.is_active, group_id: item.group_id || '' });
        // 월별 가격 로드
        const { data: mp } = await supabase.from('item_monthly_prices').select('month, price').eq('item_id', item.id);
        const mpMap: Record<number, number> = {};
        (mp || []).forEach(r => { mpMap[r.month] = r.price; });
        setMonthlyPrices(mpMap);
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
        const payload = {
            city: itemForm.city, category: itemForm.category, name: itemForm.name,
            description: itemForm.description, price: Number(itemForm.price),
            image: finalImageUrl, affiliate_link: itemForm.affiliate_link || null,
            is_active: itemForm.is_active,
            group_id: itemForm.group_id || null,
        };
        if (editingItem) {
            await supabase.from('items').update(payload).eq('id', editingItem.id);
        } else {
            const { data: newItem } = await supabase.from('items').insert({ id: itemId, ...payload }).select().single();
            if (newItem) {
                const { data: { session } } = await supabase.auth.getSession();
                fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/translate-items`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
                    body: JSON.stringify({ item_id: newItem.id }),
                }).catch(console.error);
            }
        }
        // 월별 가격 저장 (upsert)
        const targetId = editingItem?.id || itemId;
        const monthEntries = Object.entries(monthlyPrices)
            .filter(([, price]) => price > 0)
            .map(([month, price]) => ({ item_id: targetId, month: Number(month), price: Number(price) }));
        if (monthEntries.length > 0) {
            await supabase.from('item_monthly_prices').upsert(monthEntries, { onConflict: 'item_id,month' });
        }
        // 값이 0으로 지워진 달은 삭제
        const clearedMonths = Object.entries(monthlyPrices).filter(([, p]) => p <= 0).map(([m]) => Number(m));
        if (clearedMonths.length > 0) {
            await supabase.from('item_monthly_prices').delete().eq('item_id', targetId).in('month', clearedMonths);
        }
        setSavingItem(false); setShowItemForm(false); fetchItems();
    };

    const handleDeleteItem = async (id: string) => {
        if (!confirm('정말 삭제하시겠어요?')) return;
        await supabase.from('clicks').delete().eq('item_id', id);
        await supabase.from('item_monthly_prices').delete().eq('item_id', id);
        await supabase.from('package_items').delete().eq('item_id', id);
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
            {
                '도시 ID': 'danang', '카테고리': 'tours', '그룹 ID': 'hopping-tour-danang',
                '품목명': '한바다 호핑투어', '설명': '스노클링+점심 포함',
                '기본가격': 95000, '1월': 85000, '2월': 85000, '3월': 90000,
                '4월': 95000, '5월': 100000, '6월': 110000, '7월': 120000,
                '8월': 120000, '9월': 105000, '10월': 95000, '11월': 85000, '12월': 85000,
                '이미지 URL': '', '제휴 링크': 'https://example.com', '활성화(Y/N)': 'Y'
            },
            {
                '도시 ID': 'tokyo', '카테고리': 'accommodation', '그룹 ID': '',
                '품목명': '도쿄 럭셔리 호텔', '설명': '신주쿠역 도보 5분',
                '기본가격': 300000, '1월': '', '2월': '', '3월': '', '4월': '',
                '5월': '', '6월': '', '7월': 380000, '8월': 380000,
                '9월': '', '10월': '', '11월': '', '12월': '',
                '이미지 URL': '', '제휴 링크': '', '활성화(Y/N)': 'Y'
            },
        ];
        const ws = XLSX.utils.json_to_sheet(sampleData);
        ws['!cols'] = [
            { wch: 10 }, { wch: 14 }, { wch: 22 }, { wch: 25 }, { wch: 25 },
            { wch: 10 }, ...Array(12).fill({ wch: 8 }),
            { wch: 30 }, { wch: 30 }, { wch: 10 }
        ];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '품목업로드양식');
        XLSX.writeFile(wb, '여행품목_업로드_양식.xlsx');
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
                    const id = `${row['카테고리'] || 'item'}-${Date.now()}-${index}`;
                    const monthPrices: Record<number, number> = {};
                    MONTHS.forEach((label, idx) => {
                        const val = Number(row[label]);
                        if (val > 0) monthPrices[idx + 1] = val;
                    });
                    return {
                        id,
                        city: row['도시 ID'] || '',
                        category: row['카테고리'] || '',
                        group_id: row['그룹 ID'] || null,
                        name: row['품목명'] || '',
                        description: row['설명'] || '',
                        price: Number(row['기본가격']) || 0,
                        image: row['이미지 URL'] || '',
                        affiliate_link: row['제휴 링크'] || null,
                        is_active: String(row['활성화(Y/N)']).toUpperCase() === 'Y',
                        _monthPrices: monthPrices,
                    };
                });

                const invalidRow = parsedItems.find(i => !i.city || !i.category || !i.name);
                if (invalidRow) { alert('도시 ID, 카테고리, 품목명은 필수입니다.'); return; }

                setBulkProgress({ current: 0, total: parsedItems.length });
                const finalItems = [];
                for (let i = 0; i < parsedItems.length; i++) {
                    const item = parsedItems[i];
                    setBulkProgress({ current: i + 1, total: parsedItems.length, label: item.name });
                    if (item.image && item.image.startsWith('http')) {
                        item.image = await uploadImageToStorage(item.image, item.id);
                    }
                    finalItems.push(item);
                }

                // items INSERT
                const itemsPayload = finalItems.map(({ _monthPrices, ...rest }) => rest);
                const { error } = await supabase.from('items').insert(itemsPayload);
                if (error) throw error;

                // 월별 가격 INSERT
                const monthlyRows: { item_id: string; month: number; price: number }[] = [];
                finalItems.forEach(item => {
                    Object.entries(item._monthPrices).forEach(([month, price]) => {
                        monthlyRows.push({ item_id: item.id, month: Number(month), price: Number(price) });
                    });
                });
                if (monthlyRows.length > 0) {
                    await supabase.from('item_monthly_prices').insert(monthlyRows);
                }

                alert(`✅ ${finalItems.length}개 품목 업로드 완료! (월별가격 ${monthlyRows.length}건)`);
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

    // 패키지 탭용 계산 변수
    const cityItemsForPkg = items.filter(i => i.city === packageForm.city && i.is_active);
    const filteredPkgItems = cityItemsForPkg.filter(i => {
        const matchCat = pkgFilterCat === 'all' || i.category === pkgFilterCat;
        const matchText = !pkgSearchText || i.name.toLowerCase().includes(pkgSearchText.toLowerCase());
        return matchCat && matchText;
    });
    const topItems = [...items].sort((a, b) => b.click_count - a.click_count).slice(0, 5);
    const cityLabels = Object.fromEntries(cities.map(c => [c.id, c.name]));
    const groupLabels = Object.fromEntries(groups.map(g => [g.id, g.name]));

    // 번역 패널
    const TranslationPanel = () => {
        const pct = translateProgress ? Math.round((translateProgress.current / translateProgress.total) * 100) : 0;
        const remainingSec = (() => {
            if (!translateProgress || translateProgress.current === 0) return null;
            const elapsed = (Date.now() - translateProgress.startTime) / 1000;
            const perItem = elapsed / translateProgress.current;
            const remaining = perItem * (translateProgress.total - translateProgress.current);
            return remaining < 60 ? `약 ${Math.ceil(remaining)}초` : `약 ${Math.ceil(remaining / 60)}분`;
        })();
        return (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h2 className="text-sm font-bold text-gray-900 mb-3">🌐 번역 현황</h2>
                <div className="grid grid-cols-3 gap-3 mb-3">
                    {[{ label: '전체', val: translationStats.total, color: 'text-gray-900', bg: 'bg-gray-50' },
                        { label: '영어 완료', val: translationStats.translated_en, color: 'text-blue-600', bg: 'bg-blue-50' },
                        { label: '일본어 완료', val: translationStats.translated_ja, color: 'text-red-500', bg: 'bg-red-50' }
                    ].map(c => (
                        <div key={c.label} className={`text-center p-2.5 ${c.bg} rounded-xl`}>
                            <p className={`text-xl font-black ${c.color}`}>{c.val}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{c.label}</p>
                        </div>
                    ))}
                </div>
                {translating && translateProgress && (
                    <div className="mb-3">
                        <div className="flex justify-between mb-1">
                            <span className="text-xs font-semibold text-gray-700">{translateProgress.current}/{translateProgress.total}개</span>
                            <span className="text-[11px] text-gray-400">{remainingSec ? `${remainingSec} 남음` : '계산 중...'}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-[10px] text-orange-500 mt-1">⚠ 번역 중 페이지를 닫지 마세요</p>
                    </div>
                )}
                {(translationStats.translated_en < translationStats.total || translationStats.translated_ja < translationStats.total) ? (
                    <button onClick={handleBatchTranslate} disabled={translating}
                            className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-bold hover:opacity-90 disabled:opacity-50">
                        {translating ? `번역 중... (${translateProgress?.current || 0}/${translateProgress?.total || 0})` : `미번역 ${translationStats.total - Math.min(translationStats.translated_en, translationStats.translated_ja)}개 일괄 번역`}
                    </button>
                ) : (
                    <p className="text-center text-xs text-green-600 font-medium">✅ 모든 아이템 번역 완료</p>
                )}
            </div>
        );
    };

    const TABS = [
        { id: 'items',    label: '품목 관리',   icon: Package },
        { id: 'groups',   label: '그룹 관리',   icon: Layers },
        { id: 'packages', label: '패키지 관리', icon: Gift },
        { id: 'cities',   label: '나라/도시',   icon: Globe },
        { id: 'stats',    label: '통계',        icon: BarChart2 },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* 헤더 */}
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
                <div className="max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto">
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id as Tab)}
                                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-all ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                            <t.icon className={`w-4 h-4 ${tab === t.id ? 'text-blue-600' : 'text-gray-400'}`} />
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-6">

                {/* ── 품목 탭 ── */}
                {tab === 'items' && (
                    <div className="space-y-4">
                        <TranslationPanel />

                        {externalImageCount > 0 && !isBulkUploading && (
                            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center gap-4">
                                <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0" />
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-orange-900">외부 링크 이미지 {externalImageCount}개가 있습니다</p>
                                    <p className="text-xs text-orange-700 mt-0.5">네이버, 인스타 등 외부 이미지는 차단될 수 있습니다.</p>
                                </div>
                                <button onClick={handleMigrateImages} className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-bold hover:bg-orange-600 shadow-md active:scale-95">
                                    <RefreshCw className="w-3.5 h-3.5" /> 지금 이전하기
                                </button>
                            </div>
                        )}

                        {isBulkUploading && bulkProgress && (
                            <div className="bg-white border border-blue-200 rounded-2xl p-4">
                                <div className="flex items-center gap-3 mb-3">
                                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-900">처리 중... ({bulkProgress.current}/{bulkProgress.total})</p>
                                        {bulkProgress.label && <p className="text-xs text-gray-400 truncate">{bulkProgress.label}</p>}
                                    </div>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }} />
                                </div>
                            </div>
                        )}

                        {/* 엑셀 안내 */}
                        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
                            <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                    <h3 className="text-sm font-bold text-blue-900">대량 업로드 가이드</h3>
                                    <button onClick={() => setShowExcelHelp(!showExcelHelp)} className="text-xs text-blue-600 font-medium hover:underline">{showExcelHelp ? '닫기' : '자세히 보기'}</button>
                                </div>
                                <p className="text-xs text-blue-700">엑셀에 <span className="font-bold">그룹 ID · 1월~12월 시즌 가격</span> 컬럼을 추가할 수 있습니다.</p>
                                {showExcelHelp && (
                                    <div className="mt-3 pt-3 border-t border-blue-200 grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] text-blue-700">
                                        <div>
                                            <p className="font-bold text-blue-800 mb-1">✅ 필수</p>
                                            <ul className="list-disc ml-4 space-y-0.5">
                                                <li><strong>도시 ID</strong>: 영문 소문자 (예: danang)</li>
                                                <li><strong>카테고리</strong>: accommodation / transport / tours / activities</li>
                                                <li><strong>품목명</strong> / <strong>기본가격</strong></li>
                                            </ul>
                                        </div>
                                        <div>
                                            <p className="font-bold text-blue-800 mb-1">🗓 월별 가격 (선택)</p>
                                            <ul className="list-disc ml-4 space-y-0.5">
                                                <li>1월~12월 열에 숫자 입력</li>
                                                <li>빈 칸은 기본가격으로 표시</li>
                                                <li>그룹 ID: 같은 투어 업체 묶기</li>
                                            </ul>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 필터 & 액션 */}
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-2 py-1.5 shadow-sm">
                                <select value={filterCity} onChange={e => setFilterCity(e.target.value)} className="text-xs font-medium text-gray-600 bg-transparent border-none focus:ring-0 cursor-pointer">
                                    <option value="all">모든 도시</option>
                                    {cities.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
                                </select>
                                <div className="w-px h-3 bg-gray-200" />
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
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-green-600 rounded-lg text-xs font-bold shadow-sm hover:text-green-700 disabled:opacity-50">
                                        {isBulkUploading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 처리 중...</> : <><FileUp className="w-3.5 h-3.5" /> 엑셀 업로드</>}
                                    </button>
                                </div>
                                <button onClick={openCreateItemForm} className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-md active:scale-95">
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
                                            {item.image ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300"><Image className="w-6 h-6" /></div>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                                <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">{cityLabels[item.city] || item.city}</span>
                                                <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold">{CATEGORY_LABELS[item.category]}</span>
                                                {item.group_id && <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-bold">🗂 {groupLabels[item.group_id] || item.group_id}</span>}
                                                {item.image && <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${item.image.includes('supabase') ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-500'}`}>{item.image.includes('supabase') ? '✓ 서버' : '⚠ 외부'}</span>}
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

                {/* ── 그룹 탭 ── */}
                {tab === 'groups' && (
                    <div>
                        <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 mb-4 flex items-start gap-3">
                            <Layers className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-bold text-purple-900">그룹이란?</p>
                                <p className="text-xs text-purple-700 mt-0.5">같은 투어·액티비티를 여러 업체가 제공할 때 묶는 기능이에요. 예) "호핑투어" 그룹 → 한바다, 더마크루즈, 골드호핑 품목들. 사용자 화면에서는 업체 비교 테이블로 표시됩니다.</p>
                            </div>
                        </div>
                        <div className="flex justify-between items-center mb-4">
                            <p className="text-xs text-gray-500 bg-white border border-gray-200 rounded-xl px-4 py-2">총 <span className="text-blue-600 font-bold">{groups.length}개</span> 그룹</p>
                            <button onClick={openCreateGroupForm} className="flex items-center gap-1.5 px-4 py-2.5 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 shadow-md active:scale-95">
                                <Plus className="w-4 h-4" /> 그룹 추가
                            </button>
                        </div>
                        {groupsLoading ? (
                            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
                        ) : (
                            <div className="space-y-3">
                                {groups.map(group => {
                                    const groupItems = items.filter(i => i.group_id === group.id);
                                    return (
                                        <div key={group.id} className={`bg-white rounded-2xl border border-gray-100 p-4 hover:border-purple-200 hover:shadow-md transition-all group/card ${!group.is_active ? 'opacity-50 grayscale' : ''}`}>
                                            <div className="flex items-start gap-3">
                                                <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                                                    <Layers className="w-6 h-6 text-purple-400" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">{cityLabels[group.city] || group.city}</span>
                                                        <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold">{CATEGORY_LABELS[group.category]}</span>
                                                        <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">ID: {group.id}</span>
                                                    </div>
                                                    <p className="text-sm font-bold text-gray-900">{group.name}</p>
                                                    {group.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{group.description}</p>}
                                                    <p className="text-xs text-purple-500 mt-1 font-medium">소속 품목 {groupItems.length}개{groupItems.length > 0 && `: ${groupItems.slice(0,3).map(i => i.name).join(', ')}${groupItems.length > 3 ? '...' : ''}`}</p>
                                                </div>
                                                <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                                    <button onClick={() => handleToggleGroup(group)} className="p-2 hover:bg-gray-100 rounded-xl">
                                                        {group.is_active ? <ToggleRight className="w-6 h-6 text-purple-500" /> : <ToggleLeft className="w-6 h-6 text-gray-300" />}
                                                    </button>
                                                    <button onClick={() => openEditGroupForm(group)} className="p-2 hover:bg-purple-50 rounded-xl"><Pencil className="w-4 h-4 text-purple-600" /></button>
                                                    <button onClick={() => handleDeleteGroup(group.id)} className="p-2 hover:bg-red-50 rounded-xl"><Trash2 className="w-4 h-4 text-red-500" /></button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {groups.length === 0 && (
                                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                                        <Layers className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                                        <p className="text-sm text-gray-400 font-medium">등록된 그룹이 없습니다.</p>
                                        <p className="text-xs text-gray-300 mt-1">투어 업체 비교를 위해 그룹을 추가해보세요.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ── 패키지 탭 ── */}
                {tab === 'packages' && (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <div className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-xs text-gray-500 font-medium">
                                총 <span className="text-amber-600 font-bold">{packages.length}개</span>의 패키지
                            </div>
                            <button onClick={openCreatePackageForm} className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600 shadow-md transition-all active:scale-95">
                                <Plus className="w-4 h-4" /> 패키지 추가
                            </button>
                        </div>

                        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-4 flex items-start gap-3">
                            <Gift className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-amber-700">
                                <strong>누구와 · 여행 스타일</strong> 태그 조합으로 사용자에게 맞춤 패키지를 추천합니다.
                                기존 품목들을 골라 묶으면 PackageCalculator 페이지에서 자동으로 매칭됩니다.
                            </p>
                        </div>

                        {packagesLoading ? (
                            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
                        ) : packages.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                                <Gift className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                                <p className="text-sm text-gray-400">등록된 패키지가 없습니다.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {packages.map(pkg => (
                                    <div key={pkg.id} className={`bg-white rounded-2xl border border-gray-100 p-4 hover:border-amber-200 hover:shadow-md transition-all group ${!pkg.is_active ? 'opacity-50 grayscale' : ''}`}>
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                                                <Gift className="w-5 h-5 text-amber-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                                    <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">{cityLabels[pkg.city] || pkg.city}</span>
                                                    {(pkg.theme_who || []).map(w => (
                                                        <span key={w} className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-bold">
                                                                    {THEME_WHO.find(t => t.id === w)?.label || w}
                                                                </span>
                                                    ))}
                                                    {(pkg.theme_style || []).map(s => (
                                                        <span key={s} className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-bold">
                                                                    {THEME_STYLE.find(t => t.id === s)?.label || s}
                                                                </span>
                                                    ))}
                                                </div>
                                                <p className="text-sm font-bold text-gray-900">{pkg.name}</p>
                                                {pkg.description && <p className="text-[11px] text-gray-400 mt-0.5 truncate">{pkg.description}</p>}
                                            </div>
                                            <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleTogglePackage(pkg)} className="p-2 hover:bg-gray-100 rounded-xl">
                                                    {pkg.is_active ? <ToggleRight className="w-6 h-6 text-blue-500" /> : <ToggleLeft className="w-6 h-6 text-gray-300" />}
                                                </button>
                                                <button onClick={() => openEditPackageForm(pkg)} className="p-2 hover:bg-amber-50 rounded-xl"><Pencil className="w-4 h-4 text-amber-600" /></button>
                                                <button onClick={() => handleDeletePackage(pkg.id)} className="p-2 hover:bg-red-50 rounded-xl"><Trash2 className="w-4 h-4 text-red-500" /></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* 패키지 모달 */}
                        {showPackageForm && (
                            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                                <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl">
                                    <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
                                        <h2 className="text-lg font-black text-gray-900">{editingPackage ? '패키지 수정' : '새 패키지 추가'}</h2>
                                        <button onClick={() => setShowPackageForm(false)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-400" /></button>
                                    </div>
                                    <div className="px-6 py-6 space-y-6">

                                        {/* 기본 정보 */}
                                        <div className="space-y-4">
                                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider">기본 정보</h3>
                                            {!editingPackage && (
                                                <div>
                                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider block mb-1.5">패키지 ID (영문)</label>
                                                    <input value={packageForm.id} onChange={e => setPackageForm({...packageForm, id: e.target.value})} placeholder="danang-family-luxury"
                                                           className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-amber-400" />
                                                </div>
                                            )}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider block mb-1.5">도시</label>
                                                    <select value={packageForm.city} onChange={e => setPackageForm({...packageForm, city: e.target.value})} disabled={!!editingPackage}
                                                            className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-amber-400 disabled:opacity-50">
                                                        {cities.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider block mb-1.5">패키지 이름 *</label>
                                                    <input value={packageForm.name} onChange={e => setPackageForm({...packageForm, name: e.target.value})} placeholder="다낭 가족 럭셔리 패키지"
                                                           className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-amber-400" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider block mb-1.5">설명 (선택)</label>
                                                <input value={packageForm.description} onChange={e => setPackageForm({...packageForm, description: e.target.value})} placeholder="패키지 한줄 소개"
                                                       className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-amber-400" />
                                            </div>
                                        </div>

                                        {/* 테마 태그 */}
                                        <div className="space-y-4">
                                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> 누구와 떠나는 여행? *</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {THEME_WHO.map(t => (
                                                    <button key={t.id} onClick={() => setPackageForm({...packageForm, theme_who: toggleThemeTag(packageForm.theme_who, t.id)})}
                                                            className={`px-3 py-2 rounded-2xl text-xs font-bold transition-all border-2 ${packageForm.theme_who.includes(t.id) ? 'bg-purple-600 text-white border-purple-600' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-purple-300'}`}>
                                                        {t.label}
                                                    </button>
                                                ))}
                                            </div>
                                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> 여행 스타일? *</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {THEME_STYLE.map(t => (
                                                    <button key={t.id} onClick={() => setPackageForm({...packageForm, theme_style: toggleThemeTag(packageForm.theme_style, t.id)})}
                                                            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all border-2 ${packageForm.theme_style.includes(t.id) ? 'bg-amber-500 text-white border-amber-500' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-amber-300'}`}>
                                                        {t.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* 품목 선택 */}
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                                                    <Package className="w-3.5 h-3.5" /> 포함 품목 선택 *
                                                </h3>
                                                <span className="text-[11px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full">{packageItemIds.length}개 선택됨</span>
                                            </div>

                                            {/* 선택된 품목 순서 표시 */}
                                            {packageItemIds.length > 0 && (
                                                <div className="bg-amber-50 rounded-2xl p-3 space-y-1.5">
                                                    <p className="text-[10px] font-bold text-amber-600 mb-2">선택된 품목 (순서 = 사용자 표시 순서)</p>
                                                    {packageItemIds.map((itemId, idx) => {
                                                        const item = items.find(i => i.id === itemId);
                                                        if (!item) return null;
                                                        return (
                                                            <div key={itemId} className="flex items-center gap-2 bg-white rounded-xl px-3 py-2">
                                                                <span className="text-[10px] font-black text-amber-500 w-4">{idx + 1}</span>
                                                                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-bold">{CATEGORY_LABELS[item.category]}</span>
                                                                <span className="text-xs font-medium text-gray-700 flex-1 truncate">{item.name}</span>
                                                                <span className="text-xs font-bold text-blue-600">₩{item.price.toLocaleString()}</span>
                                                                <button onClick={() => setPackageItemIds(prev => prev.filter(id => id !== itemId))} className="p-1 hover:bg-red-50 rounded-lg">
                                                                    <X className="w-3 h-3 text-red-400" />
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* 품목 검색 & 필터 */}
                                            <div className="flex gap-2">
                                                <div className="flex-1 relative">
                                                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                                    <input value={pkgSearchText} onChange={e => setPkgSearchText(e.target.value)} placeholder="품목 검색..."
                                                           className="w-full bg-gray-50 border-none rounded-xl pl-8 pr-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-amber-400" />
                                                </div>
                                                <select value={pkgFilterCat} onChange={e => setPkgFilterCat(e.target.value)}
                                                        className="bg-gray-50 border-none rounded-xl px-3 py-2.5 text-xs font-bold text-gray-600 focus:ring-2 focus:ring-amber-400">
                                                    <option value="all">전체</option>
                                                    {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                                                </select>
                                            </div>

                                            {/* 품목 목록 */}
                                            <div className="max-h-64 overflow-y-auto space-y-1.5 border border-gray-100 rounded-2xl p-3">
                                                {filteredPkgItems.length === 0 ? (
                                                    <p className="text-xs text-gray-400 text-center py-6">해당 도시의 품목이 없습니다.</p>
                                                ) : filteredPkgItems.map(item => {
                                                    const isSelected = packageItemIds.includes(item.id);
                                                    return (
                                                        <div key={item.id} onClick={() => setPackageItemIds(prev => isSelected ? prev.filter(id => id !== item.id) : [...prev, item.id])}
                                                             className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${isSelected ? 'bg-amber-50 border border-amber-200' : 'hover:bg-gray-50 border border-transparent'}`}>
                                                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? 'bg-amber-500 border-amber-500' : 'border-gray-300'}`}>
                                                                {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                                                            </div>
                                                            {item.image && <img src={item.image} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" onError={e => (e.currentTarget.style.display='none')} />}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-bold">{CATEGORY_LABELS[item.category]}</span>
                                                                    <span className="text-xs font-medium text-gray-800 truncate">{item.name}</span>
                                                                </div>
                                                                <p className="text-[10px] text-gray-400 truncate mt-0.5">{item.description}</p>
                                                            </div>
                                                            <span className="text-xs font-bold text-blue-600 flex-shrink-0">₩{item.price.toLocaleString()}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* 활성화 토글 */}
                                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">패키지 활성화</p>
                                                <p className="text-[10px] text-gray-400">사용자 화면에서 추천됩니다</p>
                                            </div>
                                            <button onClick={() => setPackageForm({...packageForm, is_active: !packageForm.is_active})}
                                                    className={`w-12 h-6 rounded-full transition-all relative ${packageForm.is_active ? 'bg-blue-600' : 'bg-gray-300'}`}>
                                                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all ${packageForm.is_active ? 'left-6' : 'left-0.5'}`} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="px-6 py-5 border-t bg-gray-50 flex gap-3 sticky bottom-0 z-10">
                                        <button onClick={() => setShowPackageForm(false)} className="flex-1 py-3 text-gray-500 text-sm font-bold hover:bg-white rounded-2xl">취소</button>
                                        <button onClick={handleSavePackage} disabled={savingPackage}
                                                className="flex-1 py-3 bg-amber-500 text-white rounded-2xl text-sm font-black hover:bg-amber-600 disabled:opacity-50 active:scale-95">
                                            {savingPackage ? '저장 중...' : editingPackage ? '수정 완료' : '패키지 등록'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── 도시 탭 ── */}
                {tab === 'cities' && (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <p className="text-xs text-gray-500 bg-white border border-gray-200 rounded-xl px-4 py-2">총 <span className="text-blue-600 font-bold">{cities.length}개</span>의 도시</p>
                            <button onClick={openCreateCityForm} className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-md active:scale-95">
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

                {/* ── 통계 탭 ── */}
                {tab === 'stats' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {[{ label: '전체 품목', value: items.length, color: 'text-gray-900', bg: 'bg-white' },
                                { label: '활성 품목', value: items.filter(i => i.is_active).length, color: 'text-green-600', bg: 'bg-green-50' },
                                { label: '총 클릭수', value: totalClicks, color: 'text-blue-600', bg: 'bg-blue-50' }
                            ].map(card => (
                                <div key={card.label} className={`${card.bg} rounded-2xl border border-gray-100 p-5 shadow-sm`}>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-tight mb-1">{card.label}</p>
                                    <p className={`text-3xl font-black ${card.color}`}>{card.value.toLocaleString()}</p>
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
                                <h2 className="text-base font-black text-gray-900 flex items-center gap-2 mb-5"><BarChart2 className="w-5 h-5 text-blue-500" /> 클릭 TOP 5 품목</h2>
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
                                <h2 className="text-base font-black text-gray-900 flex items-center gap-2 mb-5"><Globe className="w-5 h-5 text-green-500" /> 도시별 클릭 비중</h2>
                                <div className="space-y-4">
                                    {cities.map(city => {
                                        const cityClicks = items.filter(i => i.city === city.id).reduce((sum, i) => sum + i.click_count, 0);
                                        const pct = totalClicks > 0 ? Math.round((cityClicks / totalClicks) * 100) : 0;
                                        return (
                                            <div key={city.id}>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-xs font-bold text-gray-700">{city.emoji} {city.name}</span>
                                                    <span className="text-[11px] text-gray-500 font-bold">{cityClicks}회 ({pct}%)</span>
                                                </div>
                                                <div className="h-3 bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                                                    <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
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

            {/* ── 그룹 모달 ── */}
            {showGroupForm && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b">
                            <h2 className="text-lg font-black text-gray-900">{editingGroup ? '그룹 수정' : '새 그룹 추가'}</h2>
                            <button onClick={() => setShowGroupForm(false)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-400" /></button>
                        </div>
                        <div className="px-6 py-6 space-y-4">
                            {!editingGroup && (
                                <div>
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5 block">그룹 ID (영문)</label>
                                    <input value={groupForm.id} onChange={e => setGroupForm({...groupForm, id: e.target.value})} placeholder="hopping-tour-danang"
                                           className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-purple-500" />
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5 block">도시</label>
                                    <select value={groupForm.city} onChange={e => setGroupForm({...groupForm, city: e.target.value})}
                                            className="w-full bg-gray-50 border-none rounded-2xl px-3 py-3 text-sm font-bold focus:ring-2 focus:ring-purple-500">
                                        {cities.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5 block">카테고리</label>
                                    <select value={groupForm.category} onChange={e => setGroupForm({...groupForm, category: e.target.value})}
                                            className="w-full bg-gray-50 border-none rounded-2xl px-3 py-3 text-sm font-bold focus:ring-2 focus:ring-purple-500">
                                        {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5 block">그룹명 *</label>
                                <input value={groupForm.name} onChange={e => setGroupForm({...groupForm, name: e.target.value})} placeholder="호핑투어"
                                       className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-purple-500" />
                            </div>
                            <div>
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5 block">설명</label>
                                <input value={groupForm.description} onChange={e => setGroupForm({...groupForm, description: e.target.value})} placeholder="다낭 호핑투어 업체 비교"
                                       className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-purple-500" />
                            </div>
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                                <p className="text-sm font-bold text-gray-900">활성화</p>
                                <button onClick={() => setGroupForm({...groupForm, is_active: !groupForm.is_active})}
                                        className={`w-12 h-6 rounded-full transition-all relative ${groupForm.is_active ? 'bg-purple-600' : 'bg-gray-300'}`}>
                                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all ${groupForm.is_active ? 'left-6' : 'left-0.5'}`} />
                                </button>
                            </div>
                        </div>
                        <div className="px-6 py-5 border-t flex gap-3">
                            <button onClick={() => setShowGroupForm(false)} className="flex-1 py-3 text-gray-500 text-sm font-bold hover:bg-gray-50 rounded-2xl">취소</button>
                            <button onClick={handleSaveGroup} disabled={savingGroup} className="flex-1 py-3 bg-purple-600 text-white rounded-2xl text-sm font-black hover:bg-purple-700 disabled:opacity-50 active:scale-95">
                                {savingGroup ? '저장 중...' : editingGroup ? '수정 완료' : '그룹 추가'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── 도시 모달 ── */}
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
                                    <input value={cityForm.id} onChange={e => setCityForm({...cityForm, id: e.target.value})} placeholder="tokyo, danang"
                                           className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500" />
                                </div>
                            )}
                            <div>
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5 block">도시명</label>
                                <input value={cityForm.name} onChange={e => setCityForm({...cityForm, name: e.target.value})} placeholder="도쿄, 다낭"
                                       className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5 block">나라 선택</label>
                                <select value={cityForm.country_code} onChange={e => { const sel = countries.find(c => c.code === e.target.value); setCityForm({ ...cityForm, country_code: e.target.value, emoji: sel?.emoji || '🌏' }); }}
                                        className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500">
                                    <option value="">나라를 선택하세요</option>
                                    {countries.map(c => <option key={c.code} value={c.code}>{c.emoji} {c.name}</option>)}
                                </select>
                                {cityForm.emoji && <p className="text-xs text-gray-400 mt-1.5 ml-1">선택된 국기: <span className="text-xl">{cityForm.emoji}</span></p>}
                            </div>
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                                <div><p className="text-sm font-bold text-gray-900">활성화</p><p className="text-[10px] text-gray-400">사용자 화면에 노출됩니다</p></div>
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

            {/* ── 품목 모달 ── */}
            {showItemForm && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
                            <h2 className="text-lg font-black text-gray-900">{editingItem ? '품목 수정' : '새 품목 등록'}</h2>
                            <button onClick={() => setShowItemForm(false)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-400" /></button>
                        </div>
                        <div className="px-6 py-6 space-y-5">
                            {/* 도시 + 카테고리 */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider block mb-1.5">도시</label>
                                    <select value={itemForm.city} onChange={e => setItemForm({...itemForm, city: e.target.value, group_id: ''})}
                                            className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500">
                                        {cities.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider block mb-1.5">카테고리</label>
                                    <select value={itemForm.category} onChange={e => setItemForm({...itemForm, category: e.target.value, group_id: ''})}
                                            className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500">
                                        {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* 그룹 선택 */}
                            <div>
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                                    <Layers className="w-3.5 h-3.5 text-purple-400" /> 그룹 (선택사항)
                                </label>
                                <select value={itemForm.group_id} onChange={e => setItemForm({...itemForm, group_id: e.target.value})}
                                        className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-purple-400">
                                    <option value="">그룹 없음 (단독 품목)</option>
                                    {groups.filter(g => g.city === itemForm.city && g.category === itemForm.category).map(g => (
                                        <option key={g.id} value={g.id}>{g.name}</option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-gray-400 mt-1 ml-1">같은 투어 업체 비교 시 그룹에 포함하세요</p>
                            </div>

                            {/* 품목명 */}
                            <div>
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider block mb-1.5">품목명 *</label>
                                <input value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} placeholder="상품명"
                                       className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500" />
                            </div>

                            {/* 설명 */}
                            <div>
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider block mb-1.5">설명</label>
                                <textarea value={itemForm.description} onChange={e => setItemForm({...itemForm, description: e.target.value})} rows={2}
                                          placeholder="상품 간략 설명"
                                          className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 resize-none" />
                            </div>

                            {/* 기본 가격 + 활성화 */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider block mb-1.5">기본 가격 (₩) *</label>
                                    <input type="number" value={itemForm.price} onChange={e => setItemForm({...itemForm, price: Number(e.target.value)})}
                                           className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-black focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider block mb-1.5">사용 여부</label>
                                    <button onClick={() => setItemForm({...itemForm, is_active: !itemForm.is_active})}
                                            className={`w-full h-[46px] rounded-2xl flex items-center justify-center gap-2 font-bold text-sm border-2 transition-all ${itemForm.is_active ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-gray-50 text-gray-400 border-transparent'}`}>
                                        {itemForm.is_active ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                        {itemForm.is_active ? '활성화됨' : '비활성'}
                                    </button>
                                </div>
                            </div>

                            {/* 월별 가격 */}
                            <div className="pt-2 border-t border-gray-100">
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                                    <CalendarDays className="w-3.5 h-3.5 text-blue-400" /> 월별 가격 (시즌별 조정)
                                    <span className="text-[10px] text-gray-300 font-normal">빈 칸 = 기본 가격 사용</span>
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {MONTHS.map((label, idx) => {
                                        const month = idx + 1;
                                        const val = monthlyPrices[month];
                                        return (
                                            <div key={month}>
                                                <p className="text-[10px] text-gray-400 font-bold mb-1 text-center">{label}</p>
                                                <input
                                                    type="number"
                                                    placeholder={itemForm.price > 0 ? String(itemForm.price) : '0'}
                                                    value={val || ''}
                                                    onChange={e => setMonthlyPrices(prev => ({ ...prev, [month]: Number(e.target.value) }))}
                                                    className={`w-full bg-gray-50 border rounded-xl px-2 py-2 text-xs font-bold text-center focus:ring-1 focus:ring-blue-400 focus:border-blue-400 ${val && val !== itemForm.price ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-transparent'}`}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                                <p className="text-[10px] text-blue-500 mt-2">💡 기본 가격과 다른 달은 파란색으로 표시됩니다</p>
                            </div>

                            {/* 이미지 + 제휴링크 */}
                            <div className="space-y-4 pt-2 border-t border-gray-100">
                                <div>
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                                        <Image className="w-3.5 h-3.5" /> 이미지 URL
                                        <span className="text-[10px] text-blue-500 font-normal">저장 시 자동으로 서버에 복사됩니다</span>
                                    </label>
                                    <input value={itemForm.image} onChange={e => setItemForm({...itemForm, image: e.target.value})}
                                           placeholder="https://... (외부 링크 가능)"
                                           className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-xs font-medium focus:ring-2 focus:ring-blue-500" />
                                    {itemForm.image?.startsWith('http') && (
                                        <img src={itemForm.image} alt="미리보기" className="w-full h-28 object-cover rounded-xl mt-2"
                                             onError={e => (e.currentTarget.style.display = 'none')} />
                                    )}
                                </div>
                                <div>
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
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
                                {savingItem ? '저장 중...' : editingItem ? '수정 완료' : '품목 등록'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}