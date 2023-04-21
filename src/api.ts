import { LedgerSdk } from "@minka/ledger-sdk";
import { Express } from "express";

const coopcentralBridgeName = 'coopcentral'

const transfers = new Map()

const buildBusinessWalletHandle = (account) => {
    return `business:${account}@coopcentral`
}

const buildKeyPair = (config) => {
    return {
        format: 'ed25519-raw',
        private: config.BRIDGE_SECRET_KEY,
        public: config.BRIDGE_PUBLIC_KEY,
    }
}

export const register = async (config, ledgerSdk: LedgerSdk, expressApp: Express) => {
    const keyPair = buildKeyPair(config)

    expressApp.post('/v2/business/onboard', async (request, response, next) => {
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
            let { wallet: businessWallet } = await ledgerSdk.wallet
                .init()
                .data({
                    handle: buildBusinessWalletHandle(account),
                    custom: {
                        document,
                        account,
                        documentType,
                    },
                    bridge: coopcentralBridgeName
                })
                .hash()
                .sign([
                    keyPair
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
            response.status(400)
                .json({
                    ok: false,
                    error: 'Something went wrong creating business wallet'
                })
        }
    })

    expressApp.post('/v2/transfer', async (request, response, next) => {
        const { source, target, symbol, amount, custom } = request.body

        // create intent
        try {
            const intent = ledgerSdk.intent
                .init()
                .data({
                    source,
                    target,
                    symbol,
                    amount,
                })
                .hash()
                .sign([
                    keyPair
                ])
                .send()


        } catch (e) {
            return response.status(500)
                .json({
                    ok: false,
                    error: 'Error creating intent in ledger'
                })
        }
    })

    expressApp.listen(config.SERVICE_API_PORT, () => {
        console.log('API Server started on port 3102')
    })
}
