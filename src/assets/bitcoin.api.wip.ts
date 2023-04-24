import axios from "axios";
import { config } from "../config";

export class BitcoinAPI {
  public static async method(method, args = []){
    const response = await axios.post(config.BTC_JSON_RPC, {
      jsonrpc: "2.0",
      id:"bridge",
      method,
      params: args
    })
    return response.data
  }
  public static async getTransactions(address){
    try{
      const blockchainInfo = await this.method('getblockchaininfo')
      const bestBlock = blockchainInfo?.result?.bestblockhash
      
      const block = await this.method('getblock', [bestBlock])

      const transactions = block?.result?.tx


    } catch (error : any){
      return [0, []]
    }
  }
}