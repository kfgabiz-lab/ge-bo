'use client';

import React, { useState } from 'react';
import { Plus, Edit2, Trash2, X, Users, Shield, Lock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

/* ── 샘플 데이터 ── */
const SAMPLE_CARDS = [
    { id: 1, code: 'SUPER_ADMIN', name: '최고 관리자', description: '시스템 전체 접근 권한', color: '#0f172a', count: 2, isSystem: true },
    { id: 2, code: 'ADMIN', name: '관리자', description: '일반 관리 업무 수행', color: '#10b981', count: 5, isSystem: true },
    { id: 3, code: 'EDITOR', name: '편집자', description: '콘텐츠 등록 및 수정', color: '#f59e0b', count: 8, isSystem: false },
    { id: 4, code: 'VIEWER', name: '뷰어', description: '조회만 가능', color: '#6366f1', count: 12, isSystem: false },
    { id: 5, code: 'MARKETING', name: '마케팅', description: '마케팅 관련 기능 접근', color: '#ec4899', count: 3, isSystem: false },
    { id: 6, code: 'SUPPORT', name: '고객 지원', description: '고객 문의 관리', color: '#14b8a6', count: 4, isSystem: false },
];

export default function GridLayoutPage() {
    const [showDrawer, setShowDrawer] = useState(false);
    const [showModal, setShowModal] = useState(false);

    return (
        <div className="h-full flex flex-col">

            {/* ── 페이지 헤더 ── */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">카드형 레이아웃</h1>
                    <p className="text-sm text-slate-500 mt-0.5">카드 그리드 + Drawer 등록/수정 패턴</p>
                </div>
                <button
                    onClick={() => setShowDrawer(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-md shadow-sm transition-all"
                >
                    <Plus className="w-4 h-4" /> 추가
                </button>
            </div>

            {/* ── 카드 그리드 ── */}
            <div className="grid grid-cols-2 gap-4">
                {SAMPLE_CARDS.map((card) => (
                    <div key={card.id} className="bg-white rounded-md border border-slate-200 p-5 hover:shadow-md transition-all">
                        {/* 카드 헤더 */}
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-10 h-10 rounded-md flex items-center justify-center"
                                    style={{ backgroundColor: `${card.color}15`, color: card.color }}
                                >
                                    <Shield className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-bold text-slate-900">{card.name}</h3>
                                        {card.isSystem && (
                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">
                                                <Lock className="w-2.5 h-2.5" /> 시스템
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">{card.code}</p>
                                </div>
                            </div>
                            {/* 액션 버튼 */}
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setShowDrawer(true)}
                                    className="w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all"
                                >
                                    <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                {!card.isSystem && (
                                    <button
                                        onClick={() => setShowModal(true)}
                                        className="w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:bg-red-50 hover:text-red-500 transition-all"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* 카드 본문 */}
                        <p className="text-sm text-slate-500 mb-4">{card.description}</p>

                        {/* 카드 푸터 */}
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                <Users className="w-3.5 h-3.5" />
                                <span>{card.count}명</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: card.color }} />
                                <span className="text-[11px] font-mono text-slate-400">{card.color}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── 등록/수정 드로어 ── */}
            {showDrawer && (
                <div className="fixed inset-0 z-[100] flex justify-end">
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" onClick={() => setShowDrawer(false)} />
                    <div className="relative w-[420px] bg-white shadow-xl flex flex-col animate-in slide-in-from-right duration-250">
                        <div className="flex items-center justify-between px-6 h-14 border-b border-slate-200">
                            <h3 className="text-base font-bold text-slate-900">역할 등록</h3>
                            <button onClick={() => setShowDrawer(false)} className="w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 transition-all">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-5">
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1.5">역할 코드 <span className="text-red-500">*</span></label>
                                <input type="text" placeholder="예: CONTENT_MANAGER" className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all" />
                                <p className="text-[11px] text-slate-400 mt-1">영문 대문자, 숫자, _ 만 사용 가능</p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1.5">표시 이름 <span className="text-red-500">*</span></label>
                                <input type="text" placeholder="예: 콘텐츠 관리자" className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1.5">설명</label>
                                <textarea placeholder="역할에 대한 설명을 입력하세요" rows={3} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all resize-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-2">색상 <span className="text-red-500">*</span></label>
                                <div className="flex items-center gap-2">
                                    {['#0f172a', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#14b8a6', '#ef4444', '#8b5cf6'].map((c) => (
                                        <button
                                            key={c}
                                            className="w-8 h-8 rounded-md border-2 border-transparent hover:border-slate-900 transition-all"
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200">
                            <button onClick={() => setShowDrawer(false)} className="px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-md hover:bg-slate-100 transition-all">
                                취소
                            </button>
                            <button onClick={() => { setShowDrawer(false); toast.success('등록되었습니다.'); }} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-md shadow-sm transition-all">
                                등록
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── 삭제 확인 모달 ── */}
            {showModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowModal(false)}>
                    <div className="max-w-md w-full bg-white rounded-md shadow-2xl p-8 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-start gap-4 mb-6">
                            <div className="w-12 h-12 rounded-md bg-rose-100 flex items-center justify-center flex-shrink-0">
                                <AlertCircle className="w-6 h-6 text-rose-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">역할 삭제</h3>
                                <p className="text-sm text-slate-500 mt-1">이 역할을 삭제하시겠습니까? 해당 역할에 속한 사용자의 권한이 제거됩니다.</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-md hover:bg-slate-100 transition-all">
                                취소
                            </button>
                            <button onClick={() => { setShowModal(false); toast.success('삭제되었습니다.'); }} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-md transition-all">
                                삭제
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
