import { ClientInfo } from './Soap'

enum AccountType {
  BUSINESS = 'BUSINESS',
  PERSON = 'PERSON',
}

export class AccountDetailsResponse {
  businessName: string
  firstName: string
  lastName: string

  accountType: string
  proprietary: string
  email: string
  phoneNumber: string

  static fromBankResponse(response: ClientInfo): AccountDetailsResponse {
    const accountDetails = new AccountDetailsResponse()
    const responseData = response.WSBCC.DETALLE

    accountDetails.businessName = responseData.NOMBREJURIDICO._text
    accountDetails.firstName = mapFirstName(responseData)
    accountDetails.lastName = mapLastName(responseData)

    accountDetails.accountType = mapAccountType(responseData.TIPOPERS._text)
    accountDetails.proprietary = mapProprietary(responseData.TIPODOCCLI._text)
    accountDetails.email = responseData.EMAIL._text
    accountDetails.phoneNumber = `57${responseData.CELULAR._text}`

    return accountDetails
  }
}

/**
 * Maps the first name of a natural person from the given data.
 *
 * @param data The client data to map from.
 * @returns The first name of the person.
 */
function mapFirstName(data: ClientInfo['WSBCC']['DETALLE']): string {
  const name1 = data.NOMBRES1._text
  const name2 = data.NOMBRES2._text
  if (name2) {
    return `${name1} ${name2}`
  }
  return name1
}

/**
 * Maps the last name of a natural person from the given data.
 *
 * @param data The client data to map from.
 * @returns The last name of the person.
 */
function mapLastName(data: ClientInfo['WSBCC']['DETALLE']): string {
  const lastName1 = data.APELLIDO1._text
  const lastName2 = data.APELLIDO2._text
  if (lastName2) {
    return `${lastName1} ${lastName2}`
  }
  return lastName1
}

/**
 * Maps a proprietary document type code from the bank's standard
 * to a standardized document type code.
 *
 * @param docType The proprietary document type code to map.
 * @returns The standardized document type code.
 *
 * The proprietary document type codes and their corresponding standardized
 * codes are defined on page 105 of the bank's documentation.
 */
function mapProprietary(docType: string): string {
  switch (docType) {
    case 'C':
      return 'CC'
    case 'E':
      return 'CE'
    case 'P':
      return 'PA'
    case 'U':
      return 'NUIP'
    case 'T':
      return 'TI'
    case 'N':
      return 'NIT'
    default:
      return 'OTR'
  }
}

/**
 * Maps a proprietary person type code from the bank's standard
 * to a standardized account type.
 *
 * @param personType The proprietary person type code to map.
 * @returns The standardized account type.
 *
 * The proprietary person type codes and their corresponding standardized
 * account types are defined on page 105 of the bank's documentation.
 * This function throws an error if the personType is not one of the expected values.
 */
function mapAccountType(personType: string): AccountType {
  switch (personType) {
    case '1':
    case '2':
      return AccountType.BUSINESS
    case '3':
      return AccountType.PERSON
    default:
      throw new Error('TIPOPERS has a different value than 1, 2, 3')
  }
}
