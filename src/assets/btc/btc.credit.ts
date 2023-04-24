import { AsyncCreditBankAdapter } from "../src/credit.service";
import { Testnet } from './btc.service'

export class BtcCreditAdapter extends AsyncCreditBankAdapter{
    constructor(testnet: Testnet) {
        super(testnet)
    }
}