import { requireAuth } from '@/lib/actions/auth';
import { AppShell } from '@/components/app-shell';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await requireAuth();

  return (
    <AppShell
      user={user}
      profile={profile}
    >
      {children}
    </AppShell>
  );
}
