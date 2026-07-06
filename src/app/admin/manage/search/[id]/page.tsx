'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import PageLayout from '@/components/layout/page-layout';
import { GridCell } from '@/components/layout/grid-cell';
import { ToggleSwitch } from '@/components/ui/toggle-switch';
import api from '@/lib/api';

/* ── 검색텍스트 단건 타입 ── */
interface SearchTextEntry {
    id: number;
    text: string;
    createdAt: string;
}

/* ── 검색관리 단건 상세 응답 타입 ── */
interface SearchMgmtDetail {
    id: number;
    url: string;
    active: boolean;
    texts: SearchTextEntry[];
}

/* ── 검색관리 등록/수정 통합 페이지 (id === 'new'이면 신규 등록) ── */
export default function SearchMgmtDetailPage() {
    const params = useParams();
    const router = useRouter();
    const routeId = params.id as string;
    const isNew = routeId === 'new';

    /* 실제 저장된 부모 id — 신규 등록 전에는 null */
    const [savedId, setSavedId] = useState<number | null>(isNew ? null : Number(routeId));

    const [url, setUrl] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [textInput, setTextInput] = useState('');
    const [textList, setTextList] = useState<SearchTextEntry[]>([]);
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);

    /* 수정 모드 — 실제 데이터 로드 */
    useEffect(() => {
        if (isNew) return;
        const load = async () => {
            setLoading(true);
            try {
                const res = await api.get<SearchMgmtDetail>(`/search-manage/${routeId}`);
                setUrl(res.data.url);
                setIsActive(res.data.active);
                setTextList(res.data.texts.map(t => ({
                    id: t.id,
                    text: t.text,
                    createdAt: t.createdAt.slice(0, 19).replace('T', ' '),
                })));
            } catch {
                toast.error('데이터를 찾을 수 없습니다.');
                router.back();
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [routeId, isNew, router]);

    /* 등록 — 화면 전체(URL/사용여부 + 입력 중인 검색텍스트) 한 번에 저장
       신규면 생성 후 해당 id로 URL만 교체(화면 이동 없음), 기존이면 그대로 갱신 */
    const handleRegister = useCallback(async () => {
        if (!url.trim()) {
            toast.error('URL을 입력해주세요.');
            return;
        }
        setSaving(true);
        try {
            const trimmedText = textInput.trim();

            if (savedId) {
                await api.put(`/search-manage/${savedId}`, { url: url.trim(), active: isActive });
                if (trimmedText) {
                    const res = await api.post<SearchMgmtDetail>(`/search-manage/${savedId}/texts`, { text: trimmedText });
                    setTextList(res.data.texts.map(t => ({
                        id: t.id,
                        text: t.text,
                        createdAt: t.createdAt.slice(0, 19).replace('T', ' '),
                    })));
                    setTextInput('');
                }
                toast.success('저장되었습니다.');
                return;
            }

            const created = await api.post<SearchMgmtDetail>('/search-manage', { url: url.trim(), active: isActive });
            const newId = created.data.id;
            let latestTexts = created.data.texts;

            if (trimmedText) {
                const res = await api.post<SearchMgmtDetail>(`/search-manage/${newId}/texts`, { text: trimmedText });
                latestTexts = res.data.texts;
                setTextInput('');
            }

            setSavedId(newId);
            setTextList(latestTexts.map(t => ({
                id: t.id,
                text: t.text,
                createdAt: t.createdAt.slice(0, 19).replace('T', ' '),
            })));
            toast.success('등록되었습니다.');
            router.replace(`/admin/manage/search/${newId}`);
        } catch {
            toast.error('저장에 실패했습니다.');
        } finally {
            setSaving(false);
        }
    }, [url, isActive, textInput, savedId, router]);

    /* 검색텍스트 삭제 — 브라우저 기본 confirm으로 확인 후 실행 */
    const handleDeleteText = useCallback(async (entryId: number) => {
        if (!savedId) return;
        if (!confirm('이 검색텍스트를 삭제하시겠습니까?')) return;
        try {
            await api.delete(`/search-manage/${savedId}/texts/${entryId}`);
            setTextList(prev => prev.filter(e => e.id !== entryId));
        } catch {
            toast.error('검색텍스트 삭제에 실패했습니다.');
        }
    }, [savedId]);

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <span className="text-sm text-slate-400">불러오는 중...</span>
            </div>
        );
    }

    return (
        <PageLayout mode="live">
            {/* URL + 사용여부 */}
            <GridCell colSpan={12} rowSpan={2}>
                <div className="h-full space-y-4 rounded-lg border border-slate-200 bg-white p-5">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">URL</label>
                        <input
                            type="text"
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                            placeholder="URL 입력"
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">사용여부</span>
                        <ToggleSwitch checked={isActive} onChange={setIsActive} />
                    </div>
                </div>
            </GridCell>

            {/* 검색텍스트 등록 */}
            <GridCell colSpan={12} rowSpan={3}>
                <div className="h-full space-y-2 rounded-lg border border-slate-200 bg-white p-5">
                    <label className="block text-sm font-medium text-slate-700">검색텍스트</label>
                    <textarea
                        value={textInput}
                        onChange={e => setTextInput(e.target.value)}
                        placeholder="검색용 텍스트를 입력하세요."
                        rows={3}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                    />
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => router.push('/admin/manage/search')}
                            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                        >
                            목록
                        </button>
                        <button
                            type="button"
                            onClick={handleRegister}
                            disabled={saving}
                            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            등록
                        </button>
                    </div>
                </div>
            </GridCell>

            {/* 등록된 검색텍스트 목록 — 최신순, 넘치면 내부 스크롤 */}
            <GridCell colSpan={12} rowSpan={9}>
                <div className="h-full space-y-2 overflow-y-auto pr-1">
                    {textList.length === 0 && (
                        <p className="p-4 text-center text-sm text-slate-400">등록된 검색텍스트가 없습니다.</p>
                    )}
                    {textList.map(entry => (
                        <div
                            key={entry.id}
                            className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3"
                        >
                            <div>
                                <p className="whitespace-pre-wrap text-sm text-slate-800">{entry.text}</p>
                                <p className="mt-1 text-xs text-slate-400">{entry.createdAt}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleDeleteText(entry.id)}
                                className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                            >
                                삭제
                            </button>
                        </div>
                    ))}
                </div>
            </GridCell>
        </PageLayout>
    );
}
