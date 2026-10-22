import 'dotenv/config'
import { createDatabasePool, createTransactionRunner } from '../config/database.js'
import { loadEnvironment } from '../config/env.js'
import { AdministratorRepository } from '../repositories/administrator.repository.js'
import { AdministratorAuthService } from '../services/administrator-auth.service.js'

const usage = 'Usage: npm run create-admin -- --email admin@example.test'

const readEmailArgument = (argumentsList: string[]) => {
  if (argumentsList.length !== 2 || argumentsList[0] !== '--email' || !argumentsList[1]) {
    throw new Error(usage)
  }
  return argumentsList[1]
}

const readHidden = (prompt: string): Promise<string> => new Promise((resolve, reject) => {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    reject(new Error('A TTY is required to enter the administrator password securely.'))
    return
  }

  let value = ''
  const stdin = process.stdin
  stdin.setEncoding('utf8')
  stdin.setRawMode(true)
  stdin.resume()
  process.stdout.write(prompt)

  const finish = (result: string | Error) => {
    stdin.removeListener('data', onData)
    stdin.setRawMode(false)
    stdin.pause()
    process.stdout.write('\n')
    if (result instanceof Error) reject(result)
    else resolve(result)
  }

  const onData = (chunk: string) => {
    for (const character of chunk) {
      if (character === '\u0003') {
        finish(new Error('Administrator creation cancelled.'))
        return
      }
      if (character === '\r' || character === '\n') {
        finish(value)
        return
      }
      if (character === '\u007f' || character === '\b') {
        value = value.slice(0, -1)
        continue
      }
      value += character
    }
  }

  stdin.on('data', onData)
})

const main = async () => {
  const email = readEmailArgument(process.argv.slice(2))
  const config = loadEnvironment()
  const password = await readHidden('Administrator password: ')
  const confirmation = await readHidden('Confirm administrator password: ')
  if (password !== confirmation) throw new Error('The password confirmation did not match.')

  const pool = createDatabasePool(config.database)
  try {
    const administrators = new AdministratorRepository(pool)
    const service = new AdministratorAuthService(
      administrators,
      createTransactionRunner(pool),
      config.security.sessionTtlHours,
    )
    const administrator = await service.createAdministrator({ email, password })
    console.info(`Administrator account created for ${administrator.email}.`)
  } finally {
    await pool.end()
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Administrator account creation failed.'
  console.error(`Administrator account creation failed: ${message}`)
  process.exitCode = 1
})
