import { LedgerSdk } from "@minka/ledger-sdk";
import axios from "axios";
import { config } from "../../config";

const baseRates = {
    'eth': {
      'btc': 0.067,
      'cop': 8335737.96,
      'usd': 1845.95
    },
    'usd': {
      'btc': 0.000037,
      'cop': 4515.69,
      'eth': 0.00054
    },
    'btc': {
      'eth': 14.81,
      'cop': 123285110.50,
      'usd': 27301.50
    },
    'cop': {
      'eth': 0.000000119965383,
      'btc': 0.0000000082,
      'usd': 0.00022
    },
  }

export class ExchangeService2{
   async checkBalance(symbol){
        return 10000000000;
    }
    async getRate(from, to, amount, factor = 1){
        const responseAmount = '100';
        const unit = Number(responseAmount) * factor
        return Math.round(unit)
    }
    async storeTransaction(incomingIntentId, outcomingIntentId, symbol, amount){
        return true
    }
}
export class ExchangeService{
    sdk: LedgerSdk
    symbols: Record<string, number> = {}
    constructor(){
        this.sdk = new LedgerSdk({
            server: config.LEDGER_SERVER,
            ledger: config.LEDGER_HANDLE,
        })
        this.sdk.symbol.list().then(data => {
            for( const symbol of data.symbols ){
                this.symbols[symbol.handle] = Number(symbol.factor)
            }
        })
    }
    async getFactor(symbol){
        if( this.symbols[symbol] ){
            return this.symbols[symbol]
        }
        const data = await this.sdk.symbol.read(symbol)
        this.symbols[data.symbol.handle] = Number(data.symbol.factor)
        return Number(data.symbol.factor)
    }
    async checkBalance(symbol){
        return 10000000000;
    }
    async getRate(sourceSymbol, targetSymbol) : Promise<number> {
        const rate = baseRates?.[sourceSymbol]?.[targetSymbol] || 1
        return rate
    }

    async calculateRate(sourceSymbol, targetSymbol, rate, units){
        const [sourceFactor, targetFactor] = await Promise.all([
            this.getFactor(sourceSymbol),
            this.getFactor(targetSymbol)
        ])
        const sourceFloat = Number(units) / sourceFactor

        const amountFloat = sourceFloat * rate
        const amountUnits = amountFloat * targetFactor
        return Math.round(amountUnits)
    }

    async storeTransaction(incomingIntentId, outcomingIntentId, symbol, amount){
        // Do nothing
    }
}