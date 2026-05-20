'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import PageLayout from '@/components/layout/PageLayout';
import { GridCell } from '@/components/layout/GridCell';
import { WidgetRenderer } from '@/app/admin/templates/make/_shared/components/renderer';
import type { SpaceWidget } from '@/app/admin/templates/make/_shared/components/renderer';
import type { FormWidget } from '@/app/admin/templates/make/_shared/components/builder/FormBuilder';
import { useSiteStore } from '@/store/useSiteStore';

/* ── 공간영역 — 취소 / 저장 ── */

const SPACE_WIDGET: SpaceWidget = {
    type: 'space',
    widgetId: 'sites-detail-space',
    align: 'right',
    showBorder: false,
    items: [
        {
            id: 's1',
            type: 'action-button',
            label: '취소',
            colSpan: 1,
            color: 'gray',
            connType: 'close',
        },
        {
            id: 's2',
            type: 'action-button',
            label: '저장',
            colSpan: 1,
            color: 'black',
            connType: 'content',
            connectedContentWidgetIds: ['sites-detail-form'],
            contentAction: 'save',
        },
    ],
};

/* ── 페이지 컴포넌트 ── */

export default function SiteDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const isNew = id === 'new';

    const { createSite, updateSite } = useSiteStore();

    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);

    const [formValues, setFormValues] = useState<Record<string, string>>({
        name: '',
        description: '',
        domain: '',
        isActive: 'true',
    });

    /* 폼 위젯 — isNew에 따라 타이틀 변경 */
    const FORM_WIDGET: FormWidget = useMemo(() => ({
        type: 'form',
        widgetId: 'sites-detail-form',
        contentKey: 'sitesDetailForm',
        title: isNew ? '홈페이지 등록' : '홈페이지 수정',
        description: '필수 입력 항목은 * 로 표시됩니다.',
        showBorder: true,
        fields: [
            {
                id: 'name',
                type: 'input',
                label: '홈페이지명',
                colSpan: 8,
                rowSpan: 1,
                required: true,
                fieldKey: 'name',
                placeholder: '예: 북미홈페이지',
            },
            {
                id: 'isActive',
                type: 'select',
                label: '사용여부',
                colSpan: 4,
                rowSpan: 1,
                required: true,
                fieldKey: 'isActive',
                options: ['true', 'false'],
            },
            {
                id: 'domain',
                type: 'input',
                label: '도메인',
                colSpan: 12,
                rowSpan: 1,
                required: false,
                fieldKey: 'domain',
                placeholder: '예: www.example.com',
            },
            {
                id: 'description',
                type: 'input',
                label: '설명',
                colSpan: 12,
                rowSpan: 1,
                required: false,
                fieldKey: 'description',
                placeholder: '선택사항',
            },
        ],
    }), [isNew]);

    /* 수정 모드: 기존 데이터 로드 */
    useEffect(() => {
        if (isNew) return;
        const load = async () => {
            setLoading(true);
            try {
                const { default: api } = await import('@/lib/api');
                const res = await api.get(`/sites/${id}`);
                const site = res.data;
                setFormValues({
                    name: site.name ?? '',
                    description: site.description ?? '',
                    domain: site.domain ?? '',
                    isActive: String(site.isActive),
                });
            } catch {
                toast.error('홈페이지 정보를 불러오지 못했습니다.');
                router.back();
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id, isNew, router]);

    /* 폼 필드 변경 */
    const handleFormChange = useCallback((fieldId: string, value: string) => {
        setFormValues(prev => ({ ...prev, [fieldId]: value }));
    }, []);

    /* 저장 */
    const handleContentAction = useCallback(async (_widgetIds: string[], action: 'save' | 'delete') => {
        if (action !== 'save' || saving) return;

        if (!formValues.name?.trim()) {
            toast.error('홈페이지명을 입력해주세요.');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                name: formValues.name.trim(),
                description: formValues.description?.trim() || undefined,
                domain: formValues.domain?.trim() || undefined,
                isActive: formValues.isActive === 'true',
            };

            if (isNew) {
                await createSite(payload);
                toast.success('홈페이지가 등록되었습니다.');
            } else {
                await updateSite(Number(id), payload);
                toast.success('홈페이지가 수정되었습니다.');
            }
            router.push('/admin/settings/sites');
        } catch {
            /* store에서 toast 처리 */
        } finally {
            setSaving(false);
        }
    }, [formValues, id, isNew, saving, createSite, updateSite, router]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <span className="text-sm text-slate-400">불러오는 중...</span>
            </div>
        );
    }

    return (
        <PageLayout mode="live">
            {/* 폼 위젯 */}
            <GridCell colSpan={12} rowSpan={5}>
                <WidgetRenderer
                    mode="live"
                    widget={FORM_WIDGET}
                    contentColSpan={12}
                    formValues={formValues}
                    onFormValuesChange={handleFormChange}
                />
            </GridCell>

            {/* 공간영역 — 취소/저장 버튼 */}
            <GridCell colSpan={2} colStart={11} rowSpan={1}>
                <WidgetRenderer
                    mode="live"
                    widget={SPACE_WIDGET}
                    contentColSpan={2}
                    onContentAction={handleContentAction}
                    onClose={() => router.back()}
                />
            </GridCell>
        </PageLayout>
    );
}
