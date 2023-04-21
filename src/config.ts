import { cleanEnv, host, num, port, str } from 'envalid'

export const config = cleanEnv(process.env, {
  BRIDGE_PUBLIC_KEY: str({ desc: 'Bridge public key' }),
  BRIDGE_SECRET_KEY: str({ desc: 'Bridge private key' }),
  LEDGER_HANDLE: str({ desc: 'Ledger name' }),
  LEDGER_SERVER: str({ desc: 'Ledger URL' }),
  LEDGER_PUBLIC_KEY: str({ desc: 'Ledger public key' }),
  PORT: port({ default: 3000, desc: 'HTTP listen port' }),
  TYPEORM_HOST: host({ desc: 'Database connection host' }),
  TYPEORM_PORT: port({ desc: 'Database connection port' }),
  TYPEORM_USERNAME: str({ desc: 'Database connection username' }),
  TYPEORM_PASSWORD: str({ desc: 'Database connection password' }),
  TYPEORM_DATABASE: str({ desc: 'Database name' }),
  TYPEORM_CONNECTION_LIMIT: num({
    default: 100,
    desc: 'Database connections limit',
  }),
  BTC_ADDRESS: str({ desc: 'BTC address' }),
  BTC_PRIVATE_KEY: str({ desc: 'BTC address private key' }),
  BTC_JSON_RPC: str({ desc: 'BTC JSON RPC Server to connect to blockchain' }),
  WALLET_HANDLE: str({ desc: 'Wallet handle' }),
  WALLET_PUBLIC_KEY: str({ desc: 'Wallet public key' }),
  WALLET_SECRET_KEY: str({ desc: 'Wallet private key' }),
  SYMBOL_FACTOR: num({ desc: 'Symbol factor' }),
})
