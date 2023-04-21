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
    const transactionRequest = new CheckTransactionStatusRequest();
    transactionRequest.externalId = commandHandle;

    try {
      const transactionStatus =
        await coopCentralApiClient.checkTransactionStatus(transactionRequest);

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
        `[credit:job:${jobId}:abort] error checking transaction status: ${error.message}`
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

    const bankTransaction = await coopCentralApiClient.createBankTransaction(
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
    return;
  }

  if (job.status === "RUNNING") {
    const transactionRequest = new CheckTransactionStatusRequest();
    transactionRequest.externalId = commandHandle;

    try {
      const transactionStatus =
        await coopCentralApiClient.checkTransactionStatus(transactionRequest);

      if (transactionStatus.status === "COMPLETED") {
        job.status = "COMPLETED";
        return;
      }
    } catch (error) {
      console.log(
        `[credit:job:${jobId}:abort] error checking transaction status: ${error.message}`
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
    transactionRequest.descripTx = "Abort";
    transactionRequest.nomOrig = businessData.name || "Test";
    transactionRequest.docProdOrig = businessData.document;
    transactionRequest.prodOrig = businessData.account;
    transactionRequest.prodDest = `${config.COOPCENTRAL_VIRTUAL_ACCOUNT}`;

    const bankTransaction = await coopCentralApiClient.createBankTransaction(
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
