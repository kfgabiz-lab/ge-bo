'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
    useReactTable, getCoreRowModel, flexRender,
    createColumnHelper, SortingState, PaginationState,
} from '@tanstack/react-table';
import {
    Plus, ChevronUp, ChevronDown, ChevronsUpDown,
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
    Loader2, Eye, Pencil, Trash2,
    CheckCircle2, Clock, AlertTriangle, XOctagon,
    Search, RotateCcw, X, Save, PanelRightOpen,
    Paperclip, Calendar, Tag, AlertCircle, Upload, FileText, Image,
} from 'lucide-react';

/* ══════════════════════════════════════════ */
/*  타입                                       */
/* ══════════════════════════════════════════ */
type StatusType = '승인완료' | '진행중' | '대기' | '반려';
type PriorityType = 'high' | 'mid' | 'low';

type Item = {
    id: number;
    title: string;
    description: string;
    category: string;
    author: string;
    email: string;
    phone: string;
    department: string;
    status: StatusType;
    date: string;
    deadline: string;
    views: number;
    priority: PriorityType;
    isPublic: boolean;
    attachments: number;
    tags: string[];
    memo: string;
};

/* ══════════════════════════════════════════ */
/*  상수 & Mock 데이터                          */
/* ══════════════════════════════════════════ */
const CATEGORIES = ['공지사항', 'FAQ', '이벤트', '투표', '설문', '보안', '인사', '개발'];
const STATUSES: StatusType[] = ['승인완료', '진행중', '대기', '반려'];
const PRIORITIES: PriorityType[] = ['high', 'mid', 'low'];
const DEPARTMENTS = ['개발팀', '기획팀', '디자인팀', '마케팅팀', '영업팀', '인사팀'];
const TAG_POOL = ['긴급', '중요', '일반', '검토필요', '외부공유', '내부전용', '월간', '분기', '반기', '연간'];

const MOCK_ENTRIES: { title: string; description: string; author: string; email: string; phone: string }[] = [
    { title: '2026년 1분기 경영 실적 보고', description: '매출 1,230억 달성. 전년 동기 대비 18% 성장 분석', author: '김영수', email: 'yskim@example.com', phone: '010-1234-5678' },
    { title: '클라우드 인프라 마이그레이션 계획', description: 'AWS → GCP 전환 3단계 로드맵 및 비용 분석', author: '이정민', email: 'jmlee@example.com', phone: '010-2345-6789' },
    { title: '신규 파트너사 계약서 검토 요청', description: '동남아 유통 파트너 MOU 조건 검토 (법무팀 확인 필요)', author: '박서현', email: 'shpark@example.com', phone: '010-3456-7890' },
    { title: '2026년 상반기 채용 계획서', description: '개발/기획/디자인 30명 충원 계획 및 예산안', author: '최은지', email: 'ejchoi@example.com', phone: '010-4567-8901' },
    { title: '고객 만족도 설문조사 결과 리포트', description: 'NPS 72점 달성. 주요 불만 사항 3건 개선 방안 포함', author: '정하늘', email: 'hnjeong@example.com', phone: '010-5678-9012' },
    { title: '정보보안 정책 개정안', description: 'ISO 27001 갱신 심사 대비 접근권한 및 VPN 정책 업데이트', author: '한동욱', email: 'dwhan@example.com', phone: '010-6789-0123' },
    { title: '임원 선출 전자 투표 안건', description: '2026년도 이사회 구성 변경에 따른 임원 선출 투표', author: '강민호', email: 'mhkang@example.com', phone: '010-7890-1234' },
    { title: '해외 지사 설립 타당성 분석', description: '베트남 하노이 지사 설립 ROI 분석 및 리스크 평가', author: '윤서영', email: 'syyoon@example.com', phone: '010-8901-2345' },
    { title: 'VOC 분석 및 서비스 개선 계획', description: 'Q1 고객 불만 Top 10 분석. CS 프로세스 개선안 3건', author: '오지훈', email: 'jhoh@example.com', phone: '010-9012-3456' },
    { title: '내부 감사 결과 보고서', description: '2025년 하반기 내부 감사. 부적합 2건, 권고 5건', author: '송미래', email: 'mrsong@example.com', phone: '010-0123-4567' },
    { title: '모바일 앱 UX 리뉴얼 제안', description: '사용자 이탈률 15% 감소 목표. 와이어프레임 초안 첨부', author: '이정민', email: 'jmlee@example.com', phone: '010-2345-6789' },
    { title: 'ERP 시스템 업그레이드 검토', description: 'SAP S/4HANA 전환 비용 및 일정 검토 (3개월 소요)', author: '강민호', email: 'mhkang@example.com', phone: '010-7890-1234' },
    { title: '사내 교육 프로그램 커리큘럼', description: '신입 온보딩 + 리더십 과정 2026년 연간 계획', author: '최은지', email: 'ejchoi@example.com', phone: '010-4567-8901' },
    { title: '브랜드 마케팅 캠페인 기획안', description: 'SNS + 오프라인 연계 캠페인. 예산 5억, 기간 3개월', author: '윤서영', email: 'syyoon@example.com', phone: '010-8901-2345' },
    { title: '공급망 리스크 관리 체계 수립', description: '원자재 가격 변동 대응 전략 및 대체 공급처 확보 계획', author: '한동욱', email: 'dwhan@example.com', phone: '010-6789-0123' },
    { title: '데이터 거버넌스 정책 수립', description: '개인정보 처리 방침 개정 및 데이터 분류 체계 정의', author: '박서현', email: 'shpark@example.com', phone: '010-3456-7890' },
    { title: 'ESG 경영 보고서 초안', description: '탄소 배출량 20% 감축 목표. 친환경 사업 투자 현황', author: '김영수', email: 'yskim@example.com', phone: '010-1234-5678' },
    { title: '지식재산권 출원 현황 보고', description: '특허 12건, 상표 5건 출원 완료. 심사 진행 상황 업데이트', author: '오지훈', email: 'jhoh@example.com', phone: '010-9012-3456' },
    { title: '사무실 이전 프로젝트 계획', description: '강남 신사옥 이전 일정. 인테리어 설계안 및 비용 견적', author: '정하늘', email: 'hnjeong@example.com', phone: '010-5678-9012' },
    { title: 'API 게이트웨이 도입 검토', description: 'Kong vs AWS API GW 비교 분석. 보안/성능/비용 관점', author: '강민호', email: 'mhkang@example.com', phone: '010-7890-1234' },
    { title: '2026년 예산 집행 내역 (3월)', description: '부서별 예산 사용 현황. 초과 집행 2건 사유 첨부', author: '김영수', email: 'yskim@example.com', phone: '010-1234-5678' },
    { title: '전사 성과 평가 기준 개정안', description: 'OKR 기반 평가 체계 전환. 평가 항목 및 가중치 조정', author: '최은지', email: 'ejchoi@example.com', phone: '010-4567-8901' },
    { title: '재해복구(DR) 훈련 결과 보고', description: 'RPO 4시간, RTO 8시간 달성. 개선 필요 사항 2건', author: '한동욱', email: 'dwhan@example.com', phone: '010-6789-0123' },
    { title: '신규 서비스 론칭 마케팅 전략', description: 'B2B SaaS 제품 론칭. 타겟 고객 세그먼트 및 GTM 전략', author: '윤서영', email: 'syyoon@example.com', phone: '010-8901-2345' },
    { title: '법인카드 사용 가이드라인 개정', description: '한도 조정 및 사용 제한 항목 추가. 전 직원 공지 필요', author: '송미래', email: 'mrsong@example.com', phone: '010-0123-4567' },
    { title: 'CI/CD 파이프라인 최적화 보고', description: '배포 시간 40% 단축. GitHub Actions + ArgoCD 구성', author: '이정민', email: 'jmlee@example.com', phone: '010-2345-6789' },
    { title: '글로벌 컴플라이언스 체크리스트', description: 'GDPR, CCPA, 개인정보보호법 준수 현황 점검표', author: '박서현', email: 'shpark@example.com', phone: '010-3456-7890' },
    { title: '사내 동호회 활동 지원 계획', description: '분기별 활동비 지원. 7개 동호회 등록 현황 및 실적', author: '정하늘', email: 'hnjeong@example.com', phone: '010-5678-9012' },
    { title: '차세대 인증 시스템 도입 제안', description: 'FIDO2/WebAuthn 기반 패스키 인증. 구축 비용 및 일정', author: '강민호', email: 'mhkang@example.com', phone: '010-7890-1234' },
    { title: '분기별 리스크 관리 현황 보고', description: '운영/재무/보안 리스크 25건 식별. 대응 현황 대시보드', author: '오지훈', email: 'jhoh@example.com', phone: '010-9012-3456' },
];

