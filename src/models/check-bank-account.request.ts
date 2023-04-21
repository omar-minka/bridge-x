export class CheckBankAccountRequest {
  constructor(
    public account: string,
    public document: string,
    public documentType: string,
  ) {}
}
