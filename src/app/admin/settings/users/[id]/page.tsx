'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useSiteStore } from '@/store/useSiteStore';
import PageLayout from '@/components/layout/PageLayout';
import { GridCell } from '@/components/layout/GridCell';
import { WidgetRenderer } from '@/app/admin/templates/make/_shared/components/renderer';
import type { SpaceWidget } from '@/app/admin/templates/make/_shared/components/renderer';
import type { FormWidget } from '@/app/admin/templates/make/_shared/components/builder/FormBuilder';

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

/* ── 상수 ── */

/** 취소 / 저장 버튼 */
const SPACE_WIDGET: SpaceWidget = {
    type: 'space',
    widgetId: 'admins-detail-space',
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
            connectedContentWidgetIds: ['admins-detail-form'],
            contentAction: 'save',
        },
    ],
};

/** 접속이력 버튼 — 수정 모드 전용 (기능 추후 개발) */
const RESET_SPACE_WIDGET: SpaceWidget = {
    type: 'space',
    widgetId: 'admins-reset-space',
    align: 'left',
    showBorder: false,
    items: [
        {
            id: 'r1',
            type: 'action-button',
            label: '접속이력',
            colSpan: 1,
            color: 'gray',
            connType: 'close',
        },
    ],
};

/* ── 페이지 컴포넌트 ── */

