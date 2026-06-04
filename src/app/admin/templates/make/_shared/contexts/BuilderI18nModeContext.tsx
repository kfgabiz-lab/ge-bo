'use client';

/**
 * BuilderI18nModeContext — 빌더 다국어 모드 전역 상태
 *
 * SizeSettingPanel의 🌐 토글 버튼으로 모드를 변경하면
 * 해당 위젯 편집 영역 내의 모든 필드(라벨·placeholder)가 한 번에 전환된다.
 *
 * 기본값: true (다국어 모드 ON)
 *
 * 사용법:
 *   // Provider — 각 빌더 페이지의 컨텐츠 편집 섹션에서 래핑
 *   <BuilderI18nModeProvider>
 *     <SizeSettingPanel ... />
 *     <CommonBuilderDispatcher ... />
 *   </BuilderI18nModeProvider>
 *
 *   // Consumer — _FieldBase, InputField 등 빌더 내부 컴포넌트
 *   const { i18nMode, toggleI18nMode } = useBuilderI18nMode();
 */

import React, { createContext, useContext, useState } from 'react';
import { Globe } from 'lucide-react';

interface BuilderI18nModeContextValue {
    /** 다국어 키 모드 여부 (true: MessageKeySelector, false: 직접 입력) */
    i18nMode: boolean;
    /** 모드 토글 */
    toggleI18nMode: () => void;
}

const BuilderI18nModeContext = createContext<BuilderI18nModeContextValue>({
    i18nMode: true,
    toggleI18nMode: () => {},
});

/** 빌더 다국어 모드 Provider — 컨텐츠 편집 섹션 단위로 래핑 */
export function BuilderI18nModeProvider({ children }: { children: React.ReactNode }) {
    /* 기본값 true — 처음부터 다국어 모드 ON */
    const [i18nMode, setI18nMode] = useState(true);

    return (
        <BuilderI18nModeContext.Provider value={{ i18nMode, toggleI18nMode: () => setI18nMode(v => !v) }}>
            {children}
        </BuilderI18nModeContext.Provider>
    );
}

/**
 * 빌더 다국어 모드 훅
 * - _FieldBase, InputField 등 빌더 내부 컴포넌트에서 사용
 * - Provider 밖에서 호출되면 기본값(i18nMode: true) 반환
 */
export function useBuilderI18nMode() {
    return useContext(BuilderI18nModeContext);
}

/**
 * 위젯 헤더에 배치하는 다국어 모드 토글 버튼
 * - BuilderI18nModeProvider 안에서만 동작
 * - e.stopPropagation()으로 헤더 클릭 이벤트와 분리
 *
 * 사용법:
 *   <WidgetI18nToggle />
 */
export function WidgetI18nToggle() {
    const { i18nMode, toggleI18nMode } = useBuilderI18nMode();
    return (
        <button
            type="button"
            title={i18nMode ? '직접 입력 모드로 전환' : '다국어 키 모드로 전환'}
            onClick={e => { e.stopPropagation(); toggleI18nMode(); }}
            className={`flex-shrink-0 p-0.5 rounded transition-all ${
                i18nMode
                    ? 'text-blue-400 bg-blue-500/20 hover:bg-blue-500/30'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/10'
            }`}
        >
            <Globe className="w-3 h-3" />
        </button>
    );
}
