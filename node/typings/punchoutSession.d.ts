interface PunchoutSessionInput {
  authentication: PunchoutSessionAuthInput
  checkout: PunchoutSessionCheckoutInput
}

interface PunchoutSessionAuthInput {
  storeUserEmail: PunchoutSessionStoreUserEmailInput
}

interface PunchoutSessionCheckoutInput {
  orderFormId: PunchoutSessionOrderFormIdInput
}

interface PunchoutSessionStoreUserEmailInput {
  value: string
}

interface PunchoutSessionOrderFormIdInput {
  value: string
}
