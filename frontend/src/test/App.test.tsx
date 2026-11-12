import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PublicCategory, PublicDashboard, PublicEstablishment } from '../api/publicApi'
import App from '../App'
import { PublicAuthProvider } from '../state/PublicAuthProvider'

const categories: PublicCategory[] = [
  { id: 'soe', code: 'SOE', name: 'SOE', description: 'State-Owned Enterprise' },
  { id: 'jvc', code: 'JVC', name: 'JVC', description: 'Joint Venture Company' },
  { id: 'ose', code: 'OSE', name: 'OSE', description: 'Other State Entity' },
]

const establishments: PublicEstablishment[] = [
  { id: '1', slug: 'electricity-company-of-ghana', name: 'Electricity Company of Ghana', website: 'https://ecg.example.test/', logoUrl: 'https://ecg.example.test/logo.png', coverImageUrl: 'https://ecg.example.test/cover.jpg', supervisingMinistry: 'Ministry of Energy', categoryId: 'soe', category: categories[0], email: 'help@ecg.example.test', contactNumber: '+233 302 611 611', summary: 'Electricity distribution utility.', region: 'Greater Accra', city: 'Accra', physicalAddress: '1 ECG Road', gpsAddress: 'GA-123-4567', gpsLocationUrl: 'https://www.google.com/maps/place/Electricity+Company+of+Ghana', latitude: 5.6037, longitude: -0.187, management: [{ id: 10, fullName: 'Ama Mensah', position: 'Managing Director', officialEmail: 'ama@ecg.example.test', officialPhone: '', displayOrder: 0 }, { id: 11, fullName: 'Kojo Owusu', position: 'Board Chair', officialEmail: null, officialPhone: '+233 302 000 001', displayOrder: 1 }] },
  { id: '2', slug: 'volta-river-authority', name: 'Volta River Authority', website: 'https://vra.example.test/', categoryId: 'soe', category: categories[0], email: 'info@vra.example.test', contactNumber: '+233 302 664 941', summary: 'Power utility.' },
  { id: '3', slug: 'ghana-oil-company', name: 'Ghana Oil Company', website: '', categoryId: 'jvc', category: categories[1], email: '', contactNumber: '', summary: 'Energy company.' },
  { id: '4', slug: 'forestry-commission', name: 'Forestry Commission', website: 'https://forestry.example.test/', categoryId: 'ose', category: categories[2], email: 'info@forestry.example.test', contactNumber: '+233 302 401 227', summary: 'Forestry and wildlife authority.' },
  { id: '5', slug: 'ghana-highway-authority', name: 'Ghana Highway Authority', website: '', categoryId: 'ose', category: categories[2], email: '', contactNumber: '', summary: 'Road infrastructure authority.' },
  { id: '6', slug: 'ghana-ports-authority', name: 'Ghana Ports Authority', website: '', categoryId: 'soe', category: categories[0], email: '', contactNumber: '', summary: 'Port operations authority.' },
  { id: '7', slug: 'national-communications-authority', name: 'National Communications Authority', website: '', categoryId: 'soe', category: categories[0], email: '', contactNumber: '', summary: 'Communications regulator.' },
  { id: '8', slug: 'tema-oil-refinery', name: 'Tema Oil Refinery', website: '', categoryId: 'soe', category: categories[0], email: '', contactNumber: '', summary: 'Petroleum refinery.' },
  { id: '9', slug: 'zeta-public-services', name: 'Zeta Public Services', website: '', categoryId: 'ose', category: categories[2], email: '', contactNumber: '', summary: 'A final alphabetic public service.' },
]

const dashboardData: PublicDashboard = {
  total: 9,
  categoryCounts: { SOE: 5, JVC: 1, OSE: 3 },
  recent: [
    { id: establishments[8]!.id, slug: establishments[8]!.slug, name: establishments[8]!.name, category: categories[2]!, publishedAt: '2026-11-03T12:00:00.000Z', publishedAtSource: 'updatedAt' },
    { id: establishments[7]!.id, slug: establishments[7]!.slug, name: establishments[7]!.name, category: categories[0]!, publishedAt: '2026-11-02T12:00:00.000Z', publishedAtSource: 'reviewedAt' },
    { id: establishments[6]!.id, slug: establishments[6]!.slug, name: establishments[6]!.name, category: categories[0]!, publishedAt: '2026-11-01T12:00:00.000Z', publishedAtSource: 'createdAt' },
  ],
}

