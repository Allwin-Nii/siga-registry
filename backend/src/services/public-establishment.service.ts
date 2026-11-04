import { DatabaseUnavailableError, NotFoundError } from '../lib/errors.js'
import type { EstablishmentReader } from '../repositories/establishment.repository.js'
import type { DirectoryQuery, PaginatedResult, PublicDashboard, PublicEntityOption, PublicEntityOptionsQuery, PublicEstablishment } from '../types/establishment.js'

export interface PublicEstablishmentEndpointService {
  getDirectory(query: DirectoryQuery): Promise<PaginatedResult<PublicEstablishment>>
  getEntityOptions(query: PublicEntityOptionsQuery): Promise<PaginatedResult<PublicEntityOption>>
  getPublishedBySlug(slug: string): Promise<PublicEstablishment>
  getDashboard(): Promise<PublicDashboard>
}

export class PublicEstablishmentService implements PublicEstablishmentEndpointService {
  constructor(private readonly establishments: EstablishmentReader) {}

  async getDirectory(query: DirectoryQuery): Promise<PaginatedResult<PublicEstablishment>> {
    try {
      return await this.establishments.findPublishedDirectory(query)
    } catch {
      throw new DatabaseUnavailableError()
    }
  }

  async getEntityOptions(query: PublicEntityOptionsQuery): Promise<PaginatedResult<PublicEntityOption>> {
    try {
      return await this.establishments.findPublishedEntityOptions(query)
    } catch {
      throw new DatabaseUnavailableError()
    }
  }

  async getPublishedBySlug(slug: string): Promise<PublicEstablishment> {
    try {
      const establishment = await this.establishments.findPublishedBySlug(slug)
      if (!establishment) throw new NotFoundError('The published establishment was not found.')
      return establishment
    } catch (error) {
      if (error instanceof NotFoundError) throw error
      throw new DatabaseUnavailableError()
    }
  }

  async getDashboard(): Promise<PublicDashboard> {
    try {
      return await this.establishments.findPublishedDashboard()
    } catch {
      throw new DatabaseUnavailableError()
    }
  }
}
