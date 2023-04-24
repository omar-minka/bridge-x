import { AsyncSchemaBankAdapter } from './async-schema-adaptor'
export class AsyncCreditBankAdapter extends AsyncSchemaBankAdapter {
  getSchema(): 'credit' {
    return 'credit'
  }
}