const ALL_DATA: Item[] = Array.from({ length: 237 }, (_, i) => {
    const entry = MOCK_ENTRIES[i % MOCK_ENTRIES.length];
    const dayOffset = i;
    const regDate = new Date(2026, 2, 19 - (dayOffset % 60));
    const deadDate = new Date(regDate); deadDate.setDate(deadDate.getDate() + 14 + (i % 30));
    return {
        id: i + 1,
        title: i < MOCK_ENTRIES.length ? entry.title : `${entry.title} (${Math.floor(i / MOCK_ENTRIES.length) + 1}차)`,
        description: entry.description,
        category: CATEGORIES[i % CATEGORIES.length],
        author: entry.author,
        email: entry.email,
        phone: entry.phone,
        department: DEPARTMENTS[i % DEPARTMENTS.length],
        status: STATUSES[i % STATUSES.length],
        date: regDate.toISOString().slice(0, 10),
        deadline: deadDate.toISOString().slice(0, 10),
        views: 100 + ((i * 137) % 2900),
        priority: PRIORITIES[i % PRIORITIES.length],
        isPublic: i % 3 !== 2,
        attachments: i % 5,
        tags: [TAG_POOL[i % TAG_POOL.length], TAG_POOL[(i + 3) % TAG_POOL.length]],
        memo: i % 4 === 0 ? '검토 후 승인 요청 예정' : i % 4 === 1 ? '관련 부서 협의 필요' : '',
    };
});

/* ══════════════════════════════════════════ */
/*  검색 조건                                   */
/* ══════════════════════════════════════════ */
interface SearchParams {
    keyword: string; category: string; status: string; author: string;
    dateFrom: string; dateTo: string; exposure: string; departments: string[];
}
const INITIAL_SEARCH: SearchParams = {
    keyword: '', category: '', status: '', author: '',
    dateFrom: '', dateTo: '', exposure: 'all', departments: [],
};

