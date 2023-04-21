import { LedgerAddress, LedgerIntent, ClaimAction, AccessAction } from "@minka/bridge-sdk/types"
import { CryptoNetwork } from "./src/network.service"
import { config } from "../config"
import { IncomingTransaction } from "./src/network.interface"

import Web3 from 'web3';

const blocks = {}
export class EthereumNetwork extends CryptoNetwork {
  balance: number = 0
  web3: Web3
  dateOffset = new Date('2023-04-21T12:00:45.026Z')

  constructor() {
    super()
    this.config = {
      symbol: 'eth',
      schema: 'eth',
      wallet: 'eth',
      blockchainAddress: config.BRIDGE_ETH_PUBLIC_KEY,
      keyPair: {
        format: 'ed25519-raw',
        public: config.BRIDGE_PUBLIC_KEY,
        secret: config.BRIDGE_SECRET_KEY
      },
      factor: 1000000000000000000
    }

    this.web3 = new Web3(config.ETH_WEBSOCKET_URL);
  }

  async loadTransactions(): Promise<IncomingTransaction[]> {
    
    const block = await this.web3.eth.getBlock('latest');

    const currBlock = block.number

    console.log(`Checking new block ${currBlock}`)

    const response = []
    if(!blocks[currBlock]) {
        blocks[currBlock] = {}
        delete blocks[currBlock - 1]
    }
    for(let txHash of block.transactions){
        if(!blocks[currBlock][txHash]) {
            blocks[currBlock][txHash] = true
            const tx = await this.web3.eth.getTransaction(txHash)
            const tranx = tx.to
            if(config.BRIDGE_ETH_PUBLIC_KEY === tranx){
                console.log(tx)
                console.log(`New transaction found - Block ${currBlock}`);
                console.log(`Transaction From: ${tx.from}`);
                console.log(`Transaction To: ${tx.to}`);
                  response.push({
                    address: tx.from,
                    amount: parseInt(tx.value),
                    hash: tx.hash,
                    received: new Date(),
                    status: 'pending'
                  })
                }
            }
        }
      return response
 }

  async checkBalance(): Promise<number> {
    return parseInt(await this.web3.eth.getBalance(config.BRIDGE_ETH_PUBLIC_KEY))
  }

  async getTransactionStatus(hash: string): Promise<string> {
    const transaction = await this.web3.eth.getTransactionReceipt(hash)
    return transaction ? 'confirmed' : 'pending'
  }

  async validateAddress(input: LedgerAddress): Promise<string | false> {
    const parts = input.split(':')
    if (parts.length !== 2) {
      return false
    }
    let [, address] = parts
    address = address.replace(`@${config.WALLET_HANDLE}`, '')

    return this.web3.utils.isAddress(address) ? address : false
  }

  async sendTransaction(to: string, amount: number) {
    const nonce =  await this.web3.eth.getTransactionCount(config.BRIDGE_ETH_PUBLIC_KEY, 'latest');

    const transaction = {
      to,
      value: amount,
      gas: config.ETH_DEFAULT_GAS,
      nonce: nonce
    };
    const signedTx = await this.web3.eth.accounts.signTransaction(transaction, config.BRIDGE_ETH_SECRET_KEY);
  
    return await this.web3.eth.sendSignedTransaction(signedTx.rawTransaction)
  }
}