import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { PublicEstablishment } from '../api/publicApi'
import { EstablishmentCard } from './EstablishmentCard'

const entity: PublicEstablishment = {
  id: '1',
  slug: 'example-entity',
  name: 'Example Entity',
  website: 'https://example.test/',
  logoUrl: 'https://example.test/logo.png',
  coverImageUrl: 'https://example.test/cover.jpg',
  categoryId: 'soe',
  category: { id: 'soe', code: 'SOE', name: 'SOE', description: 'State-Owned Enterprise' },
  email: 'info@example.test',
  contactNumber: '+233 302 000 000',
  summary: 'An example entity profile for cover-image tests.',
}

const renderCard = (establishment: PublicEstablishment) => render(
  <MemoryRouter><EstablishmentCard establishment={establishment} /></MemoryRouter>,
)

describe('EstablishmentCard cover images', () => {
  it('uses the institutional cover photograph, not the official logo', () => {
    renderCard(entity)

    const cover = screen.getByAltText('Example Entity institutional cover')
    expect(cover).toHaveAttribute('src', entity.coverImageUrl)
    expect(cover).toHaveClass('object-cover')
    expect(cover).not.toHaveAttribute('src', entity.logoUrl)
  })

  it('uses a neutral fallback when the cover is missing or broken while keeping navigation available', () => {
    const { rerender } = renderCard({ ...entity, coverImageUrl: undefined })

    expect(screen.getByRole('img', { name: 'No institutional cover available for Example Entity' })).toBeInTheDocument()
    expect(screen.queryByAltText('Example Entity institutional cover')).not.toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /logo/i })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /View Details/ })).toHaveAttribute('href', '/establishments/example-entity')

    rerender(<MemoryRouter><EstablishmentCard establishment={entity} /></MemoryRouter>)
    fireEvent.error(screen.getByAltText('Example Entity institutional cover'))
    expect(screen.getByRole('img', { name: 'No institutional cover available for Example Entity' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /View Details/ })).toBeInTheDocument()
  })
})
