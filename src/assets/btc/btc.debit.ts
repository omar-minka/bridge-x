import { AsyncDebitBankAdapter } from "../src/debit.service";
import { Testnet } from "./btc.service";

export class BtcDebitAdapter extends AsyncDebitBankAdapter{
    constructor(testnet: Testnet) {
        super(testnet)
    } 
}