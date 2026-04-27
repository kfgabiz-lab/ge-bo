'use client';

import React, { useState } from 'react';
import { SearchForm, SearchRow, SearchField } from '@/components/search';
import { FieldRenderer } from '../make/_shared/components/renderer/FieldRenderer';
import { SearchRenderer } from '../make/_shared/components/renderer/SearchRenderer';
import type { SearchRowConfig } from '../make/_shared/types';

/** 섹션 래퍼 — 제목 + 설명 표시 */
function Section({ title, description, children }: {
    title: string;
    description?: string;
    children: React.ReactNode;
}) {
    return (
        <section className="mb-8">
            <div className="mb-3 pb-2 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-900">{title}</h2>
                {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
            </div>
            {children}
        </section>
    );
}

export default function SearchLayoutPage() {
    /* ── 일반/심플 방식 공통 필드 값 상태 ── */
    const [values, setValues] = useState<Record<string, string>>({});
    const setValue = (id: string, v: string) => setValues(prev => ({ ...prev, [id]: v }));

    /* ── 미지원 패턴: 칩 스타일 체크박스 상태 ── */
    const chipOptions = ['전체', '진행 중', '완료', '대기', '취소'];
    const [chipChecked, setChipChecked] = useState<string[]>(['전체']);
    const toggleChip = (opt: string) =>
        setChipChecked(prev => prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt]);

    /* ── 심플 방식 rows 설정 ── */
    const simpleRows: SearchRowConfig[] = [
        {
            id: 'simple-row1',
            cols: 4,
            fields: [
                { id: 'sq-input',  type: 'input',  label: '검색어',   colSpan: 2, placeholder: '제목 또는 내용' },
                { id: 'sq-select', type: 'select', label: '카테고리', colSpan: 1, options: ['공지사항:notice', 'FAQ:faq', '이벤트:event'], placeholder: '전체' },
                { id: 'sq-date',   type: 'date',   label: '등록일',   colSpan: 1 },
            ],
        },
    ];

    return (
        <div className="h-full flex flex-col">

            {/* ── 페이지 헤더 ── */}
            <div className="mb-6">
                <h1 className="text-xl font-bold text-slate-900">검색 템플릿</h1>
                <p className="text-sm text-slate-500 mt-0.5">SearchForm + SearchRow + SearchField + FieldRenderer 공통 컴포넌트 기반</p>
            </div>

            <div className="flex-1 space-y-2">

                {/* ════════════════════════════════════════ */}
                {/* 1. 일반 방식 — FieldRenderer 전체 타입  */}
                {/* ════════════════════════════════════════ */}
                <Section
                    title="일반 방식 (Standard)"
                    description="SearchForm + SearchRow + SearchField + FieldRenderer — 지원하는 모든 필드 타입 예시"
                >
                    <SearchForm
                        onSearch={() => {}}
                        onReset={() => setValues({})}
                    >
                        {/* 1행: input / select / date */}
                        <SearchRow cols={4}>
                            <SearchField label="텍스트 입력" colSpan={2}>
                                <FieldRenderer
                                    mode="live"
                                    field={{ id: 's-input', type: 'input', label: '텍스트 입력', colSpan: 2, placeholder: '검색어를 입력하세요' }}
                                    value={values['s-input']}
                                    onChange={v => setValue('s-input', v)}
                                />
                            </SearchField>
                            <SearchField label="셀렉트">
                                <FieldRenderer
                                    mode="live"
                                    field={{ id: 's-select', type: 'select', label: '셀렉트', colSpan: 1, options: ['공지사항:notice', 'FAQ:faq', '이벤트:event'], placeholder: '전체' }}
                                    value={values['s-select']}
                                    onChange={v => setValue('s-select', v)}
                                />
                            </SearchField>
                            <SearchField label="날짜">
                                <FieldRenderer
                                    mode="live"
                                    field={{ id: 's-date', type: 'date', label: '날짜', colSpan: 1 }}
                                    value={values['s-date']}
                                    onChange={v => setValue('s-date', v)}
                                />
                            </SearchField>
                        </SearchRow>

                        {/* 2행: dateRange / button (빠른 선택) */}
                        <SearchRow cols={4}>
                            <SearchField label="기간 범위 ~ 종료일" colSpan={2}>
                                <FieldRenderer
                                    mode="live"
                                    field={{ id: 's-daterange', type: 'dateRange', label: '기간 범위', colSpan: 2 }}
                                    value={values['s-daterange']}
                                    onChange={v => setValue('s-daterange', v)}
                                />
                            </SearchField>
                            <SearchField label="빠른 선택" colSpan={2}>
                                <FieldRenderer
                                    mode="live"
                                    field={{ id: 's-button', type: 'button', label: '빠른 선택', colSpan: 2, options: ['오늘:today', '7일:7d', '30일:30d', '90일:90d', '전체:all'] }}
                                    value={values['s-button']}
                                    onChange={v => setValue('s-button', v)}
                                />
                            </SearchField>
                        </SearchRow>

                        {/* 3행: radio / checkbox */}
                        <SearchRow cols={4}>
                            <SearchField label="라디오" colSpan={2}>
                                <FieldRenderer
                                    mode="live"
                                    field={{ id: 's-radio', type: 'radio', label: '라디오', colSpan: 2, options: ['전체:all', '활성:active', '비활성:inactive', '대기:pending'] }}
                                    value={values['s-radio']}
                                    onChange={v => setValue('s-radio', v)}
                                />
                            </SearchField>
                            <SearchField label="체크박스" colSpan={2}>
                                <FieldRenderer
                                    mode="live"
                                    field={{ id: 's-checkbox', type: 'checkbox', label: '체크박스', colSpan: 2, options: ['개발팀:dev', '기획팀:plan', '디자인팀:design', '마케팅팀:mkt'] }}
                                    value={values['s-checkbox']}
                                    onChange={v => setValue('s-checkbox', v)}
                                />
                            </SearchField>
                        </SearchRow>

                        {/* 4행: action-button */}
                        <SearchRow cols={4}>
                            <SearchField label="액션버튼" colSpan={1}>
                                <FieldRenderer
                                    mode="live"
                                    field={{ id: 's-actionbtn', type: 'action-button', label: '등록', colSpan: 1, color: 'black', textColor: 'white' }}
                                />
                            </SearchField>
                        </SearchRow>
                    </SearchForm>
                </Section>

                {/* ════════════════════════════════════════ */}
                {/* 2. 심플 방식                            */}
                {/* ════════════════════════════════════════ */}
                <Section
                    title="심플 방식 (Simple)"
                    description="SearchRenderer displayStyle='simple' — 한 줄 인라인 레이아웃 + 우측 검색/초기화 버튼"
                >
                    {/* h-[56px]: 심플 방식 고정 높이 (SearchRenderer가 h-full로 채움) */}
                    <div className="h-[56px]">
                        <SearchRenderer
                            mode="live"
                            displayStyle="simple"
                            rows={simpleRows}
                            values={values}
                            onChangeValues={(id, v) => setValue(id, v)}
                            onSearch={() => {}}
                            onReset={() => setValues({})}
                        />
                    </div>
                </Section>

                {/* ════════════════════════════════════════ */}
                {/* 3. 공통 컴포넌트 미지원 패턴 (참고용)  */}
                {/* ════════════════════════════════════════ */}
                <Section
                    title="미지원 패턴 (참고용)"
                    description="FieldRenderer가 지원하지 않는 UI 패턴 — 공통 컴포넌트 확장이 필요한 경우 참고"
                >
                    <SearchForm onSearch={() => {}} onReset={() => setChipChecked(['전체'])}>

                        {/* 칩 스타일 체크박스 — FieldRenderer checkbox와 달리 rounded-full 버튼 형태 */}
                        <SearchRow cols={4}>
                            <SearchField label="상태 (칩 스타일 체크박스)" colSpan={4}>
                                <div className="flex items-center gap-2 flex-wrap py-1">
                                    {chipOptions.map(opt => (
                                        <button
                                            key={opt}
                                            type="button"
                                            onClick={() => toggleChip(opt)}
                                            className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                                                chipChecked.includes(opt)
                                                    ? 'bg-slate-900 text-white border-slate-900'
                                                    : 'text-slate-500 border-slate-200 hover:bg-slate-100'
                                            }`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </SearchField>
                        </SearchRow>

                        {/* Segmented 라디오 — FieldRenderer radio와 달리 inline-flex 버튼 그룹 형태 */}
                        <SearchRow cols={4}>
                            <SearchField label="기간 (Segmented 라디오)" colSpan={2}>
                                <div className="inline-flex items-center rounded-md border border-slate-200 overflow-hidden">
                                    {['일간', '주간', '월간', '연간'].map((label, i) => (
                                        <label key={label} className="cursor-pointer">
                                            <input type="radio" name="period-seg" className="peer sr-only" defaultChecked={i === 2} />
                                            <span className="inline-flex items-center px-4 py-2 text-sm font-medium text-slate-500 border-r border-slate-200 last:border-r-0 peer-checked:bg-slate-900 peer-checked:text-white transition-all hover:bg-slate-100">
                                                {label}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </SearchField>
                        </SearchRow>

                    </SearchForm>
                </Section>

            </div>
        </div>
    );
}
