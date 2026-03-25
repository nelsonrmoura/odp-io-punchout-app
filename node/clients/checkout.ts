import type {
  InstanceOptions,
  IOContext,
  IOResponse,
  RequestConfig,
} from '@vtex/api'
import { ExternalClient } from '@vtex/api'

import {
  checkoutCookieFormat,
  ownershipCookieFormat,
  statusToError,
} from '../utils'

export class Checkout extends ExternalClient {
  constructor(ctx: IOContext, options?: InstanceOptions) {
    super(`http://${ctx.account}.vtexcommercestable.com.br`, ctx, {
      ...options,
      headers: {
        ...options?.headers,
        ...(ctx.storeUserAuthToken
          ? { VtexIdclientAutCookie: ctx.storeUserAuthToken }
          : {}),
        'x-vtex-use-https': 'true',
      },
      timeout: 10000,
    })
  }

  private getCommonHeaders = () => {
    const { orderFormId, ownerId } = (this
      .context as unknown) as CustomIOContext

    const checkoutCookie = orderFormId ? checkoutCookieFormat(orderFormId) : ''
    const ownershipCookie = ownerId ? ownershipCookieFormat(ownerId) : ''

    return {
      Cookie: `${checkoutCookie}${ownershipCookie}vtex_segment=${this.context.segmentToken};vtex_session=${this.context.sessionToken};`,
    }
  }

  public newOrderForm = async (): Promise<void | OrderForm> => {
    try {
      return await this.get<OrderForm>(this.routes.newOrderForm(), {
        metric: 'new-orderForm',
      })
    } catch (error) {
      this.context.logger.error(`[newOrderForm] error : ${error}`)
      throw error
    }
  }

  public getOrderForm = async (
    orderFormId: string
  ): Promise<void | OrderForm> => {
    try {
      return this.get<OrderForm>(this.routes.getOrderForm(orderFormId), {
        metric: 'get-orderForm',
      })
    } catch (error) {
      this.context.logger.error(`[getOrderForm] error : ${error}`)
      throw error
    }
  }

  public getOrderFormRaw = async (
    orderFormId: string
  ): Promise<void | IOResponse<OrderForm>> => {
    try {
      return this.getRaw<OrderForm>(this.routes.getOrderForm(orderFormId), {
        metric: 'get-orderForm',
      })
    } catch (error) {
      this.context.logger.error(`[getOrderForm] error : ${error}`)
      throw error
    }
  }

  public setProfileData = async (
    profileData: ProfileData,
    orderFormId: string
  ): Promise<void | OrderForm> => {
    return this.post<OrderForm>(
      this.routes.profileData(orderFormId),
      profileData
    )
  }

  public setAddressData = async (
    addressData: AddressData,
    orderFormId: string
  ): Promise<void | OrderForm> => {
    try {
      return await this.post<OrderForm>(
        this.routes.addressData(orderFormId),
        addressData
      )
    } catch (error) {
      this.context.logger.error(`[setAddressData] error : ${error}`)
      throw error
    }
  }

  public updateSingleFieldCustomData = async ({
    orderFormId,
    appId,
    appFieldName,
    value,
  }: {
    orderFormId: string
    appId: string
    appFieldName: string
    value: string
  }): Promise<void | OrderForm> => {
    return this.put(
      this.routes.updateCustomDataUrl(orderFormId, appId, appFieldName),
      {
        value,
      }
    )
  }

  public addToCart = async (
    orderFormId: string,
    data: { orderItems: InputOrderFormItem[] }
  ): Promise<void | OrderForm> => {
    return this.post<OrderForm>(this.routes.addToCart(orderFormId), data)
  }

  public handleCartItems = async (
    orderFormId: string,
    data: { orderItems: InputOrderFormItemWithAttachments[] }
  ): Promise<void | OrderForm> => {
    return this.patch<OrderForm>(this.routes.addToCart(orderFormId), data)
  }

  protected get = async <T>(
    url: string,
    config: RequestConfig = {}
  ): Promise<void | T> => {
    config.headers = {
      ...config.headers,
      ...this.getCommonHeaders(),
    }

    try {
      return await this.http.get<T>(url, config)
    } catch (e) {
      return statusToError(e)
    }
  }

  protected getRaw = async <T>(
    url: string,
    config: RequestConfig = {}
  ): Promise<void | IOResponse<T>> => {
    config.headers = {
      ...config.headers,
      ...this.getCommonHeaders(),
    }

    try {
      return await this.http.getRaw<T>(url, config)
    } catch (e) {
      return statusToError(e)
    }
  }

  protected post = async <T>(
    url: string,
    data?: unknown,
    config: RequestConfig = {}
  ): Promise<void | T> => {
    config.headers = {
      ...config.headers,
      ...this.getCommonHeaders(),
    }

    try {
      return await this.http.post<T>(url, data, config)
    } catch (e) {
      return statusToError(e)
    }
  }

  protected put = async <T>(
    url: string,
    data?: unknown,
    config: RequestConfig = {}
  ): Promise<void | T> => {
    config.headers = {
      ...config.headers,
      ...this.getCommonHeaders(),
    }

    try {
      return await this.http.put<T>(url, data, config)
    } catch (e) {
      return statusToError(e)
    }
  }

  protected patch = async <T>(
    url: string,
    data?: unknown,
    config: RequestConfig = {}
  ): Promise<void | T> => {
    config.headers = {
      ...config.headers,
      ...this.getCommonHeaders(),
    }

    try {
      return await this.http.patch<T>(url, data, config)
    } catch (e) {
      return statusToError(e)
    }
  }

  private get routes() {
    const baseUrl = '/api/checkout/pub/orderForm'

    // https://{accountName}.{environment}.com.br/api/checkout/pub/orderForm/{orderFormId}/customData/{appId}/{appFieldName}

    return {
      newOrderForm: () => `${baseUrl}`,
      profileData: (orderFormId: string) =>
        `${baseUrl}/${orderFormId}/attachments/clientProfileData`,
      addressData: (orderFormId: string) =>
        `${baseUrl}/${orderFormId}/attachments/shippingData`,
      getOrderForm: (orderFormId: string) => `${baseUrl}/${orderFormId}`,
      updateCustomDataUrl: (
        orderFormId: string,
        appId: string,
        appFieldName: string
      ) => `${baseUrl}/${orderFormId}/customData/${appId}/${appFieldName}`,
      updateMultipleCustomDataUrl: (orderFormId: string, appId: string) =>
        `${baseUrl}/${orderFormId}/customData/${appId}`,
      addToCart: (orderFormId: string) => `${baseUrl}/${orderFormId}/items`,
    }
  }
}
