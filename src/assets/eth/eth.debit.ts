import { AsyncDebitBankAdapter } from "../src/debit.service";
import { EthereumNetwork } from "./eth.service";

export class EthDebitAdapter extends AsyncDebitBankAdapter{
    constructor(service: EthereumNetwork) {
        super(service)
    } 
}