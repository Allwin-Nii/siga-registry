import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { ValidationError } from '../lib/errors.js'

const scryptCost = 16_384
const scryptBlockSize = 8
const scryptParallelization = 1
const keyLength = 64
const maxMemory = 64 * 1024 * 1024

const toBuffer = (value: string) => Buffer.from(value, 'base64url')

const deriveKey = (password: string, salt: Buffer) => new Promise<Buffer>((resolve, reject) => {
  scrypt(password, salt, keyLength, {
    N: scryptCost,
    r: scryptBlockSize,
    p: scryptParallelization,
    maxmem: maxMemory,
  }, (error, derivedKey) => {
    if (error) reject(error)
    else resolve(derivedKey)
  })
})

export const normalizeAdministratorEmail = (value: unknown) =>
  typeof value === 'string' ? value.trim().toLocaleLowerCase() : ''

export const validateAdministratorCredentials = (emailValue: unknown, passwordValue: unknown) => {
  const email = normalizeAdministratorEmail(emailValue)
  const password = typeof passwordValue === 'string' ? passwordValue : ''
  const errors: Record<string, string> = {}

  if (email.length > 254 || !/^\S+@\S+\.\S+$/.test(email)) errors.email = 'Enter a valid administrator email address.'
  if (password.length < 12 || password.length > 128) errors.password = 'Use a password between 12 and 128 characters.'
  if (Object.keys(errors).length > 0) throw new ValidationError('Invalid administrator account input.', errors)
  return { email, password }
}

export const hashPassword = async (password: string) => {
  const salt = randomBytes(16)
  const key = await deriveKey(password, salt)
  return `scrypt$${scryptCost}$${scryptBlockSize}$${scryptParallelization}$${salt.toString('base64url')}$${key.toString('base64url')}`
}

export const verifyPassword = async (password: string, encodedHash: string) => {
  const parts = encodedHash.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false
  const [, cost, blockSize, parallelization, saltValue, keyValue] = parts
  if (cost !== String(scryptCost) || blockSize !== String(scryptBlockSize) || parallelization !== String(scryptParallelization) || !saltValue || !keyValue) {
    return false
  }

  try {
    const expected = toBuffer(keyValue)
    const actual = await deriveKey(password, toBuffer(saltValue))
    return expected.length === actual.length && timingSafeEqual(expected, actual)
  } catch {
    return false
  }
}

export const generateSecret = () => randomBytes(32).toString('base64url')
export const hashSecret = (secret: string) => createHash('sha256').update(secret).digest('hex')

export const secretsMatch = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}
