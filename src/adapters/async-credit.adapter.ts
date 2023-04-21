import {
  AbortResult,
  AbortSucceededResult,
  CommitResult,
  IBankAdapter,
  JobResultStatus,
  PrepareResult,
  TransactionContext,
} from "@minka/bridge-sdk";
import { LedgerErrorReason } from "@minka/bridge-sdk/errors";
import { Database } from "../database";
import { prepare, abort } from "../transfer/credit";

export class AsyncCreditBankAdapter extends IBankAdapter {
  private database: Database;

  constructor() {
    super();

    this.database = Database.getInstance();
  }

  async prepare(context: TransactionContext): Promise<PrepareResult> {
    console.log("credit prepare called with", JSON.stringify(context));

    const jobId = context.job.handle;
    const job = this.database.from("jobs").get(jobId);

    if (!job) {
      this.database.set("jobs", jobId, {
        id: jobId,
        context,
        status: "PENDING",
        run: prepare,
        args: [
          context.job.handle,
          context.entry.target,
          context.command.handle,
          context.entry.amount,
        ],
      });
    }

    if (job?.status === "COMPLETED") {
      this.database.delete("jobs", jobId);

      return {
        status: JobResultStatus.Prepared,
        coreId: "112",
        custom: {
          app: "bridge-x",
          method: "AsyncCreditBankAdapter.prepare",
        },
      };
    }

    if (job?.status === "FAILED") {
      this.database.delete("jobs", jobId);

      return {
        status: JobResultStatus.Failed,
        error: {
          reason: LedgerErrorReason.BridgeAccountInsufficientBalance,
          detail: job.error.message,
        },
      };
    }

    return {
      status: JobResultStatus.Suspended,
      suspendedUntil: new Date(Date.now() + 5000),
    };
  }

  async abort(context: TransactionContext): Promise<AbortResult> {
    console.log("credit abort called", JSON.stringify(context));

    const jobId = context.job.handle;
    const job = this.database.from("jobs").get(jobId);

    if (!job) {
      this.database.set("jobs", jobId, {
        id: jobId,
        context,
        status: "PENDING",
        run: abort,
        args: [
          context.job.handle,
          context.entry.target,
          context.command.handle,
          context.entry.amount,
        ],
      });
    }

    if (job?.status === "COMPLETED") {
      this.database.delete("jobs", jobId);

      return {
        status: JobResultStatus.Aborted,
        coreId: "667",
        custom: {
          app: "bridge-x",
          method: "AsyncCreditBankAdapter.abort",
        },
      } as AbortSucceededResult;
    }

    return {
      status: JobResultStatus.Suspended,
      suspendedUntil: new Date(Date.now() + 5000),
    };
  }

  async commit(context: TransactionContext): Promise<CommitResult> {
    console.log("credit commit called", JSON.stringify(context));

    return {
      status: JobResultStatus.Committed,
      coreId: "112",
      custom: {
        app: "bridge-x",
        method: "AsyncCreditBankAdapter.commit",
      },
    } as CommitResult;
  }
}
