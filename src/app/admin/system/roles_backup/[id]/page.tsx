'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import api from '@/lib/api';
import PageLayout from '@/components/layout/PageLayout';
import { GridCell } from '@/components/layout/GridCell';
import { WidgetRenderer } from '@/app/admin/templates/make/_shared/components/renderer';
import type { SpaceWidget } from '@/app/admin/templates/make/_shared/components/renderer';
import type { FormWidget } from '@/app/admin/templates/make/_shared/components/builder/FormBuilder';

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

/** 공간영역 위젯 — 취소 / 저장 버튼 */
const SPACE_WIDGET: SpaceWidget = {
    type: 'space',
    widgetId: 'roles-detail-space',
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
            connectedContentWidgetIds: ['roles-detail-form'],
            contentAction: 'save',
        },
    ],
};

/* ── 페이지 컴포넌트 ── */

export default function RolesDetailPage() {
    const params = useParams();
    const router = useRouter();
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

    /* FormWidget — isNew에 따라 코드 필드 readonly 결정 */
    const FORM_WIDGET: FormWidget = useMemo(() => ({
        type: 'form',
        widgetId: 'roles-detail-form',
        contentKey: 'rolesDetailForm',
        title: isNew ? '권한 등록' : '권한 수정',
        description: '필수 입력 항목은 * 로 표시됩니다.',
        showBorder: true,
        fields: [
            {
                id: 'code',
                type: 'input',
                label: '권한 코드',
                colSpan: 6,
                rowSpan: 1,
                required: isNew,
                fieldKey: 'code',
                placeholder: 'SUPER_ADMIN',
                description: '영문 대문자, 숫자, _만 사용 가능합니다.',
                readonly: !isNew,
            },
            {
                id: 'displayName',
                type: 'input',
                label: '표시명',
                colSpan: 6,
                rowSpan: 1,
                required: true,
                fieldKey: 'displayName',
                placeholder: '표시명 입력',
            },
            {
                id: 'description',
                type: 'input',
                label: '설명',
                colSpan: 12,
                rowSpan: 1,
                fieldKey: 'description',
                placeholder: '권한 설명 (선택)',
            },
            {
                id: 'color',
                type: 'color',
                label: '색상',
                colSpan: 12,
                rowSpan: 1,
                required: true,
                fieldKey: 'color',
                options: COLOR_PRESETS,
            },
        ],
    }), [isNew]);

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
                toast.error('권한 정보를 불러오지 못했습니다.');
                router.back();
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id, isNew, router]);

    /* 폼 필드 변경 핸들러 */
    const handleFormChange = useCallback((fieldId: string, value: string) => {
        setFormValues(prev => ({ ...prev, [fieldId]: value }));
    }, []);

    /* 저장 — 등록(POST) / 수정(PATCH) */
    const handleContentAction = useCallback(async (_widgetIds: string[], action: 'save' | 'delete') => {
        if (action !== 'save' || saving) return;

        /* 클라이언트 유효성 검증 */
        if (isNew && !formValues.code?.trim()) {
            toast.error('권한 코드를 입력해주세요.');
            return;
        }
        if (!formValues.displayName?.trim()) {
            toast.error('표시명을 입력해주세요.');
            return;
        }
        if (!formValues.color) {
            toast.error('색상을 선택해주세요.');
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
                toast.success('권한이 등록되었습니다.');
            } else {
                await api.patch(`/roles/${id}`, {
                    displayName: formValues.displayName,
                    description: formValues.description || null,
                    color: formValues.color,
                });
                toast.success('권한이 수정되었습니다.');
            }
            router.push('/admin/system/roles');
        } catch (e: unknown) {
            const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(msg ?? '저장 중 오류가 발생했습니다.');
        } finally {
            setSaving(false);
        }
    }, [formValues, id, isNew, router, saving]);

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

            {/* 공간영역 — 취소/저장 버튼 (align:'right', 버튼 2개 → 11번째 칸부터 2칸 배치) */}
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