const createDirectoryFixtures = (count: number): PublicEstablishment[] => [
  ...establishments,
  ...Array.from({ length: Math.max(0, count - establishments.length) }, (_, index) => ({
    ...establishments[2]!,
    id: `fixture-${index + 1}`,
    slug: `sample-entity-${String(index + 1).padStart(2, '0')}`,
    name: `Sample Entity ${String(index + 1).padStart(2, '0')}`,
  })),
]

const fetchMock = vi.fn()
const scrollTo = vi.fn()
let directoryUnavailable = false
let emptyDirectory = false
let directoryEstablishments = establishments
let publicSessionActive = false
let dashboardUnavailable = false
let emptyDashboard = false

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
})

const configurePublicApi = () => {
  fetchMock.mockImplementation((input: string, init?: RequestInit) => {
    const url = new URL(input)
    if (url.pathname === '/api/public/auth/session') {
      return Promise.resolve(publicSessionActive
        ? json({ data: { publicUser: { id: 1, email: 'visitor@example.test' }, expiresAt: '2026-11-03T00:00:00.000Z' } })
        : json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication is required.' } }, 401))
    }
    if (url.pathname === '/api/public/auth/login' || url.pathname === '/api/public/auth/register') {
      publicSessionActive = true
      document.cookie = 'siga_public_csrf=test-public-csrf; Path=/'
      return Promise.resolve(json({ data: { publicUser: { id: 1, email: 'visitor@example.test' }, expiresAt: '2026-11-03T00:00:00.000Z' } }))
    }
    if (url.pathname === '/api/public/auth/logout' && init?.method === 'POST') {
      publicSessionActive = false
      document.cookie = 'siga_public_csrf=; Max-Age=0; Path=/'
      return Promise.resolve(new Response(null, { status: 204 }))
    }
    if (url.pathname === '/api/categories') return Promise.resolve(json({ data: categories }))
    if (url.pathname === '/api/dashboard') {
      return Promise.resolve(dashboardUnavailable
        ? json({ error: { code: 'DATABASE_UNAVAILABLE', message: 'The service is temporarily unavailable.' } }, 503)
        : json({ data: emptyDashboard ? { total: 0, categoryCounts: { SOE: 0, JVC: 0, OSE: 0 }, recent: [] } : dashboardData }))
    }
    if (url.pathname === '/api/establishments/options') {
      const search = url.searchParams.get('search')?.toLocaleLowerCase() ?? ''
      const category = url.searchParams.get('category')?.toLocaleUpperCase() ?? ''
      const entity = url.searchParams.get('entity') ?? ''
      const page = Number(url.searchParams.get('page') ?? '1')
      const pageSize = Number(url.searchParams.get('pageSize') ?? '20')
      const allOptions = directoryEstablishments.filter((item) => item.name.toLocaleLowerCase().includes(search) && (!category || item.category.code === category) && (!entity || item.slug === entity))
      return Promise.resolve(json({
        data: allOptions.slice((page - 1) * pageSize, page * pageSize).map(({ id, slug, name, category: itemCategory }) => ({ id, slug, name, categoryCode: itemCategory.code })),
        meta: { page, pageSize, total: allOptions.length, totalPages: Math.ceil(allOptions.length / pageSize) },
      }))
    }
    if (url.pathname.startsWith('/api/establishments/')) {
      const slug = url.pathname.split('/').at(-1)
      const establishment = establishments.find((item) => item.slug === slug)
      return Promise.resolve(establishment
        ? json({ data: establishment })
        : json({ error: { code: 'NOT_FOUND', message: 'The published establishment was not found.' } }, 404))
    }
    if (url.pathname === '/api/establishments') {
      if (directoryUnavailable) {
        return Promise.resolve(json({ error: { code: 'DATABASE_UNAVAILABLE', message: 'The service is temporarily unavailable.' } }, 503))
      }
      const search = url.searchParams.get('search')?.toLocaleLowerCase() ?? ''
      const category = url.searchParams.get('category')?.toLocaleUpperCase() ?? ''
      const entity = url.searchParams.get('entity') ?? ''
      const sort = url.searchParams.get('sort') === 'desc' ? 'desc' : 'asc'
      const allResults = (emptyDirectory ? [] : directoryEstablishments.filter((item) =>
        item.name.toLocaleLowerCase().includes(search) && (!category || item.category.code === category) && (!entity || item.slug === entity),
      )).sort((left, right) => sort === 'asc' ? left.name.localeCompare(right.name) : right.name.localeCompare(left.name))
      const page = Number(url.searchParams.get('page') ?? '1')
      const pageSize = Number(url.searchParams.get('pageSize') ?? '20')
      return Promise.resolve(json({
        data: allResults.slice((page - 1) * pageSize, page * pageSize),
        meta: { page, pageSize, total: allResults.length, totalPages: Math.ceil(allResults.length / pageSize) },
      }))
    }
    return Promise.resolve(json({ error: { code: 'NOT_FOUND' } }, 404))
  })
}

function renderApp(entry = '/') {
  return render(<PublicAuthProvider><MemoryRouter initialEntries={[entry]}><App /></MemoryRouter></PublicAuthProvider>)
}

beforeEach(() => {
  directoryUnavailable = false
  emptyDirectory = false
  directoryEstablishments = establishments
  dashboardUnavailable = false
  emptyDashboard = false
  publicSessionActive = true
  document.cookie = 'siga_public_csrf=test-public-csrf; Path=/'
  fetchMock.mockReset()
  scrollTo.mockReset()
  configurePublicApi()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubGlobal('scrollTo', scrollTo)
})

afterEach(() => vi.unstubAllGlobals())

describe('SIGA Registry public API experience', () => {
  it('keeps administrator access out of public navigation', async () => {
    publicSessionActive = false
    document.cookie = 'siga_public_csrf=; Max-Age=0; Path=/'
    renderApp('/')

    expect(await screen.findByRole('heading', { name: 'SIGA Registry' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sign In' })).toHaveAttribute('href', '/login')
    expect(screen.queryByRole('link', { name: /admin login|administrator|admin dashboard|staff login|manage entities/i })).not.toBeInTheDocument()

    for (const link of screen.getAllByRole('link')) {
      expect(link).not.toHaveAttribute('href', expect.stringMatching(/^\/admin(?:\/|$)/))
    }
  })

  it('redirects unauthenticated visitors away from directory and profile content', async () => {
    publicSessionActive = false
    document.cookie = 'siga_public_csrf=; Max-Age=0; Path=/'
    renderApp('/directory')

    expect(await screen.findByRole('heading', { name: 'SIGA Registry' })).toBeInTheDocument()
    expect(screen.queryByLabelText('9 entities found')).not.toBeInTheDocument()
  })

  it('redirects unauthenticated visitors away from the public dashboard', async () => {
    publicSessionActive = false
    document.cookie = 'siga_public_csrf=; Max-Age=0; Path=/'
    renderApp('/dashboard')

    expect(await screen.findByRole('heading', { name: 'SIGA Registry' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Specified Entities Registry' })).not.toBeInTheDocument()
  })

  it('redirects unauthenticated visitors away from individual entity profiles', async () => {
    publicSessionActive = false
    document.cookie = 'siga_public_csrf=; Max-Age=0; Path=/'
    renderApp('/establishments/electricity-company-of-ghana')

    expect(await screen.findByRole('heading', { name: 'SIGA Registry' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Electricity Company of Ghana' })).not.toBeInTheDocument()
  })

  it('registers and logs public visitors into the directory without exposing administrator access', async () => {
    const user = userEvent.setup()
    publicSessionActive = false
    document.cookie = 'siga_public_csrf=; Max-Age=0; Path=/'
    renderApp('/register')

    await user.type(screen.getByLabelText('Email Address'), 'visitor@example.test')
    await user.type(screen.getByLabelText('Password'), 'a test-only public password')
    await user.type(screen.getByLabelText('Confirm Password'), 'a test-only public password')
    await user.click(screen.getByRole('button', { name: 'Create Account' }))

    expect(await screen.findByLabelText('9 entities found')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'My Account' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Entities' })).toHaveAttribute('href', '/directory')
    expect(screen.getByRole('button', { name: 'Sign Out' })).toBeInTheDocument()
    const footer = screen.getByRole('contentinfo')
    expect(within(footer).queryByRole('link', { name: 'Home' })).not.toBeInTheDocument()
    expect(within(footer).queryByRole('link', { name: 'Entities' })).not.toBeInTheDocument()
    expect(within(footer).queryByText(/independently developed information system/i)).not.toBeInTheDocument()
    expect(within(footer).getByRole('link', { name: /Visit the official SIGA website/ })).toHaveAttribute('href', 'https://siga.gov.gh/')
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/public/auth/register'), expect.objectContaining({ method: 'POST', credentials: 'include' }))

    await user.click(screen.getByRole('button', { name: 'Sign Out' }))
    expect(await screen.findByRole('heading', { name: 'SIGA Registry' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sign In' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Specified Entities Registry' })).not.toBeInTheDocument()
  })

  it('signs public users in through the separate login page and redirects to the dashboard', async () => {
    const user = userEvent.setup()
    publicSessionActive = false
    document.cookie = 'siga_public_csrf=; Max-Age=0; Path=/'
    renderApp('/login')

    expect(await screen.findByRole('heading', { name: 'SIGA Registry' })).toBeInTheDocument()
    const header = screen.getByRole('banner')
    expect(within(header).getByTestId('public-login-header-layout')).toHaveClass('grid', 'grid-cols-1', 'sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]')
    expect(within(header).getByTestId('public-login-header-title')).toHaveClass('justify-self-center', 'sm:col-start-2', 'sm:row-start-1')
    expect(within(header).getByRole('navigation', { name: 'Primary navigation' })).toHaveClass('justify-self-end', 'sm:col-start-3', 'sm:row-start-1')
    expect(within(header).getByAltText('State Interests and Governance Authority (SIGA)')).toHaveAttribute('src', '/branding/siga-logo.png')
    const loginCard = screen.getByTestId('public-login-card')
    expect(within(loginCard).queryByRole('heading', { name: 'SIGA Registry' })).not.toBeInTheDocument()
    expect(within(loginCard).queryByAltText('State Interests and Governance Authority (SIGA)')).not.toBeInTheDocument()
    expect(screen.getAllByAltText('State Interests and Governance Authority (SIGA)')).toHaveLength(1)
    const loginFooter = screen.getByTestId('public-login-footer')
    expect(loginFooter).toHaveClass('mt-auto', 'border-slate-200', 'bg-white')
    expect(within(loginFooter).getByText(`© ${new Date().getFullYear()} State Interests and Governance Authority. All rights reserved.`)).toBeInTheDocument()
    expect(within(loginFooter).getByText('Created by SIGA IT')).toBeInTheDocument()
    expect(within(loginFooter).queryByText('Official reference')).not.toBeInTheDocument()
    expect(within(loginFooter).queryByRole('link', { name: /Visit the official SIGA website/ })).not.toBeInTheDocument()
    expect(screen.getByTestId('public-login-footer-content')).toHaveClass('py-7', 'sm:flex-row', 'sm:justify-between')
    expect(loginFooter.parentElement).toHaveClass('flex', 'min-h-screen', 'flex-col')
    expect(screen.getByRole('main')).toHaveClass('flex', 'flex-1', 'flex-col')
    expect(loginCard.closest('section')).toHaveClass('flex-1')
    const password = screen.getByLabelText('Password')
    expect(password).toHaveAttribute('type', 'password')
    expect(screen.queryByRole('link', { name: 'Create Account' })).not.toBeInTheDocument()
    expect(screen.queryByText('New to SIGA Registry?')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Show password' }))
    expect(password).toHaveAttribute('type', 'text')
    await user.type(screen.getByLabelText('Email Address'), 'visitor@example.test')
    await user.type(password, 'a test-only public password')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(await screen.findByText('Total Entities')).toBeInTheDocument()
    expect(screen.queryByTestId('dashboard-hero')).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/public/auth/login'), expect.objectContaining({ method: 'POST', credentials: 'include' }))
  })

  it('shows the public login form without the removed copy and restores an existing public session', async () => {
    publicSessionActive = true
    document.cookie = 'siga_public_csrf=test-public-csrf; Path=/'
    renderApp('/login')

    expect(await screen.findByText('Total Entities')).toBeInTheDocument()
    expect(screen.queryByTestId('dashboard-hero')).not.toBeInTheDocument()
    expect(screen.queryByText('Sign in to your public account')).not.toBeInTheDocument()
    expect(screen.queryByText('You can also browse the Entities Directory without signing in.')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'My Account' })).not.toBeInTheDocument()
  })

  it('loads the public directory for an authenticated public user', async () => {
    renderApp('/directory')

    expect(await screen.findByText('Electricity Company of Ghana')).toBeInTheDocument()
    expect(screen.getByAltText('State Interests and Governance Authority (SIGA)')).toHaveAttribute('src', '/branding/siga-logo.png')
    expect(screen.getByLabelText('9 entities found')).toBeInTheDocument()
    expect(screen.getByAltText('Electricity Company of Ghana institutional cover')).toHaveAttribute('src', 'https://ecg.example.test/cover.jpg')
    expect(screen.getByText(/Supervising ministry:/)).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/establishments?page=1&pageSize=16'),
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('renders published-only dashboard statistics, recent entities, navigation, empty data, and retry states', async () => {
    const user = userEvent.setup()
    renderApp('/dashboard')

    expect(screen.queryByText('Public Dashboard')).not.toBeInTheDocument()
    expect(screen.queryByTestId('dashboard-hero')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Specified Entities Registry' })).not.toBeInTheDocument()
    expect(await screen.findByText('Total Entities')).toBeInTheDocument()
    expect(screen.getAllByText('State-Owned Enterprises')).not.toHaveLength(0)
    expect(screen.getAllByText('Joint Venture Companies')).not.toHaveLength(0)
    expect(screen.getAllByText('Other State Entities')).not.toHaveLength(0)
    const summaryGrid = screen.getByTestId('dashboard-summary-grid')
    expect(summaryGrid).toHaveClass('sm:grid-cols-2', 'lg:grid-cols-4')
    expect(Array.from(summaryGrid.children).map((card) => card.querySelector('p')?.textContent)).toEqual([
      'Total Entities',
      'State-Owned Enterprises',
      'Joint Venture Companies',
      'Other State Entities',
    ])
    expect(Array.from(summaryGrid.children).map((card) => card.textContent)).toEqual([
      expect.stringContaining('9'),
      expect.stringContaining('5'),
      expect.stringContaining('1'),
      expect.stringContaining('3'),
    ])
    expect(screen.getByTestId('dashboard-detail-grid')).toHaveClass('lg:grid-cols-2')
    expect(screen.getByTestId('category-chart-card')).toHaveClass('lg:px-6', 'lg:py-4')
    expect(screen.getByTestId('category-donut')).toHaveClass('lg:max-w-44')
    expect(screen.getByTestId('recent-entities-card')).toHaveClass('lg:px-6', 'lg:py-4')
    expect(screen.getByText('Zeta Public Services')).toBeInTheDocument()
    const overview = screen.getByRole('link', { name: 'Overview' })
    expect(overview).toHaveAttribute('href', '/dashboard')
    expect(overview).toHaveAttribute('aria-current', 'page')
    expect(overview).toHaveClass('bg-teal-100')
    expect(screen.getByRole('link', { name: 'Entities' })).toHaveAttribute('href', '/directory')

    await user.type(screen.getByLabelText('Search entities'), 'river')
    await user.click(screen.getByRole('button', { name: 'Search Entities' }))
    expect(await screen.findByText('Volta River Authority')).toBeInTheDocument()
  })

  it('renders zero counts and an empty recent-entity state when no records are published', async () => {
    emptyDashboard = true
    renderApp('/dashboard')

    expect(await screen.findByText('No published entities yet')).toBeInTheDocument()
    expect(screen.getByText('Recent published entities will appear here.')).toBeInTheDocument()
    expect(screen.getByText('0 published entities (0%).')).toBeInTheDocument()
  })

  it('shows a dashboard API error and retries without displaying fabricated values', async () => {
    const user = userEvent.setup()
    dashboardUnavailable = true
    renderApp('/dashboard')

    expect(await screen.findByRole('alert')).toHaveTextContent('The public dashboard is unavailable right now')
    expect(screen.queryByText('Total Entities')).not.toBeInTheDocument()
    dashboardUnavailable = false
    await user.click(screen.getByRole('button', { name: 'Retry dashboard' }))
    expect(await screen.findByText('Total Entities')).toBeInTheDocument()
  })

  it('removes the directory banner and uses a responsive four-column entity grid', async () => {
    renderApp('/directory')

    await screen.findByTestId('directory-card-grid')
    expect(screen.queryByText('Public directory', { exact: true })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Explore Specified Entities' })).not.toBeInTheDocument()
    const toolbar = screen.getByTestId('directory-toolbar')
    expect(Array.from(toolbar.querySelectorAll('[data-filter-control]')).map((control) => control.getAttribute('data-filter-control'))).toEqual([
      'search', 'categories', 'entities', 'sort', 'clear',
    ])
    expect(toolbar).toHaveClass('lg:flex-row', 'lg:flex-nowrap')
    expect(screen.getByTestId('directory-card-grid')).toHaveClass('sm:grid-cols-2', 'lg:grid-cols-4')
  })

  it('filters entity options by category, selects a published entity, and resets an incompatible selection', async () => {
    const user = userEvent.setup()
    renderApp('/directory')
    await screen.findByTestId('directory-card-grid')

    await user.selectOptions(screen.getByLabelText('Categories'), 'JVC')
    await screen.findByText('Ghana Oil Company')
    await user.click(screen.getByLabelText('Entities'))
    await user.click(await screen.findByRole('option', { name: /Ghana Oil Company/ }))
    expect((await screen.findAllByTestId('entity-card'))).toHaveLength(1)
    expect(within(screen.getByTestId('entity-card')).getByRole('heading')).toHaveTextContent('Ghana Oil Company')

    await user.selectOptions(screen.getByLabelText('Categories'), 'SOE')
    await screen.findByLabelText('5 entities found')
    expect(screen.getByLabelText('Entities')).toHaveTextContent('All entities')
  })

  it('uses backend A-to-Z and Z-to-A sorting before selecting the visible cards', async () => {
    const user = userEvent.setup()
    renderApp('/directory')
    await screen.findByTestId('directory-card-grid')
    expect(within(screen.getAllByTestId('entity-card')[0]!).getByRole('heading')).toHaveTextContent('Electricity Company of Ghana')

    await user.selectOptions(screen.getByLabelText('Sort'), 'desc')
    await screen.findByRole('heading', { name: 'Zeta Public Services' })
    expect(within(screen.getAllByTestId('entity-card')[0]!).getByRole('heading')).toHaveTextContent('Zeta Public Services')
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('sort=desc&page=1&pageSize=16'), expect.any(Object))
  })

  it('clears every filter and restores the default matching entities', async () => {
    const user = userEvent.setup()
    renderApp('/directory')
    await screen.findByTestId('directory-card-grid')

    await user.type(screen.getByLabelText('Search entities'), 'ghana')
    await screen.findByText('Ghana Highway Authority')
    await user.selectOptions(screen.getByLabelText('Sort'), 'desc')
    await user.click(screen.getByRole('button', { name: 'Clear Filters' }))

    expect(screen.getByLabelText('Search entities')).toHaveValue('')
    expect(screen.getByLabelText('Categories')).toHaveValue('')
    expect(screen.getByLabelText('Sort')).toHaveValue('asc')
    expect(await screen.findAllByTestId('entity-card')).toHaveLength(9)
  })

  it('loads sixteen additional cards at a time without duplicates and hides View More at the end', async () => {
    const user = userEvent.setup()
    directoryEstablishments = createDirectoryFixtures(33)
    renderApp('/directory')
    expect(await screen.findAllByTestId('entity-card')).toHaveLength(16)
    expect(screen.getByLabelText('33 entities found')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'View More' }))
    await screen.findByRole('heading', { name: 'Sample Entity 24' })
    const afterFirstLoad = screen.getAllByTestId('entity-card')
    expect(afterFirstLoad).toHaveLength(32)
    expect(new Set(afterFirstLoad.map((card) => within(card).getByRole('heading').textContent)).size).toBe(32)

    await user.click(screen.getByRole('button', { name: 'View More' }))
    await screen.findByText('Zeta Public Services')
    expect(screen.getAllByTestId('entity-card')).toHaveLength(33)
    expect(screen.queryByRole('button', { name: 'View More' })).not.toBeInTheDocument()
  })

  it('resets visible cards after a filter change and handles empty results', async () => {
    const user = userEvent.setup()
    directoryEstablishments = createDirectoryFixtures(33)
    renderApp('/directory')
    await screen.findAllByTestId('entity-card')
    await user.click(screen.getByRole('button', { name: 'View More' }))
    await screen.findByText('Sample Entity 24')
    expect(screen.getAllByTestId('entity-card')).toHaveLength(32)

    await user.selectOptions(screen.getByLabelText('Categories'), 'SOE')
    await screen.findByLabelText('5 entities found')
    expect(screen.getAllByTestId('entity-card')).toHaveLength(5)
    expect(screen.queryByRole('button', { name: 'View More' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Clear Filters' }))
    expect(await screen.findAllByTestId('entity-card')).toHaveLength(16)
    expect(screen.getByRole('button', { name: 'View More' })).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Search entities'))
    await user.type(screen.getByLabelText('Search entities'), 'nothing-matches')
    expect(await screen.findByText('No entities match those filters')).toBeInTheDocument()
    expect(screen.queryByTestId('directory-card-grid')).not.toBeInTheDocument()
  })

  it('uses the API name search rather than filtering seeded browser data', async () => {
    renderApp('/directory?search=river')

    expect(await screen.findByText('Volta River Authority')).toBeInTheDocument()
    expect(screen.queryByText('Electricity Company of Ghana')).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/establishments?search=river&'),
      expect.any(Object),
    )
  })

  it('filters the directory by a public category', async () => {
    const user = userEvent.setup()
    renderApp('/directory')
    await screen.findByText('Electricity Company of Ghana')

    await user.selectOptions(screen.getByLabelText('Categories'), 'JVC')

    expect(await screen.findByText('Ghana Oil Company')).toBeInTheDocument()
    expect(screen.queryByText('Electricity Company of Ghana')).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('category=JVC'),
      expect.any(Object),
    )
  })

  it('resets scrolling for profile navigation but not directory search or filter updates', async () => {
    const user = userEvent.setup()
    renderApp('/directory')
    await screen.findByText('Electricity Company of Ghana')
    scrollTo.mockClear()

    await user.type(screen.getByLabelText('Search entities'), 'river')
    expect(await screen.findByText('Volta River Authority')).toBeInTheDocument()
    expect(scrollTo).not.toHaveBeenCalled()

    await user.clear(screen.getByLabelText('Search entities'))
    await screen.findByText('Electricity Company of Ghana')
    await user.selectOptions(screen.getByLabelText('Categories'), 'JVC')
    expect(await screen.findByText('Ghana Oil Company')).toBeInTheDocument()
    expect(scrollTo).not.toHaveBeenCalled()

    await user.click(screen.getByRole('link', { name: /View Entity Details/ }))
    expect(await screen.findByRole('heading', { name: 'Ghana Oil Company' })).toBeInTheDocument()
    expect(scrollTo).toHaveBeenCalledWith(0, 0)
  })

  it('passes combined category and name filters to the published-only API', async () => {
    renderApp('/directory?search=ghana&category=SOE')

    expect(await screen.findByText('Electricity Company of Ghana')).toBeInTheDocument()
    expect(screen.queryByText('Ghana Oil Company')).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('search=ghana&category=SOE'),
      expect.any(Object),
    )
  })

  it('shows a clear empty-database state without falling back to mock entities', async () => {
    emptyDirectory = true
    renderApp('/directory')

    expect(await screen.findByText('No published entities are available yet')).toBeInTheDocument()
    expect(screen.queryByText('Electricity Company of Ghana')).not.toBeInTheDocument()
  })

  it('shows an API error and retries the directory request', async () => {
    const user = userEvent.setup()
    directoryUnavailable = true
    renderApp('/directory')

    expect(await screen.findByRole('alert')).toHaveTextContent('The directory is unavailable right now')
    directoryUnavailable = false
    await user.click(screen.getByRole('button', { name: 'Retry directory' }))
    expect(await screen.findByText('Electricity Company of Ghana')).toBeInTheDocument()
  })

  it('renders a responsive published entity profile with a logo, breadcrumb, location, contacts, and management selection', async () => {
    const user = userEvent.setup()
    renderApp('/establishments/electricity-company-of-ghana')

    expect(await screen.findByRole('heading', { name: 'Electricity Company of Ghana' })).toBeInTheDocument()
    for (const label of ['Institutional overview', 'Location', 'Official contact information', 'Management and leadership', 'Region', 'City', 'GhanaPost GPS digital address']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(breadcrumb).toHaveTextContent('Home')
    expect(breadcrumb).toHaveTextContent('Entities')
    expect(within(breadcrumb).getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
    expect(within(breadcrumb).getByRole('link', { name: 'Entities' })).toHaveAttribute('href', '/directory')
    const profilePage = screen.getByTestId('profile-page')
    const profileSections = screen.getByTestId('profile-sections')
    expect(profileSections).toHaveClass('sm:p-8', 'lg:p-10')
    const coverBackground = screen.getByTestId('profile-page-cover-background')
    expect(coverBackground).toHaveAttribute('src', 'https://ecg.example.test/cover.jpg')
    expect(coverBackground).toHaveClass('pointer-events-none', 'absolute', 'inset-0', 'h-full', 'object-cover', 'blur-sm')
    expect(screen.getByTestId('profile-page-cover-overlay')).toHaveClass('pointer-events-none', 'bg-navy-950/45')
    expect(profilePage).toContainElement(coverBackground)
    expect(profilePage).toContainElement(profileSections)
    expect(screen.queryByTestId('profile-cover-background')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Location' }).closest('section')).toHaveClass('bg-white/80')
    const logo = screen.getByAltText('Electricity Company of Ghana logo')
    expect(logo).toHaveAttribute('src', 'https://ecg.example.test/logo.png')
    expect(logo).toHaveClass('object-contain')
    expect(logo).not.toHaveClass('blur-sm')
    fireEvent.error(coverBackground)
    expect(screen.getByTestId('profile-page-cover-fallback')).toBeInTheDocument()
    expect(screen.getByAltText('Electricity Company of Ghana logo')).toBeInTheDocument()
    fireEvent.error(screen.getByAltText('Electricity Company of Ghana logo'))
    expect(screen.getByRole('img', { name: 'No institution logo available' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View on Google Maps' })).toHaveAttribute('href', 'https://www.google.com/maps/place/Electricity+Company+of+Ghana')
    expect(screen.getByRole('link', { name: 'help@ecg.example.test' })).toHaveAttribute('href', 'mailto:help@ecg.example.test')
    expect(screen.getByRole('link', { name: '+233 302 611 611' })).toHaveAttribute('href', 'tel:+233302611611')
    expect(screen.getByText('Ama Mensah')).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Select a member'), '11')
    expect(screen.getByText('Kojo Owusu')).toBeInTheDocument()
    expect(screen.getByText('Board Chair')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '+233 302 000 001' })).toHaveAttribute('href', 'tel:+233302000001')
    expect(screen.getAllByText('Not provided').length).toBeGreaterThan(0)
  })

  it('renders a complete public profile when optional location and management data is absent', async () => {
    renderApp('/establishments/volta-river-authority')

    expect(await screen.findByRole('heading', { name: 'Volta River Authority' })).toBeInTheDocument()
    expect(screen.getByText('No management or leadership information has been provided.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'View on Google Maps' })).not.toBeInTheDocument()
    expect(screen.getByTestId('profile-page-cover-fallback')).toBeInTheDocument()
    expect(screen.getAllByText('Not provided').length).toBeGreaterThan(0)
  })

  it('uses the fallback institution icon when no logo URL is supplied', async () => {
    renderApp('/establishments/volta-river-authority')

    await screen.findByRole('heading', { name: 'Volta River Authority' })
    expect(screen.getByRole('img', { name: 'No institution logo available' })).toBeInTheDocument()
    expect(screen.queryByAltText('Volta River Authority logo')).not.toBeInTheDocument()
  })

  it('returns to the public directory through the profile breadcrumb', async () => {
    const user = userEvent.setup()
    renderApp('/establishments/electricity-company-of-ghana')

    await screen.findByRole('heading', { name: 'Electricity Company of Ghana' })
    await user.click(within(screen.getByRole('navigation', { name: 'Breadcrumb' })).getByRole('link', { name: 'Entities' }))

    expect(await screen.findByLabelText('Search entities')).toBeInTheDocument()
  })

  it('uses the same public not-found page for unavailable detail routes', async () => {
    renderApp('/establishments/unpublished-or-missing')

    expect(await screen.findByRole('heading', { name: 'Entity not found' })).toBeInTheDocument()
    expect(screen.getByText('That profile is unavailable in the public directory.')).toBeInTheDocument()
  })

  it('redirects authenticated root visits to the dashboard', async () => {
    renderApp('/')

    expect(await screen.findByText('Total Entities')).toBeInTheDocument()
    expect(screen.queryByTestId('dashboard-hero')).not.toBeInTheDocument()
  })

})
