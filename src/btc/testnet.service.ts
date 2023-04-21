import { LedgerAddress, LedgerKeyPair } from "@minka/bridge-sdk/types"
import { CryptoNetwork } from "./src/network.service"
import { config } from "../config"
import wif from 'wif'
import sendCrypto from 'send-crypto'
import { IncomingTransaction } from "./src/network.interface"
import { BitcoinAPI } from "./bitcoin.api"

export class Tesnet extends CryptoNetwork {
  balance: number = 0
  cryptoAccount: sendCrypto
  dateOffset = new Date('2023-04-21T12:00:45.026Z')

  constructor() {
    super()
    this.config = {
      symbol: 'btc',
      schema: 'btc',
      blockchainAddress: config.BTC_ADDRESS,
      wallet: config.WALLET_HANDLE,
      keyPair: {
        format: 'ed25519-raw',
        public: config.WALLET_PUBLIC_KEY,
        secret: config.WALLET_SECRET_KEY
      },
      factor: 100000000
    }
    var keyPair = wif.decode(config.BTC_PRIVATE_KEY)

    this.cryptoAccount = new sendCrypto(keyPair.privateKey, {
      network: 'testnet3',
    });
  }

  async loadTransactions(): Promise<IncomingTransaction[]> {
    const [balance, transactions] = await BitcoinAPI.getTransactions(config.BTC_ADDRESS)
    this.balanceUpdate(balance)
    const response : IncomingTransaction[] = []
    for(const txn of transactions){
      let amount : number = 0
      for(const output of txn.outputs){
        if( output.addresses[0] === config.BTC_ADDRESS ){
          amount = Number(output.value)
        }
      }
      response.push({
        hash: txn.hash,
        address: txn.inputs?.[0]?.addresses?.[0],
        amount,
        received: new Date(txn.received),
        status: txn.confirmations > 4 ? 'confirmed' : 'pending'
      })
    }
    return response
  }


  async validateAddress(input: LedgerAddress): Promise<string | false> {
    const parts = input.split(':')
    if (parts.length !== 2) {
      return false
    }
    let [, address] = parts
    address = address.replace(`@${config.WALLET_HANDLE}`, '')
    if (address.length < 34) { // Only validation we do for now :)
      return false
    }
    return address
  }

  async sendTransaction(to, amount) {
    await this.cryptoAccount.send(to, (amount / this.config.factor), "BTC")
  }
}