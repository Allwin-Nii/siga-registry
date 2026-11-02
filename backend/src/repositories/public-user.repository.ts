import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import type { DatabaseExecutor } from '../config/database.js'
import type { AuthenticatedPublicUserSession, PublicUser } from '../types/public-user.js'

type PublicUserRow = RowDataPacket & { id: number; email: string; password_hash: string }
type SessionRow = RowDataPacket & {
  session_id: number
  token_hash: string
  csrf_token_hash: string
  expires_at: Date
  public_user_id: number
  public_user_email: string
}

export type CreatePublicUserSessionInput = {
  publicUserId: number
  tokenHash: string
  csrfTokenHash: string
  expiresAt: Date
}

const toPublicUser = (row: PublicUserRow): PublicUser => ({ id: row.id, email: row.email, passwordHash: row.password_hash })
const toSession = (row: SessionRow): AuthenticatedPublicUserSession => ({
  id: row.session_id,
  tokenHash: row.token_hash,
  csrfTokenHash: row.csrf_token_hash,
  expiresAt: row.expires_at,
  publicUser: { id: row.public_user_id, email: row.public_user_email },
})

export interface PublicUserRepositoryPort {
  findByEmail(email: string, executor?: DatabaseExecutor): Promise<PublicUser | undefined>
  create(email: string, passwordHash: string, executor?: DatabaseExecutor): Promise<PublicUser>
  createSession(input: CreatePublicUserSessionInput, executor?: DatabaseExecutor): Promise<void>
  markLogin(publicUserId: number, executor?: DatabaseExecutor): Promise<void>
  findActiveSession(tokenHash: string): Promise<AuthenticatedPublicUserSession | undefined>
  revokeSession(tokenHash: string, executor?: DatabaseExecutor): Promise<void>
}

export class PublicUserRepository implements PublicUserRepositoryPort {
  constructor(private readonly database: DatabaseExecutor) {}

  async findByEmail(email: string, executor: DatabaseExecutor = this.database): Promise<PublicUser | undefined> {
    const [rows] = await executor.execute<PublicUserRow[]>('SELECT id, email, password_hash FROM public_users WHERE email = ? LIMIT 1', [email])
    return rows[0] ? toPublicUser(rows[0]) : undefined
  }

  async create(email: string, passwordHash: string, executor: DatabaseExecutor = this.database): Promise<PublicUser> {
    const [result] = await executor.execute<ResultSetHeader>('INSERT INTO public_users (email, password_hash) VALUES (?, ?)', [email, passwordHash])
    const [rows] = await executor.execute<PublicUserRow[]>('SELECT id, email, password_hash FROM public_users WHERE id = ? LIMIT 1', [result.insertId])
    if (!rows[0]) throw new Error('Created public user could not be read.')
    return toPublicUser(rows[0])
  }

  async createSession(input: CreatePublicUserSessionInput, executor: DatabaseExecutor = this.database): Promise<void> {
    await executor.execute<ResultSetHeader>(
      'INSERT INTO public_user_sessions (public_user_id, token_hash, csrf_token_hash, expires_at) VALUES (?, ?, ?, ?)',
      [input.publicUserId, input.tokenHash, input.csrfTokenHash, input.expiresAt],
    )
  }

  async markLogin(publicUserId: number, executor: DatabaseExecutor = this.database): Promise<void> {
    await executor.execute<ResultSetHeader>('UPDATE public_users SET last_login_at = CURRENT_TIMESTAMP(3) WHERE id = ?', [publicUserId])
  }

  async findActiveSession(tokenHash: string): Promise<AuthenticatedPublicUserSession | undefined> {
    const [rows] = await this.database.execute<SessionRow[]>(`
      SELECT s.id AS session_id, s.token_hash, s.csrf_token_hash, s.expires_at,
        u.id AS public_user_id, u.email AS public_user_email
      FROM public_user_sessions s
      INNER JOIN public_users u ON u.id = s.public_user_id
      WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > CURRENT_TIMESTAMP(3)
      LIMIT 1
    `, [tokenHash])
    return rows[0] ? toSession(rows[0]) : undefined
  }

  async revokeSession(tokenHash: string, executor: DatabaseExecutor = this.database): Promise<void> {
    await executor.execute<ResultSetHeader>(
      'UPDATE public_user_sessions SET revoked_at = CURRENT_TIMESTAMP(3) WHERE token_hash = ? AND revoked_at IS NULL',
      [tokenHash],
    )
  }
}
