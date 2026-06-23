/**
 * 출력 모드(페이지/레이어팝업) 상태 관리 훅
 *
 * quick-detail, widget 빌더 공통 사용
 *
 * 사용법:
 *   const om = useOutputMode();
 *   // om.outputMode, om.layerType, om.isRightDrawer
 *   // om.pageTitle — page 모드 전용 제목
 *   // om.setOutputMode, om.setLayerType, om.setLayerTitle, om.setLayerWidth
 *   // om.restore(config) — 불러온 configJson에서 일괄 복원
 */

import { useState } from 'react';
import type { LayerType, LayerWidth } from '../types';

export type OutputMode = 'page' | 'layerpopup';

export interface OutputModeValue {
    outputMode: OutputMode;
    /** page 모드 전용 제목 */
    pageTitle: string;
    pageTitleMsgKey: string;       // 페이지 제목 다국어 키
    layerType: LayerType;
    layerTitle: string;
    layerTitleMsgKey: string;      // 팝업 제목 다국어 키
    layerWidth: LayerWidth;
    /** 저장 시 메인 data_slug (선택) */
    mainConnectedSlug: string;
    /** 우측 드로어 여부 — layerpopup + right 조합일 때 true */
    isRightDrawer: boolean;
    setOutputMode: (v: OutputMode) => void;
    setPageTitle: (v: string) => void;
    setPageTitleMsgKey: (v: string) => void;
    setLayerType: (v: LayerType) => void;
    setLayerTitle: (v: string) => void;
    setLayerTitleMsgKey: (v: string) => void;
    setLayerWidth: (v: LayerWidth) => void;
    setMainConnectedSlug: (v: string) => void;
    /**
     * 저장된 configJson에서 outputMode 관련 값 일괄 복원
     * @param cfg JSON.parse(tpl.configJson) 결과 객체
     */
    restore: (cfg: Record<string, unknown>) => void;
}

export function useOutputMode(): OutputModeValue {
    const [outputMode, setOutputMode]             = useState<OutputMode>('page');
    const [pageTitle, setPageTitle]               = useState('');
    const [pageTitleMsgKey, setPageTitleMsgKey]   = useState('');
    const [layerType, setLayerType]               = useState<LayerType>('center');
    const [layerTitle, setLayerTitle]             = useState('');
    const [layerTitleMsgKey, setLayerTitleMsgKey] = useState('');
    const [layerWidth, setLayerWidth]             = useState<LayerWidth>('md');
    const [mainConnectedSlug, setMainConnectedSlug] = useState('');

    const isRightDrawer = outputMode === 'layerpopup' && layerType === 'right';

    const restore = (cfg: Record<string, unknown>) => {
        setOutputMode        ((cfg.outputMode         as OutputMode)  || 'page');
        setPageTitle         ((cfg.pageTitle          as string)      || '');
        setPageTitleMsgKey   ((cfg.pageTitleMsgKey    as string)      || '');
        setLayerType         ((cfg.layerType          as LayerType)   || 'center');
        setLayerTitle        ((cfg.layerTitle         as string)      || '');
        setLayerTitleMsgKey  ((cfg.layerTitleMsgKey   as string)      || '');
        setLayerWidth        ((cfg.layerWidth         as LayerWidth)  || 'md');
        setMainConnectedSlug ((cfg.mainConnectedSlug  as string)      || '');
    };

    return {
        outputMode, pageTitle, pageTitleMsgKey, layerType, layerTitle, layerTitleMsgKey, layerWidth,
        mainConnectedSlug, isRightDrawer,
        setOutputMode, setPageTitle, setPageTitleMsgKey, setLayerType, setLayerTitle, setLayerTitleMsgKey, setLayerWidth,
        setMainConnectedSlug,
        restore,
    };
}
