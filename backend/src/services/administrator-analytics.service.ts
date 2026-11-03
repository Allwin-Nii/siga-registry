import { DatabaseUnavailableError } from '../lib/errors.js'
import type { AdministratorAnalyticsReader } from '../repositories/administrator-analytics.repository.js'
import type { AdministratorAnalytics } from '../types/administrator-analytics.js'

export class AdministratorAnalyticsService {
  constructor(private readonly analytics: AdministratorAnalyticsReader) {}

  async getDashboard(): Promise<AdministratorAnalytics> {
    try {
      return await this.analytics.getDashboard()
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) throw error
      throw new DatabaseUnavailableError()
    }
  }
}
