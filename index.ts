import { isDevEnv } from './constants.js'
import createApp from './app.js'
import { checkDbConnection } from './models/connection.js'
import appLogger from './appLogger.js'
import PresenceSystem from './Socket/PresenceSystem.js'

const port: number = process.env.PORT != null && process.env.PORT !== '' ? Number(process.env.PORT) : 3000

checkDbConnection(
  () => {
    appLogger.info('Database connection check successfull')
  },
  (err) => {
    appLogger.error(`Database connection check failed: ${JSON.stringify(err)}`)
    process.exit(1)
  }
)

const presenceSystem = new PresenceSystem()
const server = createApp(presenceSystem)

server.listen(port, () => {
  if (isDevEnv) {
    appLogger.info(`DialogueV2 Dev Backend Server: http://localhost:${port}/`)
  } else {
    appLogger.info('DialogueV2 Application successfully started!')
  }
})
