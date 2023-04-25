import axios from "axios";

const serviceUrl = 'https://e4cf-185-254-254-73.ngrok-free.app'

export class ExchangeService{
    async checkBalance(symbol){
        return 10000000000;
    }
    async getRate(from, to, amount, factor = 1){
        const responseAmount = '100';
        const unit = Number(responseAmount) * factor
        return Math.round(unit)
    }
    async storeTransaction(incomingIntentId, outcomingIntentId, symbol, amount){
        return true
    }
}
export class ExchangeService2{
    async checkBalance(symbol){
        const response = await axios.get(`${serviceUrl}/v1/symbols/${symbol}/balance`)
        return Number(response?.data?.amount)
    }
    async getRate(from, to, amount, factor = 1){
        const response = await axios.get(`${serviceUrl}/v1/symbols/${from}/${to}/${amount}`)
        return Number(response?.data?.amount) * factor
    }

    async storeTransaction(incomingIntentId, outcomingIntentId, symbol, amount){
        await axios.post(`${serviceUrl}/v1/symbols/${symbol}/transaction`, {
            extInId: incomingIntentId,
            extOutId: outcomingIntentId,
            amount
        })
    }
}