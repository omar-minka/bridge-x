import { CoopcentralApiService } from "../coopcentral-api-service";
import {
  CreateBankTransactionRequest,
  CheckTransactionStatusRequest,
  ServiceError,
} from "../models";
import { config } from "../config";
import { Database } from "../database";

const USD_FACTOR = 100;
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
    const transactionRequest = new CheckTransactionStatusRequest();
    transactionRequest.externalId = intentHandle;

    const status = await this.coopcentralApi.checkTransactionStatus(
      transactionRequest
    );

    if (status === "COMPLETED") {
      job.status = "COMPLETED";
      return;
    }

    return;
  }

  job.status = "RUNNING";

  try {
    const businessData = database.from("business").get(sourceHandle);

    const transactionRequest = new CreateBankTransactionRequest();
    transactionRequest.idTxEntidad = intentHandle;
    transactionRequest.valorTx = `${amount / USD_FACTOR}`;
    transactionRequest.descripTx = "Prepare";
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

  if (job.status === "RUNNING") {
    const transactionRequest = new CheckTransactionStatusRequest();
    transactionRequest.externalId = intentHandle;

    const status = await this.coopcentralApi.checkTransactionStatus(
      transactionRequest
    );

    if (status === "COMPLETED") {
      job.status = "COMPLETED";
      return;
    }

    return;
  }

  job.status = "RUNNING";

  try {
    const businessData = database.from("business").get(sourceHandle);

    const transactionRequest = new CreateBankTransactionRequest();
    transactionRequest.idTxEntidad = intentHandle;
    transactionRequest.valorTx = `${amount / USD_FACTOR}`;
    transactionRequest.descripTx = "Abort";
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
  }
}
