import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PublicCategory, PublicEstablishment } from '../api/publicApi'
import App from '../App'

const categories: PublicCategory[] = [
  { id: 'soe', code: 'SOE', name: 'SOE', description: 'State-Owned Enterprise' },
  { id: 'jvc', code: 'JVC', name: 'JVC', description: 'Joint Venture Company' },
  { id: 'ose', code: 'OSE', name: 'OSE', description: 'Other State Entity' },
]

const establishments: PublicEstablishment[] = [
  { id: '1', slug: 'electricity-company-of-ghana', name: 'Electricity Company of Ghana', website: 'https://ecg.example.test/', logoUrl: 'https://ecg.example.test/logo.png', categoryId: 'soe', category: categories[0], email: 'help@ecg.example.test', contactNumber: '+233 302 611 611', summary: 'Electricity distribution utility.', region: 'Greater Accra', city: 'Accra', physicalAddress: '1 ECG Road', gpsAddress: 'GA-123-4567', latitude: 5.6037, longitude: -0.187, management: [{ id: 10, fullName: 'Ama Mensah', position: 'Managing Director', officialEmail: 'ama@ecg.example.test', officialPhone: '', displayOrder: 0 }, { id: 11, fullName: 'Kojo Owusu', position: 'Board Chair', officialEmail: null, officialPhone: '+233 302 000 001', displayOrder: 1 }] },
  { id: '2', slug: 'volta-river-authority', name: 'Volta River Authority', website: 'https://vra.example.test/', categoryId: 'soe', category: categories[0], email: 'info@vra.example.test', contactNumber: '+233 302 664 941', summary: 'Power utility.' },
  { id: '3', slug: 'ghana-oil-company', name: 'Ghana Oil Company', website: '', categoryId: 'jvc', category: categories[1], email: '', contactNumber: '', summary: 'Energy company.' },
  { id: '4', slug: 'forestry-commission', name: 'Forestry Commission', website: 'https://forestry.example.test/', categoryId: 'ose', category: categories[2], email: 'info@forestry.example.test', contactNumber: '+233 302 401 227', summary: 'Forestry and wildlife authority.' },
]

const fetchMock = vi.fn()
let directoryUnavailable = false
let emptyDirectory = false

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
})

const configurePublicApi = () => {
  fetchMock.mockImplementation((input: string) => {
    const url = new URL(input)
    if (url.pathname === '/api/categories') return Promise.resolve(json({ data: categories }))
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
      const allResults = emptyDirectory ? [] : establishments.filter((item) =>
        item.name.toLocaleLowerCase().includes(search) && (!category || item.category.code === category),
      )
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
  return render(<MemoryRouter initialEntries={[entry]}><App /></MemoryRouter>)
}

beforeEach(() => {
  directoryUnavailable = false
  emptyDirectory = false
  fetchMock.mockReset()
  configurePublicApi()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => vi.unstubAllGlobals())

describe('SIGA Registry public API experience', () => {
  it('keeps administrator access out of public navigation', async () => {
    renderApp('/')

    await screen.findByText('Electricity Company of Ghana')
    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toHaveTextContent('Home')
    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toHaveTextContent('Entities')
    expect(screen.queryByRole('link', { name: /admin login|administrator|admin dashboard|sign in|staff login|manage entities/i })).not.toBeInTheDocument()

    for (const link of screen.getAllByRole('link')) {
      expect(link).not.toHaveAttribute('href', expect.stringMatching(/^\/admin(?:\/|$)/))
    }
  })

  it('loads the public directory without requiring a sign-in', async () => {
    renderApp('/directory')

    expect(await screen.findByText('Electricity Company of Ghana')).toBeInTheDocument()
    expect(screen.getByAltText('State Interests and Governance Authority (SIGA)')).toHaveAttribute('src', '/branding/siga-logo.png')
    expect(screen.getByLabelText('4 entities found')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/establishments?page=1&pageSize=6'),
      expect.objectContaining({ credentials: 'omit' }),
    )
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

    await user.click(screen.getByRole('button', { name: /JVC — Joint Venture Company/ }))

    expect(await screen.findByText('Ghana Oil Company')).toBeInTheDocument()
    expect(screen.queryByText('Electricity Company of Ghana')).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('category=JVC'),
      expect.any(Object),
    )
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

  it('renders an enhanced published entity profile with a logo, location, map, and management selection', async () => {
    const user = userEvent.setup()
    renderApp('/establishments/electricity-company-of-ghana')

    expect(await screen.findByRole('heading', { name: 'Electricity Company of Ghana' })).toBeInTheDocument()
    for (const label of ['Institutional overview', 'Location', 'Contact information', 'Management and leadership', 'Region', 'City', 'GhanaPost GPS address', 'Coordinates']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
    expect(screen.getByAltText('Electricity Company of Ghana logo')).toHaveAttribute('src', 'https://ecg.example.test/logo.png')
    fireEvent.error(screen.getByAltText('Electricity Company of Ghana logo'))
    expect(screen.getByRole('img', { name: 'No institution logo available' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View on Map' })).toHaveAttribute('href', expect.stringContaining('5.6037'))
    expect(screen.getByRole('link', { name: 'help@ecg.example.test' })).toHaveAttribute('href', 'mailto:help@ecg.example.test')
    expect(screen.getByRole('link', { name: '+233 302 611 611' })).toHaveAttribute('href', 'tel:+233302611611')
    expect(screen.getByText('Ama Mensah')).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Select a member'), '11')
    expect(screen.getByText('Kojo Owusu')).toBeInTheDocument()
    expect(screen.getAllByText('Not provided').length).toBeGreaterThan(0)
  })

  it('uses the same public not-found page for unavailable detail routes', async () => {
    renderApp('/establishments/unpublished-or-missing')

    expect(await screen.findByRole('heading', { name: 'Entity not found' })).toBeInTheDocument()
    expect(screen.getByText('That profile is unavailable in the public directory.')).toBeInTheDocument()
  })

  it('uses live category and directory data on the public homepage', async () => {
    renderApp('/')

    expect(await screen.findByText('4')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /SOE/ })).toBeInTheDocument()
    expect(screen.getByText('Electricity Company of Ghana')).toBeInTheDocument()
  })

})
