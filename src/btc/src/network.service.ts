import { AccessAction, ClaimAction, LedgerIntent, LedgerKeyPair } from "@minka/bridge-sdk/types";
import { config } from "../../config";
import { ICryptoNetwork, IncomingTransaction, LedgerConfiguration } from "./network.interface";
import { LedgerSdk } from "@minka/ledger-sdk";

export class CryptoNetwork implements ICryptoNetwork {
  cachedBalance: number = 0
  pendingTransactions: IncomingTransaction[] = []
  statusHashmap: Record<string, 'pending' | 'confirmed'> = {}

  config: Partial<LedgerConfiguration> = {}

  sdk: LedgerSdk
  keyPair: LedgerKeyPair

  dateOffset: Date

  constructor() {
    this.sdk = new LedgerSdk({
      server: config.LEDGER_SERVER,
      ledger: config.LEDGER_HANDLE,
    })
    if( !this.dateOffset ){
      this.dateOffset = new Date()
    }
  }

  async checkBalance(): Promise<number> {
    return this.cachedBalance
  }
  balanceUpdate(balance: number): void {
    this.cachedBalance = balance
  }
  async loadTransactions(): Promise<IncomingTransaction[]> {
    return []
  }

  async validateAddress(to: string): Promise<string | false> {
    return to
  }

  async sendOutgoingTransaction(to: string, amount: number) {
    throw new Error("Method not implemented.");
  }

  async getTransactionStatus(hash: string): Promise<string> {
    return this.statusHashmap[hash] || null
  }

  async startListening() {
    setInterval(this.pollNetwork.bind(this), 5000)
    this.enqueueTransactions()
  }

  async pollNetwork() {
    const transactions = await this.loadTransactions()
    for (const txn of transactions) {
      if( txn.received > this.dateOffset ){
        this.pendingTransactions.push(txn)
      } else if ( this.statusHashmap[txn.hash] ){
        // Only update status if it's on the hashmap for status
        // to avoid memory usage.
        this.statusHashmap[txn.hash] = txn.status
      }
    }
    this.dateOffset = new Date()
  }

  // Wrapper so we only process one transaction at a time
  async enqueueTransactions() {
    setTimeout(async () => {
      this.doProcess()
    }, 1000)
  }

  async doProcess() {
    if (this.pendingTransactions.length === 0) return this.enqueueTransactions()

    const txn = this.pendingTransactions.pop()
    console.log(`Processing transaction ${txn.hash}`)

    if (!txn.amount || !txn.address || txn.address === this.config.blockchainAddress) {
      return
    }

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
    
    this.statusHashmap[txn.hash] = txn.status

    this.enqueueTransactions()
  }

}