import {
    AbortResult,
    AbortSucceededResult,
    CommitResult,
    CommitSucceededResult,
    JobResultStatus,
    PrepareResult,
    TransactionContext,
  } from '@minka/bridge-sdk'
  import { LedgerErrorReason } from '@minka/bridge-sdk/errors'
  import { config } from '../../config'
  import { CryptoNetwork } from './network.service'
  import { SuspendableBankAdapter } from './suspendable.service'
  
  export class AsyncDebitBankAdapter extends SuspendableBankAdapter {
    constructor(
      protected readonly assetManager: CryptoNetwork
    ){
      super()
    }
    async prepare(context: TransactionContext): Promise<PrepareResult> {
      console.log('Prepare called for debit')  
 
        const intent = context.intent
        const txnId = intent.custom?.txnId
        const status = await this.assetManager.getTransactionStatus(txnId)
  
        let result : PrepareResult;
  
        if( !status ){
          result = {
            status: JobResultStatus.Failed,
            error: {
              reason: LedgerErrorReason.BridgeFraudDetected,
              detail: 'The transaction was not recognized by the bridge.',
            },
            custom: {
              app: config.BRIDGE_APP,
              method: 'AsyncCreditBankAdapter.prepare',
            }
          }
        }
        else if( status === 'confirmed' ){
          result = {
            status: JobResultStatus.Prepared,
            coreId: txnId,
            custom: {
              app: config.BRIDGE_APP,
              method: 'AsyncDebitBankAdapter.prepare',
            },
          }
        } else if(status === 'pending') {
          result = await this.suspend(context, 10)
        } else if(status === 'failed'){
          result = {
            status: JobResultStatus.Failed,
            error: {
              reason: LedgerErrorReason.BridgeUnexpectedError,
              detail: 'The transaction failed on source.',
            },
            custom: {
              app: config.BRIDGE_APP,
              method: 'AsyncCreditBankAdapter.prepare',
            }
          }
        }
        return result
    }
  
  }
  