/* ══════════════════════════════════════════ */
/*  Mock API                                   */
/* ══════════════════════════════════════════ */
const fetchItems = async ({ page, pageSize, sorting, search }: {
    page: number; pageSize: number; sorting: SortingState; search: SearchParams;
}): Promise<{ data: Item[]; total: number }> => {
    await new Promise(r => setTimeout(r, 300));
    let filtered = [...ALL_DATA];
    if (search.keyword) { const q = search.keyword.toLowerCase(); filtered = filtered.filter(d => d.title.toLowerCase().includes(q) || d.description.toLowerCase().includes(q)); }
    if (search.category) filtered = filtered.filter(d => d.category === search.category);
    if (search.status) filtered = filtered.filter(d => d.status === search.status);
    if (search.author) filtered = filtered.filter(d => d.author.includes(search.author));
    if (search.dateFrom) filtered = filtered.filter(d => d.date >= search.dateFrom);
    if (search.dateTo) filtered = filtered.filter(d => d.date <= search.dateTo);
    if (search.exposure === 'public') filtered = filtered.filter(d => d.isPublic);
    else if (search.exposure === 'private') filtered = filtered.filter(d => !d.isPublic);
    if (search.departments.length > 0) filtered = filtered.filter(d => search.departments.includes(d.department));
    if (sorting.length > 0) {
        const { id, desc } = sorting[0];
        filtered.sort((a, b) => { const av = a[id as keyof Item], bv = b[id as keyof Item]; return av < bv ? (desc ? 1 : -1) : av > bv ? (desc ? -1 : 1) : 0; });
    }
    const start = page * pageSize;
    return { data: filtered.slice(start, start + pageSize), total: filtered.length };
};

/* ══════════════════════════════════════════ */
/*  공통 스타일 & UI                             */
/* ══════════════════════════════════════════ */
const inputCls = "w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white";
const selectCls = "w-full appearance-none border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white cursor-pointer";
const selectArrow = <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>;
const sectionTitle = "text-[11px] font-bold text-slate-500 uppercase tracking-widest";
const fieldLabel = "text-xs font-semibold text-slate-700";

const STATUS_CFG: Record<StatusType, { bg: string; text: string; icon: React.ElementType }> = {
    '승인완료': { bg: 'bg-emerald-100', text: 'text-emerald-800', icon: CheckCircle2 },
    '진행중': { bg: 'bg-blue-100', text: 'text-blue-800', icon: Clock },
    '대기': { bg: 'bg-amber-100', text: 'text-amber-800', icon: AlertTriangle },
    '반려': { bg: 'bg-red-100', text: 'text-red-700', icon: XOctagon },
};
const PRIORITY_COLOR: Record<PriorityType, string> = { high: 'bg-red-500', mid: 'bg-amber-500', low: 'bg-slate-400' };
const PRIORITY_LABEL: Record<PriorityType, string> = { high: '긴급', mid: '보통', low: '낮음' };

const StatusBadge = ({ status }: { status: StatusType }) => {
    const c = STATUS_CFG[status]; const Icon = c.icon;
    return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${c.bg} ${c.text}`}><Icon className="w-3 h-3" />{status}</span>;
};
const SortIcon = ({ sorted }: { sorted: false | 'asc' | 'desc' }) => {
    if (sorted === 'asc') return <ChevronUp className="w-3.5 h-3.5 text-slate-900" />;
    if (sorted === 'desc') return <ChevronDown className="w-3.5 h-3.5 text-slate-900" />;
    return <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />;
};

/* ══════════════════════════════════════════ */
/*  컬럼                                       */
/* ══════════════════════════════════════════ */
const col = createColumnHelper<Item>();
const createColumns = (onEdit: (i: Item) => void, onDrawer: (i: Item) => void, onDelete: (i: Item) => void) => [
    col.display({ id: 'actions', header: '', size: 110,
        cell: ({ row }) => (
            <div className="flex items-center gap-0.5">
                <button onClick={() => onEdit(row.original)} className="p-1.5 rounded-md text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors" title="수정(팝업)"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => onDrawer(row.original)} className="p-1.5 rounded-md text-slate-400 hover:bg-violet-50 hover:text-violet-600 transition-colors" title="수정(드로어)"><PanelRightOpen className="w-3.5 h-3.5" /></button>
                <button onClick={() => onDelete(row.original)} className="p-1.5 rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors" title="삭제"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
        ),
    }),
    col.accessor('title', { header: '안건명', size: 220, enableSorting: true,
        cell: (info) => (
            <span className="text-[13px] font-semibold text-slate-800 truncate block max-w-[220px]" title={info.getValue()}>
                {info.getValue()}
            </span>
        ),
    }),
    col.accessor('description', { header: '설명', size: 200, enableSorting: false,
        cell: (info) => (
            <span className="text-[12px] text-slate-500 truncate block max-w-[200px]" title={info.getValue()}>
                {info.getValue()}
            </span>
        ),
    }),
    col.accessor('category', { header: '분류', size: 75, enableSorting: true,
        cell: (info) => <span className="inline-flex px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[11px] font-semibold">{info.getValue()}</span>,
    }),
    col.accessor('author', { header: '작성자', size: 80, enableSorting: true,
        cell: (info) => <span className="text-[13px] text-slate-700">{info.getValue()}</span>,
    }),
    col.accessor('department', { header: '부서', size: 75, enableSorting: true,
        cell: (info) => <span className="text-[12px] text-slate-600">{info.getValue()}</span>,
    }),
    col.accessor('email', { header: '이메일', size: 160, enableSorting: true,
        cell: (info) => <span className="text-[12px] text-slate-500 truncate block max-w-[160px]" title={info.getValue()}>{info.getValue()}</span>,
    }),
    col.accessor('phone', { header: '연락처', size: 120, enableSorting: false,
        cell: (info) => <span className="text-[12px] text-slate-500 tabular-nums">{info.getValue()}</span>,
    }),
    col.accessor('status', { header: '상태', size: 90, enableSorting: true,
        cell: (info) => <StatusBadge status={info.getValue()} />,
    }),
    col.accessor('priority', { header: '우선순위', size: 75, enableSorting: true,
        cell: (info) => {
            const cls: Record<PriorityType, string> = { high: 'bg-red-100 text-red-700', mid: 'bg-amber-100 text-amber-700', low: 'bg-slate-100 text-slate-600' };
            return <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold ${cls[info.getValue()]}`}>{PRIORITY_LABEL[info.getValue()]}</span>;
        },
    }),
    col.accessor('isPublic', { header: '공개', size: 55, enableSorting: true,
        cell: (info) => <span className={`text-[11px] font-semibold ${info.getValue() ? 'text-emerald-600' : 'text-slate-400'}`}>{info.getValue() ? '공개' : '비공개'}</span>,
    }),
    col.accessor('attachments', { header: '첨부', size: 50, enableSorting: true,
        cell: (info) => info.getValue() > 0
            ? <span className="inline-flex items-center gap-0.5 text-[11px] text-slate-500"><Paperclip className="w-3 h-3" />{info.getValue()}</span>
            : <span className="text-[11px] text-slate-300">-</span>,
    }),
    col.accessor('deadline', { header: '마감일', size: 95, enableSorting: true,
        cell: (info) => <span className="text-[12px] text-slate-500 tabular-nums">{info.getValue()}</span>,
    }),
    col.accessor('date', { header: '등록일', size: 95, enableSorting: true,
        cell: (info) => <span className="text-[12px] text-slate-500 tabular-nums">{info.getValue()}</span>,
    }),
];

