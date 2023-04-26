import { cleanEnv, host, num, port, str } from "envalid";

export const config = cleanEnv(process.env, {
  BRIDGE_PUBLIC_KEY: str({ desc: "Bridge public key" }),
  BRIDGE_SECRET_KEY: str({ desc: "Bridge private key" }),
  LEDGER_HANDLE: str({ desc: "Ledger name" }),
  LEDGER_SERVER: str({ desc: "Ledger URL" }),
  LEDGER_PUBLIC_KEY: str({ desc: "Ledger public key" }),
  PORT: port({ default: 3000, desc: "HTTP listen port" }),
  TYPEORM_HOST: host({ desc: "Database connection host" }),
  TYPEORM_PORT: port({ desc: "Database connection port" }),
  TYPEORM_USERNAME: str({ desc: "Database connection username" }),
  TYPEORM_PASSWORD: str({ desc: "Database connection password" }),
  TYPEORM_DATABASE: str({ desc: "Database name" }),
  TYPEORM_CONNECTION_LIMIT: num({
    default: 100,
    desc: "Database connections limit",
  }),
  COOPCENTRAL_ENTITY: str(),
  COOPCENTRAL_USER: str(),
  COOPCENTRAL_KEY1: str(),
  COOPCENTRAL_KEY2: str(),
  COOPCENTRAL_PASSWORD: str(),
  COOPCENTRAL_URL: str(),
  COOPCENTRAL_VIRTUAL_ACCOUNT: num(),
  COOPCENTRAL_OPERATION_ORIGIN: num(),
  COOPCENTRAL_API_KEY: str(),

  BANK_NAME: str(),
  BANK_BICFI: num(),
  BANK_WALLET_HANDLE: str(),
  BANK_SIGNER_HANDLE: str(),
  BANK_KEEPER_PUBLIC_KEY: str(),
  BANK_KEEPER_PRIVATE_KEY: str(),
  BANK_KEEPER_SCHEME: str(),

  CURRENCY_FACTOR: num(),

  SERVICE_API_PORT: num(),
  SERVICE_API_USERNAME: str(),
  SERVICE_API_PASSWORD: str(),
});
