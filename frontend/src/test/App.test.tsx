import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PublicCategory, PublicEstablishment } from '../api/publicApi'
import App from '../App'
import { DashboardPage } from '../pages/DashboardPage'
import { RegistryProvider } from '../state/RegistryProvider'
import { useRegistry } from '../state/useRegistry'
import type { EstablishmentInput } from '../types'

const categories: PublicCategory[] = [
  { id: 'soe', code: 'SOE', name: 'SOE', description: 'State-Owned Enterprise' },
  { id: 'jvc', code: 'JVC', name: 'JVC', description: 'Joint Venture Company' },
  { id: 'ose', code: 'OSE', name: 'OSE', description: 'Other State Entity' },
]

const establishments: PublicEstablishment[] = [
  { id: '1', slug: 'electricity-company-of-ghana', name: 'Electricity Company of Ghana', website: 'https://ecg.example.test/', categoryId: 'soe', category: categories[0], email: 'help@ecg.example.test', contactNumber: '+233 302 611 611', summary: 'Electricity distribution utility.' },
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
  return render(<RegistryProvider><MemoryRouter initialEntries={[entry]}><App /></MemoryRouter></RegistryProvider>)
}

const dashboardDraft: EstablishmentInput = {
  name: 'Dashboard Count Fixture',
  categoryId: 'jvc',
  website: '',
  email: '',
  contactNumber: '',
  summary: 'A temporary draft used only to confirm that the dashboard reads shared registry state.',
}

function DashboardHarness() {
  const { createEstablishment } = useRegistry()
  return <><button onClick={() => createEstablishment(dashboardDraft)}>Add draft</button><DashboardPage /></>
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
  it('loads the public directory without requiring a sign-in', async () => {
    renderApp('/directory')

    expect(await screen.findByText('Electricity Company of Ghana')).toBeInTheDocument()
    expect(screen.getByLabelText('4 establishments found')).toBeInTheDocument()
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

  it('shows a clear empty-database state without falling back to mock establishments', async () => {
    emptyDirectory = true
    renderApp('/directory')

    expect(await screen.findByText('No published establishments are available yet')).toBeInTheDocument()
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

  it('loads only the approved public fields for an establishment detail', async () => {
    renderApp('/establishments/electricity-company-of-ghana')

    expect(await screen.findByRole('heading', { name: 'Electricity Company of Ghana' })).toBeInTheDocument()
    for (const label of ['Name', 'Website URL', 'Category', 'Email', 'Contact Number', 'Brief Description']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
    expect(screen.getByRole('link', { name: 'help@ecg.example.test' })).toHaveAttribute('href', 'mailto:help@ecg.example.test')
    expect(screen.getByRole('link', { name: '+233 302 611 611' })).toHaveAttribute('href', 'tel:+233302611611')
  })

  it('uses the same public not-found page for unavailable detail routes', async () => {
    renderApp('/establishments/unpublished-or-missing')

    expect(await screen.findByRole('heading', { name: 'Establishment not found' })).toBeInTheDocument()
    expect(screen.getByText('That profile is unavailable in the public directory.')).toBeInTheDocument()
  })

  it('uses live category and directory data on the public homepage', async () => {
    renderApp('/')

    expect(await screen.findByText('4')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /SOE/ })).toBeInTheDocument()
    expect(screen.getByText('Electricity Company of Ghana')).toBeInTheDocument()
  })

  it('keeps the temporary dashboard provider separate from public API data', async () => {
    const user = userEvent.setup()
    render(<RegistryProvider><MemoryRouter><DashboardHarness /></MemoryRouter></RegistryProvider>)
    const draftCard = screen.getByText('Draft records').parentElement
    if (!draftCard) throw new Error('Expected the draft count card.')
    expect(within(draftCard).getByText('0')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add draft' }))
    expect(within(draftCard).getByText('1')).toBeInTheDocument()
    await waitFor(() => expect(fetchMock).not.toHaveBeenCalled())
  })
})
