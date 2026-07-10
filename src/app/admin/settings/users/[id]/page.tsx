'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import api, { getApiErrorMessage } from '@/lib/api';
import { useSiteStore } from '@/store/use-site-store';
import PageLayout from '@/components/layout/page-layout';
import { GridCell } from '@/components/layout/grid-cell';
import { WidgetRenderer } from '@/app/admin/templates/make/_shared/components/renderer';
import type { SpaceWidget } from '@/app/admin/templates/make/_shared/components/renderer';
import type { FormWidget } from '@/app/admin/templates/make/_shared/components/builder/FormBuilder';
import { useI18n } from '@/hooks/use-i18n';

/* ── 타입 ── */

interface AdminDetail {
    id: number;
    email: string;
    name: string;
    deptCode: string;
    deptName: string;
    remark: string;
    role: string;
    isActive: boolean;
}

interface AssignableRole {
    id: number;
    code: string;
    displayName: string;
}

/* ── 페이지 컴포넌트 ── */

export default function AdminDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { t } = useI18n();
    const id = params.id as string;
    const isNew = id === 'new';

    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [adminData, setAdminData] = useState<AdminDetail | null>(null);

    /* 폼 값 — isActive는 'true'/'false' 문자열로 관리 */
    const [formValues, setFormValues] = useState<Record<string, string>>({
        email: '',
        name: '',
        deptCode: '',
        deptName: '',
        role: '',
        isActive: 'true',
        remark: '',
        sitePermissions: '',
    });

    /* 수정 모드: 로드된 site ID 목록 */
    const [loadedSiteIds, setLoadedSiteIds] = useState<number[]>([]);

    /* 배정 가능한 역할 목록 */
    const [roles, setRoles] = useState<AssignableRole[]>([]);

    /* 홈페이지 목록 */
    const { sites, fetchSites } = useSiteStore();

    useEffect(() => {
        api.get<AssignableRole[]>('/roles/assignable')
            .then(res => setRoles(res.data))
            .catch(() => toast.error(t('admin.error.roles_load')));
    }, [t]);

    useEffect(() => { if (sites.length === 0) fetchSites(); }, [sites.length, fetchSites]);

    /* sites와 loadedSiteIds가 모두 준비됐을 때 name으로 변환 */
    useEffect(() => {
        if (isNew || loadedSiteIds.length === 0 || sites.length === 0) return;
        const names = loadedSiteIds
            .map(siteId => sites.find(s => s.id === siteId)?.name ?? '')
            .filter(Boolean);
        setFormValues(prev => ({ ...prev, sitePermissions: names.join(',') }));
    }, [isNew, loadedSiteIds, sites]);

    /* roles와 adminData가 모두 준비됐을 때 code → displayName 변환 */
    useEffect(() => {
        if (isNew || !adminData || roles.length === 0) return;
        const displayName = roles.find(r => r.code === adminData.role)?.displayName ?? adminData.role;
        setFormValues(prev => ({ ...prev, role: displayName }));
    }, [isNew, adminData, roles]);

    /* 수정 모드: 기존 데이터 로드 */
    useEffect(() => {
        if (isNew) return;
        const load = async () => {
            setLoading(true);
            try {
                const [adminRes, sitesRes] = await Promise.all([
                    api.get<AdminDetail>(`/admins/${id}`),
                    api.get<{ id: number }[]>(`/admins/${id}/sites`),
                ]);
                const admin = adminRes.data;
                setAdminData(admin);
                setFormValues(prev => ({
                    ...prev,
                    email:    admin.email,
                    name:     admin.name,
                    deptCode: admin.deptCode ?? '',
                    deptName: admin.deptName ?? '',
                    role:     admin.role,
                    isActive: String(admin.isActive),
                    remark:   admin.remark ?? '',
                }));
                setLoadedSiteIds(sitesRes.data.map(s => s.id));
            } catch {
                toast.error(t('admin.error.load'));
                router.back();
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id, isNew, router, t]);

    /* 취소 / 저장 버튼 */
    const SPACE_WIDGET: SpaceWidget = useMemo(() => ({
        type: 'space',
        widgetId: 'admins-detail-space',
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
                connectedContentWidgetIds: ['admins-detail-form'],
                contentAction: 'save',
            },
        ],
    }), [t]);

    /* 접속이력 버튼 — 수정 모드 전용 */
    const RESET_SPACE_WIDGET: SpaceWidget = useMemo(() => ({
        type: 'space',
        widgetId: 'admins-reset-space',
        align: 'left',
        showBorder: false,
        items: [
            {
                id: 'r1',
                type: 'action-button',
                label: t('admin.btn.history'),
                colSpan: 1,
                color: 'gray',
                connType: 'close',
            },
        ],
    }), [t]);

    /* 기본 정보 폼 위젯 */
    const FORM_WIDGET: FormWidget = useMemo(() => ({
        type: 'form',
        widgetId: 'admins-detail-form',
        contentKey: 'adminsDetailForm',
        title: isNew ? t('admin.title.new') : t('admin.title.edit'),
        description: t('admin.description'),
        showBorder: true,
        fields: [
            /* 1행: 아이디 / 사용자명 */
            {
                id: 'email',
                type: 'input',
                label: t('common.label.id'),
                colSpan: 6,
                rowSpan: 1,
                required: true,
                fieldKey: 'email',
                placeholder: 'admin@example.com',
                readonly: !isNew,
            },
            {
                id: 'name',
                type: 'input',
                label: t('common.label.name'),
                colSpan: 6,
                rowSpan: 1,
                required: true,
                fieldKey: 'name',
                placeholder: t('admin.placeholder.username'),
                readonly: !isNew,
            },
            /* 2행: 부서코드 / 부서명 */
            {
                id: 'deptCode',
                type: 'input',
                label: t('common.label.deptCode'),
                colSpan: 6,
                rowSpan: 1,
                fieldKey: 'deptCode',
                placeholder: t('admin.placeholder.deptCode'),
                readonly: !isNew,
            },
            {
                id: 'deptName',
                type: 'input',
                label: t('common.label.deptName'),
                colSpan: 6,
                rowSpan: 1,
                fieldKey: 'deptName',
                placeholder: t('admin.placeholder.deptNameInput'),
                readonly: !isNew,
            },
            /* 3행: 권한 / 계정상태 */
            {
                id: 'role',
                type: 'select',
                label: t('common.label.role'),
                colSpan: 6,
                rowSpan: 1,
                required: true,
                fieldKey: 'role',
                options: roles.map(r => r.displayName),
            },
            {
                id: 'isActive',
                type: 'radio',
                label: t('common.label.isActive'),
                colSpan: 6,
                rowSpan: 1,
                required: true,
                fieldKey: 'isActive',
                options: ['true', 'false'],
                optionLabels: {
                    true:  t('common.status.active'),
                    false: t('common.status.inactive'),
                },
            },
            /* 4행: 비고 */
            {
                id: 'remark',
                type: 'input',
                label: t('common.label.remark'),
                colSpan: 12,
                rowSpan: 1,
                fieldKey: 'remark',
                placeholder: t('admin.placeholder.remark'),
            },
        ],
    }), [isNew, roles, t]);

    /* 홈페이지 접근 권한 폼 위젯 */
    const SITE_FORM_WIDGET: FormWidget = useMemo(() => ({
        type: 'form',
        widgetId: 'admins-sites-form',
        contentKey: 'adminsSitesForm',
        title: t('admin.title.sitePerm'),
        description: t('admin.description.sitePerm'),
        showBorder: true,
        fields: [
            {
                id: 'sitePermissions',
                type: 'checkbox',
                label: t('admin.label.sitePerm'),
                colSpan: 12,
                rowSpan: 2,
                fieldKey: 'sitePermissions',
                options: sites.map(s => s.name),
            },
        ],
    }), [sites, t]);

    /* 폼 필드 변경 */
    const handleFormChange = useCallback((fieldKey: string, value: string) => {
        setFormValues(prev => ({ ...prev, [fieldKey]: value }));
    }, []);

    /* 접속이력 — 추후 개발 예정 */
    const handleAccessHistory = useCallback(() => {
        toast.info('접속이력 기능은 추후 개발 예정입니다.');
    }, []);

    /* 저장 */
    const handleContentAction = useCallback(async (_widgetIds: string[], action: 'save' | 'delete') => {
        if (action !== 'save' || saving) return;

        if (!formValues.email?.trim()) { toast.error(t('validation.admin.email.required')); return; }
        if (!formValues.name?.trim())  { toast.error(t('validation.admin.name.required'));  return; }
        if (!formValues.role)          { toast.error(t('validation.admin.role.required'));   return; }

        setSaving(true);
        try {
            /* 화면에서는 displayName 표시, API 전송 시 code로 역변환 */
            const roleCode = roles.find(r => r.displayName === formValues.role)?.code ?? formValues.role;
            const payload = {
                email:    formValues.email,
                name:     formValues.name,
                deptCode: formValues.deptCode || null,
                deptName: formValues.deptName || null,
                remark:   formValues.remark || null,
                role:     roleCode,
                isActive: formValues.isActive === 'true',
            };

            let adminId: number;
            if (isNew) {
                const res = await api.post('/admins', payload);
                adminId = res.data.id;
                toast.success(`${t('admin.title.new')} 완료. 임시 비밀번호: ${res.data.tempPassword}`, { duration: 5000 });
            } else {
                await api.patch(`/admins/${id}`, payload);
                adminId = Number(id);
                toast.success(t('admin.updated'));
            }

            /* 선택한 홈페이지 name → id 역변환 후 저장 */
            const selectedNames = (formValues.sitePermissions || '').split(',').filter(Boolean);
            const selectedSiteIds = selectedNames
                .map(name => sites.find(s => s.name === name)?.id)
                .filter((siteId): siteId is number => siteId !== undefined);
            await api.put(`/admins/${adminId}/sites`, { siteIds: selectedSiteIds });

            router.push('/admin/settings/users');
        } catch (e: unknown) {
            toast.error(getApiErrorMessage(e, t('admin.error.save')));
        } finally {
            setSaving(false);
        }
    }, [formValues, id, isNew, sites, saving, roles, router, t]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <span className="text-sm text-slate-400">{t('common.loading')}</span>
            </div>
        );
    }

    return (
        <PageLayout mode="live">
            {/* 기본 정보 폼 */}
            <GridCell colSpan={12} rowSpan={5}>
                <WidgetRenderer
                    mode="live"
                    widget={FORM_WIDGET}
                    contentColSpan={12}
                    formValues={formValues}
                    onFormValuesChange={handleFormChange}
                />
            </GridCell>

            {/* 홈페이지 접근 권한 폼 */}
            <GridCell colSpan={12} rowSpan={3}>
                <WidgetRenderer
                    mode="live"
                    widget={SITE_FORM_WIDGET}
                    contentColSpan={12}
                    formValues={formValues}
                    onFormValuesChange={handleFormChange}
                />
            </GridCell>

            {/* 접속이력 버튼 — 수정 모드만 표시 */}
            {!isNew && (
                <GridCell colSpan={2} colStart={1} rowSpan={1}>
                    <WidgetRenderer
                        mode="live"
                        widget={RESET_SPACE_WIDGET}
                        contentColSpan={2}
                        onClose={handleAccessHistory}
                    />
                </GridCell>
            )}

            {/* 취소 / 저장 버튼 */}
            <GridCell colSpan={2} colStart={11} rowSpan={1}>
                <WidgetRenderer
                    mode="live"
                    widget={SPACE_WIDGET}
                    contentColSpan={2}
                    onClose={() => router.back()}
                    onContentAction={handleContentAction}
                />
            </GridCell>
        </PageLayout>
    );
}
