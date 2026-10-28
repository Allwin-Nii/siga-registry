import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ScrollToTop } from './ScrollToTop'

const routes = [
  '/',
  '/directory',
  '/establishments/example-entity',
  '/admin',
  '/admin/establishments',
  '/admin/establishments/new',
  '/admin/establishments/1/edit',
]

const scrollTo = vi.fn()

function HistoryControls() {
  const navigate = useNavigate()
  return <div><button type="button" onClick={() => navigate(-1)}>Back</button><button type="button" onClick={() => navigate(1)}>Forward</button></div>
}

beforeEach(() => {
  scrollTo.mockReset()
  vi.stubGlobal('scrollTo', scrollTo)
})

afterEach(() => vi.unstubAllGlobals())

describe('ScrollToTop', () => {
  it.each(routes)('resets scrolling when %s opens', (route) => {
    render(<MemoryRouter initialEntries={[route]}><ScrollToTop /></MemoryRouter>)

    expect(scrollTo).toHaveBeenCalledWith(0, 0)
  })

  it('resets scrolling for browser-style back and forward navigation', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={['/directory', '/establishments/example-entity']} initialIndex={1}><ScrollToTop /><HistoryControls /></MemoryRouter>)
    scrollTo.mockClear()

    await user.click(screen.getByRole('button', { name: 'Back' }))
    await waitFor(() => expect(scrollTo).toHaveBeenCalledWith(0, 0))
    scrollTo.mockClear()

    await user.click(screen.getByRole('button', { name: 'Forward' }))
    await waitFor(() => expect(scrollTo).toHaveBeenCalledWith(0, 0))
  })
})
