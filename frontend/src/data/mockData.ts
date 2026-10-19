import type { Category, DashboardRecord, Establishment } from '../types'

// Replace these configurable prototype options with real categories when the backend is available.
export const categoryOptions: Category[] = [
  { id: 'learning', name: 'Learning space', description: 'Example places for workshops and study.' },
  { id: 'community', name: 'Community hub', description: 'Example places for neighbour-led activity.' },
  { id: 'research', name: 'Research studio', description: 'Example places for exploratory projects.' },
  { id: 'service', name: 'Service point', description: 'Example places for practical support.' },
]

export const establishments: Establishment[] = [
  {
    id: 'sample-001', slug: 'harborlight-learning-studio', name: 'Harborlight Learning Studio',
    categoryId: 'learning', location: 'Example Harbour District', address: '42 Sample Street, Example Harbour',
    email: 'hello@harborlight.example', phone: '+000 000 0142', website: 'harborlight.example',
    summary: 'A fictional sample record used to demonstrate how a learning-focused establishment might appear in the registry.',
    services: ['Workshop rooms', 'Study sessions', 'Resource desk'], status: 'Published', lastUpdated: 'Sample update · May 2026',
  },
  {
    id: 'sample-002', slug: 'cedarline-community-hub', name: 'Cedarline Community Hub',
    categoryId: 'community', location: 'Example Central Quarter', address: '8 Illustrative Lane, Central Quarter',
    email: 'team@cedarline.example', phone: '+000 000 0208', website: 'cedarline.example',
    summary: 'A fictional sample record representing a flexible community meeting and activity space.',
    services: ['Meeting space', 'Noticeboard', 'Neighbour sessions'], status: 'Published', lastUpdated: 'Sample update · April 2026',
  },
  {
    id: 'sample-003', slug: 'brightwell-research-studio', name: 'Brightwell Research Studio',
    categoryId: 'research', location: 'Example Innovation Park', address: '17 Prototype Way, Innovation Park',
    email: 'contact@brightwell.example', phone: '+000 000 0317', website: 'brightwell.example',
    summary: 'A fictional sample record illustrating a research-oriented establishment profile.',
    services: ['Project tables', 'Reference collection', 'Open inquiry hours'], status: 'Published', lastUpdated: 'Sample update · March 2026',
  },
  {
    id: 'sample-004', slug: 'juniper-path-service-point', name: 'Juniper Path Service Point',
    categoryId: 'service', location: 'Example Riverside', address: '5 Demo Avenue, Riverside',
    email: 'support@juniperpath.example', phone: '+000 000 0405', website: 'juniperpath.example',
    summary: 'A fictional sample record showing a practical support and information point.',
    services: ['Guidance desk', 'Referral information', 'Appointment hours'], status: 'Published', lastUpdated: 'Sample update · February 2026',
  },
  {
    id: 'sample-005', slug: 'northstar-workshop-house', name: 'Northstar Workshop House',
    categoryId: 'learning', location: 'Example North End', address: '63 Model Road, North End',
    email: 'info@northstar.example', phone: '+000 000 0563', website: 'northstar.example',
    summary: 'A fictional sample record for a hands-on learning and workshop venue.',
    services: ['Making tables', 'Short courses', 'Equipment lending'], status: 'Published', lastUpdated: 'Sample update · January 2026',
  },
  {
    id: 'sample-006', slug: 'willowfield-neighbour-centre', name: 'Willowfield Neighbour Centre',
    categoryId: 'community', location: 'Example Garden Ward', address: '21 Placeholder Close, Garden Ward',
    email: 'welcome@willowfield.example', phone: '+000 000 0621', website: 'willowfield.example',
    summary: 'A fictional sample record for a local gathering and programme venue.',
    services: ['Drop-in hours', 'Small groups', 'Community board'], status: 'Published', lastUpdated: 'Sample update · December 2025',
  },
]

export const dashboardRecords: DashboardRecord[] = [
  { id: 'draft-014', name: 'Cedarline Community Hub', categoryId: 'community', updated: 'Illustrative · 2 hours ago', owner: 'Sample editor', status: 'Draft' },
  { id: 'pending-009', name: 'Harborlight Learning Studio', categoryId: 'learning', updated: 'Illustrative · yesterday', owner: 'Sample editor', status: 'Pending review' },
  { id: 'published-031', name: 'Brightwell Research Studio', categoryId: 'research', updated: 'Illustrative · 3 days ago', owner: 'Sample editor', status: 'Published' },
  { id: 'changes-006', name: 'Juniper Path Service Point', categoryId: 'service', updated: 'Illustrative · 1 week ago', owner: 'Sample editor', status: 'Changes requested' },
]

export const categoryName = (categoryId: string) =>
  categoryOptions.find((category) => category.id === categoryId)?.name ?? 'Uncategorised sample'
