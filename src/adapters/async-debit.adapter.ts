import {
  AbortResult,
  AbortSucceededResult,
  CommitResult,
  CommitSucceededResult,
  IBankAdapter,
  JobResultStatus, JobSuspendedResult,
  PrepareResult,
  TransactionContext,
} from '@minka/bridge-sdk'
import {LedgerSdk} from "@minka/ledger-sdk";
import {CoopcentralApiService} from "../coopcentral-api-service";
import {AccountDetailsRequest, CheckBankAccountRequest, CreateBankTransactionRequest, ServiceError } from "../models";
import { config } from '../config'
import {PrepareFailedResult} from "@minka/bridge-sdk/src/bank/bank-adapter.service";
import {LedgerWallet} from "@minka/bridge-sdk/types";

const suspendedJobs = new Map()

function createBankTransactionRequest(context: TransactionContext, wallet: any) {
  const transactionRequest = new CreateBankTransactionRequest()
  transactionRequest.idTxEntidad = context.intent.handle
  transactionRequest.valorTx = `${context.entry.amount}`
  transactionRequest.descripTx = 'Testing'

  const virtualAccount = `${config.COOPCENTRAL_VIRTUAL_ACCOUNT}`

  transactionRequest.nomOrig = wallet.custom.name || 'Test'
  transactionRequest.docProdOrig = wallet.custom.document
  transactionRequest.prodOrig = wallet.custom.account
  transactionRequest.prodDest = virtualAccount

  return transactionRequest
}

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

  constructor(private readonly ledger: LedgerSdk, private readonly coopcentralApi: CoopcentralApiService) {
    super();


  }

  async prepareAsync(context: TransactionContext) {
    const jobId = context.job.handle
    const job = suspendedJobs.get(jobId)


    if (!job || job.status === 'RUNNING') {
      return
    }

    job.status = 'RUNNING'

    const { wallet } = await this.ledger.wallet.read(context.entry.source)

    try {
      let bankAccountResult = await this.coopcentralApi.checkBankAccount(
          new CheckBankAccountRequest(
              wallet.custom.account,
              wallet.custom.document,
              wallet.custom.documentType,
          ),
      )

      let bankAccountDetails = await this.coopcentralApi.fetchAccountDetails(
          new AccountDetailsRequest(
              wallet.custom.document,
              wallet.custom.documentType,
          ),
      )

      console.log(JSON.stringify(bankAccountDetails), JSON.stringify(bankAccountResult))
    } catch (error) {
      job.status = 'FAILED'
      job.error = error
    }

    job.status = 'COMPLETED'
  }

  async commitAsync(context: TransactionContext) {
    const jobId = context.job.handle
    const job = suspendedJobs.get(jobId)

    if (!job) {
      return
    }

    if (job.status === 'RUNNING') {
      // call coopcentral transaction status
      return
    }

    job.status = 'RUNNING'

    const { wallet } = await this.ledger.wallet.read(context.entry.source)

    try {
      const transactionRequest = createBankTransactionRequest(context, wallet)
      const bankTransaction = await this.coopcentralApi.createBankTransaction(
          transactionRequest,
      )

      console.log(JSON.stringify(bankTransaction))
      job.status = 'COMPLETED'
    } catch (error) {
      if (error instanceof ServiceError) {
        if (error.isPending()) {
          return
        }
      }

      job.status = 'PENDING'
    }
  }

  async prepare(context: TransactionContext): Promise<PrepareResult> {
    console.log(JSON.stringify(context))

    const jobId = context.job.handle
    const job = suspendedJobs.get(jobId)

    if (!job) {
      suspendedJobs.set(jobId, {
        context,
        status: 'PENDING',
      })
    }

    if (this.isContinue(context) && job?.status === 'COMPLETED') {
      this.cleanSuspended(context)

      return {
        status: JobResultStatus.Prepared,
        coreId: '112',
        custom: {
          app: 'bridge-x',
          method: 'AsyncDebitBankAdapter.prepare',
        },
      }
    }

    if (job?.status === 'FAILED') {
      this.cleanSuspended(context)

      return {
        status: JobResultStatus.Failed,
        error: job.error,
      } as PrepareFailedResult
    }

    this.prepareAsync(context)

    return {
      status: JobResultStatus.Suspended,
      suspendedUntil: new Date(Date.now() + 5000)
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

  async commit(context: TransactionContext): Promise<CommitResult> {
    console.log(JSON.stringify(context))

    const jobId = context.job.handle
    const job = suspendedJobs.get(jobId)

    if (!job) {
      suspendedJobs.set(jobId, {
        context,
        status: 'PENDING',
      })
    }

    if (this.isContinue(context) && job?.status === 'COMPLETED') {
      this.cleanSuspended(context)

      return {
        status: JobResultStatus.Committed,
        coreId: '112',
        custom: {
          app: 'bridge-x',
          method: 'AsyncDebitBankAdapter.prepare',
        },
      } as CommitResult
    }

    this.commitAsync(context)

    return {
      status: JobResultStatus.Suspended,
      suspendedUntil: new Date(Date.now() + 10000)
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

    suspendedJobs.set(job, context)

    const suspendedResult: JobSuspendedResult = {
      status: JobResultStatus.Suspended,
    }

    return Promise.resolve(suspendedResult)
  }
}
