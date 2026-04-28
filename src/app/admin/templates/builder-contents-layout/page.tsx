'use client';

/**
 * Builder 컨텐츠 레이아웃 가이드 페이지
 *
 * 빌더에서 구성되고 렌더러에서 사용되는 모든 컴포넌트를 탭별로 확인한다.
 * - 탭 상태 + 샘플 위젯 데이터만 이 파일에서 정의
 * - 렌더링은 PageLayout / WidgetRenderer 공통 컴포넌트에 위임
 */

import { useState } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import { GridCell } from '@/components/layout/GridCell';
import { WidgetRenderer } from '../make/_shared/components/renderer';
import type {
    SearchWidget,
    SpaceWidget,
    CategoryWidget,
    AnyWidget,
} from '../make/_shared/components/renderer';
import type { TableWidget } from '../make/_shared/components/builder/TableBuilder';
import type { FormWidget } from '../make/_shared/components/builder/FormBuilder';

/* ══════════════════════════════════════════ */
/*  탭 정의                                    */
/* ══════════════════════════════════════════ */

const TABS = [
    { key: 'search',   label: '검색폼' },
    { key: 'table',    label: '데이터테이블' },
    { key: 'form',     label: '폼' },
    { key: 'space',    label: '공간영역' },
    { key: 'category', label: '카테고리' },
] as const;

type TabKey = typeof TABS[number]['key'];

/* ══════════════════════════════════════════ */
/*  샘플 위젯 데이터                           */
/* ══════════════════════════════════════════ */

/** 검색폼 — input / select / date / dateRange / checkbox / radio / button 필드 포함 */
const SAMPLE_SEARCH: SearchWidget = {
    type: 'search',
    widgetId: 'guide-search',
    contentKey: '',
    rows: [
        {
            id: 'r1', cols: 3,
            fields: [
                { id: 'f1', type: 'input',  label: '검색어',   colSpan: 1, placeholder: '검색어를 입력하세요' },
                { id: 'f2', type: 'select', label: '상태',     colSpan: 1, options: ['전체', '진행중', '완료', '취소'] },
                { id: 'f3', type: 'date',   label: '등록일',   colSpan: 1 },
            ],
        },
        {
            id: 'r2', cols: 3,
            fields: [
                { id: 'f4', type: 'dateRange', label: '기간',    colSpan: 2 },
                { id: 'f5', type: 'checkbox',  label: '카테고리', colSpan: 1, options: ['경영', '기획', '계약', '인사'] },
            ],
        },
        {
            id: 'r3', cols: 3,
            fields: [
                { id: 'f6', type: 'radio',  label: '우선순위', colSpan: 1, options: ['높음', '중간', '낮음'] },
                { id: 'f7', type: 'button', label: '유형',     colSpan: 1, options: ['전체', '공지', '일반', '긴급'] },
            ],
        },
    ],
};

/** 검색폼 심플 버전 — displayStyle: 'simple' (한 줄 인라인) */
const SAMPLE_SEARCH_SIMPLE: SearchWidget = {
    type: 'search',
    widgetId: 'guide-search-simple',
    contentKey: '',
    displayStyle: 'simple',
    rows: [
        {
            id: 'sr1', cols: 3,
            fields: [
                { id: 'sf1', type: 'input',  label: '검색어', colSpan: 1, placeholder: '검색어를 입력하세요' },
                { id: 'sf2', type: 'select', label: '상태',   colSpan: 1, options: ['전체', '진행중', '완료', '취소'] },
                { id: 'sf3', type: 'date',   label: '등록일', colSpan: 1 },
            ],
        },
    ],
};

