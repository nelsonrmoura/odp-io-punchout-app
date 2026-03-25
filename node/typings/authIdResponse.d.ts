interface AuthIdResponse {
  email: string
  authStatus: string
  id: string
  user: string
  account: string
  audience: string
  tokenType: string
  customerId: string
  isRepresentative: boolean
}

interface AppKeyTokenExchangeResponse {
  authStatus: string
  token: string
  expires: number
}

interface AuthStartResponse {
  url: string
}
