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
  sourceHandle: string,
  intentHandle: string,
  amount: number
) {
  const database = Database.getInstance();
  const job = database.from("jobs").get(jobId);

  if (!job) {
    return;
  }

  if (job.status === "RUNNING") {
    console.log(
      `[job:${jobId}:prepare] checking transaction status on coopcentral`
    );
    const transactionRequest = new CheckTransactionStatusRequest();
    transactionRequest.externalId = intentHandle;

    try {
      const transactionStatus =
        await coopCentralApiClient.checkTransactionStatus(transactionRequest);

      console.log(
        `[job:${jobId}:prepare] transaction status is: ${transactionStatus.status}`
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
        `[debit:job:${jobId}:abort] error checking transaction status: ${error.message}`
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
    const businessData = database.from("business").get(sourceHandle);

    const transactionRequest = new CreateBankTransactionRequest();
    transactionRequest.idTxEntidad = intentHandle;
    transactionRequest.valorTx = `${amount / config.CURRENCY_FACTOR}`;
    transactionRequest.descripTx = "Prepare";
    transactionRequest.nomOrig = businessData.name || "Test";
    transactionRequest.docProdOrig = businessData.document;
    transactionRequest.prodOrig = businessData.account;
    transactionRequest.prodDest = `${config.COOPCENTRAL_VIRTUAL_ACCOUNT}`;

    const bankTransaction = await coopCentralApiClient.createBankTransaction(
      transactionRequest
    );

    console.log(
      `[job:${jobId}:prepare] created transaction on coopcentral: ${JSON.stringify(
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
      `[debit:job:${jobId}:prepare] failed with some uknnown error: ${error.message}`
    );
    job.status = "FAILED";
    job.error = error;
  }
}

export async function abort(
  jobId: string,
  sourceHandle: string,
  intentHandle: string,
  amount: number
) {
  const database = Database.getInstance();
  const job = database.from("jobs").get(jobId);

  if (!job) {
    return;
  }

  if (job.status === "COMPLETED") {
    return;
  }

  if (job.status === "RUNNING") {
    console.log(
      `[job:${jobId}:abort] checking transaction status on coopcentral`
    );

    const transactionRequest = new CheckTransactionStatusRequest();
    transactionRequest.externalId = intentHandle;

    try {
      const transactionStatus =
        await coopCentralApiClient.checkTransactionStatus(transactionRequest);

      if (transactionStatus.status === "COMPLETED") {
        console.log(
          `[job:${jobId}:abort] transaction status is: ${transactionStatus.status}`
        );

        job.status = "COMPLETED";
        return;
      }
    } catch (error) {
      console.log(
        `[debitL:job:${jobId}:abort] error checking transaction status: ${error.message}`
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
    const businessData = database.from("business").get(sourceHandle);

    const transactionRequest = new CreateBankTransactionRequest();
    transactionRequest.idTxEntidad = intentHandle;
    transactionRequest.valorTx = `${amount / config.CURRENCY_FACTOR}`;
    transactionRequest.descripTx = "Abort";
    transactionRequest.nomDest = businessData.name || "Test";
    transactionRequest.docProdDest = businessData.document;
    transactionRequest.prodDest = businessData.account;
    transactionRequest.prodOrig = `${config.COOPCENTRAL_VIRTUAL_ACCOUNT}`;

    const bankTransaction = await coopCentralApiClient.createBankTransaction(
      transactionRequest
    );

    console.log(
      `[job:${jobId}:abort] created transaction on coopcentral: ${JSON.stringify(
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
