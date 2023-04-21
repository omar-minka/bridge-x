import axios from "axios";

export class BitcoinAPI {
  public static async getTransactions(address){
    try{
      const response = await axios.get(`https://api.blockcypher.com/v1/btc/test3/addrs/${address}/full`)
      const transactions = response?.data?.txs || []
      return [response?.data?.balance, transactions]
    } catch (error : any){
      return [0, []]
    }
  }
}