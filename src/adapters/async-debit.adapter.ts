import {
  AbortResult,
  AbortSucceededResult,
  CommitResult,
  IBankAdapter,
  JobResultStatus,
  PrepareResult,
  TransactionContext,
} from "@minka/bridge-sdk";
import {LedgerSdk} from "@minka/ledger-sdk";
import {CoopcentralApiService} from "../coopcentral-api-service";
import {CreateBankTransactionRequest, ServiceError} from "../models";
import {config} from "../config";
import {LedgerErrorReason} from "@minka/bridge-sdk/errors";
import {Database} from "../database";

const usdFactor = 100;
const suspendedJobs = new Map();

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
  constructor(
    private readonly ledger: LedgerSdk,
    private readonly coopcentralApi: CoopcentralApiService,
    private readonly database: Database
  ) {
    super();
  }

  async prepareAsync(context: TransactionContext) {
    const jobId = context.job.handle;
    const job = suspendedJobs.get(jobId);

    if (!job) {
      return;
    }

    if (job.status === "RUNNING") {
      // call coopcentral transaction status
      return;
    }

    job.status = "RUNNING";

    try {
      const businessData = this.database.from('business')
          .get(context.entry.source)

      const transactionRequest = new CreateBankTransactionRequest();
      transactionRequest.idTxEntidad = context.intent.handle;
      transactionRequest.valorTx = `${context.entry.amount}/${usdFactor}`;
      transactionRequest.descripTx = "Prepare";
      transactionRequest.nomOrig = businessData.name || "Test";
      transactionRequest.docProdOrig = businessData.document;
      transactionRequest.prodOrig = businessData.account;
      transactionRequest.prodDest = `${config.COOPCENTRAL_VIRTUAL_ACCOUNT}`;

      const bankTransaction = await this.coopcentralApi.createBankTransaction(
        transactionRequest
      );

      console.log(JSON.stringify(bankTransaction));
      job.status = "COMPLETED";
    } catch (error) {
      if (error instanceof ServiceError) {
        if (error.isPending()) {
          return;
        }

        if (error.isRetryable()) {
          job.status = "PENDING";
          return;
        }
      }

      job.status = "FAILED";
      job.error = error;
    }
  }

  async abortAsync(context: TransactionContext) {
    const jobId = context.job.handle;
    const job = suspendedJobs.get(jobId);

    if (!job) {
      return;
    }

    if (job.status === "RUNNING") {
      // call coopcentral transaction status
      return;
    }

    job.status = "RUNNING";

    try {
      const { wallet } = await this.ledger.wallet.read(context.entry.source);

      const transactionRequest = new CreateBankTransactionRequest();
      transactionRequest.idTxEntidad = context.intent.handle;
      transactionRequest.valorTx = `${context.entry.amount}`;
      transactionRequest.descripTx = "Abort";
      transactionRequest.nomDest = wallet.custom.name || "Test";
      transactionRequest.docProdDest = wallet.custom.document;
      transactionRequest.prodDest = wallet.custom.account;
      transactionRequest.prodOrig = `${config.COOPCENTRAL_VIRTUAL_ACCOUNT}`;

      const bankTransaction = await this.coopcentralApi.createBankTransaction(
        transactionRequest
      );

      console.log(JSON.stringify(bankTransaction));
      job.status = "COMPLETED";
    } catch (error) {
      if (error instanceof ServiceError) {
        if (error.isPending()) {
          return;
        }

        if (error.isRetryable()) {
          job.status = "PENDING";
          return;
        }
      }
    }
  }

  async prepare(context: TransactionContext): Promise<PrepareResult> {
    console.log("prepare called with", context)

    const jobId = context.job.handle;
    const job = suspendedJobs.get(jobId);

    if (!job) {
      suspendedJobs.set(jobId, {
        context,
        status: "PENDING",
      });
    }

    if (this.isContinue(context) && job?.status === "COMPLETED") {
      this.cleanSuspended(context);

      return {
        status: JobResultStatus.Prepared,
        coreId: "112",
        custom: {
          app: "bridge-x",
          method: "AsyncDebitBankAdapter.prepare",
        },
      };
    }

    if (job?.status === "FAILED") {
      this.cleanSuspended(context);

      return {
        status: JobResultStatus.Failed,
        error: {
          reason: LedgerErrorReason.BridgeAccountInsufficientBalance,
          detail: job.error.message
        }
      }
    }

    this.prepareAsync(context);

    return {
      status: JobResultStatus.Suspended,
      suspendedUntil: new Date(Date.now() + 5000),
    };
  }

  async abort(context: TransactionContext): Promise<AbortResult> {
    console.log("debit abort called");

    const jobId = context.job.handle;
    const job = suspendedJobs.get(jobId);

    if (!job) {
      suspendedJobs.set(jobId, {
        context,
        status: "PENDING",
      });
    }

    if (this.isContinue(context) && job?.status === "COMPLETED") {
      this.cleanSuspended(context);

      const result: AbortSucceededResult = {
        status: JobResultStatus.Aborted,
        coreId: "667",
        custom: {
          app: "bridge-x",
          method: "AsyncDebitBankAdapter.abort",
        },
      };
    }

    this.abortAsync(context);

    return {
      status: JobResultStatus.Suspended,
      suspendedUntil: new Date(Date.now() + 5000),
    };
  }

  async commit(context: TransactionContext): Promise<CommitResult> {
    console.log("debit commit called");

    return {
      status: JobResultStatus.Committed,
      coreId: "112",
      custom: {
        app: "bridge-x",
        method: "AsyncDebitBankAdapter.prepare",
      },
    } as CommitResult;
  }

  protected isContinue(context: TransactionContext) {
    return suspendedJobs.has(context.job.handle);
  }

  protected cleanSuspended(context: TransactionContext) {
    suspendedJobs.delete(context.job.handle);
  }
}
