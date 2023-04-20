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
import moment from 'moment'

const suspendedJobs = new Set()

/**
 * Demo implementation of async credit bank adapter
 * which on first method execution will suspend job
 * for couple of seconds. After that time, processor
 * will invoke method for the second time and method
 * will return successful results.
 */
export class AsyncCreditBankAdapter extends IBankAdapter {
  prepare(context: TransactionContext): Promise<PrepareResult> {
    console.log('credit prepare called')
    console.log(JSON.stringify(context, null, 2))

    if (this.isContinue(context)) {
      this.cleanSuspended(context)

      const result: PrepareSucceededResult = {
        status: JobResultStatus.Prepared,
        coreId: '111',
        custom: {
          app: 'bridge-x',
          method: 'AsyncCreditBankAdapter.prepare',
        },
      }

      return Promise.resolve(result)
    } else {
      return this.suspend(context, 10)
    }
  }

  abort(context: TransactionContext): Promise<AbortResult> {
    console.log('credit abort called')
    console.log(JSON.stringify(context, null, 2))

    if (this.isContinue(context)) {
      this.cleanSuspended(context)

      const result: AbortSucceededResult = {
        status: JobResultStatus.Aborted,
        coreId: '666',
        custom: {
          app: 'bridge-x',
          method: 'AsyncCreditBankAdapter.abort',
        },
      }

      return Promise.resolve(result)
    } else {
      return this.suspend(context, 2)
    }
  }

  commit(context: TransactionContext): Promise<CommitResult> {
    console.log('credit commit called')
    console.log(JSON.stringify(context, null, 2))

    if (this.isContinue(context)) {
      this.cleanSuspended(context)

      const result: CommitSucceededResult = {
        status: JobResultStatus.Committed,
        coreId: '888',
        custom: {
          app: 'bridge-x',
          method: 'AsyncCreditBankAdapter.commit',
        },
      }

      return Promise.resolve(result)
    } else {
      return this.suspend(context, 5)
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
