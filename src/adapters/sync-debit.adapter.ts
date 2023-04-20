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
 * Demo implementation of sync debit bank adapter.
 * Methods will log incoming transaction context and
 * return successful results.
 */
export class SyncDebitBankAdapter extends IBankAdapter {
  prepare(context: TransactionContext): Promise<PrepareResult> {
    console.log('debit prepare called')
    console.log(JSON.stringify(context, null, 2))

    const result: PrepareSucceededResult = {
      status: JobResultStatus.Prepared,
      coreId: '112',
      custom: {
        app: 'bridge-x',
        method: 'SyncDebitBankAdapter.prepare',
      },
    }

    return Promise.resolve(result)
  }

  abort(context: TransactionContext): Promise<AbortResult> {
    console.log('debit abort called')
    console.log(JSON.stringify(context, null, 2))

    const result: AbortSucceededResult = {
      status: JobResultStatus.Aborted,
      coreId: '667',
      custom: {
        app: 'bridge-x',
        method: 'SyncDebitBankAdapter.abort',
      },
    }

    return Promise.resolve(result)
  }

  commit(context: TransactionContext): Promise<CommitResult> {
    console.log('debit commit called')
    console.log(JSON.stringify(context, null, 2))

    const result: CommitSucceededResult = {
      status: JobResultStatus.Committed,
      coreId: '889',
      custom: {
        app: 'bridge-x',
        method: 'SyncDebitBankAdapter.commit',
      },
    }

    return Promise.resolve(result)
  }
}
