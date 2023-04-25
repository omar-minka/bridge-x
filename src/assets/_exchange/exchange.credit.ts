import { JobResultStatus, PrepareFailedResult, PrepareResult, PrepareSucceededResult, TransactionContext } from "@minka/bridge-sdk";
import { SuspendableBankAdapter } from "../src/suspendable.service";
import { AccessAction, ClaimAction, IssueClaim, LedgerIntent, LedgerKeyPair, TransferClaim } from "@minka/bridge-sdk/types";
import { LedgerErrorReason } from "@minka/bridge-sdk/errors";
import { ExchangeService } from "./exchange.service";
import { config } from "../../config";
import { LedgerSdk } from "@minka/ledger-sdk";

export class ExchangeCreditAdapter extends SuspendableBankAdapter {
  protected readonly sdk: LedgerSdk
  protected readonly keyPair: LedgerKeyPair
  constructor(
    protected readonly exchangeService: ExchangeService
  ) {
    super()
    this.sdk = new LedgerSdk({
      server: config.LEDGER_SERVER,
      ledger: config.LEDGER_HANDLE,
    })
    this.keyPair = {
      format: 'ed25519-raw',
      public: config.WALLET_PUBLIC_KEY,
      secret: config.WALLET_SECRET_KEY
    }
  }
  async prepare(context: TransactionContext): Promise<PrepareResult> {
    const intent = context.intent
    const claims = intent.claims
    // Claims validation
    let purchases: any[] = []
    for (const claim of claims) {
      let error;

      if (claim.action !== ClaimAction.Transfer) {
        error = {
          reason: LedgerErrorReason.BridgeAccountLimitExceeded,
          detail: 'Only Transfer is supported',
        }
      } else {
        const [target, exchangerEntity] = claim.target.split('@')
        const [asset] = exchangerEntity.split('.')
        purchases.push({
          from: claim.symbol,
          to: asset,
          amount: claim.amount,
          target
        })
      }
      if (error) {
        const result: PrepareFailedResult = {
          status: JobResultStatus.Failed,
          error,
          custom: {
            app: config.BRIDGE_APP,
            method: 'SyncCreditBankAdapter.prepare',
          }
        }
        return result
      }

      const claims : (TransferClaim | IssueClaim)[] = []
      const requiredBalances : Record<string, number> = {}
      for(const purchase of purchases){
        let newAmount = await this.exchangeService.getRate(purchase.from, purchase.to, claim.amount)
        newAmount = Math.round( newAmount )
        claims.push({
          action: ClaimAction.Issue,
          symbol: purchase.to,
          target: 'exchange',
          amount: newAmount
        })
        claims.push({
          action: ClaimAction.Transfer,
          symbol: purchase.to,
          amount: newAmount,
          source: 'exchange',
          target: purchase.target
        })
        if( requiredBalances[purchase.to] ){
          requiredBalances[purchase.to] += newAmount
        } else {
          requiredBalances[purchase.to] = newAmount
        }
      }

      for(const [symbol, amount] of Object.entries(requiredBalances)){
        const balance = await this.exchangeService.checkBalance(symbol)
        console.log(symbol, balance, amount)
        if (balance < amount) {
          const result: PrepareFailedResult = {
            status: JobResultStatus.Failed,
            error: {
              reason: LedgerErrorReason.BridgeAccountInsufficientBalance,
              detail: `Insufficient balance. Required ${amount}, available ${balance}`,
            },
            custom: {
              app: config.BRIDGE_APP,
              method: 'SyncCreditBankAdapter.prepare',
            }
          }
          return result
        }
      }
      
      const intent: LedgerIntent = {
        handle: this.sdk.handle.unique(),
        claims,
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
              public: this.keyPair.public
            }
          }
        ],
        custom: {
          exchange: 1
        }
      }

      console.log(intent)

      try{
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
      } catch(error: any){
        console.log(error)
      }
 
      const result: PrepareSucceededResult = {
        status: JobResultStatus.Prepared,
        /**
         * Maybe allow only one transaction?
         * Compose a coreId from all transactions?
         */
        custom: {
          app: config.BRIDGE_APP,
          method: 'AsyncCreditBankAdapter.prepare',
        },
      }
      return result

    }
  }
}