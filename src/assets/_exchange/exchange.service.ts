import axios from "axios";

const serviceUrl = 'https://e4cf-185-254-254-73.ngrok-free.app'

export class ExchangeService{
    async checkBalance(symbol){
        const response = await axios.get(`${serviceUrl}/v1/symbols/${symbol}/balance`)
        return Number(response?.data?.amount)
    }
    async getRate(from, to, amount){
        const response = await axios.get(`${serviceUrl}/v1/symbols/${from}/${to}/${amount}`)
        return Number(response?.data?.amount)
    }

    async storeTransaction(incomingIntentId, outcomingIntentId, symbol, amount){
        await axios.post(`${serviceUrl}/v1/symbols/${symbol}/transaction`, {
            extInId: incomingIntentId,
            extOutId: outcomingIntentId,
            amount
        })
    }
}