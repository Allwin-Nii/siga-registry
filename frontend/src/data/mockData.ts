import type { Category, Establishment } from '../types'

// Selected public entity details for the independently developed registry interface.
// See docs/entity-sources.md for the verification record; this is not a complete SIGA directory.
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

const sourceReview = {
  status: 'Published' as const,
  lastUpdated: 'Source review · 21 Oct 2026',
  owner: 'Registry seed data',
  staffUpdated: 'Source review · 21 Oct 2026',
}

export const initialEstablishments: Establishment[] = [
  {
    id: 'sample-001',
    slug: 'electricity-company-of-ghana',
    name: 'Electricity Company of Ghana',
    categoryId: 'soe',
    website: 'https://ecg.com.gh/',
    email: 'help@ecggh.com',
    contactNumber: '+233 302 611 611',
    summary: 'Electricity distribution utility serving customers across southern Ghana.',
    ...sourceReview,
  },
  {
    id: 'sample-002',
    slug: 'volta-river-authority',
    name: 'Volta River Authority',
    categoryId: 'soe',
    website: 'https://vra.com/',
    email: 'corpcomm@vra.com',
    contactNumber: '+233 302 664 941-9',
    summary: 'Power utility that supplies electricity and related services in Ghana and West Africa.',
    ...sourceReview,
  },
  {
    id: 'sample-003',
    slug: 'ghana-ports-and-harbours-authority',
    name: 'Ghana Ports and Harbours Authority',
    categoryId: 'soe',
    website: 'https://ghanaports.gov.gh/',
    email: 'headquarters@ghanaports.gov.gh',
    contactNumber: '+233 303 219 120',
    summary: 'Public authority responsible for planning, developing, managing, operating, and controlling Ghana’s ports.',
    ...sourceReview,
  },
  {
    id: 'sample-004',
    slug: 'ghana-national-petroleum-corporation',
    name: 'Ghana National Petroleum Corporation',
    categoryId: 'soe',
    website: 'https://www.gnpcghana.com/',
    email: 'info@gnpcghana.com',
    contactNumber: '+233 303 206 020',
    summary: 'National petroleum corporation focused on Ghana’s hydrocarbon exploration, development, and production.',
    ...sourceReview,
  },
  {
    id: 'sample-005',
    slug: 'ghana-cocoa-board',
    name: 'Ghana Cocoa Board',
    categoryId: 'soe',
    website: 'https://cocobod.gh/',
    email: 'public_affairs@cocobod.gh',
    contactNumber: '+233 302 661 877',
    summary: 'Public board supporting Ghana’s cocoa sector and its related services.',
    ...sourceReview,
  },
  {
    id: 'sample-006',
    slug: 'ghana-post-company-limited',
    name: 'Ghana Post Company Limited',
    categoryId: 'soe',
    website: 'https://ghanapost.com.gh/',
    email: 'info@ghanapost.com.gh',
    contactNumber: '+233 302 668 138',
    summary: 'Postal and courier company providing mail, parcel, and related public services.',
    ...sourceReview,
  },
  {
    id: 'sample-007',
    slug: 'ghana-oil-company-limited-goil',
    name: 'Ghana Oil Company Limited (GOIL)',
    categoryId: 'jvc',
    website: 'https://www.goil.com.gh/',
    email: 'info@goil.com.gh',
    contactNumber: '+233 302 667 576',
    summary: 'Energy company marketing petroleum and allied products and services.',
    ...sourceReview,
  },
  {
    id: 'sample-008',
    slug: 'intercity-stc-company',
    name: 'Intercity STC Company',
    categoryId: 'jvc',
    website: 'https://stc.gov.gh/',
    email: 'info@stc.gov.gh',
    contactNumber: '+233 573 100 381',
    summary: 'Road passenger transport company also providing parcel and allied transport services.',
    ...sourceReview,
  },
  {
    id: 'sample-009',
    slug: 'twifo-oil-palm-plantation',
    name: 'Twifo Oil Palm Plantation',
    categoryId: 'jvc',
    website: 'https://toppghana.com.gh/',
    email: '',
    contactNumber: '',
    summary: 'Agricultural enterprise producing palm oil, palm kernel, and other oil-palm products.',
    ...sourceReview,
  },
  {
    id: 'sample-010',
    slug: 'forestry-commission',
    name: 'Forestry Commission',
    categoryId: 'ose',
    website: 'https://fc.gov.gh/',
    email: 'info.hq@fcghana.org',
    contactNumber: '+233 302 401 227',
    summary: 'Commission responsible for the sustainable development and management of Ghana’s forestry and wildlife resources.',
    ...sourceReview,
  },
  {
    id: 'sample-011',
    slug: 'ghana-highway-authority',
    name: 'Ghana Highway Authority',
    categoryId: 'ose',
    website: 'https://highways.gov.gh/',
    email: 'ce@highways.gov.gh',
    contactNumber: '+233 302 961 620',
    summary: 'Authority responsible for administering, developing, and maintaining Ghana’s trunk road network.',
    ...sourceReview,
  },
  {
    id: 'sample-012',
    slug: 'ghana-meteorological-agency',
    name: 'Ghana Meteorological Agency',
    categoryId: 'ose',
    website: 'https://www.meteo.gov.gh/',
    email: 'gmet@meteo.gov.gh',
    contactNumber: '+233 303 965 563',
    summary: 'Agency providing weather and climate information services for Ghana.',
    ...sourceReview,
  },
]
