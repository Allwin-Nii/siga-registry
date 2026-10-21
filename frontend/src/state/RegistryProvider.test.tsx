import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { initialEstablishments } from '../data/mockData'
import type { EstablishmentInput } from '../types'
import { RegistryProvider, type RegistryOperationResult } from './RegistryProvider'
import { useRegistry } from './useRegistry'

function providerWrapper({ children }: { children: ReactNode }) {
  return <RegistryProvider>{children}</RegistryProvider>
}

const newRecord: EstablishmentInput = {
  name: 'Signal House',
  categoryId: 'soe',
  website: 'https://signal-house.example',
  email: 'contact@signal-house.example',
  contactNumber: '+000 000 0999',
  summary: 'A temporary establishment used only for shared registry state tests.',
}

describe('RegistryProvider', () => {
  it('initialises each provider from a fresh copy of the selected public seed data', () => {
    const first = renderHook(() => useRegistry(), { wrapper: providerWrapper })
    expect(first.result.current.establishments).toEqual(initialEstablishments)

    act(() => { first.result.current.createEstablishment(newRecord) })
    expect(first.result.current.establishments).toHaveLength(initialEstablishments.length + 1)
    first.unmount()

    const fresh = renderHook(() => useRegistry(), { wrapper: providerWrapper })
    expect(fresh.result.current.establishments).toEqual(initialEstablishments)
  })

  it('creates and updates records immutably with stable identifiers and collision-safe slugs', () => {
    const { result } = renderHook(() => useRegistry(), { wrapper: providerWrapper })
    const beforeCreate = result.current.establishments
    let firstCreate: RegistryOperationResult | undefined
    let secondCreate: RegistryOperationResult | undefined

    act(() => { firstCreate = result.current.createEstablishment(newRecord) })
    act(() => { secondCreate = result.current.createEstablishment({ ...newRecord, name: 'Signal-House' }) })

    if (!firstCreate?.ok || !secondCreate?.ok) throw new Error('Expected valid demonstration records to be created.')
    const firstEstablishment = firstCreate.establishment
    const secondEstablishment = secondCreate.establishment
    expect(result.current.establishments).not.toBe(beforeCreate)
    expect(firstEstablishment.id).toBe('sample-013')
    expect(firstEstablishment.slug).toBe('signal-house')
    expect(secondEstablishment.id).toBe('sample-014')
    expect(secondEstablishment.slug).toBe('signal-house-2')

    const beforeUpdate = result.current.establishments
    let update: RegistryOperationResult | undefined
    act(() => {
      update = result.current.updateEstablishment(firstEstablishment.id, { ...newRecord, name: 'Signal House Updated' })
    })
    if (!update?.ok) throw new Error('Expected the demonstration record update to succeed.')
    expect(result.current.establishments).not.toBe(beforeUpdate)
    expect(update.establishment.id).toBe(firstEstablishment.id)
    expect(update.establishment.slug).toBe(firstEstablishment.slug)
    expect(result.current.findEstablishmentById(firstEstablishment.id)?.name).toBe('Signal House Updated')
  })

  it('does not mutate the registry for invalid and duplicate create attempts', () => {
    const { result } = renderHook(() => useRegistry(), { wrapper: providerWrapper })
    const before = result.current.establishments
    let invalid: RegistryOperationResult | undefined
    let duplicate: RegistryOperationResult | undefined
    act(() => { invalid = result.current.createEstablishment({ ...newRecord, categoryId: 'invalid' }) })
    act(() => { duplicate = result.current.createEstablishment({ ...newRecord, name: initialEstablishments[0].name.toUpperCase() }) })
    expect(invalid?.ok).toBe(false)
    expect(duplicate?.ok).toBe(false)
    expect(result.current.establishments).toBe(before)
  })

  it('submits drafts, approves records into the public selector, and updates dynamic status counts', () => {
    const { result } = renderHook(() => useRegistry(), { wrapper: providerWrapper })
    let created: RegistryOperationResult | undefined
    act(() => { created = result.current.createEstablishment(newRecord) })
    if (!created || !created.ok) throw new Error('Expected a valid demonstration record.')
    const createdId = created.establishment.id
    expect(result.current.findEstablishmentById(createdId)?.status).toBe('Draft')
    expect(result.current.establishments.filter((record) => record.status === 'Draft')).toHaveLength(1)

    act(() => { expect(result.current.submitEstablishment(createdId).ok).toBe(true) })
    expect(result.current.findEstablishmentById(createdId)?.status).toBe('Pending review')
    expect(result.current.getPublishedEstablishments().some((record) => record.id === createdId)).toBe(false)

    act(() => { expect(result.current.reviewEstablishment(createdId, 'approve').ok).toBe(true) })
    expect(result.current.findEstablishmentById(createdId)?.status).toBe('Published')
    expect(result.current.getPublishedEstablishments().some((record) => record.id === createdId)).toBe(true)
    expect(result.current.establishments.filter((record) => record.status === 'Published')).toHaveLength(13)
  })

  it('requires feedback for changes and rejection and keeps workflow transitions consistent', () => {
    const { result } = renderHook(() => useRegistry(), { wrapper: providerWrapper })
    let created: RegistryOperationResult | undefined
    act(() => { created = result.current.createEstablishment(newRecord, true) })
    if (!created?.ok) throw new Error('Expected a pending demonstration record.')
    const pendingId = created.establishment.id

    act(() => { expect(result.current.reviewEstablishment(pendingId, 'request_changes').ok).toBe(false) })
    expect(result.current.findEstablishmentById(pendingId)?.status).toBe('Pending review')

    act(() => { expect(result.current.reviewEstablishment(pendingId, 'request_changes', 'Please clarify the website contact.').ok).toBe(true) })
    expect(result.current.findEstablishmentById(pendingId)?.status).toBe('Changes requested')
    expect(result.current.findEstablishmentById(pendingId)?.reviewFeedback?.message).toContain('clarify')

    act(() => { expect(result.current.submitEstablishment(pendingId).ok).toBe(true) })
    act(() => { expect(result.current.reviewEstablishment(pendingId, 'reject', 'This temporary record is incomplete.').ok).toBe(true) })
    expect(result.current.findEstablishmentById(pendingId)?.status).toBe('Rejected')
  })
})
