import {
  AbortResult,
  AbortSucceededResult,
  CommitResult,
  CommitSucceededResult,
  JobResultStatus,
  PrepareFailedResult,
  PrepareResult,
  PrepareSucceededResult,
  TransactionContext,
} from '@minka/bridge-sdk'
import { LedgerErrorReason } from '@minka/bridge-sdk/errors'
import { ClaimAction, TransferClaim } from '@minka/bridge-sdk/types'
import { config } from '../../config'
import { CryptoNetwork } from './network.service'
import { SuspendableBankAdapter } from './suspendable.service'


/**
 * Demo implementation of async credit bank adapter
 * which on first method execution will suspend job
 * for couple of seconds. After that time, processor
 * will invoke method for the second time and method
 * will return successful results.
 */
export class AsyncCreditBankAdapter extends SuspendableBankAdapter {
  constructor(
    protected readonly assetManager: CryptoNetwork
  ) {
    super()
  }

  async prepare(context: TransactionContext): Promise<PrepareResult> {
    const intent = context.intent
    const claims = intent.claims
    // Claims validation
    let requiredBalance = 0
    let txns: any[] = []
    for (const claim of claims) {
      let error: PrepareFailedResult['error'];
      if (claim.action !== ClaimAction.Transfer) {
        error = {
          reason: LedgerErrorReason.BridgeAccountLimitExceeded,
          detail: 'Only Transfer is supported',
        }
      } else if (claim.symbol !== this.assetManager.config.symbol) {
        error = {
          reason: LedgerErrorReason.BridgeIntentUnrelated,
          detail: `Only ${this.assetManager.config.symbol} is supported`,
        }
      } else if (await this.assetManager.validateAddress(claim.target) === false) {
        error = {
          reason: LedgerErrorReason.BridgeAccountNotFound,
          detail: `Invalid ${this.assetManager.config.symbol} address`,
        }
      }
      if (error) {
        const result: PrepareFailedResult = {
          status: JobResultStatus.Failed,
          error,
          custom: {
            app: config.BRIDGE_APP,
            method: 'SyncCreditBankAdapter.prepare',
          }
        }
        return result
      }
      console.log(claim)
      requiredBalance += claim.amount
      txns.push({
        to: await this.assetManager.validateAddress((claim as TransferClaim).target),
        amount: claim.amount
      })
    }
    console.log('Transactions to do', txns)
    // Balance validation
    const balance = await this.assetManager.checkBalance()
    if (balance < requiredBalance) {
      const result: PrepareFailedResult = {
        status: JobResultStatus.Failed,
        error: {
          reason: LedgerErrorReason.BridgeAccountInsufficientBalance,
          detail: `Insufficient balance. Required ${requiredBalance}, available ${balance}`,
        },
        custom: {
          app: config.BRIDGE_APP,
          method: 'SyncCreditBankAdapter.prepare',
        }
      }
      return result
    }
    console.log('Balance is', balance, 'required', requiredBalance)
    // Send the transaction back to the testnet here
    for (const txn of txns) {
      await this.assetManager.sendTransaction(txn.to, txn.amount)
    }
    const result: PrepareSucceededResult = {
      status: JobResultStatus.Prepared,
      /**
       * Maybe allow only one transaction?
       * Compose a coreId from all transactions?
       */
      custom: {
        app: config.BRIDGE_APP,
        method: 'AsyncCreditBankAdapter.prepare',
      },
    }
    return result
  }

  async abort(context: TransactionContext): Promise<AbortResult> {
    const result: AbortSucceededResult = {
      status: JobResultStatus.Aborted,
      custom: {
        app: config.BRIDGE_APP,
        method: 'AsyncCreditBankAdapter.abort',
      },
    }
    return result
  }

  async commit(context: TransactionContext): Promise<CommitResult> {
    const result: CommitSucceededResult = {
      status: JobResultStatus.Committed,
      custom: {
        app: config.BRIDGE_APP,
        method: 'AsyncCreditBankAdapter.commit',
      },
    }
    return result
  }
}
