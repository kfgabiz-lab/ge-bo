/**
 * 템플릿 저장 공통 API 함수
 * - 모든 빌더(WIDGET, QUICK_LIST, QUICK_DETAIL)에서 동일한 방식으로 저장
 * - configJson 구조를 { widgetItems, ...extra } 로 통일
 */
import api from '@/lib/api';
import { TemplateItem } from './types';

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
    colSpan: number;  // 12칸 기준 가로 점유
    rowSpan: number;  // 80px 단위 세로 높이
    contents: PageContentItem[];
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
