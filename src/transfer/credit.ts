import { CoopcentralApiService } from "../coopcentral-api-service";
import {
  CreateBankTransactionRequest,
  CheckTransactionStatusRequest,
  ServiceError,
} from "../models";
import { config } from "../config";
import { Database } from "../database";

const coopCentralApiClient = new CoopcentralApiService(config);

export async function prepare(
  jobId: string,
  targetHandle: string,
  commandHandle: string,
  amount: number
) {
  const database = Database.getInstance();
  const job = database.from("jobs").get(jobId);

  if (!job) {
    return;
  }

  if (job.status === "RUNNING") {
    console.log(
        `[credit:job:${jobId}:prepare] checking transaction status on coopcentral`
    );

    try {
      const transactionRequest = new CheckTransactionStatusRequest();
      transactionRequest.externalId = commandHandle;

      const transactionStatus =
        await coopCentralApiClient.checkTransactionStatus(transactionRequest);

      console.log(
          `[debit:job:${jobId}:prepare] transaction status in coopcentral is: ${transactionStatus.status}`
      );

      if (transactionStatus.status === "COMPLETED") {
        job.status = "COMPLETED";
        return;
      }

      if (transactionStatus.status === "ERROR") {
        job.status = "FAILED";
        return;
      }
    } catch (error) {
      console.log(
        `[credit:job:${jobId}:prepare] error checking transaction status: ${error.message}`
      );

      if (error instanceof ServiceError) {
        if (error.isRetryable()) {
          job.status = "PENDING";
          return;
        }
      }
    }

    return;
  }

  job.status = "RUNNING";

  try {
    const businessData = database.from("business").get(targetHandle);

    const transactionRequest = new CreateBankTransactionRequest();
    transactionRequest.idTxEntidad = commandHandle;
    transactionRequest.valorTx = `${amount / config.CURRENCY_FACTOR}`;
    transactionRequest.descripTx = "Prepare";
    transactionRequest.nomDest = businessData.name || "Test";
    transactionRequest.docProdDest = businessData.document;
    transactionRequest.prodDest = businessData.account;
    transactionRequest.prodOrig = `${config.COOPCENTRAL_VIRTUAL_ACCOUNT}`;

    console.log(
        `[credit:job:${jobId}:prepare] creating transaction on coopcentral`
    )

    const bankTransaction = await coopCentralApiClient.createBankTransaction(
      transactionRequest
    );

    console.log(
        `[credit:job:${jobId}:prepare] created transaction on coopcentral: ${JSON.stringify(
            bankTransaction
        )}`
    );
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

    console.log(
        `[credit:job:${jobId}:prepare] failed with some uknnown error: ${error.message}`
    );

    job.status = "FAILED";
    job.error = error;
  }
}

export async function abort(
  jobId: string,
  targetHandle: string,
  commandHandle: string,
  amount: number
) {
  const database = Database.getInstance();
  const job = database.from("jobs").get(jobId);

  if (!job) {
    return;
  }

  if (job.status === "COMPLETED") {
    console.log(
        `[credit:job:${jobId}:abort] job is completed`
    )
    return;
  }

  // first check if prepared transaction exists
  try {
    const transactionRequest = new CheckTransactionStatusRequest();
    transactionRequest.externalId = commandHandle;

    console.log(
        `[credit:job:${jobId}:abort] checking previous transaction status in coopcentral`
    )

    const transactionStatus = await coopCentralApiClient.checkTransactionStatus(
      transactionRequest
    );

    console.log(
        `[credit:job:${jobId}:abort] previous transaction status is ${transactionStatus.status}`
    )

    if (transactionStatus.status !== "COMPLETED") {
      job.status = "COMPLETED";
      return;
    }
  } catch (error) {
    if (error instanceof ServiceError) {
      if (error.isRetryable()) {
        job.status = "COMPLETED";
        return;
      }
    }

    return;
  }

  console.log(
      `[credit:job:${jobId}:abort] preparing to abort transaction`
  )

  const abortCommandHandle = `abort-${commandHandle}`;
  if (job.status === "RUNNING") {
    try {
      const transactionRequest = new CheckTransactionStatusRequest();
      transactionRequest.externalId = abortCommandHandle;

      console.log(
          `[credit:job:${jobId}:abort] checking abort transaction status on coopcentral`
      );

      const transactionStatus =
        await coopCentralApiClient.checkTransactionStatus(transactionRequest);

      console.log(
          `[credit:job:${jobId}:abort] abort transaction status is ${transactionStatus.status}`
      )

      if (transactionStatus.status === "COMPLETED") {
        job.status = "COMPLETED";
        return;
      }
    } catch (error) {
      console.log(
        `[credit:job:${jobId}:abort] error checking abort transaction status: ${error.message}`
      );

      if (error instanceof ServiceError) {
        if (error.isRetryable()) {
          job.status = "PENDING";
          return;
        }
      }
    }

    return;
  }

  console.log(
      `[credit:job:${jobId}:abort] abort transaction should be created`
  )

  job.status = "RUNNING";

  try {
    const businessData = database.from("business").get(targetHandle);

    const transactionRequest = new CreateBankTransactionRequest();
    transactionRequest.idTxEntidad = abortCommandHandle;
    transactionRequest.valorTx = `${amount / config.CURRENCY_FACTOR}`;
    transactionRequest.descripTx = "Abort";
    transactionRequest.nomOrig = businessData.name || "Test";
    transactionRequest.docProdOrig = businessData.document;
    transactionRequest.prodOrig = businessData.account;
    transactionRequest.prodDest = `${config.COOPCENTRAL_VIRTUAL_ACCOUNT}`;

    console.log(
        `[credit:job:${jobId}:abort] creating abort transaction on coopcentral`
    )

    const bankTransaction = await coopCentralApiClient.createBankTransaction(
      transactionRequest
    );

    console.log(
        `[credit:job:${jobId}:abort] created abort transaction on coopcentral: ${JSON.stringify(
            bankTransaction
        )}`
    );
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
