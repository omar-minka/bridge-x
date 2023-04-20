import {
  AbortResult,
  AbortSucceededResult,
  CommitResult,
  CommitSucceededResult,
  IBankAdapter,
  JobResultStatus,
  PrepareResult,
  PrepareSucceededResult,
  TransactionContext,
} from '@minka/bridge-sdk'

/**
 * Demo implementation of sync credit bank adapter.
 * Methods will log incoming transaction context and
 * return successful results.
 */
export class SyncCreditBankAdapter extends IBankAdapter {
  prepare(context: TransactionContext): Promise<PrepareResult> {
    console.log('credit prepare called')
    console.log(JSON.stringify(context, null, 2))

    const result: PrepareSucceededResult = {
      status: JobResultStatus.Prepared,
      coreId: '111',
      custom: {
        app: 'bridge-x',
        method: 'SyncCreditBankAdapter.prepare',
      },
    }

    return Promise.resolve(result)
  }

  abort(context: TransactionContext): Promise<AbortResult> {
    console.log('credit abort called')
    console.log(JSON.stringify(context, null, 2))

    const result: AbortSucceededResult = {
      status: JobResultStatus.Aborted,
      coreId: '666',
      custom: {
        app: 'bridge-x',
        method: 'SyncCreditBankAdapter.abort',
      },
    }

    return Promise.resolve(result)
  }

  commit(context: TransactionContext): Promise<CommitResult> {
    console.log('credit commit called')
    console.log(JSON.stringify(context, null, 2))

    const result: CommitSucceededResult = {
      status: JobResultStatus.Committed,
      coreId: '888',
      custom: {
        app: 'bridge-x',
        method: 'SyncCreditBankAdapter.commit',
      },
    }

    return Promise.resolve(result)
  }
}
