import { LedgerSdk } from "@minka/ledger-sdk";
import { Express } from "express";
import { AccountDetailsRequest, CheckBankAccountRequest, ServiceError } from "./models";
import { CoopcentralApiService } from "./coopcentral-api-service";

const coopcentralBridgeName = 'coopcentral'
const usdFactor = 100

const transfers = new Map()

const buildBusinessWalletHandle = (account) => {
    return `business:${account}@coopcentral`
}

const buildKeyPair = (config) => {
    return {
        format: 'ed25519-raw',
        secret: config.BRIDGE_SECRET_KEY,
        public: config.BRIDGE_PUBLIC_KEY,
    }
}

const getAccessRules = (publicKey) => {
    return [
        {
            action: 'any',
            signer: {
                public: publicKey
            }
        },
    ]
}

export const register = async (config, ledgerSdk: LedgerSdk, expressApp: Express, coopcentralApi: CoopcentralApiService) => {
    const keyPair = buildKeyPair(config)

    expressApp.post('/v2/business/onboard', async (request, response) => {
        const { account, document, documentType } = request.body

        try {
            const existingBusinessWallet = (await ledgerSdk.wallet.read(buildBusinessWalletHandle(account))).wallet

            if (existingBusinessWallet) {
                return response.status(400)
                    .json({
                        ok: false,
                        error: 'Business is already onboarded'
                    })
            }
        } catch (e) {
            console.log(`Business does not exist yet. Proceeding to create wallet`)
        }

        try {
            let bankAccountResult = await coopcentralApi.checkBankAccount(
                new CheckBankAccountRequest(
                    account,
                    document,
                    documentType,
                ),
            )

            let bankAccountDetails = await coopcentralApi.fetchAccountDetails(
                new AccountDetailsRequest(
                    document,
                    documentType,
                ),
            )

            console.log(JSON.stringify(bankAccountDetails), JSON.stringify(bankAccountResult))

            let { wallet: businessWallet } = await ledgerSdk.wallet
                .init()
                .data({
                    handle: buildBusinessWalletHandle(account),
                    custom: {
                        document,
                        account,
                        documentType,
                    },
                    bridge: coopcentralBridgeName,
                    access: getAccessRules(config.BRIDGE_PUBLIC_KEY),
                })
                .hash()
                .sign([
                    { keyPair }
                ])
                .send()

            return response.status(201)
                .json({
                    ok: true,
                    wallet: {
                        handle: businessWallet.handle,
                        custom: businessWallet.custom,
                    }
                })
        } catch (e) {
            if (e instanceof ServiceError) {
                return response.status(400)
                    .json({
                        ok: false,
                        error: `${e.code} - ${e.message}`
                    })
            }

            return response.status(400)
                .json({
                    ok: false,
                    error: 'Something went wrong creating business wallet'
                })
        }
    })

    expressApp.post('/v2/transfer', async (request, response) => {
        const { source, target, symbol, amount, custom } = request.body

        try {
            const intentHandle = ledgerSdk.handle.unique()

            const { intent } = await ledgerSdk.intent
                .init()
                .data({
                    handle: intentHandle,
                    claims: [{
                        action: 'transfer',
                        target,
                        source,
                        symbol,
                        amount: amount * usdFactor, // This stands for 100.00$, because usd has a factor of 100
                    }],
                    access: getAccessRules(config.BRIDGE_PUBLIC_KEY)
                })
                .hash()
                .sign([
                    { keyPair }
                ])
                .send()

            transfers.set(intentHandle, intent)

            return response.status(201)
                .json({
                    ok: true,
                    intent: intent,
                })
        } catch (e) {
            return response.status(500)
                .json({
                    ok: false,
                    error: 'Error creating intent in ledger'
                })
        }
    })

    expressApp.get('/v2/transfer/:id', async (request, response) => {
        const { id } = request.params

        try {
            const { response: intentResponse } = await ledgerSdk.intent.read(id)

            return response.status(200)
                .json({
                    ok: true,
                    intent: {
                        data: intentResponse.data,
                    },
                })
        } catch (e) {
            return response.status(500)
                .json({
                    ok: false,
                    error: e.message
                })
        }
    })

    expressApp.listen(config.SERVICE_API_PORT, () => {
        console.log('API Server started on port 3102')
    })
}
