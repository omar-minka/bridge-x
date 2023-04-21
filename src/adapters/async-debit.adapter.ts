import {
  AbortResult,
  AbortSucceededResult,
  CommitResult,
  CommitSucceededResult,
  IBankAdapter,
  JobResultStatus,
  JobSuspendedResult,
  PrepareResult,
  PrepareSucceededResult,
  TransactionContext,
} from '@minka/bridge-sdk'
import { LedgerErrorReason } from '@minka/bridge-sdk/errors'
import moment from 'moment'
import { config } from '../config'
import Web3 from 'web3'

const suspendedJobs = new Set()

/**
 * Demo implementation of async debit bank adapter
 * which on first method execution will suspend job
 * indefinitely. Job has to be continued via API
 * request:
 *
 * POST on http://localhost:3100/v2/jobs/<handle>/continue
 *
 * On second execution method will return successful
 * results.
 */
export class AsyncDebitBankAdapter extends IBankAdapter {
  
  protected web3: Web3
  
  constructor() {
    super()
    this.web3 = new Web3(config.ETH_WEBSOCKET_URL)
  }

  async prepare(context: TransactionContext): Promise<PrepareResult> {
    console.log('debit prepare called')
    console.log(JSON.stringify(context, null, 2))

    if (this.isContinue(context)) {
      this.cleanSuspended(context)
      
      if(context.intent.custom) {
        const { txnId } = context.intent.custom 
        const re = /[0-9A-Fa-f]{6}/g;
        if(re.test(txnId)) {
          try {
            const transactionReceipt = await this.web3.eth.getTransactionReceipt(txnId)
   
            if(transactionReceipt) {
              const result: PrepareSucceededResult = {
                status: JobResultStatus.Prepared,
                coreId: txnId,
                custom: {
                  app: config.BRIDGE_APP,
                  method: 'AsyncDebitBankAdapter.prepare',
                }
              }
              return Promise.resolve(result)
            } else {
              return this.suspend(context, 10)
            } 
          } catch(err) {
            return this.suspend(context, 10)
          } 
        } else {
          return Promise.resolve({
            status: JobResultStatus.Failed,
            custom: {
              app: config.BRIDGE_APP,
              method: 'AsyncDebitBankAdapter.prepare',
            },
            error: {
              detail: "Invalid transaction hash",
              reason: LedgerErrorReason.BridgeIntentUnrelated
            }
          })
        }
      } else {
        return Promise.resolve({
          status: JobResultStatus.Failed,
          custom: {
            app: config.BRIDGE_APP,
            method: 'AsyncDebitBankAdapter.prepare',
          },
          error: {
            detail: "Couldn't find transaction in blockchain",
            reason: LedgerErrorReason.BridgeIntentUnrelated
          }
        })
      }
    } else {
      return this.suspend(context, 2)
    }
  }

  abort(context: TransactionContext): Promise<AbortResult> {
    console.log('debit abort called')
    console.log(JSON.stringify(context, null, 2))

    if (this.isContinue(context)) {
      this.cleanSuspended(context)

      let coreId
      if(context.intent.custom) {
        const { txnId } = context.intent.custom
        coreId = txnId 
      }
      const result: AbortSucceededResult = {
        status: JobResultStatus.Aborted,
        coreId,
        custom: {
          app: config.BRIDGE_APP,
          method: 'AsyncDebitBankAdapter.abort',
        },
      }

      return Promise.resolve(result)
    } else {
      return this.suspend(context, 2)
    }
  }

  commit(context: TransactionContext): Promise<CommitResult> {
    console.log('debit commit called')
    console.log(JSON.stringify(context, null, 2))

    if (this.isContinue(context)) {
      this.cleanSuspended(context)

      let coreId
      if(context.intent.custom) {
        const { txnId } = context.intent.custom
        coreId = txnId 
      }

      const result: CommitSucceededResult = {
        status: JobResultStatus.Committed,
        coreId,
        custom: {
          app: config.BRIDGE_APP,
          method: 'AsyncDebitBankAdapter.commit',
        },
      }

      return Promise.resolve(result)
    } else {
      return this.suspend(context, 10)
    }
  }

  protected isContinue(context: TransactionContext) {
    return suspendedJobs.has(context.job.handle)
  }

  protected cleanSuspended(context: TransactionContext) {
    suspendedJobs.delete(context.job.handle)
  }

  protected suspend(context: TransactionContext, seconds: number) {
    const job = context.job.handle

    console.log(`suspending job ${job} for ${seconds} seconds`)

    suspendedJobs.add(job)

    const suspendedResult: JobSuspendedResult = {
      status: JobResultStatus.Suspended,
      suspendedUntil: moment().utc().add(seconds, 'seconds').toDate(),
    }

    return Promise.resolve(suspendedResult)
  }
}
