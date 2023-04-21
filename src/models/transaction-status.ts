export enum TransactionStatusesEnum {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

export function resolveTransactionStatus(status: string, errorCode: string) {
  if (status === 'A') {
    return TransactionStatusesEnum.COMPLETED
  }

  if (errorCode === '00014') {
    return TransactionStatusesEnum.PENDING
  }

  return TransactionStatusesEnum.ERROR
}
