import { LedgerSdk } from "@minka/ledger-sdk";
import { Express } from "express";
import { AccountDetailsRequest, CheckBankAccountRequest, ServiceError } from "./models";
import { CoopcentralApiService } from "./coopcentral-api-service";
import {Database} from "./database";
import {Buffer} from "buffer";

const coopcentralBridgeName = 'coopcentral'
const usdFactor = 100

const transfers = new Map()

const buildBusinessWalletHandle = (account) => {
    return `bs:${account}@${coopcentralBridgeName}`
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

export const register = async (config, ledgerSdk: LedgerSdk, expressApp: Express, coopcentralApi: CoopcentralApiService, database: Database) => {
    const keyPair = buildKeyPair(config)

    const apiUsername = config.SERVICE_API_USERNAME || 'admin'
    const apiPassword = config.SERVICE_API_PASSWORD || 'admin'
    const apiCredentials = `${apiUsername}:${apiPassword}`

    expressApp.use((request, response, next) => {
        let authorizationHeader = request.headers.authorization

        if (!authorizationHeader) {
            return response.status(401).json({ ok: false, error: 'unauthorized' })
        }

        let requestCredentials = Buffer.from(authorizationHeader.replace('Basic ', ''), 'base64').toString('utf8')

        if (requestCredentials !== apiCredentials) {
            return response.status(403).json({ ok: false, error: 'forbidden' })
        }

        return next()
    })

    expressApp.post('/v2/business/onboard', async (request, response) => {
        const { account, document, documentType } = request.body

        try {
            const existingBusinessWallet = database.from('business').get(buildBusinessWalletHandle(account))

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

            database.from('business').set(buildBusinessWalletHandle(account), {
                account, document, documentType
            })

            return response.status(201)
                .json({
                    ok: true,
                    wallet: {
                        handle: buildBusinessWalletHandle(account),
                        custom: {
                            account,
                            document,
                            documentType,
                        },
                    }
                })
        } catch (e) {
            if (e instanceof ServiceError) {
                return response.status(500)
                    .json({
                        ok: false,
                        error: `${e.code} - ${e.message}`
                    })
            }

            return response.status(500)
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
