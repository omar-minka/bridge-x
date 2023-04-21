import { Encabezado, Text } from './base'

export const AccountCheckingInputXML = ({
  entity,
  account,
  documentType,
  document,
}) => `<WSBCC>
<ENCABEZADO>
<ENTIDAD>${entity}</ENTIDAD>
</ENCABEZADO>
<DETALLE>
<CUENTA>${account}</CUENTA>
<TIPODOCCLI>${documentType}</TIPODOCCLI>
<DOCCLI>${document}</DOCCLI>
</DETALLE>
</WSBCC>`

// represents the response WSBCCValidarCuenta from soap service from coopcentral
export interface AccountChecking {
  WSBCC: {
    ENCABEZADO: Encabezado
    DETALLE: {
      CUENTA: Text
      MONTOMAX: Text
      COSTOTX: Text
      MONTOMAXDIACON: Text
      MONTOMAXMENCON: Text
      MONTOMAXMENRET: Text
      MONTOMAXSALCTA: Text
      CELULAR: Text
      EMAIL: Text
      RESULTADO: Text
    }
  }
}
