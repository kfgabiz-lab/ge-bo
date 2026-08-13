"use client";

import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";

export default function NoPermissionPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
      <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center">
        <ShieldAlert className="w-8 h-8 text-amber-400" strokeWidth={1.5} />
      </div>

      <div className="space-y-1">
        <h2 className="text-lg font-bold text-slate-900">접근 권한이 없습니다</h2>
        <p className="text-sm text-slate-500">이 페이지에 접근할 수 있는 권한이 없습니다. 관리자에게 문의해 주세요.</p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => router.back()}
          className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          이전 페이지로
        </button>
        <button
          onClick={() => router.push("/admin/dashboard")}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          대시보드로 이동
        </button>
      </div>
    </div>
  );
}
