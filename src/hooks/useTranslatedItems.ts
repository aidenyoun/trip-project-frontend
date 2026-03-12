import { supabase } from "../supabase"; // src/supabase.ts

export interface TravelItem {
    id: string;
    category: string;
    name: string;
    price: number;
    image: string;
    description: string;
    affiliate_link: string | null;
    city: string;
    click_count: number;
    is_active: boolean;
}

// 아이템 목록을 언어에 맞게 번역 적용
export async function fetchItemsWithTranslation(
    city: string,
    lang: string
): Promise<TravelItem[]> {
    if (lang === "ko") {
        const { data, error } = await supabase
            .from("items")
            .select("*")
            .eq("city", city)
            .eq("is_active", true);
        if (error) throw error;
        return data || [];
    }

    // 번역본 JOIN
    const { data, error } = await supabase
        .from("items")
        .select(`
      *,
      item_translations (
        name,
        description,
        lang
      )
    `)
        .eq("city", city)
        .eq("is_active", true);

    if (error) throw error;

    return (data || []).map((item) => {
        const translation = item.item_translations?.find(
            (t: { lang: string }) => t.lang === lang
        );
        return {
            ...item,
            name: translation?.name ?? item.name,           // 번역 없으면 한국어 fallback
            description: translation?.description ?? item.description,
            item_translations: undefined,
        };
    });
}

// 도시 이름 번역
export async function fetchCitiesWithTranslation(lang: string) {
    if (lang === "ko") {
        const { data } = await supabase.from("cities").select("*").eq("is_active", true);
        return data || [];
    }

    const { data } = await supabase
        .from("cities")
        .select(`
      *,
      city_translations (
        name,
        lang
      )
    `)
        .eq("is_active", true);

    return (data || []).map((city) => {
        const translation = city.city_translations?.find(
            (t: { lang: string }) => t.lang === lang
        );
        return {
            ...city,
            name: translation?.name ?? city.name,
            city_translations: undefined,
        };
    });
}