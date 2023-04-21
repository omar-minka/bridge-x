import { LedgerAddress, LedgerKeyPair } from "@minka/bridge-sdk/types"

export type  IncomingTransaction = {
  hash: string
  address: string
  amount: number
  received: Date
  status: 'pending' | 'confirmed'
}

export type LedgerConfiguration = {
  schema: string
  symbol: string
  blockchainAddress: string
  wallet: string
  keyPair: LedgerKeyPair
  factor: number
}

export interface ICryptoNetwork {
   /**
     * This method will be called to check if the address has enough balances.
     * Also it may be called when service is started to topup the wallet inside
     * the ledger.
     */
    checkBalance() : Promise<number>

    /**
     * This method will update the cached balnce of the wallet.
     */
    balanceUpdate(balance: number) : void

    /**
     * This method can be used to validate an address before sending a transaction.
     */
    validateAddress(string: LedgerAddress): Promise<false | string>

    /**
     * This method will be called to send a transaction to the network.
     */
    sendOutgoingTransaction(to: string, amount: number): Promise<void>

    /**
     * This method will be called to get the transaction status.
     */
    getTransactionStatus(hash: string) : Promise<string>

}