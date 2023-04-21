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
import { prepare, abort } from "../transfer/debit";

export class AsyncDebitBankAdapter extends IBankAdapter {
  private database: Database;

  constructor() {
    super();

    this.database = Database.getInstance();
  }

  async prepare(context: TransactionContext): Promise<PrepareResult> {
    console.log("prepare called with", JSON.stringify(context));

    const jobId = context.job.handle;
    const job = this.database.from("jobs").get(jobId);

    if (!job) {
      this.database.set("jobs", jobId, {
        context,
        status: "PENDING",
      });
    }

    if (job?.status === "COMPLETED") {
      this.database.delete("jobs", jobId);

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
      this.database.delete("jobs", jobId);

      return {
        status: JobResultStatus.Failed,
        error: {
          reason: LedgerErrorReason.BridgeAccountInsufficientBalance,
          detail: job.error.message,
        },
      };
    }

    prepare(
      context.job.handle,
      context.entry.source,
      context.intent.handle,
      context.entry.amount
    );

    return {
      status: JobResultStatus.Suspended,
      suspendedUntil: new Date(Date.now() + 5000),
    };
  }

  async abort(context: TransactionContext): Promise<AbortResult> {
    console.log("debit abort called", JSON.stringify(context));

    const jobId = context.job.handle;
    const job = this.database.from("jobs").get(jobId);

    if (!job) {
      this.database.set("jobs", jobId, {
        context,
        status: "PENDING",
      });
    }

    if (job?.status === "COMPLETED") {
      this.database.delete("jobs", jobId);

      const result: AbortSucceededResult = {
        status: JobResultStatus.Aborted,
        coreId: "667",
        custom: {
          app: "bridge-x",
          method: "AsyncDebitBankAdapter.abort",
        },
      };
    }

    abort(
      context.job.handle,
      context.entry.source,
      context.intent.handle,
      context.entry.amount
    );

    return {
      status: JobResultStatus.Suspended,
      suspendedUntil: new Date(Date.now() + 5000),
    };
  }

  async commit(context: TransactionContext): Promise<CommitResult> {
    console.log("debit commit called", JSON.stringify(context));

    return {
      status: JobResultStatus.Committed,
      coreId: "112",
      custom: {
        app: "bridge-x",
        method: "AsyncDebitBankAdapter.prepare",
      },
    } as CommitResult;
  }
}
