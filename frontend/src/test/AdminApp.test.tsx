import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import type { AdministratorWorkflowStatus } from '../api/adminApi'
import { AdminAuthProvider } from '../state/AdminAuthProvider'

type RecordFixture = {
  id: number
  slug: string
  name: string
  website: string | null
  email: string | null
  contactNumber: string | null
  summary: string
  category: { id: number; code: string; name: string; description: string }
  workflowStatus: AdministratorWorkflowStatus
  createdAt: string
  updatedAt: string
  submittedAt: string | null
  reviewedAt: string | null
  reviewFeedback: string | null
  logoUrl?: string | null
  coverImageUrl?: string | null
  physicalAddress?: string | null
  latitude?: number | null
  longitude?: number | null
  gpsLocationUrl?: string | null
  management?: Array<{ id: number, fullName: string, position: string, officialEmail: string | null, officialPhone: string | null, displayOrder: number }>
}

const category = { id: 1, code: 'SOE', name: 'SOE', description: 'State-Owned Enterprise' }
const initialRecord = (): RecordFixture => ({
  id: 1,
  slug: 'example-entity',
  name: 'Example Entity',
  website: 'https://example.test/',
  email: 'admin@example.test',
  contactNumber: '+233 302 000 000',
  summary: 'An example establishment for administrator interface tests.',
  category,
  workflowStatus: 'published',
  createdAt: '2026-10-22T00:00:00.000Z',
  updatedAt: '2026-10-22T00:00:00.000Z',
  submittedAt: null,
  reviewedAt: null,
  reviewFeedback: null,
})

const fetchMock = vi.fn()
const scrollTo = vi.fn()
let sessionActive = false
let forceEstablishmentError = false
let forceAnalyticsError = false
let holdAnalyticsResponse = false
let releaseAnalyticsResponse: (() => void) | undefined
let records: RecordFixture[] = []
let categories = [category]

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
})

