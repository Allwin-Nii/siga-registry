import { ValidationError } from '../lib/errors.js'
import type { EstablishmentInput, ValidatedEstablishmentInput, ValidatedManagementMemberInput } from '../types/establishment.js'

const optionalText = (value: unknown) => {
  if (value === undefined || value === null || value === '') return null
  return typeof value === 'string' ? value.trim() : null
}

export const normalizeWhitespace = (value: string) => value.trim().replace(/\s+/g, ' ')

const validUrl = (value: string, allowedProtocols: readonly string[]) => {
  try {
    const url = new URL(value)
    return allowedProtocols.includes(url.protocol)
  } catch {
    return false
  }
}

const asText = (value: unknown) => typeof value === 'string' ? value : ''

const optionalCoordinate = (value: unknown, field: 'latitude' | 'longitude', errors: Record<string, string>) => {
  if (value === undefined || value === null || value === '') return null
  const text = typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim() : ''
  const maximum = field === 'latitude' ? 90 : 180
  if (!/^-?\d{1,3}(?:\.\d{1,7})?$/.test(text)) {
    errors[field] = `Enter a valid ${field} with up to seven decimal places.`
    return null
  }
  const parsed = Number(text)
  if (!Number.isFinite(parsed) || parsed < -maximum || parsed > maximum) {
    errors[field] = `Enter a ${field} between ${-maximum} and ${maximum}.`
    return null
  }
  return parsed
}

const validateManagement = (value: unknown, errors: Record<string, string>): ValidatedManagementMemberInput[] | undefined => {
  if (value === undefined) return undefined
  if (!Array.isArray(value) || value.length > 50) {
    errors.management = 'Provide no more than 50 management members.'
    return undefined
  }

  return value.map((member, index) => {
    const input = member !== null && typeof member === 'object' ? member as Record<string, unknown> : {}
    const fullName = normalizeWhitespace(asText(input.fullName))
    const position = normalizeWhitespace(asText(input.position))
    const officialEmail = optionalText(input.officialEmail)
    const officialPhone = optionalText(input.officialPhone)
    const prefix = `management.${index}`
    if (fullName.length < 2 || fullName.length > 120) errors[`${prefix}.fullName`] = 'Enter a full name between 2 and 120 characters.'
    if (position.length < 2 || position.length > 120) errors[`${prefix}.position`] = 'Enter a position between 2 and 120 characters.'
    if (officialEmail && (officialEmail.length > 254 || !/^\S+@\S+\.\S+$/.test(officialEmail))) {
      errors[`${prefix}.officialEmail`] = 'Enter a valid official email address of at most 254 characters.'
    }
    if (officialPhone && (officialPhone.length < 5 || officialPhone.length > 32 || !/^[0-9+().\-\s]+$/.test(officialPhone))) {
      errors[`${prefix}.officialPhone`] = 'Enter an official telephone number between 5 and 32 characters.'
    }
    return { fullName, position, officialEmail, officialPhone, displayOrder: index }
  })
}

export const validateEstablishmentInput = (input: Partial<EstablishmentInput>): ValidatedEstablishmentInput => {
  const name = normalizeWhitespace(asText(input.name))
  const categoryCode = normalizeWhitespace(asText(input.categoryId)).toUpperCase()
  const website = optionalText(input.website)
  const logoUrl = optionalText(input.logoUrl)
  const email = optionalText(input.email)
  const contactNumber = optionalText(input.contactNumber)
  const summary = normalizeWhitespace(asText(input.summary))
  const errors: Record<string, string> = {}
  const region = optionalText(input.region)
  const city = optionalText(input.city)
  const physicalAddress = optionalText(input.physicalAddress)
  const gpsAddress = optionalText(input.gpsAddress)
  const latitude = optionalCoordinate(input.latitude, 'latitude', errors)
  const longitude = optionalCoordinate(input.longitude, 'longitude', errors)
  const management = validateManagement(input.management, errors)

  if (name.length < 3 || name.length > 120) errors.name = 'Enter a name between 3 and 120 characters.'
  if (!/^[A-Z]{3}$/.test(categoryCode)) errors.categoryId = 'Choose a valid category.'
  if (website && (website.length > 2048 || !validUrl(website, ['http:', 'https:']))) {
    errors.website = 'Enter a valid HTTP or HTTPS website URL of at most 2048 characters.'
  }
  if (logoUrl && (logoUrl.length > 2048 || !validUrl(logoUrl, ['https:']))) {
    errors.logoUrl = 'Enter a valid HTTPS logo URL of at most 2048 characters.'
  }
  if (email && (email.length > 254 || !/^\S+@\S+\.\S+$/.test(email))) {
    errors.email = 'Enter a valid email address of at most 254 characters.'
  }
  if (contactNumber && (contactNumber.length < 5 || contactNumber.length > 32 || !/^[0-9+().\-\s]+$/.test(contactNumber))) {
    errors.contactNumber = 'Enter a contact number between 5 and 32 characters.'
  }
  if (summary.length < 20 || summary.length > 500) {
    errors.summary = 'Enter a brief description between 20 and 500 characters.'
  }
  if (region && region.length > 120) errors.region = 'Enter a region of at most 120 characters.'
  if (city && city.length > 120) errors.city = 'Enter a city of at most 120 characters.'
  if (physicalAddress && physicalAddress.length > 500) errors.physicalAddress = 'Enter a physical address of at most 500 characters.'
  if (gpsAddress && !/^[A-Z]{2}-\d{3,4}-\d{4}$/i.test(gpsAddress)) {
    errors.gpsAddress = 'Enter a GhanaPost GPS address such as GA-123-4567.'
  }
  if ((latitude === null) !== (longitude === null)) {
    errors.coordinates = 'Provide both latitude and longitude, or leave both blank.'
  }

  if (Object.keys(errors).length > 0) throw new ValidationError('Invalid establishment input.', errors)

  return {
    name,
    categoryCode,
    website,
    logoUrl,
    email,
    contactNumber,
    summary,
    region,
    city,
    physicalAddress,
    gpsAddress,
    latitude,
    longitude,
    management,
  }
}

export const slugFromName = (name: string) => {
  const slug = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (!slug) throw new ValidationError('The name must include letters or numbers that can form a URL slug.', { name: 'Use letters or numbers in the name.' })
  return slug.slice(0, 160).replace(/-+$/g, '')
}
