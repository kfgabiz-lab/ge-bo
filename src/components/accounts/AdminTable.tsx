"use client";

import React from 'react';
import { MoreHorizontal, Edit2, Trash2, Shield, User, Clock, Mail, Briefcase } from 'lucide-react';

interface AdminTableProps {
    admins: any[];
    onEdit: (admin: any) => void;
    onDelete: (id: number) => void;
}

export function AdminTable({ admins, onEdit, onDelete }: AdminTableProps) {
    return (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">관리자 정보</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">사번</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">권한</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">마지막 접속</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">가입일</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">관리</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {admins.length > 0 ? (
                        admins.map((admin) => (
                            <tr key={admin.id} className="hover:bg-slate-50/80 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold border border-slate-200 group-hover:bg-white transition-colors">
                                            {admin.name.substring(0, 1).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-slate-900 leading-tight">{admin.name}</div>
                                            <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                                <Mail className="w-3 h-3" />
                                                {admin.email}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm font-medium text-slate-600">
                                    <div className="flex items-center gap-1.5">
                                        <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                                        {admin.employeeId || '-'}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-tight ${admin.role === 'SUPER_ADMIN'
                                        ? 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                                        : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                        }`}>
                                        <Shield className="w-3 h-3" />
                                        {admin.role === 'SUPER_ADMIN' ? '슈퍼 관리자' : '일반 편집자'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <div className="text-sm text-slate-600 flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                                            {admin.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleDateString() : '접속 기록 없음'}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm text-slate-600 font-medium">
                                        {new Date(admin.createdAt).toLocaleDateString()}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => onEdit(admin)}
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                            title="수정"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => onDelete(admin.id)}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                            title="삭제"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={6} className="px-6 py-20 text-center">
                                <div className="text-slate-400 font-medium">관리자 데이터가 없습니다.</div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
