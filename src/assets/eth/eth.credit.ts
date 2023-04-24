import { AsyncCreditBankAdapter } from "../src/credit.service";
import { EthereumNetwork } from "./eth.service";

export class EthCreditAdapter extends AsyncCreditBankAdapter{
    constructor(service: EthereumNetwork) {
        super(service)
    } 
}