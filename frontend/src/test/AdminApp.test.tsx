import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
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
  workflowStatus: 'draft' | 'published'
  createdAt: string
  updatedAt: string
  submittedAt: string | null
  reviewedAt: string | null
  reviewFeedback: string | null
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
    const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {}

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
      const record: RecordFixture = { ...initialRecord(), id: 2, slug: 'new-entity', name: String(body.name), website: String(body.website || '') || null, email: String(body.email || '') || null, contactNumber: String(body.contactNumber || '') || null, summary: String(body.summary), category: categories.find((item) => item.code === body.categoryId) ?? category, workflowStatus: 'draft' }
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
  await user.type(screen.getByLabelText('Email address'), 'admin@example.test')
  await user.type(screen.getByLabelText('Password'), 'correct-password')
  await user.click(screen.getByRole('button', { name: 'Sign in' }))
  return user
}

beforeEach(() => {
  sessionActive = false
  forceEstablishmentError = false
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
  it('allows administrators to navigate directly to the login page', async () => {
    renderAdmin('/admin/login')

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('signs an administrator in with a credentialed request and restores the dashboard', async () => {
    renderAdmin('/admin/login')
    for (const logo of screen.getAllByAltText('State Interests and Governance Authority (SIGA)')) {
      expect(logo).toHaveAttribute('src', '/branding/siga-logo.png')
    }
    await signIn()

    expect(await screen.findByRole('heading', { name: 'Registry overview' })).toBeInTheDocument()
    expect(screen.getByAltText('State Interests and Governance Authority (SIGA)')).toHaveAttribute('src', '/branding/siga-logo.png')
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/api/admin/auth/login',
      expect.objectContaining({ credentials: 'include', method: 'POST' }),
    )
  })

  it('shows invalid-credential errors without establishing a session', async () => {
    const user = userEvent.setup()
    renderAdmin('/admin/login')
    await user.type(screen.getByLabelText('Email address'), 'admin@example.test')
    await user.type(screen.getByLabelText('Password'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.')
  })

  it('restores an existing session', async () => {
    sessionActive = true
    document.cookie = 'siga_admin_csrf=test-csrf-token; Path=/'
    const restored = renderAdmin('/admin')
    expect(await screen.findByRole('heading', { name: 'Registry overview' })).toBeInTheDocument()
    restored.unmount()
  })

  it('loads the administrator overview and an existing entity with no management records', async () => {
    sessionActive = true
    document.cookie = 'siga_admin_csrf=test-csrf-token; Path=/'
    const overview = renderAdmin('/admin')
    expect(await screen.findByRole('heading', { name: 'Registry overview' })).toBeInTheDocument()
    expect(screen.queryByText('The administrator overview is unavailable')).not.toBeInTheDocument()
    overview.unmount()

    renderAdmin('/admin/establishments/1/edit')
    expect(await screen.findByRole('heading', { name: 'Edit entity' })).toBeInTheDocument()
    expect(await screen.findByDisplayValue('Example Entity')).toBeInTheDocument()
    expect(screen.getByText('No management members have been added.')).toBeInTheDocument()
  })

  it.each([
    '/admin',
    '/admin/establishments',
    '/admin/establishments/new',
    '/admin/establishments/1/edit',
  ])('redirects unauthenticated visitors from %s to administrator login', async (path) => {
    renderAdmin(path)

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
  })

  it('logs out through the protected endpoint and clears administrator access', async () => {
    sessionActive = true
    document.cookie = 'siga_admin_csrf=test-csrf-token; Path=/'
    const user = userEvent.setup()
    renderAdmin('/admin')
    await screen.findByRole('heading', { name: 'Registry overview' })
    await user.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/api/admin/auth/logout',
      expect.objectContaining({ headers: expect.objectContaining({ 'X-CSRF-Token': 'test-csrf-token' }) }),
    )
  })

  it('creates and edits entities with the CSRF header', async () => {
    sessionActive = true
    document.cookie = 'siga_admin_csrf=test-csrf-token; Path=/'
    const user = userEvent.setup()
    renderAdmin('/admin/establishments/new')
    await screen.findByRole('heading', { name: 'Add entity' })
    await user.type(screen.getByLabelText(/^Name/), 'New Entity')
    await user.type(screen.getByLabelText('Website URL'), 'https://new.example.test')
    await user.selectOptions(screen.getByLabelText(/^Category/), 'SOE')
    await user.type(screen.getByLabelText('Email'), 'new@example.test')
    await user.type(screen.getByLabelText('Contact Number'), '+233 302 000 002')
    await user.type(screen.getByLabelText(/^Brief Description/), 'A new entity created through the administrator API.')
    expect(screen.queryByLabelText('Latitude')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Longitude')).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('GPS Location (Google Maps Link)'), 'https://www.google.com/maps/place/New+Entity')
    await user.click(screen.getByRole('button', { name: 'Add member' }))
    await user.type(screen.getByLabelText(/^Full name/), 'Ama Mensah')
    await user.type(screen.getByLabelText(/^Position/), 'Managing Director')
    await user.click(screen.getByRole('button', { name: 'Create entity' }))

    expect(await screen.findByRole('heading', { name: 'Edit entity' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/admin/establishments'), expect.objectContaining({ method: 'POST', headers: expect.objectContaining({ 'X-CSRF-Token': 'test-csrf-token' }) }))
    const createCall = fetchMock.mock.calls.find(([url, init]) => String(url).endsWith('/api/admin/establishments') && (init as RequestInit).method === 'POST')
    if (!createCall) throw new Error('Expected the administrator create request.')
    expect(JSON.parse(String((createCall[1] as RequestInit).body))).toMatchObject({
      gpsLocationUrl: 'https://www.google.com/maps/place/New+Entity',
      management: [{ fullName: 'Ama Mensah', position: 'Managing Director' }],
    })
    const name = screen.getByLabelText(/^Name/)
    await user.clear(name)
    await user.type(name, 'Updated Entity')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('Entity changes saved.')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/admin/establishments/2'), expect.objectContaining({ method: 'PATCH' }))
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
