import Web3 from 'web3';

import { config } from "../config"
import { LedgerSdk } from "@minka/ledger-sdk";
import { LedgerIntent, ClaimAction, LedgerKeyPair, AccessAction } from "@minka/bridge-sdk/types";

const blocks = {}

export class EthListener { 
  protected sdk: LedgerSdk
  protected keyPair: LedgerKeyPair
 
  protected web3: Web3

  protected pendingTransactions: any[] = []

  constructor() {
    this.web3 = new Web3(config.ETH_WEBSOCKET_URL)

    this.sdk = new LedgerSdk({
      server: config.LEDGER_SERVER,
      ledger: config.LEDGER_HANDLE,
    })
    this.keyPair = {
      format: 'ed25519-raw',
      public: config.BRIDGE_PUBLIC_KEY,
      secret: config.BRIDGE_SECRET_KEY
    }
    this.init()
  }

  async monitorTransactions(){
    
    const block = await this.web3.eth.getBlock('latest');

    const currBlock = block.number

    console.log(`Checking new block ${currBlock}`)

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
                this.pendingTransactions.push({
                    hash: tx.hash,
                    value: parseInt(tx.value),
                    sender: tx.from
                })
            }
        }
        
    }
}

  async init(){
    setInterval(this.monitorTransactions.bind(this), 5000)
    this.enqueueTransactions()
  }


  // Wrapper so we only process one transaction at a time
  async enqueueTransactions(){
    setTimeout(async () => {
      this.doProcess()
    }, 1000)
  }

  async doProcess(){
    if( this.pendingTransactions.length === 0 ) return this.enqueueTransactions()

    const txn = this.pendingTransactions.pop()
    console.log(`Processing transaction ${txn.hash}`)

    const data = txn

    if( !data.value || !data.sender ) {
      return
    }
    const baseIntent = {
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
                public: config.BRIDGE_PUBLIC_KEY
              }
            }
          ]
    }
    const intent : LedgerIntent = {
        handle: this.sdk.handle.unique(),
        custom: {
            txnId: txn.hash
        },
        claims: [{
          action: ClaimAction.Issue,
          target: 'eth',
          amount: data.value,
          symbol: 'eth'
        }, {
            action: ClaimAction.Transfer,
            source: "eth",
            target: 'eth:' + data.sender,
            amount: data.value,
            symbol: 'eth',
          }],
        ...baseIntent
       }

      await this.sdk.intent
        .init()
        .data(intent)
        .hash()
        .sign(
          [
            {
              keyPair: this.keyPair
            }
          ]
        )
        .send()

    this.enqueueTransactions()
  }

}
