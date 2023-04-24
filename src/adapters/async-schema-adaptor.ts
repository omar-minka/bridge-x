import {
  AbortResult,
  CommitResult,
  IBankAdapter,
  JobResultStatus,
  JobSuspendedResult,
  PrepareResult,
  TransactionContext,
} from '@minka/bridge-sdk'
import { LedgerErrorReason } from '@minka/bridge-sdk/errors'
import moment from 'moment'
import { Adaptors } from '../assets'
import { ClaimAction } from '@minka/bridge-sdk/ledger-sdk/types'


const suspendedJobs = new Set()

/**
 * Demo implementation of async credit bank adapter
 * which on first method execution will suspend job
 * for couple of seconds. After that time, processor
 * will invoke method for the second time and method
 * will return successful results.
 */
export class AsyncSchemaBankAdapter extends IBankAdapter {
  getSchema() : 'credit' | 'debit' {
    return 'credit'
  }
  async processStatus(status: 'prepare' | 'abort' | 'commit', context: TransactionContext): Promise<PrepareResult | CommitResult | AbortResult> {
    if (this.isContinue(context)) {
      this.cleanSuspended(context)
      /**
       * We could validate per claim, but for now let's
       * just do it for the entire transaction :)
       */
      const claims = context.intent?.claims || []
      const firstClaim = claims[0]
      if( !firstClaim ){
        // If there are no claims, we can't do anything
        return Promise.resolve({
          status: JobResultStatus.Prepared,
        })
      }

      let isExchange = false
      if( firstClaim.action === ClaimAction.Transfer ){
        const parts = firstClaim.target.split('@')
        isExchange = parts[1] === 'exchange'
      }

      if(isExchange || context.intent?.custom?.exchange){
        const response = Adaptors.exchange?.[this.getSchema()]?.[status](context)
        console.log('Adaptor: ', response)
        return response
      }

      const Adaptor = Adaptors?.[firstClaim.symbol]?.[this.getSchema()]
      console.log(firstClaim.symbol, this.getSchema())
      if( Adaptor ){
        return Adaptor[status](context)
      }
      

      // We have no way to prepare this, so we'll abort
      return Promise.resolve({
        status: JobResultStatus.Failed,
        error: {
          reason: LedgerErrorReason.BridgeIntentUnrelated,
          detail: 'This bridge can\'t process this transaction'
        }
      })
    } else {
      return this.suspend(context, 3)
    }
  }

  async prepare(context: TransactionContext): Promise<PrepareResult>{
    return this.processStatus('prepare', context) as Promise<PrepareResult>
  }

  async commit(context: TransactionContext): Promise<CommitResult>{
    return this.processStatus('commit', context) as Promise<CommitResult>
  }

  async abort(context: TransactionContext): Promise<AbortResult>{
    return this.processStatus('abort', context) as Promise<AbortResult>
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
