import { AccountChecking } from './Soap'

export class CheckBankAccountResponse {
  constructor(public accountNumber: string) {}

  public static fromBankReponse(response: AccountChecking) {
    return new CheckBankAccountResponse(response.WSBCC.DETALLE.CUENTA._text)
  }
}
