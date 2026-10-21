import { type ReactNode, useCallback, useMemo, useReducer } from 'react'
import { categoryOptions, initialEstablishments } from '../data/mockData'
import { RegistryContext } from './RegistryContext'
import type {
  Category,
  Establishment,
  EstablishmentInput,
  EstablishmentValidationErrors,
  RecordStatus,
  ReviewDecision,
  WorkflowFeedback,
} from '../types'
import { toEstablishmentInput, validateEstablishmentInput } from '../validation/establishmentValidation'

type RegistryState = {
  categories: Category[]
  establishments: Establishment[]
}

type RegistryAction =
  | { type: 'create'; establishment: Establishment }
  | { type: 'update'; establishment: Establishment }
  | { type: 'submit'; establishmentId: string }
  | { type: 'review'; establishmentId: string; decision: ReviewDecision; feedback?: string }

export type RegistryOperationResult =
  | { ok: true; establishment: Establishment }
  | { ok: false; errors: EstablishmentValidationErrors }

export type RegistryWorkflowResult =
  | { ok: true }
  | { ok: false; error: string }

export type RegistryContextValue = RegistryState & {
  findEstablishmentById: (id: string) => Establishment | undefined
  findEstablishmentBySlug: (slug: string) => Establishment | undefined
  getPublishedEstablishments: () => Establishment[]
  createEstablishment: (input: EstablishmentInput, submitForReview?: boolean) => RegistryOperationResult
  updateEstablishment: (id: string, input: EstablishmentInput) => RegistryOperationResult
  submitEstablishment: (id: string) => RegistryWorkflowResult
  reviewEstablishment: (id: string, decision: ReviewDecision, feedback?: string) => RegistryWorkflowResult
}

const cloneSeedState = (): RegistryState => ({
  categories: categoryOptions.map((category) => ({ ...category })),
  establishments: initialEstablishments.map((establishment) => ({
    ...establishment,
    reviewFeedback: establishment.reviewFeedback ? { ...establishment.reviewFeedback } : undefined,
  })),
})

const updateTimestamp = (establishment: Establishment) => ({
  ...establishment,
  lastUpdated: 'Sample update · just now',
  staffUpdated: 'Illustrative · just now',
})

const reviewStatusByDecision: Record<ReviewDecision, RecordStatus> = {
  approve: 'Published',
  request_changes: 'Changes requested',
  reject: 'Rejected',
}

function registryReducer(state: RegistryState, action: RegistryAction): RegistryState {
  switch (action.type) {
    case 'create':
      return { ...state, establishments: [...state.establishments, action.establishment] }
    case 'update':
      return {
        ...state,
        establishments: state.establishments.map((establishment) =>
          establishment.id === action.establishment.id ? action.establishment : establishment,
        ),
      }
    case 'submit':
      return {
        ...state,
        establishments: state.establishments.map((establishment) =>
          establishment.id === action.establishmentId
            ? { ...updateTimestamp(establishment), status: 'Pending review', reviewFeedback: undefined }
            : establishment,
        ),
      }
    case 'review': {
      const reviewedAt = new Date().toISOString()
      return {
        ...state,
        establishments: state.establishments.map((establishment) => {
          if (establishment.id !== action.establishmentId) return establishment
          const reviewFeedback: WorkflowFeedback = {
            decision: action.decision,
            ...(action.feedback?.trim() ? { message: action.feedback.trim() } : {}),
            reviewedAt,
          }
          return {
            ...updateTimestamp(establishment),
            status: reviewStatusByDecision[action.decision],
            reviewFeedback,
          }
        }),
      }
    }
  }
}

const createUniqueId = (establishments: readonly Establishment[]) => {
  const ids = new Set(establishments.map((establishment) => establishment.id))
  let sequence = 1
  while (ids.has(`sample-${String(sequence).padStart(3, '0')}`)) sequence += 1
  return `sample-${String(sequence).padStart(3, '0')}`
}

const slugBase = (name: string) => {
  const normalized = name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase()
  return normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'sample-establishment'
}

