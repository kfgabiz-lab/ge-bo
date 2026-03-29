'use client';

/**
 * ============================================================
 *  [템플릿] 우측 레이어 팝업 (Right Drawer)
 * ============================================================
 *  사용법:
 *    1. 이 파일을 복사하여 컴포넌트 폴더에 붙여넣기
 *    2. 컴포넌트명, Props, 폼 필드를 업무에 맞게 수정
 *    3. 부모 컴포넌트에서 isOpen / onClose 를 제어
 *
 *  포함된 필드 유형:
 *    - 텍스트 입력 (단독 1줄 / 2개 한 줄)
 *    - 텍스트에리어
 *    - 셀렉트 (단독 / 2개 한 줄 / 텍스트+셀렉트 한 줄)
 *    - 날짜 (단독 / 범위 from~to / 날짜+셀렉트 한 줄)
 *    - 라디오 그룹
 *    - 체크박스 그룹
 *    - 토글 스위치
 *    - 파일 업로드 (드래그앤드롭)
 *    - 태그 입력
 *    - 색상 선택 (프리셋)
 *    - 읽기전용 필드
 * ============================================================
 */

import React, { useState, useRef } from 'react';
import { X, AlertCircle, Upload, FileText, Image, Lock } from 'lucide-react';

/* ── Props 정의 ── */
interface SampleDrawerProps {
    isOpen: boolean;           // 열림/닫힘 상태
    onClose: () => void;       // 닫기 콜백
    mode?: 'create' | 'edit';  // 등록 / 수정 모드
}

/* ── 공통 스타일 상수 (필요에 따라 수정) ── */
const inputCls = "w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white";
const inputErrCls = "w-full border border-red-400 bg-red-50 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-all";
const selectCls = "w-full appearance-none border border-slate-200 rounded-md px-3 py-2 pr-8 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white cursor-pointer";
const sectionTitle = "text-[11px] font-semibold text-slate-400 uppercase tracking-widest";
const fieldLabel = "text-xs font-medium text-slate-700";

/* ── 셀렉트 화살표 아이콘 ── */
const SelectArrow = () => (
    <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>
);

/* ── 에러 메시지 컴포넌트 ── */
const FieldError = ({ message }: { message: string }) => (
    <p className="text-xs text-red-500 flex items-center gap-1">
        <AlertCircle className="w-3 h-3" />{message}
    </p>
);

/* ── 파일 아이콘 (확장자별) ── */
const FileIcon = ({ name }: { name: string }) => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return <Image className="w-4 h-4 text-blue-500" />;
    if (['pdf'].includes(ext)) return <FileText className="w-4 h-4 text-red-500" />;
    return <FileText className="w-4 h-4 text-slate-400" />;
};

/* ── 파일 크기 포맷 ── */
const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
};

