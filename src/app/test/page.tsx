'use client';

import { useEffect, useState } from 'react';

interface CodeDetail {
    id: number;
    code: string;
    name: string;
    active: boolean;
}

interface CodeGroup {
    id: number;
    groupCode: string;
    groupName: string;
    details: CodeDetail[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002/api/v1';

export default function TestPage() {
    const [groups, setGroups] = useState<CodeGroup[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API_URL}/public/codes`)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then((data: CodeGroup[]) => setGroups(data))
            .catch(err => setError(String(err)))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div style={{ padding: '24px', fontFamily: 'monospace' }}>
            <h1 style={{ fontSize: '18px', marginBottom: '8px' }}>API 연결 테스트</h1>
            <p style={{ fontSize: '12px', color: '#888', marginBottom: '16px' }}>
                {API_URL}/public/codes
            </p>

            {loading && <p>로딩 중...</p>}
            {error && <p style={{ color: 'red' }}>오류: {error}</p>}

            {groups.map(group => (
                <div key={group.id} style={{ marginBottom: '16px' }}>
                    <p style={{ fontWeight: 'bold' }}>[{group.groupCode}] {group.groupName}</p>
                    {group.details.map(d => (
                        <p key={d.id} style={{ paddingLeft: '16px', color: '#444' }}>
                            {d.code} — {d.name} {d.active ? '' : '(비활성)'}
                        </p>
                    ))}
                </div>
            ))}
        </div>
    );
}
