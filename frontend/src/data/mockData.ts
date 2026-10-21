import type { Category, Establishment } from '../types'

// These categories and records are fictional demonstration data for the prototype.
export const categoryOptions: Category[] = [
  { id: 'soe', name: 'SOE', description: 'State-Owned Enterprise' },
  { id: 'jvc', name: 'JVC', description: 'Joint Venture Company' },
  { id: 'ose', name: 'OSE', description: 'Other State Entity' },
]

export const getCategoryById = (categoryId: string, categories: readonly Category[] = categoryOptions) =>
  categories.find((category) => category.id === categoryId)

export const isCategoryId = (categoryId: string, categories: readonly Category[] = categoryOptions) =>
  Boolean(getCategoryById(categoryId, categories))

export const categoryName = (categoryId: string, categories: readonly Category[] = categoryOptions) =>
  getCategoryById(categoryId, categories)?.name ?? 'Uncategorised'

export const categoryLabel = (categoryId: string, categories: readonly Category[] = categoryOptions) => {
  const category = getCategoryById(categoryId, categories)
  return category ? `${category.name} — ${category.description}` : 'Uncategorised'
}

export const initialEstablishments: Establishment[] = [
  {
    id: 'sample-001',
    slug: 'aurelia-power-works',
    name: 'Aurelia Power Works',
    categoryId: 'soe',
    website: 'https://aurelia-power.example',
    email: 'contact@aurelia-power.example',
    contactNumber: '+000 000 0101',
    summary: 'A fictional state-owned enterprise sample that demonstrates a public power-services establishment record.',
    status: 'Published',
    lastUpdated: 'Sample update · May 2026',
    owner: 'Sample editor',
    staffUpdated: 'Illustrative · yesterday',
  },
  {
    id: 'sample-002',
    slug: 'delta-grid-authority',
    name: 'Delta Grid Authority',
    categoryId: 'soe',
    website: 'https://delta-grid.example',
    email: 'review@delta-grid.example',
    contactNumber: '+000 000 0202',
    summary: 'A fictional state-owned enterprise sample awaiting review for an illustrative grid-coordination profile.',
    status: 'Pending review',
    lastUpdated: 'Sample update · April 2026',
    owner: 'Sample editor',
    staffUpdated: 'Illustrative · 2 hours ago',
  },
  {
    id: 'sample-003',
    slug: 'cobalt-maritime-ventures',
    name: 'Cobalt Maritime Ventures',
    categoryId: 'jvc',
    website: 'https://cobalt-maritime.example',
    email: 'hello@cobalt-maritime.example',
    contactNumber: '+000 000 0303',
    summary: 'A fictional joint venture company sample for a public-facing maritime services reference profile.',
    status: 'Published',
    lastUpdated: 'Sample update · March 2026',
    owner: 'Sample editor',
    staffUpdated: 'Illustrative · 3 days ago',
  },
  {
    id: 'sample-004',
    slug: 'futura-agro-partners',
    name: 'Futura Agro Partners',
    categoryId: 'jvc',
    website: 'https://futura-agro.example',
    email: 'team@futura-agro.example',
    contactNumber: '+000 000 0404',
    summary: 'A fictional joint venture company sample retained as a staff draft for prototype workflow testing.',
    status: 'Draft',
    lastUpdated: 'Sample update · February 2026',
    owner: 'Sample editor',
    staffUpdated: 'Illustrative · 1 week ago',
  },
  {
    id: 'sample-005',
    slug: 'nkwa-civic-services',
    name: 'Nkwa Civic Services',
    categoryId: 'ose',
    website: '',
    email: '',
    contactNumber: '',
    summary: 'A fictional other state entity sample showing how a published reference profile handles unavailable contact details.',
    status: 'Published',
    lastUpdated: 'Sample update · January 2026',
    owner: 'Sample editor',
    staffUpdated: 'Illustrative · 4 days ago',
  },
  {
    id: 'sample-006',
    slug: 'harbor-community-initiative',
    name: 'Harbor Community Initiative',
    categoryId: 'ose',
    website: 'https://harbor-community.example',
    email: 'support@harbor-community.example',
    contactNumber: '+000 000 0606',
    summary: 'A fictional other state entity sample with changes requested as part of the staff and review demonstration.',
    status: 'Changes requested',
    lastUpdated: 'Sample update · December 2025',
    owner: 'Sample editor',
    staffUpdated: 'Illustrative · 1 week ago',
  },
]
