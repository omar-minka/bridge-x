import {
  AbortResult,
  AbortSucceededResult,
  CommitResult,
  CommitSucceededResult,
  IBankAdapter,
  JobResultStatus,
  JobSuspendedResult,
  PrepareFailedResult,
  PrepareResult,
  PrepareSucceededResult,
  TransactionContext,
} from '@minka/bridge-sdk'
import { LedgerErrorReason } from '@minka/bridge-sdk/errors'
import { ClaimAction, TransferClaim } from '@minka/bridge-sdk/types'
import moment from 'moment'
import { BitcoinNetwork } from '../btc/main'


const suspendedJobs = new Set()

/**
 * Demo implementation of async credit bank adapter
 * which on first method execution will suspend job
 * for couple of seconds. After that time, processor
 * will invoke method for the second time and method
 * will return successful results.
 */
export class AsyncCreditBankAdapter extends IBankAdapter {
  async prepare(context: TransactionContext): Promise<PrepareResult> {
    console.log('credit prepare called')
    console.log(JSON.stringify(context, null, 2))

    if (this.isContinue(context)) {
      this.cleanSuspended(context)
      const intent = context.intent

      const claims = intent.claims

      // Claims validation
      let requiredBalance = 0
      let txns : any[] = []
      for(const claim of claims) {
        let error : PrepareFailedResult['error'];
        if( claim.action !== ClaimAction.Transfer ){
          error = {
            reason: LedgerErrorReason.BridgeAccountLimitExceeded,
            detail: 'Only Transfer is supported',
          }
        } else if( claim.symbol !== 'btc' ){
          error = {
            reason: LedgerErrorReason.BridgeIntentUnrelated,
            detail: 'Only BTC is supported',
          }
        } else if( await BitcoinNetwork.validateAddress(claim.source) === false ){
          error = {
            reason: LedgerErrorReason.BridgeAccountNotFound,
            detail: 'Invalid bitcoin address',
          }
        }
        if( error ){
          const result: PrepareFailedResult = {
            status: JobResultStatus.Failed,
            error,
            custom: {
              app: 'bridge-x',
              method: 'SyncCreditBankAdapter.prepare',
            }
          }
          return Promise.resolve(result)
        }
        requiredBalance += claim.amount
        txns.push({
          to: await BitcoinNetwork.validateAddress((claim as TransferClaim).target),
          amount: claim.amount
        })
      }

      console.log('Transactions to do', txns)

      // Balance validation
      const balance = await BitcoinNetwork.checkBalance()
      if( balance < requiredBalance ){
        const result: PrepareFailedResult = {
          status: JobResultStatus.Failed,
          error: {
            reason: LedgerErrorReason.BridgeAccountInsufficientBalance,
            detail: `Insufficient balance. Required ${requiredBalance}, available ${balance}`,
          },
          custom: {
            app: 'bridge-x',
            method: 'SyncCreditBankAdapter.prepare',
          }
        }
        return Promise.resolve(result)
      }

      console.log('Balance is', balance, 'required', requiredBalance)

      // Send the transaction back to the testnet here
      for(const txn of txns){
        await BitcoinNetwork.sendTransaction(txn.to, txn.amount)
      }


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