/* ══════════════════════════════════════════ */
/*  드로어/모달 폼 타입                          */
/* ══════════════════════════════════════════ */
type FormData = {
    title: string; description: string; category: string; author: string; email: string;
    phone: string; department: string; status: string; priority: string; deadline: string;
    isPublic: boolean; memo: string; tags: string[];
};
const emptyForm = (): FormData => ({
    title: '', description: '', category: '', author: '', email: '', phone: '',
    department: '', status: '', priority: 'mid', deadline: '', isPublic: true, memo: '', tags: [],
});
const itemToForm = (item: Item): FormData => ({
    title: item.title, description: item.description, category: item.category,
    author: item.author, email: item.email, phone: item.phone,
    department: item.department, status: item.status, priority: item.priority,
    deadline: item.deadline, isPublic: item.isPublic, memo: item.memo, tags: [...item.tags],
});

/* ══════════════════════════════════════════ */
/*  공통 폼 렌더러                               */
/* ══════════════════════════════════════════ */
/* 파일 크기 포맷 */
const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
};

/* 파일 아이콘 */
const FileIcon = ({ name }: { name: string }) => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return <Image className="w-4 h-4 text-blue-500" />;
    if (['pdf'].includes(ext)) return <FileText className="w-4 h-4 text-red-500" />;
    return <FileText className="w-4 h-4 text-slate-400" />;
};