const unauthorized = () => Promise.resolve(json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication is required.' } }, 401))

const csrfHeader = (init?: RequestInit) => new Headers(init?.headers).get('X-CSRF-Token')

const configureAdministratorApi = () => {
  fetchMock.mockImplementation((input: string, init?: RequestInit) => {
    const url = new URL(input)
    const method = init?.method ?? 'GET'
    const path = url.pathname
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) as Record<string, unknown> : {}

    if (path === '/api/admin/auth/session') {
      return sessionActive
        ? Promise.resolve(json({ data: { administrator: { id: 1, email: 'admin@example.test' }, expiresAt: '2026-10-23T00:00:00.000Z' } }))
        : unauthorized()
    }
    if (path === '/api/admin/auth/login' && method === 'POST') {
      if (body.email !== 'admin@example.test' || body.password !== 'correct-password') {
        return Promise.resolve(json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } }, 401))
      }
      sessionActive = true
      document.cookie = 'siga_admin_csrf=test-csrf-token; Path=/'
      return Promise.resolve(json({ data: { administrator: { id: 1, email: 'admin@example.test' }, expiresAt: '2026-10-23T00:00:00.000Z' } }))
    }
    if (path === '/api/admin/auth/logout' && method === 'POST') {
      if (!sessionActive) return unauthorized()
      if (csrfHeader(init) !== 'test-csrf-token') return Promise.resolve(json({ error: { code: 'FORBIDDEN', message: 'A valid CSRF token is required.' } }, 403))
      sessionActive = false
      document.cookie = 'siga_admin_csrf=; Max-Age=0; Path=/'
      return Promise.resolve(new Response(null, { status: 204 }))
    }
    if (!path.startsWith('/api/admin/')) return Promise.resolve(json({ error: { code: 'NOT_FOUND' } }, 404))
    if (!sessionActive) return unauthorized()
    if (path === '/api/admin/imports/template' && method === 'GET') {
      return Promise.resolve(new Response(new Blob(['template'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), { status: 200 }))
    }
    if (path === '/api/admin/imports/preview' && method === 'POST') {
      if (csrfHeader(init) !== 'test-csrf-token') return Promise.resolve(json({ error: { code: 'FORBIDDEN', message: 'A valid CSRF token is required.' } }, 403))
      return Promise.resolve(json({ data: {
        id: 'preview-id', expiresAt: '2026-10-23T00:00:00.000Z', total: 2, valid: 1, invalid: 1, duplicates: 0,
        rows: [
          { rowNumber: 2, status: 'valid', values: { 'Entity Name': 'Imported Entity', Category: 'SOE', 'Website URL': 'https://example.gov.gh', 'Email Address': 'info@example.gov.gh', 'Contact Number': '+233 302 000 000' }, errors: {} },
          { rowNumber: 3, status: 'invalid', values: { 'Entity Name': 'Invalid Entity', Category: 'BAD' }, errors: { category: 'Use one of the configured category codes: SOE, JVC, or OSE.' } },
        ],
      } }))
    }
    if (path === '/api/admin/imports/preview-id/confirm' && method === 'POST') {
      if (csrfHeader(init) !== 'test-csrf-token') return Promise.resolve(json({ error: { code: 'FORBIDDEN', message: 'A valid CSRF token is required.' } }, 403))
      return Promise.resolve(json({ data: { imported: [{ rowNumber: 2, id: 12, name: 'Imported Entity' }], skippedDuplicates: [], rejected: [{ rowNumber: 3, name: 'Invalid Entity', errors: { category: 'Use one of the configured category codes: SOE, JVC, or OSE.' } }] } }))
    }
    if (path === '/api/admin/imports/preview-id/error-report' && method === 'GET') return Promise.resolve(new Response('Row,Errors\r\n3,"category: invalid"', { status: 200, headers: { 'Content-Type': 'text/csv' } }))
    const uploadMatch = path.match(/^\/api\/admin\/uploads\/(logo|cover)$/)
    if (uploadMatch && method === 'POST') {
      if (csrfHeader(init) !== 'test-csrf-token') return Promise.resolve(json({ error: { code: 'FORBIDDEN', message: 'A valid CSRF token is required.' } }, 403))
      return Promise.resolve(json({ data: { url: `/uploads/${uploadMatch[1]}-12345678-1234-1234-1234-123456789abc.png`, mimeType: 'image/png' } }, 201))
    }
    if (path === '/api/admin/analytics' && method === 'GET') {
      if (forceAnalyticsError) return Promise.resolve(json({ error: { code: 'DATABASE_UNAVAILABLE', message: 'The service is temporarily unavailable.' } }, 503))
      const analytics = () => json({
        data: {
          totals: {
            establishments: records.length,
            published: records.filter((record) => record.workflowStatus === 'published').length,
            drafts: records.filter((record) => record.workflowStatus === 'draft').length,
            unpublished: records.filter((record) => record.workflowStatus !== 'published').length,
          },
          categories: categories.map((item) => ({ code: item.code, name: item.name, count: records.filter((record) => record.category.code === item.code).length })),
          workflowStatuses: [
            { status: 'draft', count: records.filter((record) => record.workflowStatus === 'draft').length },
            { status: 'pending_review', count: records.filter((record) => record.workflowStatus === 'pending_review').length },
            { status: 'published', count: records.filter((record) => record.workflowStatus === 'published').length },
            { status: 'changes_requested', count: records.filter((record) => record.workflowStatus === 'changes_requested').length },
            { status: 'rejected', count: records.filter((record) => record.workflowStatus === 'rejected').length },
          ],
          profileCompleteness: { complete: 0, total: records.length, percentage: 0, criteria: ['an institution logo', 'at least one contact method (email or telephone)', 'a description', 'a region'] },
          regions: [],
          recentActivity: records.map((record) => ({ id: record.id, name: record.name, categoryCode: record.category.code, categoryName: record.category.name, workflowStatus: record.workflowStatus, updatedAt: record.updatedAt })),
          attention: { missingLogos: records.length, missingContactInformation: 0, missingDescriptions: 0, missingRegionalInformation: records.length, supportsRegion: true },
        },
      })
      if (holdAnalyticsResponse) return new Promise((resolve) => { releaseAnalyticsResponse = () => resolve(analytics()) })
      return Promise.resolve(analytics())
    }
    if (forceEstablishmentError && path === '/api/admin/establishments') {
      return Promise.resolve(json({ error: { code: 'DATABASE_UNAVAILABLE', message: 'The service is temporarily unavailable.' } }, 503))
    }
    if (path === '/api/admin/establishments' && method === 'GET') {
      const status = url.searchParams.get('status')
      const filtered = status ? records.filter((record) => record.workflowStatus === status) : records
      const page = Number(url.searchParams.get('page') ?? '1')
      const pageSize = Number(url.searchParams.get('pageSize') ?? '20')
      return Promise.resolve(json({
        data: filtered.slice((page - 1) * pageSize, page * pageSize),
        meta: { page, pageSize, total: filtered.length, totalPages: Math.ceil(filtered.length / pageSize) },
      }))
    }
    if (path === '/api/admin/establishments' && method === 'POST') {
      if (csrfHeader(init) !== 'test-csrf-token') return Promise.resolve(json({ error: { code: 'FORBIDDEN', message: 'A valid CSRF token is required.' } }, 403))
      const record: RecordFixture = { ...initialRecord(), id: 2, slug: 'new-entity', name: String(body.name), website: String(body.website || '') || null, logoUrl: String(body.logoUrl || '') || null, coverImageUrl: String(body.coverImageUrl || '') || null, email: String(body.email || '') || null, contactNumber: String(body.contactNumber || '') || null, summary: String(body.summary), physicalAddress: String(body.physicalAddress || '') || null, latitude: body.latitude ? Number(body.latitude) : null, longitude: body.longitude ? Number(body.longitude) : null, gpsLocationUrl: String(body.gpsLocationUrl || '') || null, management: [], category: categories.find((item) => item.code === body.categoryId) ?? category, workflowStatus: 'draft' }
      records.push(record)
      return Promise.resolve(json({ data: record }, 201))
    }
    const establishmentMatch = path.match(/^\/api\/admin\/establishments\/(\d+)(\/publication)?$/)
    if (establishmentMatch) {
      const id = Number(establishmentMatch[1])
      const record = records.find((item) => item.id === id)
      if (!record) return Promise.resolve(json({ error: { code: 'NOT_FOUND', message: 'The establishment record was not found.' } }, 404))
      if (csrfHeader(init) !== 'test-csrf-token') return Promise.resolve(json({ error: { code: 'FORBIDDEN', message: 'A valid CSRF token is required.' } }, 403))
      if (method === 'DELETE') {
        records = records.filter((item) => item.id !== id)
        return Promise.resolve(new Response(null, { status: 204 }))
      }
      if (establishmentMatch[2]) {
        record.workflowStatus = body.published === true ? 'published' : 'draft'
        return Promise.resolve(json({ data: record }))
      }
      record.name = String(body.name)
      record.website = String(body.website || '') || null
      record.email = String(body.email || '') || null
      record.contactNumber = String(body.contactNumber || '') || null
      record.summary = String(body.summary)
      record.category = categories.find((item) => item.code === body.categoryId) ?? category
      if (Array.isArray(body.management)) {
        record.management = body.management.map((member, index) => {
          const input = member as Record<string, unknown>
          return { id: 100 + index, fullName: String(input.fullName), position: String(input.position), officialEmail: String(input.officialEmail || '') || null, officialPhone: String(input.officialPhone || '') || null, displayOrder: index }
        })
      }
      return Promise.resolve(json({ data: record }))
    }
    if (path === '/api/admin/categories' && method === 'GET') return Promise.resolve(json({ data: categories }))
    return Promise.resolve(json({ error: { code: 'NOT_FOUND' } }, 404))
  })
}

