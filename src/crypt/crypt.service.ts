import * as crypto from 'crypto'
import { decode, encode } from 'iconv-lite'

export function getEncryptionKey(key1: string, key2: string) {
  return Buffer.from(`${key1}${key2}`, 'hex')
}

export function encryptData(encryptionKey: Buffer, iv: Buffer, data: string) {
  const key = crypto.createSecretKey(encryptionKey)
  const cipher = crypto.createCipheriv('aes-128-cbc', key, iv)
  const info = crypto.getCipherInfo('aes-128-cbc')
  cipher.setAutoPadding(false)
  const blockSize = info?.blockSize ?? 0

  const plainTextEncoded = encode(data, 'ISO-8859-1')
  const plainTextEncodedLength = plainTextEncoded.length
  let paddingLength = 0

  if (plainTextEncodedLength % blockSize != 0) {
    paddingLength = blockSize - (plainTextEncodedLength % blockSize)
  }

  const paddingBuffer = Buffer.alloc(paddingLength, 0)
  const paddedBuffer = Buffer.concat([plainTextEncoded, paddingBuffer])

  const encrypted = cipher.update(paddedBuffer)
  return encrypted.toString('base64')
}

export function decryptData(
  encryptionKey: Buffer,
  iv: Buffer,
  data: string,
): string {
  const key = crypto.createSecretKey(encryptionKey)
  const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv)
  decipher.setAutoPadding(false)

  let decoded = decipher.update(Buffer.from(data, 'base64'))
  decoded = Buffer.concat([decoded, decipher.final()])

  return decode(decoded, 'utf-8')
}
