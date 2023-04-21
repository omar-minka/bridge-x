import { CoopcentralCreateTransaction } from './Soap'

export class CreateBankTransactionResponse {
  constructor(public transactionId: string, public reverseSequence: string) {}

  public static fromBankResponse(resp: CoopcentralCreateTransaction) {
    return new CreateBankTransactionResponse(
      resp.WSBCC.ENCABEZADO.IDTX._text,
      resp.WSBCC.DETALLE.SECREV._text,
    )
  }
}