/* ── 프리셋 색상 ── */
const PRESET_COLORS = ['#4361ee', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#6b7280'];

/* ══════════════════════════════════════════ */
/*  메인 컴포넌트                              */
/* ══════════════════════════════════════════ */
export default function SampleDrawer({ isOpen, onClose, mode = 'create' }: SampleDrawerProps) {

    /* ── 폼 상태 ── */
    const [form, setForm] = useState({
        title: '',
        description: '',
        category: '',
        priority: 'mid',
        status: '',
        author: '',
        department: '',
        email: '',
        phone: '',
        deadline: '',
        periodFrom: '',
        periodTo: '',
        startDate: '',
        repeatCycle: '',
        approval: '자동 승인',
        notifications: [] as string[],
        isPublic: true,
        color: '#4361ee',
        tags: [] as string[],
        memo: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [tagInput, setTagInput] = useState('');

    /* 파일 업로드 상태 */
    const [files, setFiles] = useState<File[]>([]);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    /* ── 입력 핸들러 ── */
    const update = (key: string, value: string | boolean | string[]) => {
        setForm(prev => ({ ...prev, [key]: value }));
        if (errors[key]) setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
    };

    /* ── 체크박스 토글 (notifications 등) ── */
    const toggleArrayItem = (key: string, item: string) => {
        const arr = (form as Record<string, unknown>)[key] as string[];
        update(key, arr.includes(item) ? arr.filter(v => v !== item) : [...arr, item]);
    };

    /* ── 태그 추가/삭제 ── */
    const addTag = () => {
        const tag = tagInput.trim();
        if (tag && !form.tags.includes(tag)) {
            update('tags', [...form.tags, tag]);
        }
        setTagInput('');
    };
    const removeTag = (tag: string) => update('tags', form.tags.filter(t => t !== tag));

    /* ── 파일 추가/삭제 ── */
    const addFiles = (newFiles: FileList | null) => {
        if (!newFiles) return;
        setFiles(prev => [...prev, ...Array.from(newFiles)]);
    };
    const removeFile = (index: number) => setFiles(prev => prev.filter((_, i) => i !== index));
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); setIsDragOver(false);
        addFiles(e.dataTransfer.files);
    };

    /* ── 유효성 검사 ── */
    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!form.title.trim()) newErrors.title = '제목을 입력해주세요.';
        if (!form.category) newErrors.category = '카테고리를 선택해주세요.';
        if (!form.author.trim()) newErrors.author = '작성자를 입력해주세요.';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    /* ── 저장 처리 ── */
    const handleSubmit = async () => {
        if (!validate()) return;
        setIsLoading(true);
        try {
            // TODO: API 호출
            // await api.post('/your-endpoint', { ...form, files });
            console.log('저장 데이터:', form, '파일:', files);
            alert('저장 완료 (콘솔 확인)');
            onClose();
        } catch {
            alert('저장 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    /* ── 닫힌 상태면 렌더링 안함 ── */
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex justify-end">

            {/* ============================== */}
            {/* 1. Backdrop (반투명 배경)       */}
            {/*    - 클릭 시 Drawer 닫힘        */}
            {/*    - bg-black/40 : 투명도 조절   */}
            {/* ============================== */}
            <div
                className="absolute inset-0 bg-black/40 animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* ============================== */}
            {/* 2. Panel (우측 슬라이드 패널)    */}
            {/*    - w-[420px] : 너비 조절       */}
            {/* ============================== */}
            <div className="relative w-[420px] bg-white h-full shadow-xl flex flex-col animate-in slide-in-from-right duration-250 border-l border-slate-200">

                {/* ============================== */}
                {/* 2-1. Header                    */}
                {/* ============================== */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                    <div>
                        <h2 className="text-sm font-bold text-slate-900">
                            {mode === 'edit' ? '항목 수정' : '항목 등록'}
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                            {mode === 'edit' ? '기존 항목을 수정합니다' : '새로운 항목을 등록합니다'}
                        </p>
                    </div>
                    <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 transition-all">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* ============================== */}
                {/* 2-2. Body (스크롤 가능)         */}
                {/* ============================== */}
                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

                    {/* ═══════════════════════════════ */}
                    {/* 섹션 1: 기본 정보               */}
                    {/* ═══════════════════════════════ */}
                    <section className="space-y-4">
                        <p className={sectionTitle}>기본 정보</p>

                        {/* ── 텍스트 입력 (1줄 전체) ── */}
                        <div className="space-y-1.5">
                            <label className={fieldLabel}>제목 <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                value={form.title}
                                onChange={e => update('title', e.target.value)}
                                placeholder="제목을 입력하세요"
                                className={errors.title ? inputErrCls : inputCls}
                            />
                            {errors.title && <FieldError message={errors.title} />}
                        </div>

                        {/* ── 텍스트에리어 (1줄 전체) ── */}
                        <div className="space-y-1.5">
                            <label className={fieldLabel}>설명</label>
                            <textarea
                                rows={3}
                                value={form.description}
                                onChange={e => update('description', e.target.value)}
                                placeholder="상세 설명을 입력하세요"
                                className={`${inputCls} resize-none`}
                            />
                        </div>

                        {/* ── 셀렉트 단독 (1줄 전체) ── */}
                        <div className="space-y-1.5">
                            <label className={fieldLabel}>카테고리 <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <select
                                    value={form.category}
                                    onChange={e => update('category', e.target.value)}
                                    className={errors.category ? inputErrCls + ' appearance-none pr-8 cursor-pointer' : selectCls}
                                >
                                    <option value="">선택하세요</option>
                                    <option value="notice">공지사항</option>
                                    <option value="event">이벤트</option>
                                    <option value="faq">FAQ</option>
                                </select>
                                <SelectArrow />
                            </div>
                            {errors.category && <FieldError message={errors.category} />}
                        </div>

                        {/* ── 셀렉트 2개 한 줄 ── */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className={fieldLabel}>우선순위</label>
                                <div className="relative">
                                    <select value={form.priority} onChange={e => update('priority', e.target.value)} className={selectCls}>
                                        <option value="high">긴급</option>
                                        <option value="mid">보통</option>
                                        <option value="low">낮음</option>
                                    </select>
                                    <SelectArrow />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className={fieldLabel}>상태</label>
                                <div className="relative">
                                    <select value={form.status} onChange={e => update('status', e.target.value)} className={selectCls}>
                                        <option value="">선택</option>
                                        <option value="승인완료">승인완료</option>
                                        <option value="진행중">진행중</option>
                                        <option value="대기">대기</option>
                                    </select>
                                    <SelectArrow />
                                </div>
                            </div>
                        </div>

                        {/* ── 읽기전용 필드 (수정 모드 시) ── */}
                        {mode === 'edit' && (
                            <div className="space-y-1.5">
                                <label className={fieldLabel}>등록번호</label>
                                <div className="relative">
                                    <input
                                        value="NO-20260321-001"
                                        readOnly
                                        className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-slate-50 text-slate-400 font-mono cursor-not-allowed pr-9"
                                    />
                                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                                </div>
                                <p className="text-[11px] text-slate-400">등록번호는 변경할 수 없습니다.</p>
                            </div>
                        )}
                    </section>

                    {/* ═══════════════════════════════ */}
                    {/* 섹션 2: 담당자                   */}
                    {/* ═══════════════════════════════ */}
                    <section className="space-y-4">
                        <p className={sectionTitle}>담당자</p>

                        {/* ── 텍스트 + 셀렉트 한 줄 ── */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className={fieldLabel}>작성자 <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={form.author}
                                    onChange={e => update('author', e.target.value)}
                                    placeholder="이름"
                                    className={errors.author ? inputErrCls : inputCls}
                                />
                                {errors.author && <FieldError message={errors.author} />}
                            </div>
                            <div className="space-y-1.5">
                                <label className={fieldLabel}>부서</label>
                                <div className="relative">
                                    <select value={form.department} onChange={e => update('department', e.target.value)} className={selectCls}>
                                        <option value="">선택</option>
                                        <option>개발팀</option>
                                        <option>기획팀</option>
                                        <option>디자인팀</option>
                                        <option>마케팅팀</option>
                                    </select>
                                    <SelectArrow />
                                </div>
                            </div>
                        </div>

                        {/* ── 텍스트 2개 한 줄 ── */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className={fieldLabel}>이메일</label>
                                <input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="email@example.com" className={inputCls} />
                            </div>
                            <div className="space-y-1.5">
                                <label className={fieldLabel}>연락처</label>
                                <input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="010-0000-0000" className={inputCls} />
                            </div>
                        </div>
                    </section>

                    {/* ═══════════════════════════════ */}
                    {/* 섹션 3: 일정                     */}
                    {/* ═══════════════════════════════ */}
                    <section className="space-y-4">
                        <p className={sectionTitle}>일정</p>

                        {/* ── 날짜 단독 1줄 ── */}
                        <div className="space-y-1.5">
                            <label className={fieldLabel}>마감일</label>
                            <input type="date" value={form.deadline} onChange={e => update('deadline', e.target.value)} className={inputCls} />
                        </div>

                        {/* ── 날짜 범위 (from ~ to) ── */}
                        <div className="space-y-1.5">
                            <label className={fieldLabel}>진행 기간</label>
                            <div className="flex items-center gap-2">
                                <input type="date" value={form.periodFrom} onChange={e => update('periodFrom', e.target.value)} className={`flex-1 ${inputCls}`} />
                                <span className="text-sm text-slate-400 font-medium">~</span>
                                <input type="date" value={form.periodTo} onChange={e => update('periodTo', e.target.value)} className={`flex-1 ${inputCls}`} />
                            </div>
                        </div>

                        {/* ── 날짜 + 셀렉트 한 줄 ── */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className={fieldLabel}>시작일</label>
                                <input type="date" value={form.startDate} onChange={e => update('startDate', e.target.value)} className={inputCls} />
                            </div>
                            <div className="space-y-1.5">
                                <label className={fieldLabel}>반복 주기</label>
                                <div className="relative">
                                    <select value={form.repeatCycle} onChange={e => update('repeatCycle', e.target.value)} className={selectCls}>
                                        <option value="">없음</option>
                                        <option>매일</option>
                                        <option>매주</option>
                                        <option>매월</option>
                                    </select>
                                    <SelectArrow />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* ═══════════════════════════════ */}
                    {/* 섹션 4: 옵션                     */}
                    {/* ═══════════════════════════════ */}
                    <section className="space-y-4">
                        <p className={sectionTitle}>옵션</p>

                        {/* ── 라디오 그룹 ── */}
                        <div className="space-y-1.5">
                            <label className={fieldLabel}>승인 방식</label>
                            <div className="flex items-center gap-5 pt-0.5">
                                {['자동 승인', '1차 승인', '2차 승인'].map(opt => (
                                    <label key={opt} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="approval"
                                            checked={form.approval === opt}
                                            onChange={() => update('approval', opt)}
                                            className="w-4 h-4 border-slate-400 text-slate-900 focus:ring-slate-900/20 cursor-pointer"
                                        />
                                        <span className="text-sm text-slate-700">{opt}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* ── 체크박스 그룹 ── */}
                        <div className="space-y-1.5">
                            <label className={fieldLabel}>알림 수신</label>
                            <div className="flex items-center gap-5 pt-0.5">
                                {['이메일', 'SMS', '푸시', '슬랙'].map(opt => (
                                    <label key={opt} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={form.notifications.includes(opt)}
                                            onChange={() => toggleArrayItem('notifications', opt)}
                                            className="w-4 h-4 rounded border-slate-400 text-slate-900 focus:ring-slate-900/20 cursor-pointer"
                                        />
                                        <span className="text-sm text-slate-700">{opt}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* ── 토글 스위치 ── */}
                        <div className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-md border border-slate-200">
                            <div>
                                <p className="text-xs font-semibold text-slate-700">외부 공개</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">비공개 시 내부 직원만 열람 가능</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => update('isPublic', !form.isPublic)}
                                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${form.isPublic ? 'bg-slate-900' : 'bg-slate-300'}`}
                            >
                                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${form.isPublic ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                            </button>
                        </div>
                    </section>

                    {/* ═══════════════════════════════ */}
                    {/* 섹션 5: 색상 선택               */}
                    {/* ═══════════════════════════════ */}
                    <section className="space-y-3">
                        <p className={sectionTitle}>색상</p>
                        <div className="flex items-center gap-2 flex-wrap">
                            {PRESET_COLORS.map(color => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => update('color', color)}
                                    className="w-7 h-7 rounded-full transition-all hover:scale-110"
                                    style={{
                                        backgroundColor: color,
                                        outline: form.color === color ? `2px solid ${color}` : 'none',
                                        outlineOffset: form.color === color ? '2px' : '0',
                                    }}
                                />
                            ))}
                        </div>
                    </section>

                    {/* ═══════════════════════════════ */}
                    {/* 섹션 6: 태그 입력               */}
                    {/* ═══════════════════════════════ */}
                    <section className="space-y-3">
                        <p className={sectionTitle}>태그</p>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={tagInput}
                                onChange={e => setTagInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                                placeholder="태그 입력 후 Enter"
                                className={`flex-1 ${inputCls}`}
                            />
                            <button
                                type="button"
                                onClick={addTag}
                                className="px-3 py-2 text-sm font-semibold text-slate-700 border border-slate-200 rounded-md hover:bg-slate-50 transition-all"
                            >
                                추가
                            </button>
                        </div>
                        {form.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {form.tags.map(tag => (
                                    <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-md">
                                        {tag}
                                        <button type="button" onClick={() => removeTag(tag)} className="text-slate-400 hover:text-red-500 transition-colors">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* ═══════════════════════════════ */}
                    {/* 섹션 7: 첨부파일               */}
                    {/* ═══════════════════════════════ */}
                    <section className="space-y-4">
                        <p className={sectionTitle}>첨부파일</p>

                        {/* 드래그앤드롭 업로드 영역 */}
                        <div
                            onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                            onDragLeave={() => setIsDragOver(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-all duration-200
                                ${isDragOver ? 'border-slate-900 bg-slate-50' : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50/50'}`}
                        >
                            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
                            <Upload className={`w-8 h-8 mx-auto mb-2 ${isDragOver ? 'text-slate-900' : 'text-slate-400'}`} />
                            <p className="text-sm font-semibold text-slate-700">
                                {isDragOver ? '여기에 놓으세요' : '클릭하거나 파일을 드래그하세요'}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-1">PDF, JPG, PNG, XLSX, DOCX (최대 10MB / 파일당)</p>
                        </div>

                        {/* 업로드된 파일 목록 */}
                        {files.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-xs font-semibold text-slate-600">{files.length}개 파일 선택됨</p>
                                {files.map((file, i) => (
                                    <div key={`${file.name}-${i}`} className="flex items-center justify-between px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-md">
                                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                            <FileIcon name={file.name} />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                                                <p className="text-[11px] text-slate-400">{formatFileSize(file.size)}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => removeFile(i)} className="p-1 rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors flex-shrink-0">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* ═══════════════════════════════ */}
                    {/* 섹션 8: 메모                     */}
                    {/* ═══════════════════════════════ */}
                    <section className="space-y-3">
                        <p className={sectionTitle}>메모</p>
                        <textarea
                            rows={2}
                            value={form.memo}
                            onChange={e => update('memo', e.target.value)}
                            placeholder="내부 참고 사항을 입력하세요"
                            className={`${inputCls} resize-none`}
                        />
                    </section>
                </div>

                {/* ============================== */}
                {/* 2-3. Footer (하단 고정)         */}
                {/* ============================== */}
                <div className="px-5 py-4 border-t border-slate-200 flex gap-2.5">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-2.5 text-sm font-semibold text-slate-700 border border-slate-300 rounded-md hover:bg-slate-100 transition-all"
                    >
                        취소
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="flex-1 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                    >
                        {isLoading
                            ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            : (mode === 'edit' ? '저장' : '등록')
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}
