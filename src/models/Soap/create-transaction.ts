import { Encabezado, Text } from './base'

const DEFAULT_OPERATION_TYPE = '03' // Internal transactions
const DEFAULT_CHANNEL = '05' // WEB
const DEFAULT_COMMITION = '0'

// Placeholder values when virtual account is used
const DEFAULT_VIRTUAL_ACCOUNT_DOCUMENT_NUMBER = '0'
const DEFAULT_VIRTUAL_ACCOUNT_NAME = 'VA'

export const CreateTransactionInputXML = ({
  entity,
  origOper,
  prodOrig, // source account number
  docProdOrig = DEFAULT_VIRTUAL_ACCOUNT_DOCUMENT_NUMBER, // source document number
  nomOrig = DEFAULT_VIRTUAL_ACCOUNT_NAME,
  prodDest, // target account number
  docProdDest = DEFAULT_VIRTUAL_ACCOUNT_DOCUMENT_NUMBER, // target document number
  nomDest = DEFAULT_VIRTUAL_ACCOUNT_NAME,
  descripTx,
  valorTx,
  idTxEntidad,
  tipoOperTX = DEFAULT_OPERATION_TYPE,
  vComTx = DEFAULT_COMMITION,
  tProc = DEFAULT_CHANNEL,
}) => `<WSBCC>
<ENCABEZADO>
<ENTIDAD>${entity}</ENTIDAD>
</ENCABEZADO>
<DETALLE>
<ORIGOPER>${origOper}</ORIGOPER>
<PRODORIG>${prodOrig}</PRODORIG>
<DOCPRODORIG>${docProdOrig}</DOCPRODORIG>
<NOMORIG>${nomOrig}</NOMORIG>
<PRODDEST>${prodDest}</PRODDEST>
<DOCPRODDEST>${docProdDest}</DOCPRODDEST>
<NOMDEST>${nomDest}</NOMDEST>
<DESCRIPTX>${descripTx}</DESCRIPTX>
<VALORTX>${formatTransactionAmount(valorTx)}</VALORTX>
<IDTXENTIDAD>${idTxEntidad}</IDTXENTIDAD>
<TIPOOPERTX>${tipoOperTX}</TIPOOPERTX>
<VCOMITX>${vComTx}</VCOMITX>
<TPROC>${tProc}</TPROC>
</DETALLE>
</WSBCC>`

/**
 * Format the transaction amount as required by the SOAP API.
 *
 * The amount should be passed as a string with two decimal places (e.g. "100.00").
 * However, the SOAP API requires the amount to be a single number with no decimals (e.g "10000").
 * This function removes the decimal point from the amount and returns it as a string.
 *
 * @param amount - The transaction amount to format.
 * @returns The formatted amount as a string.
 */
const formatTransactionAmount = (amount: string) => {
  if (amount.includes('.')) {
    return amount.replace('.', '')
  }
  return amount
}

// represents the response from WSBCCAplicarTXCaptaciones soap service 13 page 67 from coopcentral
export interface CoopcentralCreateTransaction {
  WSBCC: {
    ENCABEZADO: Encabezado
    DETALLE: {
      IDTXENTIDAD: Text
      SECREV: Text
      RESULTADO: Text
      SALDOTOT: Text
      SALDODISP: Text
    }
  }
}
