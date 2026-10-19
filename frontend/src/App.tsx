import { Route, Routes } from 'react-router-dom'
import { SiteLayout } from './components/SiteLayout'
import { DashboardPage } from './pages/DashboardPage'
import { DirectoryPage } from './pages/DirectoryPage'
import { EstablishmentDetailPage } from './pages/EstablishmentDetailPage'
import { LandingPage } from './pages/LandingPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { RecordFormPage } from './pages/RecordFormPage'
import { ReviewPage } from './pages/ReviewPage'
import { SignInPage } from './pages/SignInPage'

function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="directory" element={<DirectoryPage />} />
        <Route path="establishments/:slug" element={<EstablishmentDetailPage />} />
        <Route path="staff/dashboard" element={<DashboardPage />} />
        <Route path="staff/records/new" element={<RecordFormPage mode="create" />} />
        <Route path="staff/records/:recordId/edit" element={<RecordFormPage mode="edit" />} />
        <Route path="admin/review" element={<ReviewPage />} />
      </Route>
      <Route path="sign-in" element={<SignInPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
