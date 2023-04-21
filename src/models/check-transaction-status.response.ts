import { CheckTransactionStatus } from './Soap'
import { resolveTransactionStatus } from './transaction-status'

export class CheckTransactionStatusResponse {
  constructor(
    public status: string,
    public transactionId: string,
    public reverseSequence: string,
    public errorCod: string,
    public errorDescription: string,
  ) {}

  public static fromBankResponse(resp: CheckTransactionStatus) {
    const status = resolveTransactionStatus(
      resp.WSBCC.DETALLE.ESTADOTX._text,
      resp.WSBCC.DETALLE.CODERROR._text,
    )

    return new CheckTransactionStatusResponse(
      status,
      resp.WSBCC.DETALLE.IDTXAPL._text,
      resp.WSBCC.DETALLE.SECREV._text,
      resp.WSBCC.DETALLE.CODERROR._text,
      resp.WSBCC.DETALLE.DESCRIPERROR._text,
    )
  }
}
