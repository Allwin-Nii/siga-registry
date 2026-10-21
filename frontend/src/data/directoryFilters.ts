import type { Establishment } from '../types'

export const normalizeDirectoryQuery = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase()

export const filterPublishedEstablishments = (
  establishments: readonly Establishment[],
  query: string,
  categoryId = '',
) => {
  const normalizedQuery = normalizeDirectoryQuery(query)
  return establishments.filter((establishment) =>
    establishment.status === 'Published'
      && normalizeDirectoryQuery(establishment.name).includes(normalizedQuery)
      && (!categoryId || establishment.categoryId === categoryId),
  )
}