const FormFields = ({ form, setForm }: { form: FormData; setForm: React.Dispatch<React.SetStateAction<FormData>>; compact?: boolean }) => {
    const update = (key: keyof FormData, value: string | boolean | string[]) => setForm(p => ({ ...p, [key]: value }));
    const [files, setFiles] = useState<File[]>([]);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const addFiles = (newFiles: FileList | null) => {
        if (!newFiles) return;
        const arr = Array.from(newFiles);
        setFiles(prev => [...prev, ...arr]);
    };
    const removeFile = (index: number) => setFiles(prev => prev.filter((_, i) => i !== index));

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); setIsDragOver(false);
        addFiles(e.dataTransfer.files);
    };
    return (
        <div className="space-y-5">
            {/* ── 기본 정보 ── */}
            <section className="space-y-4">
                <p className={sectionTitle}>기본 정보</p>
                {/* 텍스트 1줄 (full-width) */}
                <div className="space-y-1.5">
                    <label className={fieldLabel}>안건명 <span className="text-red-500">*</span></label>
                    <input type="text" value={form.title} onChange={e => update('title', e.target.value)} placeholder="안건 제목을 입력하세요" className={inputCls} />
                </div>
                {/* 텍스트에어리어 1줄 (full-width) */}
                <div className="space-y-1.5">
                    <label className={fieldLabel}>설명</label>
                    <textarea rows={3} value={form.description} onChange={e => update('description', e.target.value)} placeholder="안건에 대한 상세 설명" className={`${inputCls} resize-none`} />
                </div>
                {/* 셀렉트 단독 1줄 (full-width) */}
                <div className="space-y-1.5">
                    <label className={fieldLabel}>카테고리 <span className="text-red-500">*</span></label>
                    <div className="relative">
                        <select value={form.category} onChange={e => update('category', e.target.value)} className={selectCls}>
                            <option value="">선택</option>{CATEGORIES.map(c => <option key={c}>{c}</option>)}
                        </select>{selectArrow}
                    </div>
                </div>
                {/* 셀렉트 2개 한 줄 */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className={fieldLabel}>우선순위</label>
                        <div className="relative">
                            <select value={form.priority} onChange={e => update('priority', e.target.value)} className={selectCls}>
                                <option value="high">긴급</option><option value="mid">보통</option><option value="low">낮음</option>
                            </select>{selectArrow}
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className={fieldLabel}>상태</label>
                        <div className="relative">
                            <select value={form.status} onChange={e => update('status', e.target.value)} className={selectCls}>
                                <option value="">선택</option>{STATUSES.map(s => <option key={s}>{s}</option>)}
                            </select>{selectArrow}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── 담당자 ── */}
            <section className="space-y-4">
                <p className={sectionTitle}>담당자</p>
                {/* 텍스트 + 셀렉트 한 줄 */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className={fieldLabel}>작성자 <span className="text-red-500">*</span></label>
                        <input type="text" value={form.author} onChange={e => update('author', e.target.value)} placeholder="이름" className={inputCls} />
                    </div>
                    <div className="space-y-1.5">
                        <label className={fieldLabel}>부서</label>
                        <div className="relative">
                            <select value={form.department} onChange={e => update('department', e.target.value)} className={selectCls}>
                                <option value="">선택</option>{DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                            </select>{selectArrow}
                        </div>
                    </div>
                </div>
                {/* 텍스트 2개 한 줄 */}
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

            {/* ── 일정 ── */}
            <section className="space-y-4">
                <p className={sectionTitle}>일정</p>
                {/* 날짜 단독 1줄 (full-width) */}
                <div className="space-y-1.5">
                    <label className={fieldLabel}>마감일</label>
                    <input type="date" value={form.deadline} onChange={e => update('deadline', e.target.value)} className={inputCls} />
                </div>
                {/* 날짜 범위 1줄 (from ~ to) */}
                <div className="space-y-1.5">
                    <label className={fieldLabel}>진행 기간</label>
                    <div className="flex items-center gap-2">
                        <input type="date" className={`flex-1 ${inputCls}`} />
                        <span className="text-sm text-slate-400 font-medium">~</span>
                        <input type="date" className={`flex-1 ${inputCls}`} />
                    </div>
                </div>
                {/* 날짜 + 셀렉트 한 줄 */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className={fieldLabel}>시작일</label>
                        <input type="date" className={inputCls} />
                    </div>
                    <div className="space-y-1.5">
                        <label className={fieldLabel}>반복 주기</label>
                        <div className="relative">
                            <select className={selectCls}>
                                <option>없음</option><option>매일</option><option>매주</option><option>매월</option>
                            </select>{selectArrow}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── 옵션 ── */}
            <section className="space-y-4">
                <p className={sectionTitle}>옵션</p>
                {/* 라디오 그룹 한 줄 */}
                <div className="space-y-1.5">
                    <label className={fieldLabel}>승인 방식</label>
                    <div className="flex items-center gap-5 pt-0.5">
                        {['자동 승인', '1차 승인', '2차 승인'].map((opt, i) => (
                            <label key={opt} className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="approval" defaultChecked={i === 0} className="w-4 h-4 border-slate-400 text-slate-900 focus:ring-slate-900/20 cursor-pointer" />
                                <span className="text-sm text-slate-700">{opt}</span>
                            </label>
                        ))}
                    </div>
                </div>
                {/* 체크박스 그룹 한 줄 */}
                <div className="space-y-1.5">
                    <label className={fieldLabel}>알림 수신</label>
                    <div className="flex items-center gap-5 pt-0.5">
                        {['이메일', 'SMS', '푸시', '슬랙'].map(opt => (
                            <label key={opt} className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="w-4 h-4 rounded border-slate-400 text-slate-900 focus:ring-slate-900/20 cursor-pointer" />
                                <span className="text-sm text-slate-700">{opt}</span>
                            </label>
                        ))}
                    </div>
                </div>
                {/* 토글 스위치 */}
                <div className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-md border border-slate-200">
                    <div><p className="text-sm font-semibold text-slate-800">외부 공개</p><p className="text-[11px] text-slate-500">비공개 시 내부 직원만 열람 가능</p></div>
                    <button type="button" onClick={() => update('isPublic', !form.isPublic)}
                        className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${form.isPublic ? 'bg-slate-900' : 'bg-slate-300'}`}>
                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${form.isPublic ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                    </button>
                </div>
            </section>

            {/* ── 첨부파일 ── */}
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
                    <input ref={fileInputRef} type="file" multiple className="hidden"
                        onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
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
                            <div key={`${file.name}-${i}`} className="flex items-center justify-between px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-md group">
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    <FileIcon name={file.name} />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                                        <p className="text-[11px] text-slate-400">{formatFileSize(file.size)}</p>
                                    </div>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                                    className="p-1 rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors flex-shrink-0">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* ── 메모 ── */}
            <section className="space-y-4">
                <p className={sectionTitle}>메모</p>
                <textarea rows={2} value={form.memo} onChange={e => update('memo', e.target.value)} placeholder="내부 참고 사항을 입력하세요" className={`${inputCls} resize-none`} />
            </section>
        </div>
    );
};

/* ══════════════════════════════════════════ */
/*  메인 컴포넌트                                */
/* ══════════════════════════════════════════ */
export default function DemoPage2() {
    const [data, setData] = useState<Item[]>([]);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
    const [searchParams, setSearchParams] = useState<SearchParams>(INITIAL_SEARCH);
    const [isSearchOpen, setIsSearchOpen] = useState(true);

    /* 모달/드로어 상태 */
    const [editItem, setEditItem] = useState<Item | null>(null);
    const [editForm, setEditForm] = useState<FormData>(emptyForm());
    const [drawerItem, setDrawerItem] = useState<Item | null>(null);
    const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
    const [drawerForm, setDrawerForm] = useState<FormData>(emptyForm());
    const [deleteItem, setDeleteItem] = useState<Item | null>(null);

    const openEdit = (item: Item) => { setEditItem(item); setEditForm(itemToForm(item)); };
    const closeEdit = () => setEditItem(null);
    const openDrawer = (item: Item) => { setDrawerItem(item); setDrawerMode('edit'); setDrawerForm(itemToForm(item)); };
    const openCreateDrawer = () => { setDrawerItem({} as Item); setDrawerMode('create'); setDrawerForm(emptyForm()); };
    const closeDrawer = () => setDrawerItem(null);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const tableColumns = useMemo(() => createColumns(openEdit, openDrawer, setDeleteItem), []);

    const loadData = useCallback(async (pag: PaginationState, sort: SortingState, search: SearchParams) => {
        setIsLoading(true);
        const result = await fetchItems({ page: pag.pageIndex, pageSize: pag.pageSize, sorting: sort, search });
        setData(result.data); setTotal(result.total); setIsLoading(false);
    }, []);
    useEffect(() => { loadData(pagination, sorting, searchParams); }, [pagination, sorting, searchParams, loadData]);

    const handleSearch = () => setPagination(p => ({ ...p, pageIndex: 0 }));
    const handleReset = () => { setSearchParams(INITIAL_SEARCH); setPagination({ pageIndex: 0, pageSize: 10 }); setSorting([]); };
    const toggleDept = (d: string) => setSearchParams(p => ({ ...p, departments: p.departments.includes(d) ? p.departments.filter(x => x !== d) : [...p.departments, d] }));
    const toggleAllDepts = () => setSearchParams(p => ({ ...p, departments: p.departments.length === DEPARTMENTS.length ? [] : [...DEPARTMENTS] }));

    /* 필터 칩 계산 */
    const activeFilters = useMemo(() => {
        const chips: { key: string; label: string; onRemove: () => void }[] = [];
        if (searchParams.keyword) chips.push({ key: 'keyword', label: `"${searchParams.keyword}"`, onRemove: () => setSearchParams(p => ({ ...p, keyword: '' })) });
        if (searchParams.category) chips.push({ key: 'category', label: searchParams.category, onRemove: () => setSearchParams(p => ({ ...p, category: '' })) });
        if (searchParams.status) chips.push({ key: 'status', label: searchParams.status, onRemove: () => setSearchParams(p => ({ ...p, status: '' })) });
        if (searchParams.author) chips.push({ key: 'author', label: `작성자: ${searchParams.author}`, onRemove: () => setSearchParams(p => ({ ...p, author: '' })) });
        if (searchParams.dateFrom || searchParams.dateTo) chips.push({ key: 'date', label: `${searchParams.dateFrom || '~'} ~ ${searchParams.dateTo || '~'}`, onRemove: () => setSearchParams(p => ({ ...p, dateFrom: '', dateTo: '' })) });
        if (searchParams.exposure !== 'all') chips.push({ key: 'exposure', label: searchParams.exposure === 'public' ? '노출' : '비노출', onRemove: () => setSearchParams(p => ({ ...p, exposure: 'all' })) });
        if (searchParams.departments.length > 0) chips.push({ key: 'dept', label: `부서: ${searchParams.departments.join(', ')}`, onRemove: () => setSearchParams(p => ({ ...p, departments: [] })) });
        return chips;
    }, [searchParams]);

    const pageCount = Math.ceil(total / pagination.pageSize);
    const table = useReactTable({
        data, columns: tableColumns, pageCount,
        state: { sorting, pagination },
        manualPagination: true, manualSorting: true,
        onSortingChange: (u) => { setSorting(typeof u === 'function' ? u(sorting) : u); setPagination(p => ({ ...p, pageIndex: 0 })); },
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <div className="h-full flex flex-col gap-5 min-w-0">
            {/* ── 페이지 헤더 ── */}
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">목록2 (FE)</h1>
                    <p className="text-sm text-slate-500 mt-1">종합실전예시 검색폼 + 서버사이드 페이징 테이블</p>
                </div>
                <button onClick={openCreateDrawer} className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-md hover:bg-slate-800 active:scale-[0.98] transition-all duration-150 shadow-sm">
                    <Plus className="w-4 h-4" strokeWidth={2.5} />등록
                </button>
            </div>

            {/* ══════ 검색폼 ══════ */}
            <div className="bg-white rounded-md border border-slate-200 shadow-sm">
                <button onClick={() => setIsSearchOpen(!isSearchOpen)} className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors rounded-t-md">
                    <div className="flex items-center gap-2">
                        <Search className="w-4 h-4 text-slate-500" />
                        <span className="text-sm font-semibold text-slate-700">상세 검색</span>
                        {activeFilters.length > 0 && <span className="text-[10px] px-1.5 py-0.5 bg-slate-900 text-white rounded-full font-bold">{activeFilters.length}</span>}
                    </div>
                    {isSearchOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                </button>
                {isSearchOpen && (
                    <>
                        <div className="px-5 pt-4 pb-5 border-t border-slate-100 space-y-4">
                            <div className="grid grid-cols-4 gap-4">
                                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">검색어</label><input type="text" placeholder="제목/내용" value={searchParams.keyword} onChange={e => setSearchParams(p => ({ ...p, keyword: e.target.value }))} className={inputCls} /></div>
                                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">카테고리</label><div className="relative"><select value={searchParams.category} onChange={e => setSearchParams(p => ({ ...p, category: e.target.value }))} className={selectCls}><option value="">전체</option>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>{selectArrow}</div></div>
                                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">상태</label><div className="relative"><select value={searchParams.status} onChange={e => setSearchParams(p => ({ ...p, status: e.target.value }))} className={selectCls}><option value="">전체</option>{STATUSES.map(s => <option key={s}>{s}</option>)}</select>{selectArrow}</div></div>
                                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">작성자</label><input type="text" placeholder="이름" value={searchParams.author} onChange={e => setSearchParams(p => ({ ...p, author: e.target.value }))} className={inputCls} /></div>
                            </div>
                            <div className="grid grid-cols-4 gap-4">
                                <div className="col-span-2"><label className="block text-xs font-semibold text-slate-600 mb-1.5">등록 기간</label><div className="flex items-center gap-2"><input type="date" value={searchParams.dateFrom} onChange={e => setSearchParams(p => ({ ...p, dateFrom: e.target.value }))} className={`flex-1 ${inputCls}`} /><span className="text-sm text-slate-400 font-medium">~</span><input type="date" value={searchParams.dateTo} onChange={e => setSearchParams(p => ({ ...p, dateTo: e.target.value }))} className={`flex-1 ${inputCls}`} /></div></div>
                                <div className="col-span-2"><label className="block text-xs font-semibold text-slate-600 mb-1.5">노출 여부</label><div className="flex items-center gap-5 pt-1">{[{ value: 'all', label: '전체' }, { value: 'public', label: '노출' }, { value: 'private', label: '비노출' }].map(opt => (<label key={opt.value} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="exposure" value={opt.value} checked={searchParams.exposure === opt.value} onChange={() => setSearchParams(p => ({ ...p, exposure: opt.value }))} className="w-4 h-4 border-slate-400 text-slate-900 focus:ring-slate-900/20 cursor-pointer" /><span className="text-sm text-slate-700">{opt.label}</span></label>))}</div></div>
                            </div>
                            <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">부서 필터</label><div className="flex items-center gap-5"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={searchParams.departments.length === DEPARTMENTS.length} onChange={toggleAllDepts} className="w-4 h-4 rounded border-slate-400 text-slate-900 focus:ring-slate-900/20 cursor-pointer" /><span className="text-sm font-semibold text-slate-800">전체</span></label>{DEPARTMENTS.map(d => (<label key={d} className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={searchParams.departments.includes(d)} onChange={() => toggleDept(d)} className="w-4 h-4 rounded border-slate-400 text-slate-900 focus:ring-slate-900/20 cursor-pointer" /><span className="text-sm text-slate-700">{d}</span></label>))}</div></div>
                        </div>
                        <div className="flex items-center justify-end gap-2 px-5 py-3 bg-slate-50 border-t border-slate-100 rounded-b-md">
                            <button onClick={handleReset} className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 text-slate-700 text-sm font-semibold rounded-md hover:bg-white hover:border-slate-400 transition-all"><RotateCcw className="w-3.5 h-3.5" /> 초기화</button>
                            <button onClick={handleSearch} className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-md hover:bg-slate-800 transition-all shadow-sm"><Search className="w-3.5 h-3.5" /> 검색</button>
                        </div>
                    </>
                )}
            </div>

            {/* ── 필터 칩 ── */}
            {activeFilters.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-slate-500">적용 필터:</span>
                    {activeFilters.map(f => (
                        <button key={f.key} onClick={f.onRemove} className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-[11px] font-semibold hover:bg-slate-200 transition-colors">
                            {f.label}<X className="w-3 h-3 text-slate-400" />
                        </button>
                    ))}
                    <button onClick={handleReset} className="text-[11px] text-slate-500 hover:text-slate-700 font-semibold underline underline-offset-2">전체 해제</button>
                </div>
            )}

            {/* ══════ 테이블 ══════ */}
            <div className="bg-white border border-slate-200 rounded-md flex-1 flex flex-col shadow-sm min-w-0 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 flex-shrink-0">
                    <p className="text-[13px] text-slate-600">
                        {activeFilters.length > 0
                            ? <>전체 {ALL_DATA.length.toLocaleString()}건 중 <span className="font-bold text-slate-900">{total.toLocaleString()}</span>건 검색</>
                            : <>총 <span className="font-bold text-slate-900">{total.toLocaleString()}</span>건</>
                        }
                    </p>
                    <select value={pagination.pageSize} onChange={e => setPagination({ pageIndex: 0, pageSize: Number(e.target.value) })} className="text-sm border border-slate-300 rounded-md px-2 py-1.5 text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 cursor-pointer">{[10, 20, 50].map(s => <option key={s} value={s}>{s}건씩</option>)}</select>
                </div>
                <div className="flex-1 overflow-auto relative">
                    {isLoading && <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10"><Loader2 className="w-5 h-5 text-slate-600 animate-spin" /></div>}
                    <table className="min-w-[1500px]">
                        <thead className="sticky top-0 z-10 bg-slate-50">
                            <tr className="border-b border-slate-200">
                                {table.getHeaderGroups()[0].headers.map(h => (
                                    <th key={h.id} className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap" style={{ width: h.getSize() !== 150 ? h.getSize() : undefined }}>
                                        {h.column.getCanSort() ? <button onClick={h.column.getToggleSortingHandler()} className="flex items-center gap-1 hover:text-slate-800 transition-colors">{flexRender(h.column.columnDef.header, h.getContext())}<SortIcon sorted={h.column.getIsSorted()} /></button> : flexRender(h.column.columnDef.header, h.getContext())}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {table.getRowModel().rows.map(row => (
                                <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors duration-150 cursor-pointer group">
                                    {row.getVisibleCells().map(cell => (<td key={cell.id} className="px-4 py-3 whitespace-nowrap">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>))}
                                </tr>
                            ))}
                            {!isLoading && data.length === 0 && <tr><td colSpan={tableColumns.length} className="px-4 py-16 text-center text-slate-400 text-sm">검색 결과가 없습니다.</td></tr>}
                        </tbody>
                    </table>
                </div>
                <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 flex-shrink-0 bg-slate-50/80">
                    <p className="text-[12px] text-slate-500"><span className="font-bold text-slate-800">{total > 0 ? `${pagination.pageIndex * pagination.pageSize + 1}–${Math.min((pagination.pageIndex + 1) * pagination.pageSize, total)}` : '0'}</span> / 전체 {total.toLocaleString()}건</p>
                    <div className="flex items-center gap-1">
                        <button onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()} className="p-1.5 rounded-md border border-slate-300 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"><ChevronsLeft className="w-3.5 h-3.5" /></button>
                        <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="p-1.5 rounded-md border border-slate-300 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"><ChevronLeft className="w-3.5 h-3.5" /></button>
                        {Array.from({ length: Math.min(5, pageCount) }, (_, i) => { let s = Math.max(0, pagination.pageIndex - 2); s = Math.max(0, Math.min(pageCount, s + 5) - 5); return s + i; }).filter(p => p < pageCount).map(p => (
                            <button key={p} onClick={() => table.setPageIndex(p)} className={`min-w-[32px] h-8 px-2 rounded-md text-[12px] font-semibold transition-all duration-150 border ${p === pagination.pageIndex ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-300 text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>{p + 1}</button>
                        ))}
                        <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="p-1.5 rounded-md border border-slate-300 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"><ChevronRight className="w-3.5 h-3.5" /></button>
                        <button onClick={() => table.setPageIndex(pageCount - 1)} disabled={!table.getCanNextPage()} className="p-1.5 rounded-md border border-slate-300 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"><ChevronsRight className="w-3.5 h-3.5" /></button>
                    </div>
                </div>
            </div>

            {/* ══════ 수정 모달 ══════ */}
            {editItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40" onClick={closeEdit} />
                    <div className="relative bg-white rounded-md shadow-xl w-full max-w-[640px] max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-300 flex-shrink-0">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 tracking-tight">안건 수정</h3>
                                <p className="text-xs text-slate-500 mt-0.5">No. {editItem.id} · {editItem.category} · {PRIORITY_LABEL[editItem.priority]}</p>
                            </div>
                            <button onClick={closeEdit} className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-6 py-5">
                            <FormFields form={editForm} setForm={setEditForm} />
                        </div>
                        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-300 bg-slate-50 rounded-b-md flex-shrink-0">
                            <button onClick={closeEdit} className="flex items-center gap-1.5 px-4 py-2.5 border border-slate-300 text-slate-700 text-sm font-semibold rounded-md hover:bg-white hover:border-slate-400 transition-all"><X className="w-4 h-4" />취소</button>
                            <button onClick={closeEdit} className="flex items-center gap-1.5 px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-md hover:bg-slate-800 active:scale-[0.98] transition-all shadow-sm"><Save className="w-4 h-4" />저장</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════ 우측 드로어 (등록/수정) ══════ */}
            {drawerItem && (
                <div className="fixed inset-0 z-[100] flex justify-end">
                    <div className="absolute inset-0 bg-black/40 animate-in fade-in duration-200" onClick={closeDrawer} />
                    <div className="relative w-[460px] bg-white h-full shadow-xl flex flex-col animate-in slide-in-from-right duration-250 border-l border-slate-300">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-300">
                            <div>
                                <h2 className="text-sm font-bold text-slate-900">{drawerMode === 'create' ? '안건 등록' : '안건 수정'}</h2>
                                <p className="text-xs text-slate-500 mt-0.5">{drawerMode === 'create' ? '신규 안건을 등록합니다' : `No. ${drawerItem.id} 안건을 수정합니다`}</p>
                            </div>
                            <button onClick={closeDrawer} className="w-7 h-7 flex items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 transition-all"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-5 py-5">
                            <FormFields form={drawerForm} setForm={setDrawerForm} compact />
                        </div>
                        <div className="px-5 py-4 border-t border-slate-300 flex gap-2.5">
                            <button onClick={closeDrawer} className="flex-1 py-2.5 text-sm font-semibold text-slate-700 border border-slate-300 rounded-md hover:bg-slate-100 transition-all">취소</button>
                            <button onClick={closeDrawer} className="flex-1 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-all shadow-sm">{drawerMode === 'create' ? '등록' : '저장'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════ 삭제 확인 모달 ══════ */}
            {deleteItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteItem(null)} />
                    <div className="relative bg-white rounded-md shadow-xl w-full max-w-[400px] p-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-start gap-3 mb-5">
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                                <AlertCircle className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900">안건 삭제</h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    <span className="font-semibold text-slate-700">{deleteItem.title}</span>을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2.5">
                            <button onClick={() => setDeleteItem(null)} className="flex-1 py-2.5 text-sm font-semibold text-slate-700 border border-slate-300 rounded-md hover:bg-slate-100 transition-all">취소</button>
                            <button onClick={() => setDeleteItem(null)} className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md transition-all shadow-sm">삭제</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
