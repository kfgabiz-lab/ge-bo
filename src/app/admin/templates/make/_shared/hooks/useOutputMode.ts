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

export type ConnectedType = 'none' | 'slug' | 'entity' | 'data';

export interface OutputModeValue {
    outputMode: OutputMode;
    /** page 모드 전용 제목 */
    pageTitle: string;
    pageTitleMsgKey: string;       // 페이지 제목 다국어 키
    layerType: LayerType;
    layerTitle: string;
    layerTitleMsgKey: string;      // 팝업 제목 다국어 키
    layerWidth: LayerWidth;
    /** 저장 시 메인 data_slug (선택) — connectedType에 따라 네임스페이스가 달라진다.
     * slug: SlugRegistry slug / entity: SlugRegistry 중 entity가 연결된 slug / data: SlugEntity 고유 slug */
    mainConnectedSlug: string;
    /** 운영페이지 이탈 시 변경사항 확인 여부 */
    leaveCheck: boolean;
    /** 단일페이지 여부 — true 시 /widgetSub/{slug}?id=N URL 사용 안내 */
    singlePage: boolean;
    /** 연결 타입 — mainConnectedSlug 기반, restore 시 함께 복원 */
    connectedType: ConnectedType;
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
    setLeaveCheck: (v: boolean) => void;
    setSinglePage: (v: boolean) => void;
    setConnectedType: (v: ConnectedType) => void;
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
    const [leaveCheck, setLeaveCheck]               = useState(false);
    const [singlePage, setSinglePage]               = useState(false);
    const [connectedType, setConnectedType]         = useState<ConnectedType>('none');

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
        setLeaveCheck        ((cfg.leaveCheck         as boolean)     ?? false);
        setSinglePage        ((cfg.singlePage         as boolean)     ?? false);
        /* connectedType — 신규 저장분은 configJson에 명시된 값을 그대로 사용.
         * 레거시 데이터(connectedType 미저장)는 기존처럼 mainConnectedSlug·slugEntityId 기반으로 파생 복원.
         * — 옛 템플릿에 slugEntityId만 저장되어 있고 mainConnectedSlug가 없는 경우, 값을 역산하지 않고
         *   connectedType만 'entity'로 추정 복원하며 mainConnectedSlug는 빈 값으로 둔다(사용자가 다시 선택해야 함). */
        setConnectedType(
            (cfg.connectedType as ConnectedType) ?? (
                (cfg.slugEntityId as number)      ? 'entity' :
                (cfg.mainConnectedSlug as string) ? 'slug'   : 'none'
            )
        );
    };

    return {
        outputMode, pageTitle, pageTitleMsgKey, layerType, layerTitle, layerTitleMsgKey, layerWidth,
        mainConnectedSlug, leaveCheck, singlePage, connectedType, isRightDrawer,
        setOutputMode, setPageTitle, setPageTitleMsgKey, setLayerType, setLayerTitle, setLayerTitleMsgKey, setLayerWidth,
        setMainConnectedSlug, setLeaveCheck, setSinglePage, setConnectedType,
        restore,
    };
}