/** 데이터테이블 — text / badge / boolean / actions 컬럼 포함 */
const SAMPLE_TABLE: TableWidget = {
    type: 'table',
    widgetId: 'guide-table',
    contentKey: '',
    connectedSearchIds: [],
    pageSize: 10,
    displayMode: 'pagination',
    columns: [
        {
            id: 'c1', header: 'ID',     accessor: 'id',
            align: 'center', sortable: true,  cellType: 'text', width: 60,
        },
        {
            id: 'c2', header: '제목',   accessor: 'title',
            align: 'left',   sortable: true,  cellType: 'text',
        },
        {
            id: 'c3', header: '상태',   accessor: 'status',
            align: 'center', sortable: false, cellType: 'badge',
            showIcon: true,  badgeShape: 'round',
            cellOptions: [
                { text: '진행중', value: '진행중', color: 'blue' },
                { text: '완료',   value: '완료',   color: 'green' },
                { text: '취소',   value: '취소',   color: 'red' },
            ],
        },
        {
            id: 'c4', header: '공개여부', accessor: 'active',
            align: 'center', sortable: false, cellType: 'boolean',
            trueText: '공개', falseText: '비공개',
        },
        {
            id: 'c5', header: '등록일', accessor: 'createdAt',
            align: 'center', sortable: true,  cellType: 'text',
        },
        {
            id: 'c6', header: '관리',   accessor: '_actions',
            align: 'center', sortable: false, cellType: 'actions',
            actions: ['edit', 'delete'],
        },
    ],
};

/** 폼 — input / select / date / dateRange / radio / checkbox / button / file / image 필드 포함 */
const SAMPLE_FORM: FormWidget = {
    type: 'form',
    widgetId: 'guide-form',
    contentKey: '',
    title: '기본 정보',
    description: '필수 입력 항목은 * 로 표시됩니다.',
    showBorder: true,
    fields: [
        { id: 'ff1',  type: 'input',     label: '이름',           colSpan: 6,  rowSpan: 1, required: true,  placeholder: '이름을 입력하세요' },
        { id: 'ff2',  type: 'input',     label: '이메일',          colSpan: 6,  rowSpan: 1, required: true,  placeholder: 'email@example.com' },
        { id: 'ff3',  type: 'select',    label: '부서',            colSpan: 4,  rowSpan: 1, options: ['개발팀', '기획팀', '디자인팀', '마케팅팀'] },
        { id: 'ff4',  type: 'select',    label: '직급',            colSpan: 4,  rowSpan: 1, options: ['사원', '대리', '과장', '차장', '부장'] },
        { id: 'ff5',  type: 'date',      label: '입사일',          colSpan: 4,  rowSpan: 1 },
        { id: 'ff6',  type: 'dateRange', label: '계약기간',         colSpan: 6,  rowSpan: 1 },
        { id: 'ff7',  type: 'radio',     label: '고용형태',         colSpan: 6,  rowSpan: 1, options: ['정규직', '계약직', '파견직'] },
        { id: 'ff8',  type: 'checkbox',  label: '권한',            colSpan: 6,  rowSpan: 1, options: ['읽기', '쓰기', '삭제', '관리'] },
        { id: 'ff9',  type: 'button',    label: '상태',            colSpan: 6,  rowSpan: 1, options: ['활성', '비활성', '대기', '잠금'] },
        { id: 'ff10', type: 'file',      label: '첨부파일',         colSpan: 12, rowSpan: 1 },
        { id: 'ff11', type: 'image',     label: '프로필 이미지',    colSpan: 12, rowSpan: 1 },
    ],
};

/** 공간영역 — textarea(텍스트) + action-button(버튼) 아이템 포함 */
const SAMPLE_SPACE: SpaceWidget = {
    type: 'space',
    widgetId: 'guide-space',
    align: 'right',
    showBorder: false,
    items: [
        {
            id: 's1', type: 'textarea',      label: '안내 텍스트', colSpan: 1,
            content: '※ 입력 후 저장 버튼을 클릭하세요.',
        },
        { id: 's2', type: 'action-button', label: '취소', colSpan: 1, color: 'gray',  connType: 'close' },
        { id: 's3', type: 'action-button', label: '삭제', colSpan: 1, color: 'red',   connType: 'form', formAction: 'delete' },
        { id: 's4', type: 'action-button', label: '저장', colSpan: 1, color: 'black', connType: 'form', formAction: 'save' },
    ],
};

