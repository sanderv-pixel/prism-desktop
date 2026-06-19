import { AdminSecretProvider } from '@/components/admin/AdminSecretProvider'
import { AdminShell } from '@/components/admin/AdminShell'

export const metadata = {
  title: 'Admin | Prism',
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AdminSecretProvider>
      <AdminShell>{children}</AdminShell>
    </AdminSecretProvider>
  )
}
