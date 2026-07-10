'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import api, { getApiErrorMessage } from '@/lib/api';
import PageLayout from '@/components/layout/page-layout';
import { GridCell } from '@/components/layout/grid-cell';
import { WidgetRenderer } from '@/app/admin/templates/make/_shared/components/renderer';
import type { SpaceWidget } from '@/app/admin/templates/make/_shared/components/renderer';
import type { FormWidget } from '@/app/admin/templates/make/_shared/components/builder/FormBuilder';
import { useI18n } from '@/hooks/use-i18n';

/* ── 타입 ── */

interface Role {
    id: number;
    code: string;
    displayName: string;
    description: string;
    color: string;
    isSystem: boolean;
    memberCount: number;
}

/* ── 상수 ── */

const COLOR_PRESETS = ['#4361ee', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#6b7280'];

/* ── 페이지 컴포넌트 ── */

export default function RolesDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { t } = useI18n();
    const id = params.id as string;
    const isNew = id === 'new';

    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);

    /* fieldId → value 형태로 관리 (WidgetRenderer 규격) */
    const [formValues, setFormValues] = useState<Record<string, string>>({
        code: '',
        displayName: '',
        description: '',
        color: COLOR_PRESETS[0],
    });

    /** 공간영역 위젯 — 취소 / 저장 버튼 */
    const SPACE_WIDGET: SpaceWidget = useMemo(() => ({
        type: 'space',
        widgetId: 'roles-detail-space',
        align: 'right',
        showBorder: false,
        items: [
            {
                id: 's1',
                type: 'action-button',
                label: t('common.btn.cancel'),
                colSpan: 1,
                color: 'gray',
                connType: 'close',
            },
            {
                id: 's2',
                type: 'action-button',
                label: t('common.btn.save'),
                colSpan: 1,
                color: 'black',
                connType: 'content',
                connectedContentWidgetIds: ['roles-detail-form'],
                contentAction: 'save',
            },
        ],
    }), [t]);

    /** 기본 정보 폼 위젯 */
    const FORM_WIDGET: FormWidget = useMemo(() => ({
        type: 'form',
        widgetId: 'roles-detail-form',
        contentKey: 'rolesDetailForm',
        title: isNew ? t('role.title.new') : t('role.title.edit'),
        description: t('admin.description'),
        showBorder: true,
        fields: [
            {
                id: 'code',
                type: 'input',
                label: t('role.label.code'),
                colSpan: 6,
                rowSpan: 1,
                required: isNew,
                fieldKey: 'code',
                placeholder: 'SUPER_ADMIN',
                description: t('validation.code.code.format'),
                readonly: !isNew,
            },
            {
                id: 'displayName',
                type: 'input',
                label: t('common.label.displayName'),
                colSpan: 6,
                rowSpan: 1,
                required: true,
                fieldKey: 'displayName',
                placeholder: t('role.placeholder.displayName'),
            },
            {
                id: 'description',
                type: 'input',
                label: t('common.label.description'),
                colSpan: 12,
                rowSpan: 1,
                fieldKey: 'description',
                placeholder: t('role.placeholder.description'),
            },
            {
                id: 'color',
                type: 'color',
                label: t('common.label.color'),
                colSpan: 12,
                rowSpan: 1,
                required: true,
                fieldKey: 'color',
                options: COLOR_PRESETS,
            },
        ],
    }), [isNew, t]);

    /* 수정 모드: 기존 데이터 로드 */
    useEffect(() => {
        if (isNew) return;
        const load = async () => {
            setLoading(true);
            try {
                const res = await api.get<Role>(`/roles/${id}`);
                const role = res.data;
                setFormValues({
                    code: role.code,
                    displayName: role.displayName,
                    description: role.description ?? '',
                    color: role.color ?? COLOR_PRESETS[0],
                });
            } catch {
                toast.error(t('role.error.load'));
                router.back();
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id, isNew, router, t]);

    /* 폼 필드 변경 핸들러 */
    const handleFormChange = useCallback((fieldId: string, value: string) => {
        setFormValues(prev => ({ ...prev, [fieldId]: value }));
    }, []);

    /* 저장 — 등록(POST) / 수정(PATCH) */
    const handleContentAction = useCallback(async (_widgetIds: string[], action: 'save' | 'delete') => {
        if (action !== 'save' || saving) return;

        /* 클라이언트 유효성 검증 */
        if (isNew && !formValues.code?.trim()) {
            toast.error(t('validation.role.code.required'));
            return;
        }
        if (!formValues.displayName?.trim()) {
            toast.error(t('validation.role.displayName.required'));
            return;
        }
        if (!formValues.color) {
            toast.error(t('validation.role.color.required'));
            return;
        }

        setSaving(true);
        try {
            if (isNew) {
                await api.post('/roles', {
                    code: formValues.code.toUpperCase(),
                    displayName: formValues.displayName,
                    description: formValues.description || null,
                    color: formValues.color,
                });
                toast.success(t('role.created'));
            } else {
                await api.patch(`/roles/${id}`, {
                    displayName: formValues.displayName,
                    description: formValues.description || null,
                    color: formValues.color,
                });
                toast.success(t('role.updated'));
            }
            router.push('/admin/settings/roles');
        } catch (e: unknown) {
            toast.error(getApiErrorMessage(e, t('admin.error.save')));
        } finally {
            setSaving(false);
        }
    }, [formValues, id, isNew, router, saving, t]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <span className="text-sm text-slate-400">{t('common.loading')}</span>
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
