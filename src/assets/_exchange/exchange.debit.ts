import { JobResultStatus, PrepareResult, PrepareSucceededResult, TransactionContext } from "@minka/bridge-sdk";
import { SuspendableBankAdapter } from "../src/suspendable.service";

export class ExchangeDebitAdapter extends SuspendableBankAdapter{
  async prepare(context: TransactionContext): Promise<PrepareResult> {
    console.log('Prepare here')
    const result: PrepareSucceededResult = {
      status: JobResultStatus.Prepared,
      custom: {
        method: 'AsyncDebitBankAdapter.abort',
      },
    }
    return result
  }

}