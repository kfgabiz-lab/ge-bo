import { useCallback } from 'react';
import { useI18nStore } from '@/store/use-i18n-store';
import { useLanguageStore } from '@/store/use-language-store';

/**
 * 다국어 번역 훅
 * @example
 * const { t } = useI18n();
 * t('login.submit')                          → '로그인' | 'Sign In'
 * t('login.toast.success', { name: '홍길동' }) → '홍길동님, 반갑습니다!'
 */
export function useI18n() {
    const messages = useI18nStore(s => s.messages);
    const locale   = useLanguageStore(s => s.locale);

    const t = useCallback(
        (key: string, vars?: Record<string, string>): string => {
            const entry = messages[key];
            if (!entry) return key; // key 없으면 key 자체 반환 (누락 확인용)

            const text = (locale === 'en' && entry.en) ? entry.en : entry.ko;
            if (!vars) return text;

            /* {name} 같은 변수 치환 */
            return text.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
        },
        [messages, locale],
    );

    return { t };
}
