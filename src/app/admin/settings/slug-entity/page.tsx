'use client';

/**
 * Slug Entity 관리 페이지
 * - 좌측: EntityList (entity 목록 + 등록)
 * - 우측: EntityFieldEditor (필드 편집)
 */

import { useState } from 'react';
import { EntityList, SlugEntityItem } from '@/components/slug-entity/EntityList';
import { EntityFieldEditor } from '@/components/slug-entity/EntityFieldEditor';

export default function SlugEntityPage() {
    const [selectedEntity, setSelectedEntity] = useState<SlugEntityItem | null>(null);

    /* EntityList에서 entity 선택 시 */
    const handleSelect = (entity: SlugEntityItem | null) => {
        setSelectedEntity(entity);
    };

    /* 신규 등록 완료 시 — 등록된 entity 자동 선택 */
    const handleCreated = (entity: SlugEntityItem) => {
        setSelectedEntity(entity);
    };

    /* 필드 저장 완료 시 — 선택 entity 갱신 */
    const handleUpdated = (entity: SlugEntityItem) => {
        setSelectedEntity(entity);
    };

    /* entity 삭제 완료 시 — 선택 해제 */
    const handleDeleted = () => {
        setSelectedEntity(null);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-120px)]">
            {/* 페이지 헤더 */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">Entity 관리</h1>
                    <p className="text-sm text-slate-500 mt-0.5">빌더 연동용 엔티티 구조(필드)를 등록하고 관리합니다.</p>
                </div>
            </div>

            {/* 2단 레이아웃 */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5 min-h-0 overflow-hidden">
                {/* 좌측: entity 목록 */}
                <EntityList
                    selectedId={selectedEntity?.id ?? null}
                    onSelect={handleSelect}
                    onCreated={handleCreated}
                />

                {/* 우측: 필드 편집 */}
                <EntityFieldEditor
                    entity={selectedEntity}
                    onDeleted={handleDeleted}
                    onUpdated={handleUpdated}
                />
            </div>
        </div>
    );
}
