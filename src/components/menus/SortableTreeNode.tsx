import React, { CSSProperties } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronRight, ChevronDown, Folder, FileText, EyeOff, ChevronUp, ChevronDown as ChevronDownIcon, GripVertical } from 'lucide-react';
import { FlattenedItem } from './tree-utils';
import { useMenuStore } from '@/store/useMenuStore';

interface SortableTreeNodeProps {
    item: FlattenedItem;
    indentationWidth: number;
}

export function SortableTreeNode({ item, indentationWidth }: SortableTreeNodeProps) {
    const { selectedMenu, selectMenu, moveMenu } = useMenuStore();
    const {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.id.toString(), data: { type: 'menuItem', item } });

    if (item.isHidden) {
        return <div ref={setNodeRef} style={{ display: 'none' }} />;
    }

    const isSelected = selectedMenu?.id === item.id;
    const hasUrl = item.url && item.url.length > 0;
    // 원래 hasChildren은 Flatten에서 파악하기 애매하지만, 실제 자식이 있는지 여부는 store(menus)의 원본과 동기화 해야함.
    // 로컬 테스트용이므로 깊이와 하위 관계만 유추합니다.
    const hasChildren = !item.isCategory && (item.children?.length ?? 0) > 0;

    const style: CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
        position: 'relative',
        zIndex: isDragging ? 1 : 0,
    };

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isSelected) selectMenu(null);
        else selectMenu(item);
    };

    if (item.isCategory) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className={item.depth === 0 ? 'mt-3 first:mt-0' : ''}
            >
                <div
                    className={`flex items-center justify-between px-3 py-1.5 cursor-pointer group ${isSelected ? 'bg-slate-100 rounded-md' : ''}`}
                    onClick={handleClick}
                >
                    <div className="flex items-center gap-1">
                        {/* Drag Grip Handle */}
                        <button
                            ref={setActivatorNodeRef}
                            {...attributes}
                            {...listeners}
                            className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 p-0.5 rounded outline-none focus:outline-none focus:ring-0 touch-none"
                            onClick={e => e.stopPropagation()}
                        >
                            <GripVertical className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.name}</span>
                    </div>
                    <div className={`items-center gap-0.5 ${isSelected ? 'flex' : 'hidden group-hover:flex'}`}>
                        {/* 상하 이동 버튼은 추후 dnd와 완전히 교체 가능하나 일단 유지 */}
                        <button onClick={e => { e.stopPropagation(); moveMenu(item.id, 'up'); }} className={`p-0.5 rounded text-slate-300 hover:text-slate-500`}><ChevronUp className="w-3 h-3" /></button>
                        <button onClick={e => { e.stopPropagation(); moveMenu(item.id, 'down'); }} className={`p-0.5 rounded text-slate-300 hover:text-slate-500`}><ChevronDownIcon className="w-3 h-3" /></button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={item.isGhost ? "relative" : ""}
        >
            {/* 드롭 보조선 (고스트) */}
            {item.isGhost && (
                <div className="absolute inset-0 border-2 border-dashed border-blue-400 bg-blue-50/50 rounded-md pointer-events-none z-10" />
            )}
            <div
                className={`flex items-center gap-1.5 px-3 py-2 cursor-pointer rounded-md transition-all group select-none ${isSelected ? 'bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-700'
                    } ${item.isGhost ? 'opacity-30' : ''}`}
                style={{ paddingLeft: `${item.depth * indentationWidth + 12}px` }}
                onClick={handleClick}
            >
                {/* Drag Grip Handle */}
                <button
                    ref={setActivatorNodeRef}
                    {...attributes}
                    {...listeners}
                    className={`cursor-grab active:cursor-grabbing p-0.5 rounded outline-none focus:outline-none focus:ring-0 flex-shrink-0 touch-none ${isSelected ? 'text-white/50 hover:text-white' : 'text-slate-300 hover:text-slate-500'
                        }`}
                    onClick={e => e.stopPropagation()}
                >
                    <GripVertical className="w-4 h-4" />
                </button>

                {hasChildren ? (
                    <button onClick={e => { e.stopPropagation(); /* 확장은 추후 구현 */ }} className={`p-0.5 rounded flex-shrink-0 ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>
                        <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                ) : <span className="w-4.5" />}

                {hasUrl
                    ? <FileText className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-white/80' : 'text-slate-400'}`} />
                    : <Folder className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-white/80' : 'text-amber-400'}`} />
                }

                <span className={`text-sm font-medium flex-1 truncate ${isSelected ? 'text-white' : ''}`}>
                    {item.name}
                </span>

                {/* 뱃지: 자식이 있을 경우 표시 (오버레이) */}
                {item.childCountBadge && item.childCountBadge > 0 ? (
                    <span className=" bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-sm whitespace-nowrap">
                        +{item.childCountBadge} 항목
                    </span>
                ) : null}

                {!item.visible && <EyeOff className={`w-3 h-3 ${isSelected ? 'text-white/50' : 'text-slate-300'}`} />}

                <div className={`items-center gap-0.5 ${isSelected ? 'flex' : 'hidden group-hover:flex'} ${item.isGhost ? '!hidden' : ''}`}>
                    <button onClick={e => { e.stopPropagation(); moveMenu(item.id, 'up'); }} className={`p-0.5 rounded outline-none focus:outline-none ${isSelected ? 'text-white/60' : 'text-slate-300 hover:text-slate-500'}`}><ChevronUp className="w-3 h-3" /></button>
                    <button onClick={e => { e.stopPropagation(); moveMenu(item.id, 'down'); }} className={`p-0.5 rounded outline-none focus:outline-none ${isSelected ? 'text-white/60' : 'text-slate-300 hover:text-slate-500'}`}><ChevronDownIcon className="w-3 h-3" /></button>
                </div>
            </div>
        </div>
    );
}
