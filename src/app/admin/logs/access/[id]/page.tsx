'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageLayout from '@/components/layout/page-layout';
import { GridCell } from '@/components/layout/grid-cell';
import { WidgetRenderer } from '@/app/admin/templates/make/_shared/components/renderer';
import type { SpaceWidget } from '@/app/admin/templates/make/_shared/components/renderer';
import type { FormWidget } from '@/app/admin/templates/make/_shared/components/builder/FormBuilder';
import api from '@/lib/api';

/* ── 접속이력 상세 타입 ── */
interface LoginLogDetail {
    id: number;
    adminUserId: number | null;
    loginEmail: string;
    status: string;
    failReason: string | null;
    clientIp: string | null;
    userAgent: string | null;
    createdAt: string;
}

export default function LoginLogDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [loading, setLoading] = useState(true);
    const [formValues, setFormValues] = useState<Record<string, string>>({});

    /* 상세 데이터 로드 */
    useEffect(() => {
        const load = async () => {
            try {
                const res = await api.get<LoginLogDetail>(`/login-logs/${id}`);
                const d = res.data;
                setFormValues({
                    createdAt:  d.createdAt ? d.createdAt.slice(0, 19).replace('T', ' ') : '-',
                    loginEmail: d.loginEmail,
                    status:     d.status,
                    failReason: d.failReason ?? '-',
                    clientIp:   d.clientIp   ?? '-',
                    userAgent:  d.userAgent  ?? '',
                });
            } catch {
                router.back();
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id, router]);

    /* 기본 정보 폼 위젯 */
    const INFO_FORM_WIDGET: FormWidget = useMemo(() => ({
        type: 'form',
        widgetId: 'login-log-info-form',
        contentKey: 'loginLogInfoForm',
        title: '접속이력 상세',
        showBorder: true,
        fields: [
            { id: 'createdAt',  type: 'input',    label: '발생일시',     colSpan: 6,  rowSpan: 1, fieldKey: 'createdAt',  readonly: true },
            { id: 'status',     type: 'input',    label: '결과',         colSpan: 6,  rowSpan: 1, fieldKey: 'status',     readonly: true },
            { id: 'loginEmail', type: 'input',    label: 'ID',           colSpan: 6,  rowSpan: 1, fieldKey: 'loginEmail', readonly: true },
            { id: 'failReason', type: 'input',    label: '실패사유',     colSpan: 6,  rowSpan: 1, fieldKey: 'failReason', readonly: true },
            { id: 'clientIp',   type: 'input',    label: '요청자 IP',   colSpan: 12, rowSpan: 1, fieldKey: 'clientIp',   readonly: true },
            { id: 'userAgent',  type: 'textarea', label: '브라우저 정보', colSpan: 12, rowSpan: 3, fieldKey: 'userAgent',  readonly: true, placeholder: '' },
        ],
    }), []);

    /* 목록으로 버튼 */
    const SPACE_WIDGET: SpaceWidget = useMemo(() => ({
        type: 'space',
        widgetId: 'login-log-detail-space',
        align: 'right',
        showBorder: false,
        items: [
            {
                id: 's1',
                type: 'action-button',
                label: '목록으로',
                colSpan: 1,
                color: 'gray',
                connType: 'close',
            },
        ],
    }), []);

    if (loading) return null;

    return (
        <PageLayout mode="live">
            {/* 기본 정보 + 브라우저 정보 통합 */}
            <GridCell colSpan={12} rowSpan={10}>
                <WidgetRenderer
                    mode="live"
                    widget={INFO_FORM_WIDGET}
                    contentColSpan={12}
                    formValues={formValues}
                    onFormValuesChange={() => {}}
                />
            </GridCell>

            {/* 목록으로 버튼 */}
            <GridCell colSpan={12} rowSpan={1}>
                <WidgetRenderer
                    mode="live"
                    widget={SPACE_WIDGET}
                    contentColSpan={12}
                    onClose={() => router.back()}
                />
            </GridCell>
        </PageLayout>
    );
}
