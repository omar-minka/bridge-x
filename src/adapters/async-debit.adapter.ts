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
  PrepareFailedResult,
} from '@minka/bridge-sdk'
import { LedgerErrorReason } from '@minka/bridge-sdk/errors'
import { ethereumNetwork } from '../btc/main'
import moment from 'moment'
import { config } from '../config'

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
  async prepare(context: TransactionContext): Promise<PrepareResult> {
    console.log('debit prepare called')
    console.log( context.intent.handle, context.intent.custom?.txnId )

    if (this.isContinue(context)) {
      this.cleanSuspended(context)

      const intent = context.intent
      const txnId = intent.custom?.txnId
      const status = await ethereumNetwork.getTransactionStatus(txnId)
      if( !status ){
        const result: PrepareFailedResult = {
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
        return Promise.resolve(result)
      }
      if( status !== 'confirmed' ){
        return this.suspend(context, 10)
      }
      const result: PrepareSucceededResult = {
        status: JobResultStatus.Prepared,
        coreId: txnId,
        custom: {
          app: config.BRIDGE_APP,
          method: 'AsyncDebitBankAdapter.prepare',
        },
      }
      return Promise.resolve(result)
    } else {
      return this.suspend(context, 10)
    }
  }

  abort(context: TransactionContext): Promise<AbortResult> {
    console.log('debit abort called')
    console.log( context.intent.handle, context.intent.custom?.txnId )

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
      return this.suspend(context, 10)
    }
  }

  commit(context: TransactionContext): Promise<CommitResult> {
    console.log('debit commit called')
    console.log( context.intent.handle, context.intent.custom?.txnId )

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
