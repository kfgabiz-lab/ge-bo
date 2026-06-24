'use client';
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { saveTemplate, PageWidgetItem } from '../templateApi';
import { TemplateItem } from '../types';

/**
 * 빌더 페이지 공통 템플릿 관리 훅
 * - 불러오기(목록/삭제/복사) + 저장(모달/확인) 상태와 핸들러 통합 제공
 *
 * 사용 예시:
 *   const tm = useTemplateManagement('QUICK_LIST');
 *   <TemplateLoader {...tm} onSelect={handleLoadSelect} />
 *   <SaveModal show={tm.showSaveModal} onConfirm={() => tm.handleSaveConfirm(buildWidgetItems())} ... />
 *
 * @param templateType 필터링 및 저장에 사용할 타입 ('PAGE' | 'QUICK_LIST' | 'QUICK_DETAIL')
 */
export function useTemplateManagement(templateType: string) {

    /* ── 불러오기 상태 ── */
    const [templateList,    setTemplateList]    = useState<TemplateItem[]>([]);
    const [isLoadingList,   setIsLoadingList]   = useState(false);
    const [showLoadDropdown, setShowLoadDropdown] = useState(false);
    const [loadSearch,      setLoadSearch]      = useState('');
    const [isDeletingId,    setIsDeletingId]    = useState<number | null>(null);
    const [isDuplicatingId, setIsDuplicatingId] = useState<number | null>(null);

    /* ── 저장 상태 ── */
    const [currentTemplateId,   setCurrentTemplateId]   = useState<number | null>(null);
    const [currentTemplateName, setCurrentTemplateName] = useState('');
    const [showSaveModal,       setShowSaveModal]       = useState(false);
    const [saveModalName,       setSaveModalName]       = useState('');
    const [saveModalSlug,       setSaveModalSlug]       = useState('');
    const [saveModalDesc,       setSaveModalDesc]       = useState('');
    const [isSaving,            setIsSaving]            = useState(false);

    /* ── 검색 필터 (파생 상태) ── */
    const filteredTemplates = templateList.filter(t =>
        t.name.toLowerCase().includes(loadSearch.toLowerCase()) ||
        t.slug.toLowerCase().includes(loadSearch.toLowerCase())
    );

    /* ── 목록 조회 ── */
    const loadTemplateList = useCallback(async () => {
        setIsLoadingList(true);
        try {
            const res = await api.get('/page-templates');
            setTemplateList((res.data || []).filter((t: TemplateItem) => t.templateType === templateType));
        } catch { /* 조용히 처리 */ } finally {
            setIsLoadingList(false);
        }
    }, [templateType]);

    /* ── 불러오기 성공 후 공통 처리 (currentTemplateId/Name 업데이트 + 드롭다운 닫기 + toast) ── */
    const onLoadSuccess = useCallback((tpl: TemplateItem) => {
        setCurrentTemplateId(tpl.id);
        setCurrentTemplateName(tpl.name);
        setSaveModalSlug(tpl.slug);
        setShowLoadDropdown(false);
        toast.success(`"${tpl.name}" 불러왔습니다.`);
    }, []);

    /* ── 저장 모달 열기 ── */
    const openSaveModal = useCallback(() => {
        setSaveModalName(currentTemplateName || '');
        if (!currentTemplateId) {
            setSaveModalSlug('');
            setSaveModalDesc('');
        }
        setShowSaveModal(true);
    }, [currentTemplateId, currentTemplateName]);

    /* ── 삭제 ── */
    const handleDeleteTemplate = useCallback(async (id: number) => {
        if (!window.confirm('템플릿을 삭제하시겠습니까?')) return;
        setIsDeletingId(id);
        try {
            await api.delete(`/page-templates/${id}`);
            setTemplateList(prev => prev.filter(t => t.id !== id));
            if (currentTemplateId === id) {
                setCurrentTemplateId(null);
                setCurrentTemplateName('');
            }
            toast.success('템플릿이 삭제되었습니다.');
        } catch {
            toast.error('삭제 중 오류가 발생했습니다.');
        } finally { setIsDeletingId(null); }
    }, [currentTemplateId]);

    /* ── 복사 ── */
    const handleDuplicateTemplate = useCallback(async (tpl: TemplateItem) => {
        setIsDuplicatingId(tpl.id);
        try {
            const newName = `${tpl.name} (복사)`;
            const res = await api.post('/page-templates', {
                name: newName, slug: `${tpl.slug}-copy`,
                description: tpl.description, configJson: tpl.configJson, templateType,
            });
            setTemplateList(prev => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)));
            toast.success(`"${newName}" 으로 복사되었습니다.`);
        } catch (err: unknown) {
            const axiosError = err as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || '복사 중 오류가 발생했습니다.');
        } finally { setIsDuplicatingId(null); }
    }, [templateType]);

    /* ── 저장 확인 ── */
    const handleSaveConfirm = useCallback(async (
        widgetItems: PageWidgetItem[],
        extra?: Record<string, unknown>,
    ) => {
        setIsSaving(true);
        try {
            /* 카테고리 위젯 depth 2+ dbSlug를 depth 1 값으로 전파 */
            const allWidgets = widgetItems.flatMap(item => item.contents.map(c => c.widget)) as { type?: string; depth?: number; dbSlug?: string; widgetId?: string; parentWidgetId?: string }[];
            const catDepth1 = allWidgets.find(w => w.type === 'category' && w.depth === 1);
            const depth1Slug = catDepth1?.dbSlug ?? '';
            const processedItems = depth1Slug
                ? widgetItems.map(item => ({
                    ...item,
                    contents: item.contents.map(c => {
                        const w = c.widget as { type?: string; depth?: number; dbSlug?: string };
                        if (w.type === 'category' && (w.depth ?? 1) > 1) {
                            return { ...c, widget: { ...c.widget, dbSlug: depth1Slug } };
                        }
                        return c;
                    }),
                }))
                : widgetItems;

            const result = await saveTemplate({
                id: currentTemplateId,
                name: saveModalName,
                slug: saveModalSlug,
                description: saveModalDesc,
                templateType,
                widgetItems: processedItems,
                extra,
            });
            setCurrentTemplateId(result.id);
            setCurrentTemplateName(result.name);
            setSaveModalSlug(result.slug);
            setShowSaveModal(false);
            toast.success(currentTemplateId ? '템플릿이 수정되었습니다.' : '템플릿이 저장되었습니다.');
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(msg || '저장 중 오류가 발생했습니다.');
        } finally { setIsSaving(false); }
    }, [currentTemplateId, saveModalName, saveModalSlug, saveModalDesc, templateType]);

    return {
        /* 불러오기 */
        templateList, isLoadingList,
        showLoadDropdown, setShowLoadDropdown,
        loadSearch, setLoadSearch,
        isDeletingId, isDuplicatingId,
        filteredTemplates,
        loadTemplateList, onLoadSuccess,
        handleDeleteTemplate, handleDuplicateTemplate,
        /* 저장 */
        currentTemplateId, currentTemplateName,
        showSaveModal, setShowSaveModal,
        saveModalName, setSaveModalName,
        saveModalSlug, setSaveModalSlug,
        saveModalDesc, setSaveModalDesc,
        isSaving,
        openSaveModal, handleSaveConfirm,
    };
}
