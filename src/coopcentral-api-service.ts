import { toString } from 'lodash'
import * as convert from 'xml-js'
import { Client } from 'soap'
import { getEncryptionKey, encryptData, decryptData } from './crypt'
import {
    AccountDetailsRequest,
    AccountDetailsResponse,
    CheckBankAccountRequest,
    CheckBankAccountResponse,
    CheckTransactionStatusRequest,
    CheckTransactionStatusResponse,
    CreateBankTransactionRequest,
    CreateBankTransactionResponse,
    ServiceError,
} from './models'
import {
    AccountChecking,
    AccountCheckingInputXML,
    ClientInfo,
    ClientInfoInputXML,
    CoopcentralCreateTransaction,
    CreateTransactionInputXML,
    OutputWithError,
    Product,
    ServiceCallResponse,
    CheckTransactionStatus,
    CheckTransactionStatusInputXML,
} from './models/Soap'
import { createSoapClient } from './soap-client'

/**
 * Code '' => OK code, no error
 * Code '0' => OK code, no error
 * Code '00000' => OK code, no error
 * Code '00014' => code for transaction in pending state
 * For more info check Coopcentral manual
 */
const WHITELIST_OF_ERROR_CODES = ['', '0', '00000', '00014']

export type CoopcentralApiConfig = {
    ENTITY: string
    USER: string
    KEY1: string
    KEY2: string
    PASSWORD: string
    URL: string
    OPERATION_ORIGIN: string
}

export class CoopcentralApiService {
    private url: string
    private entity: string
    private user: string
    private key1: string
    private key2: string
    private password: string
    private operationOrigin: string

    private readonly iv = Buffer.alloc(16, 0)
    private soapService: Client

    constructor(options) {
        this.url = options.COOPCENTRAL_URL
        this.entity = options.COOPCENTRAL_ENTITY
        this.user = options.COOPCENTRAL_USER
        this.key1 = options.COOPCENTRAL_KEY1
        this.key2 = options.COOPCENTRAL_KEY2
        this.password = options.COOPCENTRAL_PASSWORD
        this.operationOrigin = options.COOPCENTRAL_OPERATION_ORIGIN
    }

    private get encryptionKey() {
        return getEncryptionKey(this.key1, this.key2)
    }

    private encrypt(plainText: string): string {
        return encryptData(this.encryptionKey, this.iv, plainText)
    }

    private decrypt(encrypted: string): string {
        return decryptData(this.encryptionKey, this.iv, encrypted)
    }

    private async handleOutputXML<T>(outputXML: string): Promise<T> {
        let output = this.decrypt(outputXML)
        output = output.replace('<?xml version="1.0" encoding="ISO-8859-1"?>', '')
        output = output.slice(0, output.lastIndexOf('>') + 1)
        return convert.xml2js(output, { compact: true }) as T
    }

    private async xml(inputXml: string, product: number) {
        return `<bcc:BCCExecute xmlns:bcc="http://bccservice.coopcentral.com/">
      <input>
        <entity>${this.entity}</entity>
        <inputXML>${this.encrypt(inputXml)}</inputXML>
        <password>${this.encrypt(this.password)}</password>
        <product>${product}</product>
        <user>${this.user}</user>
      </input>
  </bcc:BCCExecute>`
    }

    private async executeSoapCall<T>(
        inputXML: string,
        product: Product,
    ): Promise<T> {
        try {
            const enc = await this.xml(inputXML, product)
            const [result]: [ServiceCallResponse] =
                await this.soapService.BCCExecuteAsync({
                    _xml: enc,
                })

            if (result.return.codError != 0) {
                const err = ServiceError.fromServiceResponse(result)
                throw err
            }
            const response = await this.handleOutputXML<T>(result.return.outputXML)

            const err = (response as OutputWithError).WSBCC?.DETALLE?.CODERROR?._text
            if (!WHITELIST_OF_ERROR_CODES.includes(toString(err))) {
                const error = ServiceError.fromServiceResponseWithInnerError(
                    response as OutputWithError,
                )

                throw error
            }

            return response
        } catch (e) {
            if (!(e instanceof ServiceError)) {
                const err = new ServiceError('system', e)
                throw err
            }

            throw e
        }
    }

    async createInputXml(inputXmlConstructor, inputXmlArguments) {
        // we chose this to be a centralized place to lazy load the soap module
        if (!this.soapService) {
            this.soapService = await createSoapClient(
                this.url,
                this.user,
                this.password,
            )
        }

        return inputXmlConstructor(inputXmlArguments)
    }

    async fetchAccountDetails(
        request: AccountDetailsRequest,
    ): Promise<AccountDetailsResponse> {
        const response = await this.executeSoapCall<ClientInfo>(
            await this.createInputXml(ClientInfoInputXML, {
                entity: this.entity,
                ...request,
            }),
            Product.ACCOUNT_DETAILS,
        )
        return AccountDetailsResponse.fromBankResponse(response)
    }

    async checkBankAccount(
        args: CheckBankAccountRequest,
    ): Promise<CheckBankAccountResponse> {
        const response = await this.executeSoapCall<AccountChecking>(
            await this.createInputXml(AccountCheckingInputXML, {
                entity: this.entity,
                ...args,
            }),
            Product.CHECK_BANK_ACCOUNT,
        )
        return CheckBankAccountResponse.fromBankReponse(response)
    }

    async createBankTransaction(
        args: CreateBankTransactionRequest,
    ): Promise<CreateBankTransactionResponse> {
        const response = await this.executeSoapCall<CoopcentralCreateTransaction>(
            await this.createInputXml(CreateTransactionInputXML, {
                entity: this.entity,
                origOper: this.operationOrigin,
                ...args,
            }),
            Product.PROCESS_TRANSACTION,
        )
        return CreateBankTransactionResponse.fromBankResponse(response)
    }

    async checkTransactionStatus(
        args: CheckTransactionStatusRequest,
    ): Promise<CheckTransactionStatusResponse> {
        const response = await this.executeSoapCall<CheckTransactionStatus>(
            await this.createInputXml(CheckTransactionStatusInputXML, {
                entity: this.entity,
                ...args,
            }),
            Product.STATUS_CHECK,
        )
        return CheckTransactionStatusResponse.fromBankResponse(response)
    }
}