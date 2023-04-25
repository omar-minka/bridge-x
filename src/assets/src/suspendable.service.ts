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
import { config } from '../../config';


export class SuspendableBankAdapter extends IBankAdapter {
  async prepare(context: TransactionContext): Promise<PrepareResult> {
    console.log('Prepare here')
    const result: PrepareSucceededResult = {
      status: JobResultStatus.Prepared,
      custom: {
        app: config.BRIDGE_APP,
        method: 'AsyncDebitBankAdapter.abort',
      },
    }
    return result
  }

  async abort(context: TransactionContext): Promise<AbortResult> {
    console.log('Abort here')
    const result: AbortSucceededResult = {
      status: JobResultStatus.Aborted,
      custom: {
        app: config.BRIDGE_APP,
        method: 'AsyncDebitBankAdapter.abort',
      },
    }

    return result
  }

  async commit(context: TransactionContext): Promise<CommitResult> {
    console.log('Commit here')
    const result: CommitSucceededResult = {
      status: JobResultStatus.Committed,
      custom: {
        app: config.BRIDGE_APP,
        method: 'AsyncDebitBankAdapter.commit',
      },
    }

    return result
  }

  protected suspend(context: TransactionContext, seconds: number) {
    const job = context.job.handle

    console.log(`suspending job ${job} for ${seconds} seconds`)

    const suspendedResult: JobSuspendedResult = {
      status: JobResultStatus.Suspended,
      suspendedUntil: moment().utc().add(seconds, 'seconds').toDate(),
    }

    return suspendedResult
  }
}
