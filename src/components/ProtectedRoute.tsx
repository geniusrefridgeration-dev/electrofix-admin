import { Navigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAppStore((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}
