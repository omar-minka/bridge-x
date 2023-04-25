import dotenv from 'dotenv'
dotenv.config({ path: `${__dirname}/.env` })
import { config } from './config'
import {
  DataSourceOptions,
  LedgerClientOptions,
  ProcessorBuilder,
  ProcessorOptions,
  ServerBuilder,
  ServerOptions,
} from '@minka/bridge-sdk'
import sleep from 'sleep-promise'
import { AsyncCreditBankAdapter } from './adapters/async-credit.adapter'
import { AsyncDebitBankAdapter } from './adapters/async-debit.adapter'

import { BitcoinNetwork, ethereumNetwork } from './assets'

const dataSource: DataSourceOptions = {
  host: config.TYPEORM_HOST,
  port: config.TYPEORM_PORT,
  database: config.TYPEORM_DATABASE,
  username: config.TYPEORM_USERNAME,
  password: config.TYPEORM_PASSWORD,
  connectionLimit: config.TYPEORM_CONNECTION_LIMIT,
  migrate: false,
}

const ledger: LedgerClientOptions = {
  ledger: config.LEDGER_HANDLE,
  server: config.LEDGER_SERVER,
  ledgerSigner: {
    format: 'ed25519-raw',
    public: config.LEDGER_PUBLIC_KEY,
  },
  bridgeSigner: {
    format: 'ed25519-raw',
    public: config.BRIDGE_PUBLIC_KEY,
    secret: config.BRIDGE_SECRET_KEY,
  },
}

const bootstrapServer = async (processors: string[]) => {
  const server = ServerBuilder.init()
    .useDataSource({ ...dataSource, migrate: true })
    .useLedger(ledger)
    .useProcessors(processors)
    .build()

  const options: ServerOptions = {
    port: config.PORT,
    routePrefix: 'v2',
  }

  await server.start(options)
}

const bootstrapProcessor = async (handle: string) => {
  const creditAdapter = new AsyncCreditBankAdapter()
  const debitAdapter = new AsyncDebitBankAdapter()

  const processor = ProcessorBuilder.init()
    .useDataSource(dataSource)
    .useLedger(ledger)
    .useCreditAdapter(creditAdapter)
    .useDebitAdapter(debitAdapter)
    .build()

  const options: ProcessorOptions = {
    handle,
    sleep: 2000,
  }

  await processor.start(options)
}

const bootstrapListeners = async () => {
  return [ethereumNetwork, BitcoinNetwork]
}

const boostrap = async () => {
  const processors = ['proc-0']

  await bootstrapServer(processors)

  await sleep(2000) // wait for migrations to execute

  for (const handle of processors) {
    await bootstrapProcessor(handle)
  }

  const listeners = await bootstrapListeners() 

  for(const listener of listeners) {
    listener.startListening()
  }
}

boostrap()