/** 카테고리 대분류 (depth 1) */
const SAMPLE_CATEGORY_1: CategoryWidget = {
    type: 'category', widgetId: 'guide-category-1', contentKey: '', dbSlug: '',
    depth: 1, label: '대분류', allowCreate: true, allowEdit: true, allowDelete: true, showBorder: true,
};

/** 카테고리 중분류 (depth 2) */
const SAMPLE_CATEGORY_2: CategoryWidget = {
    type: 'category', widgetId: 'guide-category-2', contentKey: '', dbSlug: '',
    depth: 2, label: '중분류', parentWidgetId: 'guide-category-1',
    allowCreate: true, allowEdit: true, allowDelete: true, showBorder: true,
};

/** 카테고리 소분류 (depth 3) */
const SAMPLE_CATEGORY_3: CategoryWidget = {
    type: 'category', widgetId: 'guide-category-3', contentKey: '', dbSlug: '',
    depth: 3, label: '소분류', parentWidgetId: 'guide-category-2',
    allowCreate: true, allowEdit: true, allowDelete: true, showBorder: true,
};

/** 카테고리 세분류 (depth 4) */
const SAMPLE_CATEGORY_4: CategoryWidget = {
    type: 'category', widgetId: 'guide-category-4', contentKey: '', dbSlug: '',
    depth: 4, label: '세분류', parentWidgetId: 'guide-category-3',
    allowCreate: true, allowEdit: true, allowDelete: true, showBorder: true,
};

/* ══════════════════════════════════════════ */
/*  탭별 위젯 + 그리드 크기 매핑              */
/* ══════════════════════════════════════════ */

/* 탭별 위젯 배열 — 순서대로 PageLayout 그리드에 배치됨 */
const TAB_CONFIG: Record<TabKey, { widget: AnyWidget; colSpan: number; rowSpan: number }[]> = {
    search: [
        { widget: SAMPLE_SEARCH,        colSpan: 12, rowSpan: 4 },
        { widget: SAMPLE_SEARCH_SIMPLE, colSpan: 12, rowSpan: 1 },
    ],
    table:    [{ widget: SAMPLE_TABLE,    colSpan: 12, rowSpan: 6 }],
    form:     [{ widget: SAMPLE_FORM,     colSpan: 12, rowSpan: 7 }],
    space:    [{ widget: SAMPLE_SPACE,    colSpan: 12, rowSpan: 2 }],
    category: [
        { widget: SAMPLE_CATEGORY_1, colSpan: 3, rowSpan: 8 },
        { widget: SAMPLE_CATEGORY_2, colSpan: 3, rowSpan: 8 },
        { widget: SAMPLE_CATEGORY_3, colSpan: 3, rowSpan: 8 },
        { widget: SAMPLE_CATEGORY_4, colSpan: 3, rowSpan: 8 },
    ],
};

/* ══════════════════════════════════════════ */
/*  메인 컴포넌트                               */
/* ══════════════════════════════════════════ */

export default function BuilderContentsLayoutPage() {
    const [activeTab, setActiveTab] = useState<TabKey>('search');

    return (
        <div className="space-y-4">

            {/* 페이지 헤더 */}
            <div>
                <h1 className="text-lg font-bold text-slate-900">Builder 컨텐츠 레이아웃</h1>
            </div>

            {/* 탭 네비게이션 */}
            <div className="flex gap-1 border-b border-slate-200">
                {TABS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                            activeTab === tab.key
                                ? 'border-slate-900 text-slate-900'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* 캔버스 — PageLayout: 격자 처음부터 표시 (mode="preview") */}
            <PageLayout mode="preview">
                {TAB_CONFIG[activeTab].map((item, idx) => (
                    /* GridCell — colSpan/rowSpan/height/overflow 일괄 관리 */
                    <GridCell key={idx} colSpan={item.colSpan} rowSpan={item.rowSpan}>
                        <WidgetRenderer
                            mode="preview"
                            widget={item.widget}
                            contentColSpan={item.colSpan}
                        />
                    </GridCell>
                ))}
            </PageLayout>

        </div>
    );
}
