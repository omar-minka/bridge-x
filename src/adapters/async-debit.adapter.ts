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
  prepare(context: TransactionContext): Promise<PrepareResult> {
    console.log('debit prepare called')
    console.log(JSON.stringify(context, null, 2))

    if (this.isContinue(context)) {
      this.cleanSuspended(context)

      const result: PrepareSucceededResult = {
        status: JobResultStatus.Prepared,
        coreId: '112',
        custom: {
          app: 'bridge-x',
          method: 'AsyncDebitBankAdapter.prepare',
        },
      }

      return Promise.resolve(result)
    } else {
      return this.suspend(context)
    }
  }

  abort(context: TransactionContext): Promise<AbortResult> {
    console.log('debit abort called')
    console.log(JSON.stringify(context, null, 2))

    if (this.isContinue(context)) {
      this.cleanSuspended(context)

      const result: AbortSucceededResult = {
        status: JobResultStatus.Aborted,
        coreId: '667',
        custom: {
          app: 'bridge-x',
          method: 'AsyncDebitBankAdapter.abort',
        },
      }

      return Promise.resolve(result)
    } else {
      return this.suspend(context)
    }
  }

  commit(context: TransactionContext): Promise<CommitResult> {
    console.log('debit commit called')
    console.log(JSON.stringify(context, null, 2))

    if (this.isContinue(context)) {
      this.cleanSuspended(context)

      const result: CommitSucceededResult = {
        status: JobResultStatus.Committed,
        coreId: '889',
        custom: {
          app: 'bridge-x',
          method: 'AsyncDebitBankAdapter.commit',
        },
      }

      return Promise.resolve(result)
    } else {
      return this.suspend(context)
    }
  }

  protected isContinue(context: TransactionContext) {
    return suspendedJobs.has(context.job.handle)
  }

  protected cleanSuspended(context: TransactionContext) {
    suspendedJobs.delete(context.job.handle)
  }

  protected suspend(context: TransactionContext) {
    const job = context.job.handle

    console.log(`suspending indefinitely job ${job}`)

    suspendedJobs.add(job)

    const suspendedResult: JobSuspendedResult = {
      status: JobResultStatus.Suspended,
    }

    return Promise.resolve(suspendedResult)
  }
}
