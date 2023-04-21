import { toString } from 'lodash'
import { ServiceCallResponse, OutputWithError } from './Soap'

/**
 * Code 'system' => bank is not reachable
 * Code '00014' => transaction in pending state
 * Code '14' => input/output error in response
 * Code '15' => unidentified error
 * Code '20' => file not found
 * For more info check Coopcentral manual
 */
const pendingErrorCodes: { [key: string]: true } = {
  system: true,
  '00014': true,
  '14': true,
  '15': true,
  '20': true,
}

export class ServiceError extends Error {
  constructor(public code: string | number, public message: string) {
    super(message)
    this.code = code
    this.name = 'Service Error'
  }

  static fromServiceResponseWithInnerError(result: OutputWithError) {
    return new ServiceError(
      result.WSBCC.DETALLE.CODERROR._text,
      result.WSBCC.DETALLE.DESCRIPERROR._text,
    )
  }
  static fromServiceResponse(result: ServiceCallResponse) {
    return new ServiceError(result.return.codError, result.return.desError)
  }

  public isUnknown() {
    return !(this.isPending() || this.isRetryable())
  }

  public isPending() {
    return pendingErrorCodes[toString(this.code)] || false
  }

  public isRetryable() {
    // retryable is only when the code is 189 and the message is [02]...
    // for more info check Coopcentral docs page 67
    const retryable =
      toString(this.code) === '189' &&
      this.message ===
        '[02] - Error en Consulta de Estado de Transacciones - Transaccion NO Existe en el Sistema'

    return retryable
  }

  public toString() {
    return `${this.code}: ${this.message}`
  }
}
