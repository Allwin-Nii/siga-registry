import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from '../App'

describe('SIGA Registry prototype navigation', () => {
  it('searches the fictional directory from the landing page', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>)
    await user.type(screen.getByLabelText('Search sample establishment records'), 'Harborlight')
    await user.click(screen.getByRole('button', { name: 'Search directory' }))
    expect(await screen.findByRole('heading', { name: 'Directory results' })).toBeInTheDocument()
    expect(screen.getByText('Harborlight Learning Studio')).toBeInTheDocument()
  })

  it('shows an empty state for an unmatched fictional directory search', () => {
    render(<MemoryRouter initialEntries={['/directory?query=not-a-sample']}><App /></MemoryRouter>)
    expect(screen.getByText('No sample records match those filters')).toBeInTheDocument()
  })
})
