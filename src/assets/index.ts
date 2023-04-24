import { ExchangeCreditAdapter, ExchangeDebitAdapter, ExchangeService } from "./_exchange";
import { BtcCreditAdapter, BtcDebitAdapter, Testnet } from "./btc";
import { EthCreditAdapter, EthDebitAdapter, EthereumNetwork } from "./eth"

export const BitcoinNetwork = new Testnet()
export const ethereumNetwork = new EthereumNetwork()

export const exchangeService = new ExchangeService()

export const Adaptors = {
    btc: {
        credit: new BtcCreditAdapter(BitcoinNetwork),
        debit: new BtcDebitAdapter(BitcoinNetwork)
    },
    eth: {
        credit: new EthCreditAdapter(ethereumNetwork),
        debit: new EthDebitAdapter(ethereumNetwork)
    },

    // Special adaptor for exchanging
    exchange: {
        credit: new ExchangeCreditAdapter(exchangeService),
        debit: new ExchangeDebitAdapter()
    }
}