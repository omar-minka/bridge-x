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
import { JobStatus } from '@minka/bridge-sdk/src/job/types'


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
      console.log(`${status} started`)
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
      
      // Default adaptor based on firstClaim's symbol
      let Adaptor = Adaptors?.[firstClaim.symbol]

      let isExchange = false
      const exchangeWallets = [
        'btc.fx',
        'eth.fx',
        'cop.fx',
        'usd.fx',
      ]

      if( firstClaim.action === ClaimAction.Transfer ){
        const parts = firstClaim.target.split('@')
        isExchange = exchangeWallets.includes(parts[1]) || exchangeWallets.includes(firstClaim.target)
      }

      if(isExchange || context.intent?.custom?.exchange){
        Adaptor = Adaptors?.exchange
      }

      try{
        const response = await Adaptor[this.getSchema()][status](context)
        // Ledger doesn't have all bridge error codes, so we replace if any
        if( response?.error?.reason ){
          response.error.reason = LedgerErrorReason.BridgeUnexpectedError
        }
        return Promise.resolve(response)
      } catch (error){
        console.log('Adaptor', Adaptor)
        console.log(error)
      }
      
      // We have no way to prepare this, so we'll abort
      return {
        status: JobResultStatus.Failed,
        error: {
          reason: LedgerErrorReason.BridgeIntentUnrelated,
          detail: 'This bridge can\'t process this transaction'
        }
      }
    } else {
      return this.suspend(context, 3)
    }
  }

  async prepare(context: TransactionContext): Promise<PrepareResult>{
    const result = await this.processStatus('prepare', context) as PrepareResult
    console.log(`Final response for prepare:`, result)
    return Promise.resolve(result)
  }

  async commit(context: TransactionContext): Promise<CommitResult>{
    const result = await this.processStatus('commit', context) as CommitResult
    console.log(`Final response for commit:`, result)
    return Promise.resolve(result)
  }

  async abort(context: TransactionContext): Promise<AbortResult>{
    const result = await this.processStatus('commit', context) as AbortResult
    console.log(`Final response for abort:`, result)
    return Promise.resolve(result)
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

    return suspendedResult
  }
}
