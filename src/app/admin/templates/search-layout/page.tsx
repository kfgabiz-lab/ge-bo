'use client';

import React, { useState } from 'react';
import { Search, X, ChevronDown, Calendar, Copy, Check } from 'lucide-react';
import { SearchForm, SearchRow, SearchField } from '@/components/search';

export default function SearchLayoutPage() {
    /* ── 인라인 검색 바 상태 ── */
    const [inlineSearch, setInlineSearch] = useState('');

    /* ── 체크박스 상태 ── */
    const checkOptions = ['개발팀', '기획팀', '디자인팀', '마케팅팀', '영업팀'];
    const [checkedItems, setCheckedItems] = useState<string[]>([]);
    const isAllChecked = checkedItems.length === checkOptions.length;

    const toggleCheck = (item: string) => {
        setCheckedItems(prev =>
            prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
        );
    };
    const toggleAllCheck = () => {
        setCheckedItems(isAllChecked ? [] : [...checkOptions]);
    };

    /* ── 라디오 상태 ── */
    const [radioValue, setRadioValue] = useState('all');

    /* ── 섹션 래퍼 (코드 복사 기능 포함) ── */
    const Section = ({ title, description, code, children }: { title: string; description?: string; code?: string; children: React.ReactNode }) => {
        const [showCode, setShowCode] = useState(false);
        const [copied, setCopied] = useState(false);

        const handleCopy = async () => {
            if (!code) return;
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        };

        return (
            <section className="mb-8">
                <div className="mb-4 pb-2 border-b border-slate-200 flex items-end justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
                        {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
                    </div>
                    {code && (
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setShowCode(!showCode)}
                                className={`px-2.5 py-1 text-[11px] font-medium rounded-md border transition-all ${showCode ? 'bg-slate-900 text-white border-slate-900' : 'text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                            >
                                {showCode ? '미리보기' : '코드'}
                            </button>
                            <button
                                onClick={handleCopy}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-500 border border-slate-200 rounded-md hover:bg-slate-50 transition-all"
                            >
                                {copied ? <><Check className="w-3 h-3 text-emerald-500" />복사됨</> : <><Copy className="w-3 h-3" />복사</>}
                            </button>
                        </div>
                    )}
                </div>
                {showCode && code ? (
                    <div className="mb-3 bg-[#161929] rounded-md p-4 overflow-x-auto">
                        <pre className="text-xs text-slate-300 font-mono whitespace-pre">{code}</pre>
                    </div>
                ) : (
                    children
                )}
            </section>
        );
    };

    return (
        <div className="h-full flex flex-col">

            {/* ── 페이지 헤더 ── */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">검색 템플릿</h1>
                    <p className="text-sm text-slate-500 mt-0.5">SearchForm + SearchRow + SearchField 공통 컴포넌트 기반</p>
                </div>
            </div>

            <div className="flex-1 space-y-2">

                {/* ════════════════════════════════════════ */}
                {/* 1. 인라인 검색 바 */}
                {/* ════════════════════════════════════════ */}
                <Section
                    title="인라인 검색 바"
                    description="한 줄에 검색어 + 셀렉트 + 버튼 배치. hideActions로 자체 버튼 사용"
                    code={`<SearchForm hideActions>
  <SearchRow cols={4}>
    <SearchField label="검색어" colSpan={2}>
      <input ... />
    </SearchField>
    <SearchField label="카테고리">
      <select ... />
    </SearchField>
    <SearchField>  {/* 버튼 직접 배치 */}
      <button>검색</button>
    </SearchField>
  </SearchRow>
</SearchForm>`}
                >
                    <SearchForm hideActions>
                        <SearchRow cols={4}>
                            <SearchField label="검색어" colSpan={2}>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="검색어를 입력하세요"
                                        value={inlineSearch}
                                        onChange={(e) => setInlineSearch(e.target.value)}
                                        className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                                    />
                                    {inlineSearch && (
                                        <button onClick={() => setInlineSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </SearchField>
                            <SearchField label="카테고리">
                                <div className="relative">
                                    <select className="w-full appearance-none border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white">
                                        <option value="">전체</option>
                                        <option>공지사항</option>
                                        <option>FAQ</option>
                                        <option>이벤트</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            </SearchField>
                            <SearchField>
                                {/* 라벨 높이만큼 여백 맞춤 */}
                                <div className="pt-[22px]">
                                    <button className="w-full px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-md shadow-sm shadow-sm transition-all">
                                        검색
                                    </button>
                                </div>
                            </SearchField>
                        </SearchRow>
                    </SearchForm>
                </Section>

                {/* ════════════════════════════════════════ */}
                {/* 2. 확장형 상세 검색 (4단 통일) */}
                {/* ════════════════════════════════════════ */}
                <Section
                    title="확장형 상세 검색"
                    description="collapsible로 접기/펼치기. 4단 그리드 통일, colSpan으로 넓은 필드 처리"
                    code={`<SearchForm collapsible onSearch={...} onReset={...}>
  <SearchRow cols={4}>
    <SearchField label="검색어">...</SearchField>
    <SearchField label="카테고리">...</SearchField>
    <SearchField label="상태">...</SearchField>
    <SearchField label="작성자">...</SearchField>
  </SearchRow>
  <SearchRow cols={4}>
    <SearchField label="등록 기간" colSpan={2}>...</SearchField>
    <SearchField label="빠른 선택" colSpan={2}>...</SearchField>
  </SearchRow>
</SearchForm>`}
                >
                    <SearchForm collapsible onSearch={() => {}} onReset={() => {}}>
                        <SearchRow cols={4}>
                            <SearchField label="검색어">
                                <input type="text" placeholder="제목 또는 내용" className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all" />
                            </SearchField>
                            <SearchField label="카테고리">
                                <div className="relative">
                                    <select className="w-full appearance-none border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white">
                                        <option value="">전체</option>
                                        <option>공지사항</option>
                                        <option>FAQ</option>
                                        <option>이벤트</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            </SearchField>
                            <SearchField label="상태">
                                <div className="relative">
                                    <select className="w-full appearance-none border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white">
                                        <option value="">전체</option>
                                        <option>발행</option>
                                        <option>임시저장</option>
                                        <option>숨김</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            </SearchField>
                            <SearchField label="작성자">
                                <input type="text" placeholder="이름" className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all" />
                            </SearchField>
                        </SearchRow>
                        <SearchRow cols={4}>
                            <SearchField label="등록 기간" colSpan={2}>
                                <div className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input type="date" className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all" />
                                    </div>
                                    <span className="text-sm text-slate-400">~</span>
                                    <div className="relative flex-1">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input type="date" className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all" />
                                    </div>
                                </div>
                            </SearchField>
                            <SearchField label="빠른 선택" colSpan={2}>
                                <div className="flex items-center gap-1.5">
                                    {['오늘', '1주', '1개월', '3개월', '전체'].map((label) => (
                                        <button key={label} className="px-2.5 py-2 text-xs font-medium text-slate-500 border border-slate-200 rounded-md hover:bg-slate-100 hover:text-slate-900 transition-all">
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </SearchField>
                        </SearchRow>
                    </SearchForm>
                </Section>

                {/* ════════════════════════════════════════ */}
                {/* 3. 체크박스 필터 */}
                {/* ════════════════════════════════════════ */}
                <Section
                    title="체크박스 필터"
                    description="SearchField 안에 체크박스 그룹을 넣는 패턴"
                    code={`<SearchForm onSearch={...} onReset={...}>
  <SearchRow cols={4}>
    <SearchField label="부서" colSpan={4}>
      <div className="flex items-center gap-4">
        <label>전체 <input type="checkbox" /></label>
        <label>개발팀 <input type="checkbox" /></label>
        ...
      </div>
    </SearchField>
  </SearchRow>
</SearchForm>`}
                >
                    <SearchForm onSearch={() => {}} onReset={() => { setCheckedItems([]); }}>
                        {/* 가로 체크박스 (전체 선택 포함) */}
                        <SearchRow cols={4}>
                            <SearchField label="부서 (가로 배치)" colSpan={4}>
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={isAllChecked} onChange={toggleAllCheck} className="w-4 h-4 rounded border-slate-400 text-slate-900 focus:ring-slate-900/10 focus:ring-offset-0 cursor-pointer" />
                                        <span className="text-sm font-medium text-slate-900">전체</span>
                                    </label>
                                    <span className="w-px h-4 bg-slate-200" />
                                    {checkOptions.map((option) => (
                                        <label key={option} className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={checkedItems.includes(option)} onChange={() => toggleCheck(option)} className="w-4 h-4 rounded border-slate-400 text-slate-900 focus:ring-slate-900/10 focus:ring-offset-0 cursor-pointer" />
                                            <span className="text-sm text-slate-700">{option}</span>
                                        </label>
                                    ))}
                                </div>
                            </SearchField>
                        </SearchRow>
                        {/* 칩 스타일 체크박스 */}
                        <SearchRow cols={4}>
                            <SearchField label="상태 (칩 스타일)" colSpan={4}>
                                <div className="flex items-center gap-2 flex-wrap">
                                    {['전체', '진행 중', '완료', '대기', '취소'].map((option, i) => (
                                        <label key={option} className="cursor-pointer">
                                            <input type="checkbox" className="peer sr-only" defaultChecked={i === 0} />
                                            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm border border-slate-200 text-slate-500 peer-checked:bg-slate-900 peer-checked:text-white peer-checked:border-slate-900 transition-all hover:bg-slate-100">
                                                {option}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </SearchField>
                        </SearchRow>
                    </SearchForm>
                </Section>

                {/* ════════════════════════════════════════ */}
                {/* 4. 라디오 버튼 필터 */}
                {/* ════════════════════════════════════════ */}
                <Section
                    title="라디오 버튼 필터"
                    description="SearchField 안에 라디오 그룹을 넣는 패턴"
                    code={`<SearchForm onSearch={...} onReset={...}>
  <SearchRow cols={4}>
    <SearchField label="상태" colSpan={2}>
      <div className="flex items-center gap-4">
        <label><input type="radio" /> 전체</label>
        <label><input type="radio" /> 활성</label>
      </div>
    </SearchField>
    <SearchField label="기간" colSpan={2}>
      {/* 버튼형 Segmented Control */}
    </SearchField>
  </SearchRow>
</SearchForm>`}
                >
                    <SearchForm onSearch={() => {}} onReset={() => { setRadioValue('all'); }}>
                        <SearchRow cols={4}>
                            {/* 가로 라디오 */}
                            <SearchField label="상태 (가로 배치)" colSpan={2}>
                                <div className="flex items-center gap-4">
                                    {[
                                        { value: 'all', label: '전체' },
                                        { value: 'active', label: '활성' },
                                        { value: 'inactive', label: '비활성' },
                                        { value: 'pending', label: '대기' },
                                    ].map((option) => (
                                        <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" name="status-demo" value={option.value} checked={radioValue === option.value} onChange={(e) => setRadioValue(e.target.value)} className="w-4 h-4 border-slate-400 text-slate-900 focus:ring-slate-900/10 focus:ring-offset-0 cursor-pointer" />
                                            <span className="text-sm text-slate-700">{option.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </SearchField>
                            {/* 버튼형 라디오 (Segmented) */}
                            <SearchField label="기간 (Segmented)" colSpan={2}>
                                <div className="inline-flex items-center rounded-md border border-slate-200 overflow-hidden">
                                    {['일간', '주간', '월간', '연간'].map((label, i) => (
                                        <label key={label} className="cursor-pointer">
                                            <input type="radio" name="period-demo" className="peer sr-only" defaultChecked={i === 2} />
                                            <span className="inline-flex items-center px-4 py-2 text-sm font-medium text-slate-500 border-r border-slate-200 last:border-r-0 peer-checked:bg-slate-900 peer-checked:text-white transition-all hover:bg-slate-100">
                                                {label}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </SearchField>
                        </SearchRow>
                        {/* 설명 포함 세로 라디오 */}
                        <SearchRow cols={4}>
                            <SearchField label="검색 대상 (세로 배치, 설명 포함)" colSpan={4}>
                                <div className="flex items-start gap-6">
                                    {[
                                        { value: 'title', label: '제목', desc: '제목에서만 검색' },
                                        { value: 'content', label: '내용', desc: '본문에서 검색' },
                                        { value: 'author', label: '작성자', desc: '작성자 이름으로 검색' },
                                        { value: 'all-field', label: '전체', desc: '모든 필드에서 검색' },
                                    ].map((option) => (
                                        <label key={option.value} className="flex items-start gap-2 cursor-pointer">
                                            <input type="radio" name="search-target-demo" defaultChecked={option.value === 'all-field'} className="w-4 h-4 mt-0.5 border-slate-400 text-slate-900 focus:ring-slate-900/10 focus:ring-offset-0 cursor-pointer" />
                                            <div>
                                                <span className="text-sm font-medium text-slate-700">{option.label}</span>
                                                <p className="text-xs text-slate-400">{option.desc}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </SearchField>
                        </SearchRow>
                    </SearchForm>
                </Section>

                {/* ════════════════════════════════════════ */}
                {/* 5. 날짜 선택 패턴 */}
                {/* ════════════════════════════════════════ */}
                <Section
                    title="날짜 선택 패턴"
                    description="기간 범위, 빠른 선택 버튼, 단일 날짜를 SearchField에 넣는 패턴"
                    code={`<SearchForm onSearch={...} onReset={...}>
  <SearchRow cols={4}>
    {/* 기간 범위 (colSpan={2}) */}
    <SearchField label="기간 범위" colSpan={2}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="date" className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md text-sm ..." />
        </div>
        <span className="text-sm text-slate-400">~</span>
        <div className="relative flex-1">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="date" className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md text-sm ..." />
        </div>
      </div>
    </SearchField>
    {/* 빠른 선택 버튼 */}
    <SearchField label="빠른 선택" colSpan={2}>
      <div className="flex items-center gap-1.5">
        {['오늘', '어제', '7일', '30일', '90일', '전체'].map(label => (
          <button key={label} className="px-3 py-2 text-xs font-medium rounded-md border ...">
            {label}
          </button>
        ))}
      </div>
    </SearchField>
  </SearchRow>
  <SearchRow cols={4}>
    {/* 단일 날짜 */}
    <SearchField label="단일 날짜">
      <div className="relative">
        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="date" className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md text-sm ..." />
      </div>
    </SearchField>
  </SearchRow>
</SearchForm>`}
                >
                    <SearchForm onSearch={() => {}} onReset={() => {}}>
                        <SearchRow cols={4}>
                            <SearchField label="기간 범위" colSpan={2}>
                                <div className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input type="date" className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all" />
                                    </div>
                                    <span className="text-sm text-slate-400">~</span>
                                    <div className="relative flex-1">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input type="date" className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all" />
                                    </div>
                                </div>
                            </SearchField>
                            <SearchField label="빠른 선택" colSpan={2}>
                                <div className="flex items-center gap-1.5">
                                    {[
                                        { label: '오늘', active: false },
                                        { label: '어제', active: false },
                                        { label: '7일', active: true },
                                        { label: '30일', active: false },
                                        { label: '90일', active: false },
                                        { label: '전체', active: false },
                                    ].map((btn) => (
                                        <button
                                            key={btn.label}
                                            className={`px-3 py-2 text-xs font-medium rounded-md transition-all ${
                                                btn.active
                                                    ? 'bg-slate-900 text-white'
                                                    : 'border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                                            }`}
                                        >
                                            {btn.label}
                                        </button>
                                    ))}
                                </div>
                            </SearchField>
                        </SearchRow>
                        <SearchRow cols={4}>
                            <SearchField label="단일 날짜">
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input type="date" className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all" />
                                </div>
                            </SearchField>
                        </SearchRow>
                    </SearchForm>
                </Section>

                {/* ════════════════════════════════════════ */}
                {/* 6. 종합 실전 예시 */}
                {/* ════════════════════════════════════════ */}
                <Section
                    title="종합 실전 예시"
                    description="Input + Select + Radio + Date + Checkbox를 4단 그리드에 혼합 배치"
                    code={`<SearchForm collapsible onSearch={handleSearch} onReset={handleReset}>
  {/* 1행: 텍스트 + 셀렉트 */}
  <SearchRow cols={4}>
    <SearchField label="검색어">
      <input type="text" placeholder="제목/내용" className="..." />
    </SearchField>
    <SearchField label="카테고리">
      <div className="relative">
        <select className="..."><option value="">전체</option>...</select>
        <ChevronDown className="..." />
      </div>
    </SearchField>
    <SearchField label="상태">
      <div className="relative">
        <select className="..."><option value="">전체</option>...</select>
        <ChevronDown className="..." />
      </div>
    </SearchField>
    <SearchField label="작성자">
      <input type="text" placeholder="이름" className="..." />
    </SearchField>
  </SearchRow>
  {/* 2행: 날짜 + 라디오 */}
  <SearchRow cols={4}>
    <SearchField label="등록 기간" colSpan={2}>
      <div className="flex items-center gap-2">
        <input type="date" className="flex-1 ..." />
        <span className="text-sm text-slate-400">~</span>
        <input type="date" className="flex-1 ..." />
      </div>
    </SearchField>
    <SearchField label="노출 여부" colSpan={2}>
      <div className="flex items-center gap-4 pt-0.5">
        {['전체', '노출', '비노출'].map(label => (
          <label key={label} className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="exposure" className="..." />
            <span className="text-sm text-slate-700">{label}</span>
          </label>
        ))}
      </div>
    </SearchField>
  </SearchRow>
  {/* 3행: 체크박스 */}
  <SearchRow cols={4}>
    <SearchField label="부서 필터" colSpan={4}>
      <div className="flex items-center gap-4">
        {['전체', '개발팀', '기획팀', '디자인팀'].map(option => (
          <label key={option} className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="..." />
            <span className="text-sm text-slate-700">{option}</span>
          </label>
        ))}
      </div>
    </SearchField>
  </SearchRow>
</SearchForm>`}
                >
                    <SearchForm collapsible onSearch={() => {}} onReset={() => {}}>
                        {/* 1행: 텍스트 + 셀렉트 */}
                        <SearchRow cols={4}>
                            <SearchField label="검색어">
                                <input type="text" placeholder="제목/내용" className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all" />
                            </SearchField>
                            <SearchField label="카테고리">
                                <div className="relative">
                                    <select className="w-full appearance-none border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white">
                                        <option value="">전체</option>
                                        <option>공지사항</option>
                                        <option>FAQ</option>
                                        <option>이벤트</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            </SearchField>
                            <SearchField label="상태">
                                <div className="relative">
                                    <select className="w-full appearance-none border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white">
                                        <option value="">전체</option>
                                        <option>발행</option>
                                        <option>임시저장</option>
                                        <option>숨김</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            </SearchField>
                            <SearchField label="작성자">
                                <input type="text" placeholder="이름" className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all" />
                            </SearchField>
                        </SearchRow>
                        {/* 2행: 날짜 + 라디오 */}
                        <SearchRow cols={4}>
                            <SearchField label="등록 기간" colSpan={2}>
                                <div className="flex items-center gap-2">
                                    <input type="date" className="flex-1 border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all" />
                                    <span className="text-sm text-slate-400">~</span>
                                    <input type="date" className="flex-1 border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all" />
                                </div>
                            </SearchField>
                            <SearchField label="노출 여부" colSpan={2}>
                                <div className="flex items-center gap-4 pt-0.5">
                                    {['전체', '노출', '비노출'].map((label, i) => (
                                        <label key={label} className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" name="exposure-demo" defaultChecked={i === 0} className="w-4 h-4 border-slate-400 text-slate-900 focus:ring-slate-900/10 focus:ring-offset-0 cursor-pointer" />
                                            <span className="text-sm text-slate-700">{label}</span>
                                        </label>
                                    ))}
                                </div>
                            </SearchField>
                        </SearchRow>
                        {/* 3행: 체크박스 */}
                        <SearchRow cols={4}>
                            <SearchField label="부서 필터" colSpan={4}>
                                <div className="flex items-center gap-4">
                                    {['전체', '개발팀', '기획팀', '디자인팀', '마케팅팀', '영업팀'].map((option, i) => (
                                        <label key={option} className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" defaultChecked={i === 0} className="w-4 h-4 rounded border-slate-400 text-slate-900 focus:ring-slate-900/10 focus:ring-offset-0 cursor-pointer" />
                                            <span className={`text-sm ${i === 0 ? 'font-medium text-slate-900' : 'text-slate-700'}`}>{option}</span>
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
