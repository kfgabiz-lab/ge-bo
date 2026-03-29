'use client';

import React from 'react';
import {
    Users, Eye, FileText, TrendingUp, TrendingDown,
    ArrowRight, MoreHorizontal, Clock, UserCheck
} from 'lucide-react';

/* ── KPI 카드 데이터 ── */
const KPI_DATA = [
    { label: '총 방문자', value: '12,847', change: '+12.5%', trend: 'up', icon: <Eye className="w-5 h-5" />, color: '#0f172a' },
    { label: '신규 가입', value: '342', change: '+8.2%', trend: 'up', icon: <Users className="w-5 h-5" />, color: '#10b981' },
    { label: '콘텐츠 수', value: '1,205', change: '+3.1%', trend: 'up', icon: <FileText className="w-5 h-5" />, color: '#6366f1' },
    { label: '이탈률', value: '24.3%', change: '-2.4%', trend: 'down', icon: <TrendingDown className="w-5 h-5" />, color: '#f59e0b' },
];

/* ── 최근 활동 데이터 ── */
const RECENT_ACTIVITIES = [
    { user: '홍길동', action: '팝업 "봄 이벤트" 등록', time: '5분 전', avatar: '홍' },
    { user: '김철수', action: '배너 "신제품 출시" 수정', time: '15분 전', avatar: '김' },
    { user: '이영희', action: '관리자 "박민수" 계정 등록', time: '30분 전', avatar: '이' },
    { user: '박민수', action: '메뉴 구조 변경', time: '1시간 전', avatar: '박' },
    { user: '최지은', action: '게시글 "FAQ 업데이트" 발행', time: '2시간 전', avatar: '최' },
];

/* ── 인기 콘텐츠 데이터 ── */
const POPULAR_CONTENT = [
    { title: '신제품 라인업 소개', views: 3240, category: '제품' },
    { title: '기술 백서 다운로드', views: 2180, category: '기술' },
    { title: 'FAQ - 자주 묻는 질문', views: 1920, category: '지원' },
    { title: '파트너사 등록 가이드', views: 1540, category: '파트너' },
    { title: '상반기 프로모션 안내', views: 1120, category: '이벤트' },
];

/* ── 빠른 링크 데이터 ── */
const QUICK_LINKS = [
    { label: '사용자 관리', href: '/admin/settings/users', icon: <Users className="w-4 h-4" />, color: '#0f172a' },
    { label: '권한 관리', href: '/admin/settings/roles', icon: <UserCheck className="w-4 h-4" />, color: '#10b981' },
    { label: '콘텐츠 관리', href: '#', icon: <FileText className="w-4 h-4" />, color: '#6366f1' },
    { label: '통계', href: '#', icon: <TrendingUp className="w-4 h-4" />, color: '#f59e0b' },
];

export default function DashboardLayoutPage() {
    return (
        <div className="h-full flex flex-col">

            {/* ── 페이지 헤더 ── */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">대시보드 레이아웃</h1>
                    <p className="text-sm text-slate-500 mt-0.5">KPI 위젯 + 차트 영역 + 최근 활동 + 빠른 링크 패턴</p>
                </div>
            </div>

            <div className="flex-1 space-y-6">

                {/* ── KPI 카드 영역 ── */}
                <div className="grid grid-cols-4 gap-4">
                    {KPI_DATA.map((kpi) => (
                        <div key={kpi.label} className="bg-white rounded-md border border-slate-200 p-5">
                            <div className="flex items-center justify-between mb-3">
                                <div className="w-10 h-10 rounded-md flex items-center justify-center" style={{ backgroundColor: `${kpi.color}10`, color: kpi.color }}>
                                    {kpi.icon}
                                </div>
                                <button className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 transition-all">
                                    <MoreHorizontal className="w-4 h-4" />
                                </button>
                            </div>
                            <p className="text-2xl font-bold text-slate-900">{kpi.value}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-xs text-slate-400">{kpi.label}</p>
                                <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${kpi.trend === 'up' ? 'text-[#059669]' : 'text-[#dc2626]'}`}>
                                    {kpi.trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                    {kpi.change}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── 중간 영역: 차트 + 빠른 링크 ── */}
                <div className="grid grid-cols-3 gap-4">
                    {/* 차트 영역 (플레이스홀더) */}
                    <div className="col-span-2 bg-white rounded-md border border-slate-200 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-slate-900">방문자 추이</h3>
                            <div className="flex items-center gap-2">
                                <button className="px-3 py-1 text-xs font-medium text-slate-900 bg-slate-900/10 rounded-md">7일</button>
                                <button className="px-3 py-1 text-xs font-medium text-slate-400 hover:text-slate-700 rounded-md">30일</button>
                                <button className="px-3 py-1 text-xs font-medium text-slate-400 hover:text-slate-700 rounded-md">90일</button>
                            </div>
                        </div>
                        {/* 차트 플레이스홀더 */}
                        <div className="h-56 bg-gradient-to-b from-slate-900/5 to-transparent rounded-md flex items-center justify-center border border-dashed border-slate-200">
                            <div className="text-center">
                                <TrendingUp className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                <p className="text-sm text-slate-400">차트 라이브러리 연동 영역</p>
                                <p className="text-xs text-slate-300 mt-0.5">Recharts / Chart.js 등</p>
                            </div>
                        </div>
                    </div>

                    {/* 빠른 링크 */}
                    <div className="bg-white rounded-md border border-slate-200 p-5">
                        <h3 className="text-sm font-bold text-slate-900 mb-4">빠른 이동</h3>
                        <div className="space-y-2">
                            {QUICK_LINKS.map((link) => (
                                <a
                                    key={link.label}
                                    href={link.href}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-slate-100 transition-all group"
                                >
                                    <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ backgroundColor: `${link.color}10`, color: link.color }}>
                                        {link.icon}
                                    </div>
                                    <span className="flex-1 text-sm text-slate-700 font-medium">{link.label}</span>
                                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-400 transition-colors" />
                                </a>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── 하단 영역: 최근 활동 + 인기 콘텐츠 ── */}
                <div className="grid grid-cols-2 gap-4">
                    {/* 최근 활동 */}
                    <div className="bg-white rounded-md border border-slate-200 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-slate-900">최근 활동</h3>
                            <button className="text-xs text-slate-900 hover:text-slate-800 font-medium transition-colors">
                                전체 보기
                            </button>
                        </div>
                        <div className="space-y-3">
                            {RECENT_ACTIVITIES.map((activity, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <div className="w-7 h-7 rounded-full bg-slate-900/10 flex items-center justify-center text-[10px] font-bold text-slate-900 flex-shrink-0 mt-0.5">
                                        {activity.avatar}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-slate-700">
                                            <span className="font-medium text-slate-900">{activity.user}</span>
                                            {' '}님이 {activity.action}
                                        </p>
                                        <p className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                                            <Clock className="w-3 h-3" /> {activity.time}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 인기 콘텐츠 */}
                    <div className="bg-white rounded-md border border-slate-200 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-slate-900">인기 콘텐츠</h3>
                            <button className="text-xs text-slate-900 hover:text-slate-800 font-medium transition-colors">
                                전체 보기
                            </button>
                        </div>
                        <div className="space-y-0">
                            {POPULAR_CONTENT.map((content, i) => (
                                <div key={i} className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
                                    <span className="text-sm font-bold text-slate-300 w-5 text-center">{i + 1}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-slate-700 truncate">{content.title}</p>
                                        <span className="text-[11px] text-slate-400">{content.category}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-slate-400">
                                        <Eye className="w-3.5 h-3.5" />
                                        {content.views.toLocaleString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
