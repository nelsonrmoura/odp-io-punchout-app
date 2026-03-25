import type { EventContext } from '@vtex/api'

import type { Clients } from '../clients'
import {
  PUNCHOUT_SETUP_REQUEST_ENTITY_NAME,
  PUNCHOUT_SETUP_REQUEST_SCHEMA_NAME,
} from '../utils/consts'
import { logToMasterData } from '../utils/Logging'

export interface InstalledAppEvent extends EventContext<Clients> {
  body: { id?: string }
}

export const setupAppEnvironment = async (
  ctx: InstalledAppEvent,
  next: () => Promise<void>
) => {
  const {
    clients: { masterDataExtended },
  } = ctx

  try {
    await masterDataExtended.createOrUpdateSchema({
      dataEntity: PUNCHOUT_SETUP_REQUEST_ENTITY_NAME,
      name: PUNCHOUT_SETUP_REQUEST_SCHEMA_NAME,
      schema: {
        properties: {
          setupId: {
            type: 'string',
            title: 'Session ID',
          },
          status: {
            type: 'string',
            title: 'Status',
            default: 'pending',
          },
          content: {
            type: 'object',
            title: 'Session content',
          },
          expiresIn: {
            type: 'string',
            title: 'Expiry time',
          },
        },
        required: ['setupId', 'status', 'expiresIn'],
        'v-indexed': ['id', 'setupId', 'status', 'expiresIn'],
        'v-default-fields': ['id', 'setupId', 'status', 'content', 'expiresIn'],
        'v-security': {
          allowGetAll: true,
          publicRead: [
            'id',
            'setupId',
            'status',
            'content',
            'createdIn',
            'expiresIn',
            'lastInteractionIn',
          ],
          publicWrite: ['setupId', 'status', 'content', 'expiresIn'],
          publicFilter: ['setupId', 'status', 'expiresIn'],
        },
      },
    })
    await masterDataExtended.createOrUpdateIndex({
      dataEntity: PUNCHOUT_SETUP_REQUEST_ENTITY_NAME,
      name: `UniqueIndexForSetupIdOn${PUNCHOUT_SETUP_REQUEST_ENTITY_NAME}`,
      multiple: false,
      fields: 'setupId',
    })
    await masterDataExtended.createOrUpdateIndex({
      dataEntity: PUNCHOUT_SETUP_REQUEST_ENTITY_NAME,
      name: `NonUniqueIndexForStatusOn${PUNCHOUT_SETUP_REQUEST_ENTITY_NAME}`,
      multiple: true,
      fields: 'status',
    })
    await masterDataExtended.createOrUpdateIndex({
      dataEntity: PUNCHOUT_SETUP_REQUEST_ENTITY_NAME,
      name: `NonUniqueIndexForExpiresInOn${PUNCHOUT_SETUP_REQUEST_ENTITY_NAME}`,
      multiple: true,
      fields: 'expiresIn',
    })
  } catch (error) {
    console.error(error)
    logToMasterData(ctx, 'setupEnvironment-error', '', 'error', error)
  }

  await next()
}
