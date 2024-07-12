/* eslint-disable @typescript-eslint/space-before-function-paren */
import { type Server } from 'socket.io'
import { type DefaultEventsMap } from 'socket.io/dist/typed-events'
import type PresenceSystem from './PresenceSystem'
import { emitEventToAllUserSessions } from '../utils/socket-utils'

export enum SocketServerEvents {
  newConversation = 'new-conversation'
}

export default class SocketServerEventEmitter {
  private readonly socketServer: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
  private readonly presenceSystem: PresenceSystem

  constructor(
    presenceSystem: PresenceSystem,
    socketServer: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
  ) {
    this.socketServer = socketServer
    this.presenceSystem = presenceSystem
  }

  async newConversation(users: string[], data: any): Promise<void> {
    await emitEventToAllUserSessions(
      this.presenceSystem,
      this.socketServer,
      users,
      SocketServerEvents.newConversation,
      data
    )
  }
}
