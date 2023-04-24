import dotenv from 'dotenv'
dotenv.config({ path: `${__dirname}/.env` })
import { config } from './config'
import sendCrypto from 'send-crypto'
import wif from 'wif'

var keyPair = wif.decode(config.BTC_PRIVATE_KEY)

const account = new sendCrypto(keyPair.privateKey, {
    network: 'testnet3',
});

account.send("tb1qw4p3hywyjhhrvm0l2ls8q25tjgyq8a7l0dn9rx", 0.0001, "BTC").then((txn) => {
    console.log(txn)
    account.getBalance("BTC").then(console.log)
    account.address("BTC").then(console.log)
})
