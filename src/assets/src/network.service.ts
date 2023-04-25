import { AccessAction, ClaimAction, LedgerIntent, LedgerKeyPair } from "@minka/bridge-sdk/types";
import { config } from "../../config";
import { ICryptoNetwork, IncomingTransaction, LedgerConfiguration } from "./network.interface";
import { LedgerSdk } from "@minka/ledger-sdk";

export class CryptoNetwork implements ICryptoNetwork {
  pendingTransactions: IncomingTransaction[] = []

  public config: Partial<LedgerConfiguration> = {}

  sdk: LedgerSdk
  keyPair: LedgerKeyPair

  pollingTime: number = 5000

  constructor() {
    this.sdk = new LedgerSdk({
      server: config.LEDGER_SERVER,
      ledger: config.LEDGER_HANDLE,
    })
  }

  async checkBalance(): Promise<number> {
    return 0
  }

  async loadTransactions(): Promise<IncomingTransaction[]> {
    return []
  }

  async validateAddress(to: string): Promise<string | false> {
    return to
  }

  async sendTransaction(to: string, amount: number): Promise<void> {
    throw new Error("Method not implemented.");
  }

  async getTransactionStatus(hash: string): Promise<string> {
    return null
  }

  async startListening() {
    // First listening is immediate
    // TODO: Reenable this
    this.pollNetwork()
    //setInterval(this.pollNetwork.bind(this), this.pollingTime)
    this.enqueueTransactions()
  }

  async pollNetwork() {
    let transactions
    try{
      transactions = await this.loadTransactions()
    } catch (error){
      console.log(error)
      transactions = []
    }
    for (const txn of transactions) {
      const isValid = await this.validateTransaction(txn)
      if (!isValid) continue
      this.pendingTransactions.push(txn)
    }
  }

  // Wrapper so we only process one transaction at a time
  async enqueueTransactions() {
    setTimeout(async () => {
      this.doProcess()
    }, 1000)
  }

  async validateTransaction(txn: IncomingTransaction): Promise<boolean> {
    if (!txn.amount || !txn.address || txn.address === this.config.blockchainAddress) {
      return false
    }

    return true
  }

  async doProcess() {
    if (this.pendingTransactions.length === 0) return this.enqueueTransactions()

    const txn = this.pendingTransactions.pop()
    console.log(`Processing ${this.config.symbol} transaction ${txn.hash}`)

    if( !await this.validateTransaction(txn) ){
      console.log(`Transaction ${txn.hash} is invalid`)
      return this.enqueueTransactions()
    }
    console.log(`${txn.hash} is valid`)

    const intent: LedgerIntent = {
      handle: this.sdk.handle.unique(),
      claims: [
        {
          action: ClaimAction.Issue,
          target: this.config.wallet,
          amount: txn.amount,
          symbol: this.config.symbol,
        },
        {
          action: ClaimAction.Transfer,
          source: this.config.wallet,
          target: `${this.config.schema}:${txn.address}`,
          amount: txn.amount,
          symbol: this.config.symbol,
        }
      ],
      custom: {
        txnId: txn.hash,
      },
      access: [
        {
          action: AccessAction.Sign,
          signer: {
            public: config.BRIDGE_PUBLIC_KEY
          }
        },
        {
          action: AccessAction.Any,
          signer: {
            public: this.config.keyPair.public
          }
        }
      ]
    }
    try{
      await this.sdk.intent
        .init()
        .data(intent)
        .hash()
        .sign(
          [
            {
              keyPair: this.config.keyPair
            }
          ]
        )
        .send()
    } catch (error){
      console.log(error)
    }

    this.enqueueTransactions()
  }

}