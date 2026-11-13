import { randomUUID } from 'node:crypto'
import { mkdir, rename, unlink, writeFile } from 'node:fs/promises'
import { basename, resolve, sep } from 'node:path'
import { ValidationError } from '../lib/errors.js'

export type ImageUploadKind = 'logo' | 'cover'

export type ImageUploadResult = {
  url: string
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp'
}

const imageLimits: Record<ImageUploadKind, number> = {
  logo: 5 * 1024 * 1024,
  cover: 10 * 1024 * 1024,
}

const fileTypes = {
  png: { mimeType: 'image/png' as const, extension: 'png' },
  jpeg: { mimeType: 'image/jpeg' as const, extension: 'jpg' },
  webp: { mimeType: 'image/webp' as const, extension: 'webp' },
}

const isPng = (body: Buffer) => body.length >= 8 && body.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
const isJpeg = (body: Buffer) => body.length >= 4 && body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff
const isWebp = (body: Buffer) => body.length >= 12 && body.subarray(0, 4).toString('ascii') === 'RIFF' && body.subarray(8, 12).toString('ascii') === 'WEBP'

const detectFileType = (body: Buffer) => {
  if (isPng(body)) return fileTypes.png
  if (isJpeg(body)) return fileTypes.jpeg
  if (isWebp(body)) return fileTypes.webp
  return undefined
}

const normalizedContentType = (value: string | undefined) => value?.split(';', 1)[0]?.trim().toLocaleLowerCase()

export const readMultipartFile = (body: unknown, contentType: string | undefined, fieldName: string) => {
  if (!Buffer.isBuffer(body)) throw new ValidationError('Choose an image file to upload.', { image: 'Choose a PNG, JPEG, or WebP image.' })
  const boundary = /^multipart\/form-data\s*;\s*boundary=(?:"([^"]+)"|([^;\s]+))/i.exec(contentType ?? '')
  const boundaryValue = boundary?.[1] ?? boundary?.[2]
  if (!boundaryValue) throw new ValidationError('Invalid image upload.', { image: 'Use a multipart image upload.' })

  const opening = Buffer.from(`--${boundaryValue}\r\n`)
  const headersEnd = body.indexOf('\r\n\r\n', opening.length)
  if (!body.subarray(0, opening.length).equals(opening) || headersEnd < opening.length) {
    throw new ValidationError('Invalid image upload.', { image: 'The image upload could not be read.' })
  }
  const headers = body.subarray(opening.length, headersEnd).toString('latin1').split('\r\n')
  const disposition = headers.find((header) => header.toLocaleLowerCase().startsWith('content-disposition:'))
  const imageContentType = headers.find((header) => header.toLocaleLowerCase().startsWith('content-type:'))?.slice('content-type:'.length).trim()
  const name = /\bname="([^"]+)"/i.exec(disposition ?? '')?.[1]
  const filename = /\bfilename="([^"]+)"/i.exec(disposition ?? '')?.[1]
  if (!disposition || name !== fieldName || !filename || !imageContentType) {
    throw new ValidationError('Invalid image upload.', { image: 'Choose one image file to upload.' })
  }

  const contentStart = headersEnd + 4
  const partEnd = Buffer.from(`\r\n--${boundaryValue}`)
  const contentEnd = body.indexOf(partEnd, contentStart)
  const closing = contentEnd < 0 ? '' : body.subarray(contentEnd + partEnd.length).toString('latin1')
  if (contentEnd < contentStart || !/^--\r?\n?$/.test(closing)) {
    throw new ValidationError('Invalid image upload.', { image: 'Upload one complete image file.' })
  }
  return { body: body.subarray(contentStart, contentEnd), contentType: imageContentType, filename }
}

export const readMultipartImage = (body: unknown, contentType: string | undefined) => readMultipartFile(body, contentType, 'image')

export const isImageUploadKind = (value: string): value is ImageUploadKind => value === 'logo' || value === 'cover'

/**
 * Stores public institution imagery on the filesystem rather than in the database.
 * The configured directory must be mounted on persistent storage in production.
 */
export class ImageUploadService {
  private readonly directory: string

  constructor(directory: string) {
    this.directory = resolve(directory)
  }

  async upload(kind: ImageUploadKind, body: unknown, contentType: string | undefined): Promise<ImageUploadResult> {
    if (!Buffer.isBuffer(body) || body.length === 0) {
      throw new ValidationError('Choose an image file to upload.', { image: 'Choose a PNG, JPEG, or WebP image.' })
    }
    if (body.length > imageLimits[kind]) {
      const limit = kind === 'logo' ? '5 MB' : '10 MB'
      throw new ValidationError(`The ${kind} image is too large.`, { image: `Choose an image no larger than ${limit}.` })
    }

    const detected = detectFileType(body)
    if (!detected) {
      throw new ValidationError('Unsupported image file.', { image: 'Choose a PNG, JPEG, or WebP image.' })
    }
    if (normalizedContentType(contentType) !== detected.mimeType) {
      throw new ValidationError('The image content type does not match the file.', { image: 'Upload the image using its correct PNG, JPEG, or WebP content type.' })
    }

    await mkdir(this.directory, { recursive: true, mode: 0o750 })
    const filename = `${kind}-${randomUUID()}.${detected.extension}`
    const finalPath = resolve(this.directory, filename)
    if (!finalPath.startsWith(`${this.directory}${sep}`) || basename(finalPath) !== filename) {
      throw new ValidationError('Invalid upload destination.')
    }
    const temporaryPath = `${finalPath}.uploading`

    try {
      await writeFile(temporaryPath, body, { mode: 0o640, flag: 'wx' })
      await rename(temporaryPath, finalPath)
    } catch (error) {
      await unlink(temporaryPath).catch(() => undefined)
      throw error
    }

    return { url: `/uploads/${filename}`, mimeType: detected.mimeType }
  }
}
