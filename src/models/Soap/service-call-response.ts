import { Text } from './base'
export type OutputWithError = {
  WSBCC: {
    DETALLE: {
      CODERROR: Text
      DESCRIPERROR: Text
    }
  }
}

export type ServiceCallResponse = {
  return: {
    codError: number
    desError: string
    entity: string
    idTxBCC: string
    outputXML: string
  }
}
