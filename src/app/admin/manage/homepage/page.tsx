'use client';

/**
 * 홈페이지 관리 페이지 — 홈페이지 기능 on/off 설정
 *
 * SYSTEM > Manage > 홈페이지 관리 (시스템 권한 전용)
 */

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import PageLayout from '@/components/layout/page-layout';
import { GridCell } from '@/components/layout/grid-cell';
import { ToggleSwitch } from '@/components/ui/toggle-switch';

/* ── 설정 항목 타입 ── */
interface SettingItem {
    key: string;
    title: string;
    description: string;
}

/* ── 설정 항목 목록 (항목 추가 시 여기에만 추가) ── */
const SETTING_ITEMS: SettingItem[] = [
    {
        key: 'isMultilingual',
        title: '다국어',
        description: '홈페이지 다국어 기능을 on/off 설정합니다.',
    },
];

export default function HomepageManagePage() {
    /* 설정 상태 (key → boolean) */
    const [settings, setSettings] = useState<Record<string, boolean>>({
        isMultilingual: false,
    });
    const [isSaving, setIsSaving] = useState(false);

    /* 마운트 시 현재 설정 조회 */
    useEffect(() => {
        api.get('/homepage-manage')
            .then(res => {
                setSettings({
                    isMultilingual: res.data.isMultilingual ?? false,
                });
            })
            .catch(() => toast.error('설정을 불러오는 데 실패했습니다.'));
    }, []);

    /** 토글 변경 핸들러 */
    const handleToggle = (key: string, value: boolean) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    /** 저장 핸들러 */
    const handleSave = async () => {
        setIsSaving(true);
        try {
            await api.patch('/homepage-manage', {
                isMultilingual: settings.isMultilingual,
            });
            toast.success('저장되었습니다.');
        } catch {
            toast.error('저장에 실패했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <PageLayout mode="live">

            {/* 설정 카드 영역 */}
            <GridCell colSpan={12} rowSpan={4}>
                <div className="space-y-3 p-1">
                    {SETTING_ITEMS.map(item => (
                        <div
                            key={item.key}
                            className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-5 py-4"
                        >
                            {/* 설명 영역 */}
                            <div>
                                <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                                <p className="mt-0.5 text-xs text-slate-500">{item.description}</p>
                            </div>

                            {/* 토글 스위치 */}
                            <ToggleSwitch
                                checked={settings[item.key] ?? false}
                                onChange={value => handleToggle(item.key, value)}
                            />
                        </div>
                    ))}
                </div>
            </GridCell>

            {/* 저장 버튼 영역 */}
            <GridCell colSpan={12} rowSpan={1}>
                <div className="flex justify-end p-1">
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? '저장 중...' : '저장'}
                    </button>
                </div>
            </GridCell>

        </PageLayout>
    );
}
