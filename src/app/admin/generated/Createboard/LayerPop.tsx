'use client';
// ================================================================
// 📄 이 파일은 페이지 메이커로 자동 생성된 팝업 컴포넌트입니다.
//
// 📁 파일 구조
//   [1] 설정 영역    — 폼 입력값 등 초기값을 정의합니다
//   [2] JS 로직 영역 — 저장, 닫기, 유효성 검사 등 기능 코드입니다  ← 수정 포인트
//   [3] 화면 영역    — 브라우저에 보이는 팝업 화면(HTML) 코드입니다  ← 수정 포인트
//
// ✏️ 자주 수정하는 것들
//   • 저장 API 경로  → handleSave() 함수 안의 URL을 수정하세요
//   • 팝업 열기/닫기 → 부모 컴포넌트에서 isOpen / onClose 를 제어합니다
//   • 화면 레이아웃  → return ( ... ) 안의 HTML 코드를 수정하세요
//
// 💡 사용법 (부모 컴포넌트에서)
//   const [open, setOpen] = useState(false);
//   <LayerPopup isOpen={open} onClose={() => setOpen(false)} onSave={(data) => console.log(data)} />
//
// 💡 JSX(HTML) 작성 팁
//   • {변수명} — 중괄호 안에 JS 변수를 넣으면 화면에 값이 출력됩니다
//   • className — HTML의 class 속성과 같습니다 (스타일 지정)
// ================================================================

import React, { useState, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { useCodeStore } from '@/store/useCodeStore';
import WysiwygEditor from '@/components/common/WysiwygEditor';

interface LayerPopupProps {
    isOpen: boolean;
    onClose: () => void;
    onSave?: (data: Record<string, unknown>) => Promise<void>;
}

export default function LayerPopup({ isOpen, onClose, onSave }: LayerPopupProps) {

    /* ── 공통코드 그룹 ── */
    const { groups, fetchGroups } = useCodeStore();
    useEffect(() => { fetchGroups(); }, [fetchGroups]);

    // ──────────────────────────────────────────────────────
    // [1] 설정 영역
    // 팝업 폼의 각 입력 필드 값을 저장하는 변수입니다.
    // useState('기본값') — 따옴표 안의 값이 초기값입니다.
    // ──────────────────────────────────────────────────────
    const [title, setTitle] = useState('');
    const [type, setType] = useState('');
    const [content, setContent] = useState('');


    // ──────────────────────────────────────────────────────
    // [2] JS 로직 영역
    // 버튼 클릭 시 동작, 유효성 검사, API 호출 등 기능 코드입니다.
    // ✏️ 저장 API를 바꾸려면 handleSave() 안의 URL을 수정하세요.
    // ──────────────────────────────────────────────────────
    // 초기화 — 모든 입력 필드를 빈 값으로 되돌립니다
    const handleReset = () => {
        setTitle('');
        setType('');
        setContent('');
    };

    /* ── 팝업이 열릴 때마다 폼 초기화 ── */
    useEffect(() => { if (isOpen) handleReset(); }, [isOpen]);

    /* ── 닫기: 값 초기화 후 닫음 ── */
    const handleClose = () => {
        handleReset();
        onClose();
    };

    /* ── 저장: validation 후 API 호출 ── */
    const handleSave = async () => {
        const errors: string[] = [];

        if (!title.trim()) errors.push('[필수] 제목');
        if (title && title.trim().length < 1) errors.push(`[최소 1자] 제목 (현재 ${title.trim().length}자)`);
        if (title && title.trim().length > 100) errors.push(`[최대 100자] 제목 (현재 ${title.trim().length}자)`);
        if (!type) errors.push('[필수] 타입');
        const contentPlain = content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
        if (!contentPlain) errors.push('[필수] 내용');

        if (errors.length > 0) {
            toast.error(`입력 오류: ${errors.join(', ')}`);
            return;
        }

        /* formData 구성 — 파일 필드는 File[] 배열로 포함 */
        const formData = {
            title,
            type,
            content,
        };

        try {
            await onSave?.(formData);
        } catch (err) {
            console.error('저장 실패:', err);
        }
    };

    if (!isOpen) return null;

    // ──────────────────────────────────────────────────────
    // [3] 화면(HTML) 영역
    // 실제로 화면에 그려지는 팝업 HTML 코드입니다.
    // 구성: 배경 오버레이 → 팝업 카드 → 헤더 → 본문(필드들) → 푸터(버튼들)
    // ✏️ 버튼 텍스트·색상·위치를 바꾸려면 푸터 영역을 수정하세요.
    // ──────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* 배경 오버레이 */}
            <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
            {/* 팝업 카드 */}
            <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
                {/* 헤더 */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <h2 className="text-base font-bold text-slate-900">게시판2 등록/수정</h2>
                    <button onClick={handleClose} className="p-1.5 rounded-md hover:bg-slate-100 transition-all"><X className="w-4 h-4 text-slate-500" /></button>
                </div>
                {/* 본문 */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '1.25rem 1rem' }}>
                        <div style={{ gridColumn: 'span 4' }}>
                            <label className="text-xs font-medium text-slate-700 mb-1.5 block">
                                제목 <span className="text-red-500">*</span>
                            </label>
                            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="입력하세요" className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all" />
                        </div>
                        <div style={{ gridColumn: 'span 1' }}>
                            <label className="text-xs font-medium text-slate-700 mb-1.5 block">
                                타입 <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <select value={type} onChange={e => setType(e.target.value)} className="w-full appearance-none border border-slate-200 rounded-md px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white">
                                    <option value="">선택하세요</option>
                                    {groups.find(g => g.groupCode === 'STATUS')?.details.filter(d => d.active).map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                        <div style={{ gridColumn: 'span 5' }}>
                            <label className="text-xs font-medium text-slate-700 mb-1.5 block">
                                내용 <span className="text-red-500">*</span>
                            </label>
                            <WysiwygEditor initialValue={content} onChange={v => setContent(v)} />
                        </div>
                    </div>
                </div>
                {/* 푸터 */}
                <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200 bg-slate-50/50 rounded-b-xl">
                    <button type="button" onClick={handleClose} className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-semibold rounded-md hover:bg-slate-50 transition-all">닫기</button>
                    <button type="button" onClick={handleSave} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-md shadow-sm transition-all">저장</button>
                </div>
            </div>
        </div>
    );
}