export default function AdminDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const isNew = id === 'new';

    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [adminData, setAdminData] = useState<AdminDetail | null>(null);

    /* 폼 값 — fieldKey 기준으로 관리, sitePermissions는 site name comma-joined */
    const [formValues, setFormValues] = useState<Record<string, string>>({
        email: '',
        name: '',
        deptCode: '',
        deptName: '',
        role: '',
        isActive: '활성',
        remark: '',
        sitePermissions: '',
    });

    /* 수정 모드: 로드된 site ID 목록 — sites 스토어가 로드된 후 name으로 변환 */
    const [loadedSiteIds, setLoadedSiteIds] = useState<number[]>([]);

    /* 배정 가능한 역할 목록 — /roles/assignable (is_system=false 만 반환) */
    const [roles, setRoles] = useState<AssignableRole[]>([]);

    /* 홈페이지 목록 */
    const { sites, fetchSites } = useSiteStore();

    useEffect(() => {
        api.get<AssignableRole[]>('/roles/assignable')
            .then(res => setRoles(res.data))
            .catch(() => toast.error('권한 목록을 불러오지 못했습니다.'));
    }, []);
    useEffect(() => { if (sites.length === 0) fetchSites(); }, [sites.length, fetchSites]);

    /* sites와 loadedSiteIds가 모두 준비됐을 때 name으로 변환하여 formValues 초기화 */
    useEffect(() => {
        if (isNew || loadedSiteIds.length === 0 || sites.length === 0) return;
        const names = loadedSiteIds
            .map(siteId => sites.find(s => s.id === siteId)?.name ?? '')
            .filter(Boolean);
        setFormValues(prev => ({ ...prev, sitePermissions: names.join(',') }));
    }, [isNew, loadedSiteIds, sites]);

    /* roles와 adminData가 모두 준비됐을 때 code → displayName 변환하여 select 초기화 */
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
                    email: admin.email,
                    name: admin.name,
                    deptCode: admin.deptCode ?? '',
                    deptName: admin.deptName ?? '',
                    role: admin.role,
                    isActive: admin.isActive ? '활성' : '비활성',
                    remark: admin.remark ?? '',
                }));
                /* site name 변환은 sites 스토어가 로드된 후 별도 effect에서 처리 */
                setLoadedSiteIds(sitesRes.data.map(s => s.id));
            } catch {
                toast.error('관리자 정보를 불러오지 못했습니다.');
                router.back();
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id, isNew, router]);

    /* 기본 정보 폼 위젯 — 역할 options 동적 구성 */
    const FORM_WIDGET: FormWidget = useMemo(() => ({
        type: 'form',
        widgetId: 'admins-detail-form',
        contentKey: 'adminsDetailForm',
        title: isNew ? '관리자 등록' : '관리자 수정',
        description: '필수 입력 항목은 * 로 표시됩니다.',
        showBorder: true,
        fields: [
            /* 1행: 아이디 / 사용자명 */
            {
                id: 'email',
                type: 'input',
                label: '아이디',
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
                label: '사용자명',
                colSpan: 6,
                rowSpan: 1,
                required: true,
                fieldKey: 'name',
                placeholder: '사용자명 입력',
                readonly: !isNew,
            },
            /* 2행: 부서코드 / 부서명 */
            {
                id: 'deptCode',
                type: 'input',
                label: '부서코드',
                colSpan: 6,
                rowSpan: 1,
                fieldKey: 'deptCode',
                placeholder: '부서코드 입력',
                readonly: !isNew,
            },
            {
                id: 'deptName',
                type: 'input',
                label: '부서명',
                colSpan: 6,
                rowSpan: 1,
                fieldKey: 'deptName',
                placeholder: '부서명 입력',
                readonly: !isNew,
            },
            /* 3행: 권한 / 계정상태 */
            {
                id: 'role',
                type: 'select',
                label: '권한',
                colSpan: 6,
                rowSpan: 1,
                required: true,
                fieldKey: 'role',
                options: roles.map(r => r.displayName),
            },
            {
                id: 'isActive',
                type: 'radio',
                label: '계정상태',
                colSpan: 6,
                rowSpan: 1,
                required: true,
                fieldKey: 'isActive',
                options: ['활성', '비활성'],
            },
            /* 4행: 비고 */
            {
                id: 'remark',
                type: 'input',
                label: '비고',
                colSpan: 12,
                rowSpan: 1,
                fieldKey: 'remark',
                placeholder: '비고 입력 (선택)',
            },
        ],
    }), [isNew, roles]);

    /* 홈페이지 접근 권한 폼 위젯 — checkbox, sites options 동적 구성 */
    const SITE_FORM_WIDGET: FormWidget = useMemo(() => ({
        type: 'form',
        widgetId: 'admins-sites-form',
        contentKey: 'adminsSitesForm',
        title: '홈페이지 접근 권한',
        description: '접근을 허용할 홈페이지를 선택하세요.',
        showBorder: true,
        fields: [
            {
                id: 'sitePermissions',
                type: 'checkbox',
                label: '홈페이지',
                colSpan: 12,
                rowSpan: 2,
                fieldKey: 'sitePermissions',
                options: sites.map(s => s.name),
            },
        ],
    }), [sites]);

    /* 폼 필드 변경 — 기본 정보와 사이트 권한 모두 동일한 formValues 공유 */
    const handleFormChange = useCallback((fieldKey: string, value: string) => {
        setFormValues(prev => ({ ...prev, [fieldKey]: value }));
    }, []);

    /* 접속이력 — 추후 개발 예정 */
    const handleAccessHistory = useCallback(() => {
        toast.info('접속이력 기능은 추후 개발 예정입니다.');
    }, []);

    /* 저장 — SPACE_WIDGET의 contentAction:'save' 에 연결 */
    const handleContentAction = useCallback(async (_widgetIds: string[], action: 'save' | 'delete') => {
        if (action !== 'save' || saving) return;

        if (!formValues.email?.trim()) { toast.error('아이디를 입력해주세요.'); return; }
        if (!formValues.name?.trim()) { toast.error('사용자명을 입력해주세요.'); return; }
        if (!formValues.role) { toast.error('권한을 선택해주세요.'); return; }

        setSaving(true);
        try {
            /* 화면에서는 displayName으로 표시, API 전송 시 code로 역변환 */
            const roleCode = roles.find(r => r.displayName === formValues.role)?.code ?? formValues.role;
            const payload = {
                email: formValues.email,
                name: formValues.name,
                deptCode: formValues.deptCode || null,
                deptName: formValues.deptName || null,
                remark: formValues.remark || null,
                role: roleCode,
                isActive: formValues.isActive === '활성',
            };

            let adminId: number;
            if (isNew) {
                const res = await api.post('/admins', payload);
                adminId = res.data.id;
                toast.success(`등록 완료. 임시 비밀번호: ${res.data.tempPassword}`, { duration: 5000 });
            } else {
                await api.patch(`/admins/${id}`, payload);
                adminId = Number(id);
                toast.success('관리자 정보가 수정되었습니다.');
            }

            /* 선택한 홈페이지 name → id 역변환 후 저장 */
            const selectedNames = (formValues.sitePermissions || '').split(',').filter(Boolean);
            const selectedSiteIds = selectedNames
                .map(name => sites.find(s => s.name === name)?.id)
                .filter((siteId): siteId is number => siteId !== undefined);
            await api.put(`/admins/${adminId}/sites`, { siteIds: selectedSiteIds });

            router.push('/admin/settings/users');
        } catch (e: unknown) {
            const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(msg ?? '저장 중 오류가 발생했습니다.');
        } finally {
            setSaving(false);
        }
    }, [formValues, id, isNew, sites, saving, router]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <span className="text-sm text-slate-400">불러오는 중...</span>
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
