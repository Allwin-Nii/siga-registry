import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from '../App'
import { DashboardPage } from '../pages/DashboardPage'
import { RegistryProvider } from '../state/RegistryProvider'
import { useRegistry } from '../state/useRegistry'
import type { EstablishmentInput } from '../types'

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

describe('SIGA Registry public experience', () => {
  it('keeps one primary directory CTA and preserves a landing-page name search in the directory URL flow', async () => {
    const user = userEvent.setup()
    renderApp()
    expect(screen.getByRole('heading', { name: 'Specified Entities Registry' })).toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: 'Primary navigation' })).getByRole('link', { name: 'Establishments' })).toHaveAttribute('href', '/directory')
    expect(screen.getAllByRole('button', { name: 'Browse Establishments' })).toHaveLength(1)
    await user.type(screen.getByLabelText('Search establishment names'), 'Electricity{enter}')
    expect(await screen.findByRole('heading', { name: 'Published establishment profiles' })).toBeInTheDocument()
    expect(screen.getByText('Electricity Company of Ghana')).toBeInTheDocument()
  })

  it('uses the homepage CTA, category shortcuts, and featured cards for distinct destinations', async () => {
    const user = userEvent.setup()
    const rendered = renderApp()
    expect(screen.getAllByRole('link', { name: 'View Details' }).map((link) => link.getAttribute('href'))).toEqual([
      '/establishments/electricity-company-of-ghana',
      '/establishments/volta-river-authority',
      '/establishments/ghana-ports-and-harbours-authority',
    ])

    await user.click(screen.getByRole('button', { name: 'Browse Establishments' }))
    expect(await screen.findByRole('heading', { name: 'Published establishment profiles' })).toBeInTheDocument()

    rendered.unmount()
    for (const shortcut of [
      { name: /SOE State-Owned Enterprise/, expected: 'Electricity Company of Ghana', excluded: 'Ghana Oil Company Limited (GOIL)' },
      { name: /JVC Joint Venture Company/, expected: 'Ghana Oil Company Limited (GOIL)', excluded: 'Electricity Company of Ghana' },
      { name: /OSE Other State Entity/, expected: 'Forestry Commission', excluded: 'Electricity Company of Ghana' },
    ]) {
      const categoryPage = renderApp()
      await user.click(screen.getByRole('button', { name: shortcut.name }))
      expect(await screen.findByText(shortcut.expected)).toBeInTheDocument()
      expect(screen.queryByText(shortcut.excluded)).not.toBeInTheDocument()
      categoryPage.unmount()
    }
  })

  it('matches establishment names case-insensitively, partially, and with extra whitespace', () => {
    renderApp('/directory?query=%20%20eLeCtRiCiTy%20%20%20CoM%20')
    expect(screen.getByText('Electricity Company of Ghana')).toBeInTheDocument()
    expect(screen.queryByText('Ghana Cocoa Board')).not.toBeInTheDocument()
  })

  it('filters published records by each configured category and combines category with name search', async () => {
    const user = userEvent.setup()
    const rendered = renderApp('/directory')
    await user.click(screen.getByRole('button', { name: /SOE — State-Owned Enterprise/ }))
    expect(screen.getByText('Electricity Company of Ghana')).toBeInTheDocument()
    expect(screen.queryByText('Ghana Oil Company Limited (GOIL)')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /JVC — Joint Venture Company/ }))
    expect(screen.getByText('Ghana Oil Company Limited (GOIL)')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /OSE — Other State Entity/ }))
    expect(screen.getByText('Forestry Commission')).toBeInTheDocument()

    rendered.unmount()
    renderApp('/directory?category=soe&query=volta')
    expect(screen.getByText('Volta River Authority')).toBeInTheDocument()
    expect(screen.queryByText('Ghana Highway Authority')).not.toBeInTheDocument()
  })

  it('clears filters and shows an empty-result state when appropriate', async () => {
    const user = userEvent.setup()
    renderApp('/directory?category=soe&query=not-a-record')
    expect(screen.getByText('No establishments match those filters')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(screen.getByLabelText('12 establishments found')).toBeInTheDocument()
  })

  it('displays precisely the six public establishment fields and safe contact links', () => {
    renderApp('/establishments/electricity-company-of-ghana')
    for (const label of ['Name', 'Website URL', 'Category', 'Email Address', 'Contact Number', 'Brief Description']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
    expect(screen.getByRole('link', { name: 'https://ecg.com.gh/' })).toHaveAttribute('target', '_blank')
    expect(screen.getByRole('link', { name: 'help@ecggh.com' })).toHaveAttribute('href', 'mailto:help@ecggh.com')
    expect(screen.getByRole('link', { name: '+233 302 611 611' })).toHaveAttribute('href', 'tel:+233302611611')
  })

  it('uses safe fallbacks for public details that were not confidently verified', () => {
    renderApp('/establishments/twifo-oil-palm-plantation')
    expect(screen.getAllByText('Not provided')).toHaveLength(2)
    expect(screen.queryByRole('link', { name: /@/ })).not.toBeInTheDocument()
  })

  it('does not expose unavailable records in public URLs and keeps the independent-project disclosure accessible', () => {
    renderApp('/establishments/not-a-record')
    expect(screen.getByRole('heading', { name: 'Establishment not found' })).toBeInTheDocument()
    expect(screen.getByText(/SIGA Registry is an independently developed information system/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Visit the official SIGA website' })).toHaveAttribute('href', 'https://siga.gov.gh/')
  })

  it('makes clear that the sign-in screen is preview-only and does not accept real credentials', () => {
    renderApp('/sign-in')
    expect(screen.getByText(/Do not enter a real email address or password/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Preview sign in' })).toBeInTheDocument()
  })

  it('updates dashboard counts from the shared registry state', async () => {
    const user = userEvent.setup()
    render(<RegistryProvider><MemoryRouter><DashboardHarness /></MemoryRouter></RegistryProvider>)
    const draftCard = screen.getByText('Draft records').parentElement
    if (!draftCard) throw new Error('Expected the draft count card.')
    expect(within(draftCard).getByText('0')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add draft' }))
    expect(within(draftCard).getByText('1')).toBeInTheDocument()
  })
})
