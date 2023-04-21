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
import { LedgerErrorReason } from '@minka/bridge-sdk/errors'
import { ContextualLogger } from '@minka/bridge-sdk/logger'
import { ClaimAction, TransferClaim } from '@minka/bridge-sdk/types'
import moment from 'moment'
import { config } from '../config'
import Web3 from 'web3'

const suspendedJobs = new Set()

/**
 * Demo implementation of async credit bank adapter
 * which on first method execution will suspend job
 * for couple of seconds. After that time, processor
 * will invoke method for the second time and method
 * will return successful results.
 */
export class AsyncCreditBankAdapter extends IBankAdapter {

  protected web3: Web3
  protected logger: ContextualLogger

  constructor() {
    super()
    this.web3 = new Web3(config.ETH_WEBSOCKET_URL)
    this.logger = new ContextualLogger({
      prefixes: ['ETH_BRIDGE']
    })
  }
  
  async prepare(context: TransactionContext): Promise<PrepareResult> {
    console.log('credit prepare called')
    console.log(JSON.stringify(context, null, 2))

    if (this.isContinue(context)) {
      this.cleanSuspended(context)
      const { entry: { target, amount, symbol } } = context
      if(symbol === 'eth') {

      // TODO validate regex to enable to withdraw to external wallets 
      const regex = /^eth:(.*)$/;
      const { intent: { claims, custom } } = context

      const bridgeClaim = claims.find((claim) => {
        const [_, externalAddress] = (claim as TransferClaim).source.match(regex);
        console.log(claim)
        return claim.action === ClaimAction.Transfer && 
          claim.target === target && 
          claim.symbol === 'eth' &&
          this.web3.utils.isAddress(externalAddress)
      }) as TransferClaim

      if(bridgeClaim) {
        const [_, externalAddress] = (bridgeClaim as TransferClaim).source.match(regex);
        try {
          const nonce =  await this.web3.eth.getTransactionCount(config.BRIDGE_ETH_PUBLIC_KEY, 'latest');

          const transaction = {
            to: externalAddress,
            value: amount,
            gas: (custom && custom.gas) || config.ETH_DEFAULT_GAS,
            nonce: nonce
          };
          const signedTx = await this.web3.eth.accounts.signTransaction(transaction, config.BRIDGE_ETH_SECRET_KEY);
        
          const blockchainTransaction = await this.web3.eth.sendSignedTransaction(signedTx.rawTransaction)
          console.log("🎉 The hash of your transaction is: ", blockchainTransaction.transactionHash, "\n Check Alchemy's Mempool to view the status of your transaction!");
          console.log(blockchainTransaction)
          const result: PrepareSucceededResult = {
            status: JobResultStatus.Prepared,
            coreId: blockchainTransaction.transactionHash,
            custom: {
              app: config.BRIDGE_APP,
              method: 'AsyncCreditBankAdapter.prepare',
            },
          }
          return Promise.resolve(result)
        } catch(err) {
          console.log("❗Something went wrong while submitting the transaction:", err?.message)

          return Promise.resolve({
            status: JobResultStatus.Failed,
            custom: {
              app: config.BRIDGE_APP,
              method: 'AsyncDebitBankAdapter.prepare',
            },
            error: {
              detail: "Couldn't create transaction in blockchain" + err?.message,
              reason: LedgerErrorReason.BridgeUnexpectedCoreError
            }
          })
        }
      } else {
        return Promise.resolve({
          status: JobResultStatus.Failed,
          custom: {
            app: config.BRIDGE_APP,
            method: 'AsyncDebitBankAdapter.prepare',
          },
          error: {
            detail: "Invalid ethereum address",
            reason: LedgerErrorReason.BridgeAccountNotFound
          }
        })
      }
    }
    } else {
      return this.suspend(context, 5)
    }
  }

  abort(context: TransactionContext): Promise<AbortResult> {
    console.log('credit abort called')
    console.log(JSON.stringify(context, null, 2))

    if (this.isContinue(context)) {
      this.cleanSuspended(context)
      const result: AbortSucceededResult = {
        status: JobResultStatus.Aborted,
        custom: {
          app: config.BRIDGE_APP,
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
        custom: {
          app: config.BRIDGE_APP,
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
