import crypto from 'node:crypto'

export function hashMd5(text: string) {
  const hash = crypto.createHash('md5')

  return hash.update(text).digest('hex')
}

export const transformRequest = async (
  request: PunchOutSetupRequest
): Promise<PunchOutSetupRequest> => {
  const hashedPassword = hashMd5(request.session.header.sender.sharedSecret)

  return {
    ...request,
    session: {
      ...request.session,
      header: {
        ...request.session.header,
        sender: {
          ...request.session.header.sender,
          sharedSecret: hashedPassword,
        },
      },
    },
  }
}
