/**
 * 템플릿 저장/조회 공통 API 함수
 * - 모든 빌더(WIDGET, QUICK_LIST, QUICK_DETAIL)에서 동일한 방식으로 저장
 * - configJson 구조를 { widgetItems, ...extra } 로 통일
 */
import api from '@/lib/api';
import { TemplateItem } from './types';
import type { ConnectedType } from './hooks/useOutputMode';

/** 위젯 컨텐츠 아이템 (그리드 셀 내부 배치 단위) */
export interface PageContentItem {
    id: string;
    colSpan: number;
    rowSpan: number;
    widget: Record<string, unknown>;
}

/** 위젯 그리드 아이템 (12칸 그리드의 한 셀) */
export interface PageWidgetItem {
    id: string;
    colSpan: number;
    rowSpan: number;
    contents: PageContentItem[];
}

/** 팝업 템플릿 설정 파싱 결과 */
export interface TemplatePopupConfig {
    outputMode:       'page' | 'layerpopup';
    layerType?:       'center' | 'right';
    layerTitle?:      string;
    layerTitleMsgKey?: string;
    layerWidth?:      'sm' | 'md' | 'lg' | 'xl';
    /** 페이지 레벨 메인 연결 slug — 탭 서브페이지 저장 시 우선순위 판단에 사용 */
    mainConnectedSlug?: string;
    /** 페이지 레벨 메인 연결 타입 — 'entity' | 'data'면 mainConnectedSlug가 Slug Entity REST API를 가리킨다 */
    connectedType?: ConnectedType;
    /** 운영페이지 이탈 시 변경사항 확인 여부 */
    leaveCheck?: boolean;
    /** 페이지 레벨 연결 Slug Entity ID */
    slugEntityId?: number;
    /** 위젯 목록 — PageWidgetItem[] 구조 (PageGridRenderer에 바로 사용) */
    widgetItems: PageWidgetItem[];
}

/**
 * slug로 템플릿 configJson 조회 후 TemplatePopupConfig로 파싱
 * - 신규 widgetItems 구조: PageWidgetItem[] 그대로 반환 (flat 변환 없음)
 * - 구형 formContent/spaceContent 구조도 PageWidgetItem[]으로 자동 변환 (하위 호환)
 *
 * @param slug 템플릿 slug
 */
export async function fetchTemplateConfig(slug: string): Promise<TemplatePopupConfig> {
    const res = await api.get(`/page-templates/by-slug/${slug}`);
    const raw = JSON.parse(res.data.configJson);

    let widgetItems: PageWidgetItem[] = [];

    if (raw.widgetItems) {
        /* 신규 widgetItems 구조 — PageGridRenderer가 그대로 사용할 수 있는 구조 */
        widgetItems = raw.widgetItems as PageWidgetItem[];
    } else {
        /* 구형 formContent/spaceContent 포맷 → PageWidgetItem[]으로 변환 */
        if (raw.formContent?.widget) {
            widgetItems.push({
                id:       raw.formContent.id      ?? 'form',
                colSpan:  raw.formContent.colSpan ?? 12,
                rowSpan:  raw.formContent.rowSpan ?? 3,
                contents: [{
                    id:      raw.formContent.id      ?? 'form',
                    colSpan: raw.formContent.colSpan ?? 12,
                    rowSpan: raw.formContent.rowSpan ?? 3,
                    widget:  raw.formContent.widget,
                }],
            });
        }
        if (raw.spaceContent?.widget) {
            widgetItems.push({
                id:       raw.spaceContent.id      ?? 'space',
                colSpan:  raw.spaceContent.colSpan ?? 12,
                rowSpan:  raw.spaceContent.rowSpan ?? 1,
                contents: [{
                    id:      raw.spaceContent.id      ?? 'space',
                    colSpan: raw.spaceContent.colSpan ?? 12,
                    rowSpan: raw.spaceContent.rowSpan ?? 1,
                    widget:  raw.spaceContent.widget,
                }],
            });
        }
    }

    return {
        outputMode:        raw.outputMode        || 'page',
        layerType:         raw.layerType         || 'center',
        layerTitle:        raw.layerTitle        || '',
        layerTitleMsgKey:  raw.layerTitleMsgKey  || '',
        layerWidth:        raw.layerWidth        || 'md',
        mainConnectedSlug: (raw.mainConnectedSlug as string) || undefined,
        connectedType:     (raw.connectedType as ConnectedType) || undefined,
        leaveCheck:        (raw.leaveCheck as boolean)       ?? false,
        slugEntityId:      (raw.slugEntityId as number)      || undefined,
        widgetItems,
    };
}

/**
 * 템플릿 저장 공통 함수
 * @param id - 있으면 수정(PUT), 없으면 신규(POST)
 * @param name - 템플릿 이름
 * @param slug - 고유 슬러그
 * @param description - 설명
 * @param templateType - 'PAGE' | 'QUICK_LIST' | 'QUICK_DETAIL' 등
 * @param widgetItems - 모든 빌더가 통일된 widgetItems 구조로 전달
 * @param extra - 추가 메타 (outputMode, layerType 등) — configJson에 병합
 */
export async function saveTemplate({
    id,
    name,
    slug,
    description,
    templateType,
    widgetItems,
    extra = {},
}: {
    id?: number | null;
    name: string;
    slug: string;
    description: string;
    templateType: string;
    widgetItems: PageWidgetItem[];
    extra?: Record<string, unknown>;
}): Promise<TemplateItem> {
    const configJson = JSON.stringify({ widgetItems, ...extra });
    const body = { name, slug, description, configJson, templateType };

    if (id) {
        const res = await api.put(`/page-templates/${id}`, body);
        return res.data;
    } else {
        const res = await api.post('/page-templates', body);
        return res.data;
    }
}
