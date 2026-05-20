import { SystemAdminGuard } from '@/components/guard/SystemAdminGuard';

export default function DatabaseLayout({ children }: { children: React.ReactNode }) {
    return <SystemAdminGuard>{children}</SystemAdminGuard>;
}


