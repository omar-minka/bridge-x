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
    console.log(
        `[credit:processor:${context.job.handle}:prepare] got a new request to prepare`
    );

    const jobId = context.job.handle;
    const job = this.database.from("jobs").get(jobId);

    if (!job) {
      console.log(
          `[credit:processor:${context.job.handle}:prepare] creating a new background task to be executed`
      );

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
      console.log(
          `[credit:processor:${context.job.handle}:prepare] background task executed. status: PREPARED`
      );

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
      console.log(
          `[credit:processor:${context.job.handle}:prepare] background task executed. status: FAILED`
      );

      return {
        status: JobResultStatus.Failed,
        error: {
          reason: LedgerErrorReason.BridgeAccountInsufficientBalance,
          detail: job.error.message,
        },
      };
    }

    console.log(
        `[credit:processor:${context.job.handle}:prepare] supending execution of prepare on ledger for 5000 ms`
    )

    return {
      status: JobResultStatus.Suspended,
      suspendedUntil: new Date(Date.now() + 5000),
    };
  }

  async abort(context: TransactionContext): Promise<AbortResult> {
    console.log(
        `[credit:processor:${context.job.handle}:abort] got a new request to abort`
    );

    const jobId = context.job.handle;
    const job = this.database.from("jobs").get(jobId);

    if (!job) {
      console.log(
          `[credit:processor:${context.job.handle}:abort] creating a new background task to be executed`
      );

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
      console.log(
          `[credit:processor:${context.job.handle}:abort] background task executed. status: ABORTED`
      );

      return {
        status: JobResultStatus.Aborted,
        coreId: "667",
        custom: {
          app: "bridge-x",
          method: "AsyncCreditBankAdapter.abort",
        },
      } as AbortSucceededResult;
    }

    console.log(
        `[credit:processor:${context.job.handle}:abort] supending execution of prepare on ledger for 5000 ms`
    )

    return {
      status: JobResultStatus.Suspended,
      suspendedUntil: new Date(Date.now() + 5000),
    };
  }

  async commit(context: TransactionContext): Promise<CommitResult> {
    console.log(
        `[credit:processor:${context.job.handle}:commit] got a new request to commit`
    );

    console.log(
        `[credit:processor:${context.job.handle}:commit] no background task necessary. status: COMMITED`
    );

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
