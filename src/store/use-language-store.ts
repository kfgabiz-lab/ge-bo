import { create } from 'zustand';

/** 지원 언어 목록 — 언어 추가 시 여기에만 추가 */
export const SUPPORTED_LOCALES = [
    { code: 'ko', label: '한국어' },
    { code: 'en', label: 'English' },
] as const;

export type SupportedLocale = typeof SUPPORTED_LOCALES[number]['code'];

export const STORAGE_KEY = 'bo_locale';

/** 스토어 생성 시점에 localStorage를 직접 읽어 초기 언어 결정 */
const getInitialLocale = (): SupportedLocale => {
    if (typeof window === 'undefined') return 'ko'; // SSR
    const stored = localStorage.getItem(STORAGE_KEY) as SupportedLocale | null;
    return (stored && SUPPORTED_LOCALES.some(l => l.code === stored)) ? stored : 'ko';
};

interface LanguageState {
    locale: SupportedLocale;
    setLocale: (locale: SupportedLocale) => void;
    loadLocaleFromStorage: () => void;
}

export const useLanguageStore = create<LanguageState>((set) => ({
    locale: getInitialLocale(),

    setLocale: (locale) => {
        set({ locale });
        localStorage.setItem(STORAGE_KEY, locale);
    },

    /** getInitialLocale()로 초기화하므로 별도 호출 불필요 — 하위 호환성 유지 */
    loadLocaleFromStorage: () => {},
}));
