export type RecordStatus = 'Draft' | 'Pending review' | 'Published' | 'Changes requested'

export type Category = {
  id: string
  name: string
  description: string
}

export type Establishment = {
  id: string
  slug: string
  name: string
  categoryId: string
  location: string
  address: string
  email: string
  phone: string
  website: string
  summary: string
  services: string[]
  status: RecordStatus
  lastUpdated: string
}

export type DashboardRecord = {
  id: string
  name: string
  categoryId: string
  updated: string
  owner: string
  status: RecordStatus
}
