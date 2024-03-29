import helmet from 'helmet'
import type http from 'http'
import { Server, type ServerOptions } from 'socket.io'
import { type DefaultEventsMap } from 'socket.io/dist/typed-events'
import PresenceSystem from './PresenceSystem.js'
import socketAuthMDW from './middleware.js'
import SockEvents from './SockEvents.js'
import { handleSocketEvent } from '../utils/error-utils.js'

type httpServer = http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>
type SocketIoServer = Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>

const socketServerOptions: Partial<ServerOptions> = {
  maxHttpBufferSize: 1e7
}

/**
 * Sets up and initialises a SocketIO server along with assigning it with all middlewares, and events.
 * @param httpServer
 */
export default function (httpServer: httpServer): SocketIoServer {
  const SocketIO = new Server(httpServer, socketServerOptions)

  const presenceSystem = new PresenceSystem()
  const sockEvents = new SockEvents(presenceSystem, SocketIO)

  // Socket Level Middlewares
  SocketIO.engine.use(helmet())
  SocketIO.use(socketAuthMDW)

  // SocketIO Events
  SocketIO.on('connection', (socket) => {
    sockEvents.onConnect(socket)
    socket.on('disconnect', () => {
      sockEvents.onDisconnect(socket)
    })
    socket.on(
      'message',
      handleSocketEvent(async (data, callback) => {
        await sockEvents.onMessage(socket, data, callback)
      })
    )
    socket.on('initiateCall', async (data, callback) => {
      await sockEvents.onOffer(socket, data, callback, SocketIO)
    })
    socket.on('answerCall', async (data, callback) => {
      await sockEvents.onAnswer(socket, data, callback, SocketIO)
    })
  })

  return SocketIO
}
