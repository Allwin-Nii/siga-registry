import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from './components/AdminLayout'
import { AdminRoute } from './components/AdminRoute'
import { SiteLayout } from './components/SiteLayout'
import { ScrollToTop } from './components/ScrollToTop'
import { PublicEntryRedirect } from './components/PublicEntryRedirect'
import { PublicRoute } from './components/PublicRoute'
import { AdminDashboardPage } from './pages/AdminDashboardPage'
import { AdminEstablishmentFormPage } from './pages/AdminEstablishmentFormPage'
import { AdminEstablishmentListPage } from './pages/AdminEstablishmentListPage'
import { AdminBulkImportPage } from './pages/AdminBulkImportPage'
import { AdminLoginPage } from './pages/AdminLoginPage'
import { DirectoryPage } from './pages/DirectoryPage'
import { EstablishmentDetailPage } from './pages/EstablishmentDetailPage'
import { LandingPage } from './pages/LandingPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PublicAccountPage } from './pages/PublicAccountPage'
import { PublicLoginPage } from './pages/PublicLoginPage'
import { PublicRegistrationPage } from './pages/PublicRegistrationPage'
import { PublicDashboardPage } from './pages/PublicDashboardPage'

function App() {
  return <>
    <ScrollToTop />
    <Routes>
      <Route element={<SiteLayout />}>
        <Route index element={<PublicEntryRedirect />} />
        <Route path="login" element={<PublicLoginPage />} />
        <Route path="register" element={<PublicRegistrationPage />} />
        <Route element={<PublicRoute />}>
          <Route path="dashboard" element={<PublicDashboardPage />} />
          <Route path="directory" element={<DirectoryPage />} />
          <Route path="establishments/:slug" element={<EstablishmentDetailPage />} />
          <Route path="account" element={<PublicAccountPage />} />
          <Route path="home" element={<LandingPage />} />
        </Route>
      </Route>
      <Route path="admin/login" element={<AdminLoginPage />} />
      <Route element={<AdminRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="admin" element={<AdminDashboardPage />} />
          <Route path="admin/establishments" element={<AdminEstablishmentListPage />} />
          <Route path="admin/establishments/import" element={<AdminBulkImportPage />} />
          <Route path="admin/establishments/new" element={<AdminEstablishmentFormPage mode="create" />} />
          <Route path="admin/establishments/:recordId/edit" element={<AdminEstablishmentFormPage mode="edit" />} />
        </Route>
      </Route>
      <Route path="sign-in" element={<Navigate to="/login" replace />} />
      <Route path="staff/*" element={<Navigate to="/admin/login" replace />} />
      <Route path="admin/review" element={<Navigate to="/admin" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  </>
}

export default App
