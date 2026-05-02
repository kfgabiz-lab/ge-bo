/**
 * 출력 모드(페이지/레이어팝업) 상태 관리 훅
 *
 * quick-detail, widget 빌더 공통 사용
 *
 * 사용법:
 *   const om = useOutputMode();
 *   // om.outputMode, om.layerType, om.isRightDrawer
 *   // om.setOutputMode, om.setLayerType, om.setLayerTitle, om.setLayerWidth
 *   // om.restore(config) — 불러온 configJson에서 일괄 복원
 */

import { useState } from 'react';
import type { LayerType, LayerWidth } from '../types';

export type OutputMode = 'page' | 'layerpopup';

export interface OutputModeValue {
    outputMode: OutputMode;
    layerType: LayerType;
    layerTitle: string;
    layerWidth: LayerWidth;
    /** 우측 드로어 여부 — layerpopup + right 조합일 때 true */
    isRightDrawer: boolean;
    setOutputMode: (v: OutputMode) => void;
    setLayerType: (v: LayerType) => void;
    setLayerTitle: (v: string) => void;
    setLayerWidth: (v: LayerWidth) => void;
    /**
     * 저장된 configJson에서 outputMode 관련 값 일괄 복원
     * @param cfg JSON.parse(tpl.configJson) 결과 객체
     */
    restore: (cfg: Record<string, unknown>) => void;
}

export function useOutputMode(): OutputModeValue {
    const [outputMode, setOutputMode] = useState<OutputMode>('page');
    const [layerType, setLayerType]   = useState<LayerType>('center');
    const [layerTitle, setLayerTitle] = useState('');
    const [layerWidth, setLayerWidth] = useState<LayerWidth>('md');

    const isRightDrawer = outputMode === 'layerpopup' && layerType === 'right';

    const restore = (cfg: Record<string, unknown>) => {
        setOutputMode((cfg.outputMode as OutputMode)  || 'page');
        setLayerType ((cfg.layerType  as LayerType)   || 'center');
        setLayerTitle((cfg.layerTitle  as string)     || '');
        setLayerWidth((cfg.layerWidth  as LayerWidth) || 'md');
    };

    return {
        outputMode, layerType, layerTitle, layerWidth, isRightDrawer,
        setOutputMode, setLayerType, setLayerTitle, setLayerWidth,
        restore,
    };
}
