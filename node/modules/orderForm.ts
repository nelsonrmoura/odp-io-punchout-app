import { ResolverError } from '@vtex/api'

import { logToMasterData } from '../utils/Logging'
import { WEB_METHODS_ATTACHMENT_NAME } from '../utils/consts'

export const updateOrderFormWithAddress = async ({
  checkout,
  orderForm,
  addressData,
  ctx,
}: {
  checkout: Context['clients']['checkout']
  orderForm: OrderForm
  addressData: AddressData | undefined
  ctx: Context
}): Promise<OrderForm> => {
  if (!addressData) {
    return orderForm
  }

  try {
    const updatedOrderForm = await checkout.setAddressData(
      addressData,
      orderForm.orderFormId
    )

    if (!updatedOrderForm) {
      throw new ResolverError('Failed to update order form with address data')
    }

    return updatedOrderForm
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'

    // logger.error(`Error updating order form with address: ${errorMessage}`)
    logToMasterData(
      ctx,
      'updateOrderFormWithAddress-error',
      orderForm.orderFormId,
      'error',
      error
    )
    throw new ResolverError(
      error instanceof Error ? error : new Error(errorMessage)
    )
  }
}

export const updateOrderFormWithProfile = async ({
  checkout,
  orderForm,
  profileData,
  ctx,
}: {
  checkout: Context['clients']['checkout']
  orderForm: OrderForm
  profileData: ProfileData
  ctx: Context
}): Promise<OrderForm> => {
  try {
    const updatedOrderForm = await checkout.setProfileData(
      {
        ...profileData,
        firstName: profileData.firstName ?? '',
        lastName: profileData.lastName ?? '',
        phone: profileData.phone ?? '',
        document: profileData.document ?? '',
        profilePicture: profileData.profilePicture ?? '',
      },
      orderForm.orderFormId
    )

    if (!updatedOrderForm) {
      throw new ResolverError('Failed to update order form with profile data')
    }

    return updatedOrderForm
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'

    // logger.error(`Error updating order form with profile: ${errorMessage}`)
    logToMasterData(
      ctx,
      'updateOrderFormWithProfile-error',
      orderForm.orderFormId,
      'error',
      error
    )
    throw new ResolverError(
      error instanceof Error ? error : new Error(errorMessage)
    )
  }
}

export const addItemsToCart = async ({
  checkout,
  orderFormId,
  items,
  ctx,
}: {
  checkout: Context['clients']['checkout']
  orderFormId: string
  items: SetupItem[]
  ctx: Context
}): Promise<OrderForm> => {
  try {
    if (!items || !Array.isArray(items)) {
      logToMasterData(
        ctx,
        'addItemsToCart-error',
        orderFormId,
        'error',
        'No items found in the setup request'
      )
      throw new ResolverError('No items found in the setup request')
    }

    const itemsWithIds = items
      .map((item) => {
        return {
          ...item,
          crossRefItem: ctx.state.crossRefItemList.find(
            (crf) => crf.vendorSkuId === item.refId
          ),
        }
      })
      .filter(
        (item) => !!item.crossRefItem?.skuId && Number(item.crossRefItem.skuId)
      )

    const itemsToAdd = itemsWithIds.map((item) => {
      return {
        // At this point, only the items with ID are present.
        id: item.crossRefItem?.skuId ?? '',
        quantity: item.quantity,
        seller: 'odpseller',
        attachments: [
          {
            name: WEB_METHODS_ATTACHMENT_NAME,
            content: {
              ...(item.comments ? { comments: item.comments } : {}),
              customerItemId: item.refId,
            },
          },
        ],
      }
    })

    if (itemsToAdd.length > 0) {
      const addToCartResponse = await checkout.handleCartItems(orderFormId, {
        orderItems: [...itemsToAdd],
      })

      return addToCartResponse as OrderForm
    }

    const orderForm = (await checkout.getOrderForm(orderFormId)) as OrderForm

    return orderForm
  } catch (error) {
    logToMasterData(ctx, 'addItemsToCart-error', orderFormId, 'error', error)
    throw new ResolverError(error)
  }
}
