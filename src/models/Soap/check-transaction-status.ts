import { Encabezado, Text } from './base'

export const CheckTransactionStatusInputXML = ({ entity, externalId }) =>
  `<WSBCC>
<ENCABEZADO>
<ENTIDAD>${entity}</ENTIDAD>
</ENCABEZADO>
<DETALLE>
<IDTXENTIDAD>${externalId}</IDTXENTIDAD>
<TIPOOPERTX>3</TIPOOPERTX>
</DETALLE>
</WSBCC>`

// represents the response from WSBCCConsultaEstadoTrans soap service 31 page 84 from coopcentral
export interface CheckTransactionStatus {
  WSBCC: {
    ENCABEZADO: Encabezado
    DETALLE: {
      IDTXAPL: Text
      IDTXENTIDAD: Text
      SECREV: Text
      ESTADOTX: Text
      CODERROR: Text
      DESCRIPERROR: Text
    }
  }
}
