import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import type { DatabaseExecutor } from '../config/database.js'
import type { Administrator, AuthenticatedAdministratorSession } from '../types/administrator.js'

type AdministratorRow = RowDataPacket & {
  id: number
  email: string
  password_hash: string
}

type SessionRow = RowDataPacket & {
  session_id: number
  token_hash: string
  csrf_token_hash: string
  expires_at: Date
  administrator_id: number
  administrator_email: string
}

const toAdministrator = (row: AdministratorRow): Administrator => ({
  id: row.id,
  email: row.email,
  passwordHash: row.password_hash,
})

const toSession = (row: SessionRow): AuthenticatedAdministratorSession => ({
  id: row.session_id,
  tokenHash: row.token_hash,
  csrfTokenHash: row.csrf_token_hash,
  expiresAt: row.expires_at,
  administrator: { id: row.administrator_id, email: row.administrator_email },
})

export type CreateSessionInput = {
  administratorId: number
  tokenHash: string
  csrfTokenHash: string
  expiresAt: Date
}

export interface AdministratorRepositoryPort {
  findByEmail(email: string, executor?: DatabaseExecutor): Promise<Administrator | undefined>
  create(email: string, passwordHash: string, executor?: DatabaseExecutor): Promise<Administrator>
  createSession(input: CreateSessionInput, executor?: DatabaseExecutor): Promise<void>
  markLogin(administratorId: number, executor?: DatabaseExecutor): Promise<void>
  findActiveSession(tokenHash: string): Promise<AuthenticatedAdministratorSession | undefined>
  revokeSession(tokenHash: string, executor?: DatabaseExecutor): Promise<void>
}

export class AdministratorRepository implements AdministratorRepositoryPort {
  constructor(private readonly database: DatabaseExecutor) {}

  async findByEmail(email: string, executor: DatabaseExecutor = this.database): Promise<Administrator | undefined> {
    const [rows] = await executor.execute<AdministratorRow[]>(`
      SELECT id, email, password_hash
      FROM administrators
      WHERE email = ?
      LIMIT 1
    `, [email])
    return rows[0] ? toAdministrator(rows[0]) : undefined
  }

  async create(email: string, passwordHash: string, executor: DatabaseExecutor = this.database): Promise<Administrator> {
    const [result] = await executor.execute<ResultSetHeader>(`
      INSERT INTO administrators (email, password_hash)
      VALUES (?, ?)
    `, [email, passwordHash])
    const [rows] = await executor.execute<AdministratorRow[]>(`
      SELECT id, email, password_hash
      FROM administrators
      WHERE id = ?
      LIMIT 1
    `, [result.insertId])
    if (!rows[0]) throw new Error('Created administrator could not be read.')
    return toAdministrator(rows[0])
  }

  async createSession(input: CreateSessionInput, executor: DatabaseExecutor = this.database): Promise<void> {
    await executor.execute<ResultSetHeader>(`
      INSERT INTO administrator_sessions (administrator_id, token_hash, csrf_token_hash, expires_at)
      VALUES (?, ?, ?, ?)
    `, [input.administratorId, input.tokenHash, input.csrfTokenHash, input.expiresAt])
  }

  async markLogin(administratorId: number, executor: DatabaseExecutor = this.database): Promise<void> {
    await executor.execute<ResultSetHeader>(`
      UPDATE administrators
      SET last_login_at = CURRENT_TIMESTAMP(3)
      WHERE id = ?
    `, [administratorId])
  }

  async findActiveSession(tokenHash: string): Promise<AuthenticatedAdministratorSession | undefined> {
    const [rows] = await this.database.execute<SessionRow[]>(`
      SELECT
        s.id AS session_id,
        s.token_hash,
        s.csrf_token_hash,
        s.expires_at,
        a.id AS administrator_id,
        a.email AS administrator_email
      FROM administrator_sessions s
      INNER JOIN administrators a ON a.id = s.administrator_id
      WHERE s.token_hash = ?
        AND s.revoked_at IS NULL
        AND s.expires_at > CURRENT_TIMESTAMP(3)
      LIMIT 1
    `, [tokenHash])
    return rows[0] ? toSession(rows[0]) : undefined
  }

  async revokeSession(tokenHash: string, executor: DatabaseExecutor = this.database): Promise<void> {
    await executor.execute<ResultSetHeader>(`
      UPDATE administrator_sessions
      SET revoked_at = CURRENT_TIMESTAMP(3)
      WHERE token_hash = ? AND revoked_at IS NULL
    `, [tokenHash])
  }
}
