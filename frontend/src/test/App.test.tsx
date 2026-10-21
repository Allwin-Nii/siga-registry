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
  name: 'Dashboard Count Sample',
  categoryId: 'jvc',
  website: '',
  email: '',
  contactNumber: '',
  summary: 'A fictional draft used only to confirm the dashboard count reads shared registry state.',
}

function DashboardHarness() {
  const { createEstablishment } = useRegistry()
  return <><button onClick={() => createEstablishment(dashboardDraft)}>Add draft</button><DashboardPage /></>
}

describe('SIGA Registry public experience', () => {
  it('preserves a landing-page name search in the directory URL flow', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.type(screen.getByLabelText('Search establishment names'), 'Aurelia')
    await user.click(screen.getByRole('button', { name: 'Search directory' }))
    expect(await screen.findByRole('heading', { name: 'Directory results' })).toBeInTheDocument()
    expect(screen.getByText('Aurelia Power Works')).toBeInTheDocument()
  })

  it('matches establishment names case-insensitively, partially, and with extra whitespace', () => {
    renderApp('/directory?query=%20%20aUrElIa%20%20%20PoW%20')
    expect(screen.getByText('Aurelia Power Works')).toBeInTheDocument()
    expect(screen.queryByText('Cobalt Maritime Ventures')).not.toBeInTheDocument()
  })

  it('filters published records by each configured category and combines category with name search', async () => {
    const user = userEvent.setup()
    const rendered = renderApp('/directory')
    await user.click(screen.getByRole('button', { name: /SOEs/ }))
    expect(screen.getByText('Aurelia Power Works')).toBeInTheDocument()
    expect(screen.queryByText('Cobalt Maritime Ventures')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /JVCs/ }))
    expect(screen.getByText('Cobalt Maritime Ventures')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /OSEs/ }))
    expect(screen.getByText('Nkwa Civic Services')).toBeInTheDocument()

    rendered.unmount()
    renderApp('/directory?category=soe&query=power')
    expect(screen.getAllByText('Aurelia Power Works').length).toBeGreaterThan(0)
    expect(screen.queryByText('Delta Grid Authority')).not.toBeInTheDocument()
  })

  it('clears filters and shows an empty-result state when appropriate', async () => {
    const user = userEvent.setup()
    renderApp('/directory?category=soe&query=not-a-record')
    expect(screen.getByText('No establishments match those filters')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(screen.getByText('3 establishments found')).toBeInTheDocument()
  })

  it('displays precisely the six public establishment fields and safe contact links', () => {
    renderApp('/establishments/aurelia-power-works')
    for (const label of ['Establishment Name', 'Category', 'Brief Description', 'Website URL', 'Email Address', 'Contact Number']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
    expect(screen.getByRole('link', { name: 'https://aurelia-power.example' })).toHaveAttribute('target', '_blank')
    expect(screen.getByRole('link', { name: 'contact@aurelia-power.example' })).toHaveAttribute('href', 'mailto:contact@aurelia-power.example')
    expect(screen.getByRole('link', { name: '+000 000 0101' })).toHaveAttribute('href', 'tel:+000 000 0101')
  })

  it('does not expose unpublished records in public URLs and retains the prototype notice', () => {
    renderApp('/establishments/delta-grid-authority')
    expect(screen.getByRole('heading', { name: 'Establishment not found' })).toBeInTheDocument()
    expect(screen.getByText(/Prototype mode:/)).toBeInTheDocument()
  })

  it('updates dashboard counts from the shared registry state', async () => {
    const user = userEvent.setup()
    render(<RegistryProvider><MemoryRouter><DashboardHarness /></MemoryRouter></RegistryProvider>)
    const draftCard = screen.getByText('Draft records').parentElement
    if (!draftCard) throw new Error('Expected the draft count card.')
    expect(within(draftCard).getByText('1')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add draft' }))
    expect(within(draftCard).getByText('2')).toBeInTheDocument()
  })
})
