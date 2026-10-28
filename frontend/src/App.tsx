import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from './components/AdminLayout'
import { AdminRoute } from './components/AdminRoute'
import { SiteLayout } from './components/SiteLayout'
import { AdminDashboardPage } from './pages/AdminDashboardPage'
import { AdminEstablishmentFormPage } from './pages/AdminEstablishmentFormPage'
import { AdminEstablishmentListPage } from './pages/AdminEstablishmentListPage'
import { AdminLoginPage } from './pages/AdminLoginPage'
import { DirectoryPage } from './pages/DirectoryPage'
import { EstablishmentDetailPage } from './pages/EstablishmentDetailPage'
import { LandingPage } from './pages/LandingPage'
import { NotFoundPage } from './pages/NotFoundPage'

function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="directory" element={<DirectoryPage />} />
        <Route path="establishments/:slug" element={<EstablishmentDetailPage />} />
      </Route>
      <Route path="admin/login" element={<AdminLoginPage />} />
      <Route element={<AdminRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="admin" element={<AdminDashboardPage />} />
          <Route path="admin/establishments" element={<AdminEstablishmentListPage />} />
          <Route path="admin/establishments/new" element={<AdminEstablishmentFormPage mode="create" />} />
          <Route path="admin/establishments/:recordId/edit" element={<AdminEstablishmentFormPage mode="edit" />} />
        </Route>
      </Route>
      <Route path="sign-in" element={<Navigate to="/admin/login" replace />} />
      <Route path="staff/*" element={<Navigate to="/admin/login" replace />} />
      <Route path="admin/review" element={<Navigate to="/admin" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
