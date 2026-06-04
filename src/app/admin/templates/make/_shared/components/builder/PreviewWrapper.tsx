'use client';

/**
 * 출력 모드에 따라 미리보기 컨텐츠를 올바른 레이아웃으로 감싸는 컴포넌트
 *
 * - page:           children 그대로 렌더
 * - layerpopup center: CenterPopupLayout으로 감싸기
 * - layerpopup right:  RightDrawerLayout으로 감싸기
 *
 * 사용법:
 *   const om = useOutputMode();
 *   <PreviewWrapper
 *     outputMode={om.outputMode}
 *     layerType={om.layerType}
 *     layerTitle={om.layerTitle}
 *     layerWidth={om.layerWidth}
 *   >
 *     {미리보기 내부 컨텐츠}
 *   </PreviewWrapper>
 */

import type { ReactNode } from 'react';
import type { LayerType, LayerWidth } from '../../types';
import type { OutputMode } from '../../hooks/useOutputMode';
import { useI18n } from '@/hooks/use-i18n';
import CenterPopupLayout from '@/components/layout/popup/center-popup-layout';
import RightDrawerLayout from '@/components/layout/popup/right-drawer-layout';

interface PreviewWrapperProps {
    outputMode: OutputMode;
    layerType: LayerType;
    layerTitle: string;
    layerTitleMsgKey?: string;
    layerWidth: LayerWidth;
    children: ReactNode;
}

/**
 * 출력 모드 기반 미리보기 래퍼
 * page 모드는 children을 그대로 반환하고,
 * layerpopup 모드는 팝업 레이아웃 컴포넌트로 감싼다.
 */
export function PreviewWrapper({ outputMode, layerType, layerTitle, layerTitleMsgKey, layerWidth, children }: PreviewWrapperProps) {
    const { t } = useI18n();
    const resolvedTitle = layerTitleMsgKey ? t(layerTitleMsgKey) : layerTitle;

    /* page 모드: 그대로 렌더 */
    if (outputMode !== 'layerpopup') return <>{children}</>;

    /* 우측 드로어 */
    if (layerType === 'right') {
        return (
            <RightDrawerLayout preview open onClose={() => {}} title={resolvedTitle || '드로어 미리보기'}>
                <div className="px-6 py-5">{children}</div>
            </RightDrawerLayout>
        );
    }

    /* 중앙 팝업 */
    return (
        <CenterPopupLayout preview open onClose={() => {}} title={resolvedTitle || '팝업 미리보기'} layerWidth={layerWidth}>
            <div className="px-6 py-5">{children}</div>
        </CenterPopupLayout>
    );
}
