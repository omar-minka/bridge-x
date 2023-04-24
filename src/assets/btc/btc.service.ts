import { LedgerAddress, LedgerKeyPair } from "@minka/bridge-sdk/types"
import { CryptoNetwork } from "../src/network.service"
import { config } from "../../config"
import wif from 'wif'
import sendCrypto from 'send-crypto'
import { IncomingTransaction } from "../src/network.interface"
import { BitcoinAPI } from "../bitcoin.api"

export class Testnet extends CryptoNetwork {
  balance: number = 0
  statusHashmap: Record<string, 'pending' | 'confirmed'> = {}
  cryptoAccount: sendCrypto
  dateOffset : Date = new Date('2023-04-22T09:04:28.45Z');
  //dateOffset: Date = new Date()

  pollingTime: number = 600000

  constructor() {
    super()
    this.config = {
      symbol: 'btc',
      schema: 'btc',
      wallet: config.WALLET_HANDLE,
      blockchainAddress: config.BTC_ADDRESS,
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

  async checkBalance(): Promise<number> {
    return this.balance
  }
  balanceUpdate(balance: number) {
    this.balance = balance
  }

  async getTransactionStatus(hash: string): Promise<string> {
    return this.statusHashmap[hash] || null
  }

  async loadTransactions(): Promise<IncomingTransaction[]> {
    const [balance, transactions] = await BitcoinAPI.getTransactions(config.BTC_ADDRESS)
    this.balanceUpdate(balance)
    const response : IncomingTransaction[] = []
    console.log('Checking btc transactions, ', transactions.length, ' found.')
    for(const txn of transactions){
      let amount : number = 0
      for(const output of txn.outputs){
        if( output.addresses[0] === config.BTC_ADDRESS ){
          amount = Number(output.value)
        }
      }
      const parsedTxn : IncomingTransaction = {
        hash: txn.hash,
        address: txn.inputs?.[0]?.addresses?.[0],
        amount,
        received: new Date(txn.received),
        status: txn.confirmations > 0 ? 'confirmed' : 'pending'
      }
     if( parsedTxn.received.getTime() > this.dateOffset.getTime()){
        response.push(parsedTxn)
        this.statusHashmap[txn.hash] = parsedTxn.status
      } else if ( this.statusHashmap[parsedTxn.hash] ){
        // Only update status if it's on the hashmap for status
        // to avoid memory usage.
        this.statusHashmap[txn.hash] = parsedTxn.status
      }
 
    }
    this.dateOffset = new Date()
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
    const txn = await this.cryptoAccount.sendSats(to, amount, "BTC")
    console.log(`Transaction sent: ${txn}`)
  }
}