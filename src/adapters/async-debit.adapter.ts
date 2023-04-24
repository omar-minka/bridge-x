import { AsyncSchemaBankAdapter } from './async-schema-adaptor'
export class AsyncDebitBankAdapter extends AsyncSchemaBankAdapter {
  getSchema(): 'debit' {
    return 'debit'
  }
}