function renderAdmin(entry: string) {
  return render(<AdminAuthProvider><MemoryRouter initialEntries={[entry]}><App /></MemoryRouter></AdminAuthProvider>)
}

const signIn = async () => {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Email Address'), 'admin@example.test')
  await user.type(screen.getByLabelText('Password'), 'correct-password')
  await user.click(screen.getByRole('button', { name: 'Sign in' }))
  return user
}

beforeEach(() => {
  sessionActive = false
  forceEstablishmentError = false
  forceAnalyticsError = false
  holdAnalyticsResponse = false
  releaseAnalyticsResponse = undefined
  records = [initialRecord()]
  categories = [{ ...category }]
  document.cookie = 'siga_admin_csrf=; Max-Age=0; Path=/'
  fetchMock.mockReset()
  scrollTo.mockReset()
  configureAdministratorApi()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubGlobal('scrollTo', scrollTo)
})

afterEach(() => {
  document.cookie = 'siga_admin_csrf=; Max-Age=0; Path=/'
  vi.unstubAllGlobals()
})

describe('administrator interface', () => {
  it('renders a centered institutional administrator login page', async () => {
    renderAdmin('/admin/login')

    expect(await screen.findByRole('heading', { name: 'Administrator Sign In' })).toBeInTheDocument()
    const header = screen.getByRole('banner')
    expect(screen.getByTestId('admin-login-header-layout')).toHaveClass('grid', 'grid-cols-1', 'sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]')
    expect(within(header).getByTestId('admin-login-header-title')).toHaveClass('justify-self-center', 'sm:col-start-2', 'sm:row-start-1')
    expect(within(header).getByText('Administrator')).toHaveClass('justify-self-end', 'sm:col-start-3', 'sm:row-start-1')
    expect(within(header).getByAltText('State Interests and Governance Authority (SIGA)')).toHaveAttribute('src', '/branding/siga-logo.png')
    expect(screen.getAllByAltText('State Interests and Governance Authority (SIGA)')).toHaveLength(1)
    const card = screen.getByTestId('admin-login-card')
    expect(card).toHaveClass('rounded-2xl', 'border', 'bg-white', 'p-6', 'shadow-sm', 'sm:p-8')
    expect(screen.queryByText('Administrator access')).not.toBeInTheDocument()
    expect(screen.queryByText('Manage the registry securely.')).not.toBeInTheDocument()
    expect(screen.queryByText('Specified Entities information directory')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Welcome back' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Back to public directory/ })).not.toBeInTheDocument()
    const footer = screen.getByTestId('admin-login-footer')
    expect(footer).toHaveClass('mt-auto', 'border-slate-200', 'bg-white')
    expect(within(footer).getByText(`© ${new Date().getFullYear()} State Interests and Governance Authority. All rights reserved.`)).toBeInTheDocument()
    expect(within(footer).getByText('Created by SIGA IT')).toBeInTheDocument()
    expect(screen.getByTestId('admin-login-footer-content')).toHaveClass('py-7', 'sm:flex-row', 'sm:justify-between')
    expect(screen.getByTestId('admin-login-page')).toHaveClass('flex', 'min-h-screen', 'flex-col')
    expect(screen.getByRole('main')).toHaveClass('flex', 'flex-1', 'flex-col')
    expect(card.closest('section')).toHaveClass('flex-1')
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('signs an administrator in with a credentialed request and restores the dashboard', async () => {
    renderAdmin('/admin/login')
    for (const logo of screen.getAllByAltText('State Interests and Governance Authority (SIGA)')) {
      expect(logo).toHaveAttribute('src', '/branding/siga-logo.png')
    }
    await signIn()

    expect(await screen.findByRole('heading', { name: 'Overview' })).toBeInTheDocument()
    expect(screen.getAllByAltText('State Interests and Governance Authority (SIGA)')[0]).toHaveAttribute('src', '/branding/siga-logo.png')
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/api/admin/auth/login',
      expect.objectContaining({ credentials: 'include', method: 'POST' }),
    )
  })

  it('shows invalid-credential errors without establishing a session', async () => {
    const user = userEvent.setup()
    renderAdmin('/admin/login')
    await user.type(screen.getByLabelText('Email Address'), 'admin@example.test')
    await user.type(screen.getByLabelText('Password'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.')
  })

  it('restores an existing session', async () => {
    sessionActive = true
    document.cookie = 'siga_admin_csrf=test-csrf-token; Path=/'
    const restored = renderAdmin('/admin')
    expect(await screen.findByRole('heading', { name: 'Overview' })).toBeInTheDocument()
    restored.unmount()
  })

  it('loads the administrator overview and an existing entity with no management records', async () => {
    sessionActive = true
    document.cookie = 'siga_admin_csrf=test-csrf-token; Path=/'
    const overview = renderAdmin('/admin')
    expect(await screen.findByRole('heading', { name: 'Overview' })).toBeInTheDocument()
    expect(screen.queryByText('The administrator overview is unavailable')).not.toBeInTheDocument()
    overview.unmount()

    renderAdmin('/admin/establishments/1/edit')
    expect(await screen.findByRole('heading', { name: 'Manage Entity' })).toBeInTheDocument()
    expect(await screen.findByDisplayValue('Example Entity')).toBeInTheDocument()
    expect(screen.getByText('No management members have been added.')).toBeInTheDocument()
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    const navigation = screen.getByRole('navigation', { name: 'Administrator navigation' })
    expect(within(navigation).getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '/admin')
    expect(within(navigation).getByRole('link', { name: 'Entities' })).toHaveClass('bg-teal-100')
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
  })

  it('renders analytics after its loading skeleton and retries an unavailable dashboard request', async () => {
    sessionActive = true
    document.cookie = 'siga_admin_csrf=test-csrf-token; Path=/'
    holdAnalyticsResponse = true
    const loading = renderAdmin('/admin')
    expect(await screen.findByRole('status', { name: 'Loading administrator analytics' })).toBeInTheDocument()
    releaseAnalyticsResponse?.()
    expect(await screen.findByRole('heading', { name: 'Overview' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Entities by category' })).toBeInTheDocument()
    const summaryGrid = screen.getByTestId('admin-summary-grid')
    expect(summaryGrid).toHaveClass('sm:grid-cols-2', 'lg:grid-cols-4')
    expect(Array.from(summaryGrid.children).map((card) => card.querySelector('p')?.textContent)).toEqual([
      'Total Entities',
      'Published',
      'Drafts',
      'Unpublished Entities',
    ])
    expect(Array.from(summaryGrid.children).map((card) => card.textContent)).toEqual([
      expect.stringContaining('1'),
      expect.stringContaining('1'),
      expect.stringContaining('0'),
      expect.stringContaining('0'),
    ])
    const analyticsGrid = screen.getByTestId('admin-analytics-grid')
    expect(analyticsGrid).toHaveClass('lg:grid-cols-2')
    expect(analyticsGrid.children).toHaveLength(2)
    expect(screen.getByTestId('admin-category-chart')).toHaveClass('h-full', 'min-w-0', 'lg:p-3')
    expect(screen.getByTestId('admin-category-donut')).toHaveClass('lg:h-24', 'lg:w-24')
    expect(screen.getByTestId('admin-regional-chart')).toHaveClass('h-full', 'min-w-0', 'lg:p-3')
    expect(screen.getAllByText('SOE — State-Owned Enterprises')).toHaveLength(2)
    expect(screen.getByText('entities')).toBeInTheDocument()
    expect(screen.getAllByText('SOE — State-Owned Enterprises')[1]?.parentElement).toHaveTextContent('1 entity (100%)')
    expect(screen.getByRole('heading', { name: 'Regional distribution' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Records requiring attention' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Publication status' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Profile completeness' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Add Entity' })).toHaveAttribute('href', '/admin/establishments/new')
    expect(screen.queryByRole('heading', { name: 'Recent activity' })).not.toBeInTheDocument()
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: 'Administrator navigation' })).getByRole('link', { name: 'Entities' })).toHaveAttribute('href', '/admin/establishments')
    holdAnalyticsResponse = false
    loading.unmount()

    forceAnalyticsError = true
    const retry = renderAdmin('/admin')
    expect(await screen.findByRole('alert')).toHaveTextContent('The administrator overview is unavailable')
    forceAnalyticsError = false
    await userEvent.setup().click(screen.getByRole('button', { name: 'Retry analytics' }))
    expect(await screen.findByRole('heading', { name: 'Overview' })).toBeInTheDocument()
    retry.unmount()
  })

  it('counts every non-published workflow status and refreshes the overview after publication changes', async () => {
    sessionActive = true
    document.cookie = 'siga_admin_csrf=test-csrf-token; Path=/'
    records = [
      initialRecord(),
      { ...initialRecord(), id: 2, slug: 'draft-entity', name: 'Draft Entity', workflowStatus: 'draft' },
      { ...initialRecord(), id: 3, slug: 'pending-entity', name: 'Pending Entity', workflowStatus: 'pending_review' },
      { ...initialRecord(), id: 4, slug: 'changes-entity', name: 'Changes Entity', workflowStatus: 'changes_requested' },
      { ...initialRecord(), id: 5, slug: 'rejected-entity', name: 'Rejected Entity', workflowStatus: 'rejected' },
    ]
    const user = userEvent.setup()
    renderAdmin('/admin')

    const expectUnpublishedCount = async (count: number) => {
      const card = (await screen.findByText('Unpublished Entities')).closest('section')
      if (!card) throw new Error('Expected the unpublished-entities summary card.')
      expect(card).toHaveTextContent(String(count))
    }

    await expectUnpublishedCount(4)
    expect(screen.queryByText('Pending review')).not.toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Entities' }))
    await user.click(await screen.findByRole('button', { name: 'Unpublish Example Entity' }))
    expect(await screen.findByText('Entity unpublished.')).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Overview' }))
    await expectUnpublishedCount(5)

    await user.click(screen.getByRole('link', { name: 'Entities' }))
    await user.click(await screen.findByRole('button', { name: 'Publish Example Entity' }))
    expect(await screen.findByText('Entity published.')).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Overview' }))
    await expectUnpublishedCount(4)
  })

  it.each([
    '/admin',
    '/admin/establishments',
    '/admin/establishments/new',
    '/admin/establishments/1/edit',
  ])('redirects unauthenticated visitors from %s to administrator login', async (path) => {
    renderAdmin(path)

    expect(await screen.findByRole('heading', { name: 'Administrator Sign In' })).toBeInTheDocument()
  })

  it('logs out through the protected endpoint and clears administrator access', async () => {
    sessionActive = true
    document.cookie = 'siga_admin_csrf=test-csrf-token; Path=/'
    const user = userEvent.setup()
    renderAdmin('/admin')
    await screen.findByRole('heading', { name: 'Overview' })
    await user.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(await screen.findByRole('heading', { name: 'Administrator Sign In' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/api/admin/auth/logout',
      expect.objectContaining({ headers: expect.objectContaining({ 'X-CSRF-Token': 'test-csrf-token' }) }),
    )
  })

  it('uploads images and creates an entity with manual location details without Google Maps', async () => {
    sessionActive = true
    document.cookie = 'siga_admin_csrf=test-csrf-token; Path=/'
    const user = userEvent.setup()
    renderAdmin('/admin/establishments/new')
    await screen.findByRole('heading', { name: 'Add Entity' })
    expect(screen.getByLabelText('Institution logo')).toHaveAttribute('type', 'file')
    expect(screen.getByLabelText('Institution cover image')).toHaveAttribute('type', 'file')
    expect(screen.queryByLabelText('Institution Logo URL')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add Member' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Location information' })).toBeInTheDocument()
    expect(screen.getByLabelText('Region')).toBeInTheDocument()
    expect(screen.getByLabelText('City')).toBeInTheDocument()
    expect(screen.getByLabelText('Physical address')).toBeInTheDocument()
    expect(screen.queryByTestId('google-maps-fallback')).not.toBeInTheDocument()
    expect(screen.queryByTestId('google-map-location-picker')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Find a location')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Latitude (optional)')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Longitude (optional)')).not.toBeInTheDocument()
    expect(document.getElementById('siga-google-maps-script')).not.toBeInTheDocument()
    await user.upload(screen.getByLabelText('Institution logo'), new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'oversized-logo.png', { type: 'image/png' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Choose an image no larger than 5 MB.')
    await user.upload(screen.getByLabelText('Institution logo'), new File(['png'], 'logo.png', { type: 'image/png' }))
    expect(await screen.findByAltText('Institution logo preview')).toBeInTheDocument()
    await user.upload(screen.getByLabelText('Institution logo'), new File(['webp'], 'replacement.webp', { type: 'image/webp' }))
    expect(await screen.findByAltText('Institution logo preview')).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Remove image' })[0])
    expect(screen.queryByAltText('Institution logo preview')).not.toBeInTheDocument()
    await user.upload(screen.getByLabelText('Institution logo'), new File(['png'], 'final-logo.png', { type: 'image/png' }))
    expect(await screen.findByAltText('Institution logo preview')).toBeInTheDocument()
    await user.upload(screen.getByLabelText('Institution cover image'), new File(['png'], 'cover.png', { type: 'image/png' }))
    expect(await screen.findByAltText('Institution cover preview')).toBeInTheDocument()
    await user.type(screen.getByLabelText(/^Name/), 'New Entity')
    await user.type(screen.getByLabelText('Website URL'), 'https://new.example.test')
    await user.selectOptions(screen.getByLabelText(/^Category/), 'SOE')
    await user.type(screen.getByLabelText('Email'), 'new@example.test')
    await user.type(screen.getByLabelText('Contact Number'), '+233 302 000 002')
    await user.type(screen.getByLabelText(/^Brief Description/), 'A new entity created through the administrator API.')
    await user.type(screen.getByLabelText('Region'), 'Greater Accra')
    await user.type(screen.getByLabelText('City'), 'Accra')
    await user.type(screen.getByLabelText('Physical address'), '1 Registry Road, Accra')
    await user.click(screen.getByRole('button', { name: 'Create Entity' }))

    expect(await screen.findByRole('heading', { name: 'Manage Entity' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/admin/establishments'), expect.objectContaining({ method: 'POST', headers: expect.objectContaining({ 'X-CSRF-Token': 'test-csrf-token' }) }))
    const createCall = fetchMock.mock.calls.find(([url, init]) => String(url).endsWith('/api/admin/establishments') && (init as RequestInit).method === 'POST')
    if (!createCall) throw new Error('Expected the administrator create request.')
    expect(JSON.parse(String((createCall[1] as RequestInit).body))).toMatchObject({
      logoUrl: '/uploads/logo-12345678-1234-1234-1234-123456789abc.png',
      coverImageUrl: '/uploads/cover-12345678-1234-1234-1234-123456789abc.png',
      region: 'Greater Accra',
      city: 'Accra',
      physicalAddress: '1 Registry Road, Accra',
      latitude: '',
      longitude: '',
      gpsLocationUrl: '',
      management: [],
    })
    expect(screen.getByTestId('google-maps-fallback')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add Member' }))
    await user.type(screen.getByLabelText(/^Full name/), 'Ama Mensah')
    await user.type(screen.getByLabelText(/^Position/), 'Managing Director')
    const name = screen.getByLabelText(/^Name/)
    await user.clear(name)
    await user.type(name, 'Updated Entity')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('Entity changes saved.')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/admin/establishments/2'), expect.objectContaining({ method: 'PATCH' }))
    const updateCall = fetchMock.mock.calls.find(([url, init]) => String(url).endsWith('/api/admin/establishments/2') && (init as RequestInit).method === 'PATCH')
    if (!updateCall) throw new Error('Expected the administrator update request.')
    expect(JSON.parse(String((updateCall[1] as RequestInit).body))).toMatchObject({ management: [{ fullName: 'Ama Mensah', position: 'Managing Director' }] })
  })

  it('opens the administrator bulk import workflow, previews rows, and requires confirmation before import', async () => {
    sessionActive = true
    document.cookie = 'siga_admin_csrf=test-csrf-token; Path=/'
    const user = userEvent.setup()
    renderAdmin('/admin/establishments')
    const importLink = await screen.findByRole('link', { name: 'Import' })
    expect(importLink).toHaveAttribute('href', '/admin/establishments/import')
    expect(importLink).toHaveClass('rounded-lg', 'border', 'border-navy-950')
    expect(screen.queryByRole('link', { name: 'Bulk Import' })).not.toBeInTheDocument()
    await user.click(importLink)

    expect(await screen.findByRole('heading', { name: 'Bulk Entity Import' })).toBeInTheDocument()
    expect(screen.queryByText(/Review up to 500 new entities from an Excel or CSV file/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Supported formats: .xlsx and .csv/)).not.toBeInTheDocument()
    await user.upload(screen.getByLabelText('Entity spreadsheet'), new File(['Entity Name,Category\nImported Entity,SOE'], 'entities.csv', { type: 'text/csv' }))
    await user.click(screen.getByRole('button', { name: 'Preview Import' }))
    expect(await screen.findByRole('heading', { name: 'Import preview' })).toBeInTheDocument()
    expect(screen.getByText('2 total')).toBeInTheDocument()
    expect(screen.getByText('1 valid')).toBeInTheDocument()
    expect(screen.getByText('1 invalid')).toBeInTheDocument()
    expect(screen.getByText('Imported Entity')).toBeInTheDocument()
    expect(screen.getByText('Invalid Entity')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Contact Number' })).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Brief Description' })).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/admin/imports/preview'), expect.objectContaining({ method: 'POST', headers: expect.objectContaining({ 'X-CSRF-Token': 'test-csrf-token' }) }))

    await user.click(screen.getByRole('button', { name: 'Import Valid Entities' }))
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Import 1 valid entity record as drafts')
    await user.click(screen.getByRole('button', { name: 'Confirm import 1 valid entities' }))
    expect(await screen.findByRole('heading', { name: 'Import summary' })).toBeInTheDocument()
    expect(screen.getByText('Imported Entity')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Manage entity' })).toHaveAttribute('href', '/admin/establishments/12/edit')
  })

  it('combines administrator entity name, category, and publication filters', async () => {
    sessionActive = true
    document.cookie = 'siga_admin_csrf=test-csrf-token; Path=/'
    records = [
      { ...initialRecord(), id: 1, name: 'Alpha Registry', workflowStatus: 'published' },
      { ...initialRecord(), id: 2, name: 'Alpha Draft', category: { id: 2, code: 'JVC', name: 'JVC', description: 'Joint Venture Company' }, workflowStatus: 'draft' },
      { ...initialRecord(), id: 3, name: 'Beta Published', category: { id: 3, code: 'OSE', name: 'OSE', description: 'Other State Entity' }, workflowStatus: 'published' },
      { ...initialRecord(), id: 4, name: 'Mines Joint Venture', category: { id: 2, code: 'JVC', name: 'JVC', description: 'Joint Venture Company' }, workflowStatus: 'published' },
      { ...initialRecord(), id: 5, name: 'Other Draft', category: { id: 3, code: 'OSE', name: 'OSE', description: 'Other State Entity' }, workflowStatus: 'draft' },
    ]
    const user = userEvent.setup()
    renderAdmin('/admin/establishments')

    const search = await screen.findByRole('searchbox', { name: 'Search entities' })
    const categoryFilter = screen.getByLabelText('Category')
    expect(search).toHaveAttribute('placeholder', 'Search entities by name...')
    expect(categoryFilter).toHaveValue('')

    await user.selectOptions(categoryFilter, 'SOE')
    expect(await screen.findByRole('link', { name: 'Edit Alpha Registry' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Edit Alpha Draft' })).not.toBeInTheDocument()

    await user.selectOptions(categoryFilter, 'JVC')
    expect(await screen.findByRole('link', { name: 'Edit Alpha Draft' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Edit Mines Joint Venture' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Edit Alpha Registry' })).not.toBeInTheDocument()

    await user.selectOptions(categoryFilter, 'OSE')
    expect(await screen.findByRole('link', { name: 'Edit Beta Published' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Edit Other Draft' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Edit Mines Joint Venture' })).not.toBeInTheDocument()

    await user.selectOptions(categoryFilter, '')
    await user.type(search, '  aLpHa  ')
    expect(await screen.findByRole('link', { name: 'Edit Alpha Registry' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Edit Alpha Draft' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Edit Beta Published' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Published' }))
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Edit Alpha Draft' })).not.toBeInTheDocument())
    expect(screen.getByRole('link', { name: 'Edit Alpha Registry' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Unpublished' }))
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Edit Alpha Registry' })).not.toBeInTheDocument())
    expect(screen.getByRole('link', { name: 'Edit Alpha Draft' })).toBeInTheDocument()

    await user.clear(search)
    expect(await screen.findByRole('link', { name: 'Edit Alpha Draft' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Edit Alpha Registry' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Edit Other Draft' })).toBeInTheDocument()

    await user.selectOptions(categoryFilter, 'JVC')
    await user.type(search, ' mines ')
    expect(await screen.findByRole('heading', { name: 'No matching entities' })).toBeInTheDocument()
    expect(screen.getByText('No entities match your search or selected filters.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'All records' }))
    expect(await screen.findByRole('link', { name: 'Edit Mines Joint Venture' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Edit Alpha Draft' })).not.toBeInTheDocument()

    await user.clear(search)
    expect(await screen.findByRole('link', { name: 'Edit Alpha Draft' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Edit Mines Joint Venture' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Edit Alpha Registry' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Published' }))
    expect(await screen.findByRole('link', { name: 'Edit Mines Joint Venture' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Edit Alpha Draft' })).not.toBeInTheDocument()

    await user.type(search, 'mines')
    await user.selectOptions(categoryFilter, 'OSE')
    expect(await screen.findByRole('heading', { name: 'No matching entities' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Clear search and category filters' }))
    expect(search).toHaveValue('')
    expect(categoryFilter).toHaveValue('')
    expect(await screen.findByRole('link', { name: 'Edit Alpha Registry' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Edit Beta Published' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Edit Mines Joint Venture' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Edit Alpha Draft' })).not.toBeInTheDocument()
  })

  it('finds an administrator entity beyond the currently displayed page', async () => {
    sessionActive = true
    document.cookie = 'siga_admin_csrf=test-csrf-token; Path=/'
    records = Array.from({ length: 101 }, (_, index) => ({
      ...initialRecord(),
      id: index + 1,
      slug: `entity-${index + 1}`,
      name: index === 100 ? 'Faraway Entity' : `Entity ${index + 1}`,
      workflowStatus: 'draft' as const,
    }))
    const user = userEvent.setup()
    renderAdmin('/admin/establishments')

    await user.type(await screen.findByRole('searchbox', { name: 'Search entities' }), 'faraway')
    expect(await screen.findByRole('link', { name: 'Edit Faraway Entity' })).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('page=2&pageSize=100'))).toBe(true)
  })

  it('requires an explicit deletion confirmation and can publish or unpublish a record', async () => {
    sessionActive = true
    document.cookie = 'siga_admin_csrf=test-csrf-token; Path=/'
    const user = userEvent.setup()
    renderAdmin('/admin/establishments')
    await screen.findByRole('button', { name: 'Unpublish Example Entity' })
    await user.click(screen.getByRole('button', { name: /Unpublish Example Entity/ }))
    expect(await screen.findByText('Entity unpublished.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Delete Example Entity/ }))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([url, init]) => String(url).endsWith('/api/admin/establishments/1') && (init as RequestInit).method === 'DELETE')).toBe(false)
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Confirm delete' }))
    expect(await screen.findByText('Entity deleted.')).toBeInTheDocument()
  })

  it('removes category management from administrator navigation and routing', async () => {
    sessionActive = true
    document.cookie = 'siga_admin_csrf=test-csrf-token; Path=/'
    const overview = renderAdmin('/admin')
    const navigation = await screen.findByRole('navigation', { name: 'Administrator navigation' })
    expect(navigation).not.toHaveTextContent('Categories')
    expect(within(navigation).queryByRole('link', { name: 'Categories' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Open categories →' })).not.toBeInTheDocument()
    overview.unmount()

    renderAdmin('/admin/categories')
    expect(await screen.findByRole('heading', { name: 'That page is not here.' })).toBeInTheDocument()
  })

  it('shows protected API failures without exposing administration data', async () => {
    sessionActive = true
    document.cookie = 'siga_admin_csrf=test-csrf-token; Path=/'
    forceEstablishmentError = true
    renderAdmin('/admin/establishments')

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load entity records')
  })
})