const createUniqueSlug = (name: string, establishments: readonly Establishment[]) => {
  const existingSlugs = new Set(establishments.map((establishment) => establishment.slug))
  const base = slugBase(name)
  let slug = base
  let suffix = 2
  while (existingSlugs.has(slug)) {
    slug = `${base}-${suffix}`
    suffix += 1
  }
  return slug
}

export function RegistryProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(registryReducer, undefined, cloneSeedState)

  const findEstablishmentById = useCallback((id: string) =>
    state.establishments.find((establishment) => establishment.id === id), [state.establishments])
  const findEstablishmentBySlug = useCallback((slug: string) =>
    state.establishments.find((establishment) => establishment.slug === slug), [state.establishments])
  const getPublishedEstablishments = useCallback(() =>
    state.establishments.filter((establishment) => establishment.status === 'Published'), [state.establishments])

  const createEstablishment = useCallback((input: EstablishmentInput, submitForReview = false): RegistryOperationResult => {
    const normalizedInput = toEstablishmentInput(input)
    const errors = validateEstablishmentInput(normalizedInput, {
      categories: state.categories,
      existingEstablishments: state.establishments,
    })
    if (Object.keys(errors).length > 0) return { ok: false, errors }
    const establishment: Establishment = {
      ...normalizedInput,
      id: createUniqueId(state.establishments),
      slug: createUniqueSlug(normalizedInput.name, state.establishments),
      status: submitForReview ? 'Pending review' : 'Draft',
      lastUpdated: 'Sample update · just now',
      owner: 'Sample editor',
      staffUpdated: 'Illustrative · just now',
    }
    dispatch({ type: 'create', establishment })
    return { ok: true, establishment }
  }, [state.categories, state.establishments])

  const updateEstablishment = useCallback((id: string, input: EstablishmentInput): RegistryOperationResult => {
    const current = state.establishments.find((establishment) => establishment.id === id)
    if (!current) return { ok: false, errors: { name: 'This sample establishment was not found.' } }
    const normalizedInput = toEstablishmentInput(input)
    const errors = validateEstablishmentInput(normalizedInput, {
      categories: state.categories,
      existingEstablishments: state.establishments,
      excludeEstablishmentId: id,
    })
    if (Object.keys(errors).length > 0) return { ok: false, errors }
    const establishment = { ...updateTimestamp(current), ...normalizedInput, id: current.id, slug: current.slug }
    dispatch({ type: 'update', establishment })
    return { ok: true, establishment }
  }, [state.categories, state.establishments])

  const submitEstablishment = useCallback((id: string): RegistryWorkflowResult => {
    const current = state.establishments.find((establishment) => establishment.id === id)
    if (!current) return { ok: false, error: 'This sample establishment was not found.' }
    if (current.status !== 'Draft' && current.status !== 'Changes requested') {
      return { ok: false, error: 'Only draft or changes-requested records can be submitted for review.' }
    }
    dispatch({ type: 'submit', establishmentId: id })
    return { ok: true }
  }, [state.establishments])

  const reviewEstablishment = useCallback((id: string, decision: ReviewDecision, feedback?: string): RegistryWorkflowResult => {
    const current = state.establishments.find((establishment) => establishment.id === id)
    if (!current) return { ok: false, error: 'This sample establishment was not found.' }
    if (current.status !== 'Pending review') {
      return { ok: false, error: 'Only pending records can be reviewed.' }
    }
    if ((decision === 'request_changes' || decision === 'reject') && !feedback?.trim()) {
      return { ok: false, error: 'Provide feedback when requesting changes or rejecting a submission.' }
    }
    dispatch({ type: 'review', establishmentId: id, decision, feedback })
    return { ok: true }
  }, [state.establishments])

  const value = useMemo<RegistryContextValue>(() => ({
    ...state,
    findEstablishmentById,
    findEstablishmentBySlug,
    getPublishedEstablishments,
    createEstablishment,
    updateEstablishment,
    submitEstablishment,
    reviewEstablishment,
  }), [state, findEstablishmentById, findEstablishmentBySlug, getPublishedEstablishments, createEstablishment, updateEstablishment, submitEstablishment, reviewEstablishment])

  return <RegistryContext.Provider value={value}>{children}</RegistryContext.Provider>
}
