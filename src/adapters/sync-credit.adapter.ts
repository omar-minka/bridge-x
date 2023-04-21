import {
  AbortResult,
  AbortSucceededResult,
  CommitResult,
  CommitSucceededResult,
  IBankAdapter,
  JobResultStatus,
  PrepareFailedResult,
  PrepareResult,
  PrepareSucceededResult,
  TransactionContext,
} from '@minka/bridge-sdk'
import { LedgerErrorReason } from '@minka/bridge-sdk/errors'
import { ClaimAction } from '@minka/bridge-sdk/ledger-sdk/types'
import { TransferClaim } from '@minka/bridge-sdk/types'

export class SyncCreditBankAdapter extends IBankAdapter {
  prepare(context: TransactionContext): Promise<PrepareResult> {
    console.log('credit prepare called')
    console.log(JSON.stringify(context, null, 2))

    const result: PrepareSucceededResult = {
      status: JobResultStatus.Prepared,
      coreId: '3123123',
      custom: {
        app: 'bridge-x',
        method: 'SyncCreditBankAdapter.prepare',  
      },
    }
    console.log('credit prepare result', result)
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
