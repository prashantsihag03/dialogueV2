/* eslint-disable @typescript-eslint/indent */
import { type Socket } from 'socket.io'
import { type ExtendedError } from 'socket.io/dist/namespace'
import { type DefaultEventsMap } from 'socket.io/dist/typed-events'
import appLogger from '../appLogger.js'
import JwtUtils from '../utils/jwt-utils/index.js'
import SessionUtils from '../utils/session-utils.js'
import type PresenceSystem from './PresenceSystem.js'

export const socketAuthMDW = (
  socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>,
  next: (err?: ExtendedError) => void
): void => {
  if (socket.request.headers.cookie == null) {
    appLogger.error('Socket conn invalidated due to missing cookies!')
    next(new Error('Invalid!'))
    return
  }

  const sessionTokens = SessionUtils.extractSessionDataFromHeaders(socket.request)
  if (sessionTokens == null) {
    appLogger.error('Socket conn invalidated due to invalid tokens!')
    next(new Error('Invalid!'))
    return
  }

  JwtUtils.validateAccessToken(sessionTokens.accessToken)
    .then((result) => {
      if (result.decoded != null && !result.expired) {
        socket.data.jwt = result.decoded
        socket.data.refreshToken = sessionTokens.refreshToken
        next()
        return
      }
      appLogger.info('Auth failed for socket conn')
      next(new Error('Unauthorised!'))
    })
    .catch((err) => {
      appLogger.error(`Error encountered while validating access token from socket middleware ${JSON.stringify(err)}`)
      next(new Error('Something went wrong. Please try again later!'))
    })
}

export const socketSessionRecordLastActivity =
  (presenceSystem: PresenceSystem) =>
  (
    socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>,
    next: (err?: ExtendedError) => void
  ): void => {
    if (socket.data?.jwt?.username != null) {
      presenceSystem.updateSocketsessionLastActivity(socket.data.jwt.username, socket.id)
    }
    next()
  }
