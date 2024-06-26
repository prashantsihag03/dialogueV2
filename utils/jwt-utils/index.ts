import jwt, { type AccessTokenJwtPayload } from 'jsonwebtoken'
import SessionModel from '../../models/user/sessions.js'
import { type JwtTokens } from './types.js'
import { ACCESS_TOKEN_EXPIRATION, JWT_SECRET, REFRESH_TOKEN_EXPIRATION } from './contants.js'

const generateJwtToken = async (userId: string): Promise<JwtTokens> => {
  const accessToken = createAccessToken(userId)
  const refreshToken = createRefreshToken(userId)

  const sessionEntity = {
    ...SessionModel.createSessionKeys(userId, refreshToken),
    createdAt: new Date().toUTCString(),
    sessionId: refreshToken
  }

  await SessionModel.storeSession(sessionEntity)

  return {
    accessToken,
    refreshToken
  }
}

const validateAccessToken = async (
  accessToken: string
  // eslint-disable-next-line @typescript-eslint/member-delimiter-style
): Promise<{ expired: boolean; decoded: string | AccessTokenJwtPayload | null }> => {
  try {
    const decoded = jwt.verify(accessToken, JWT_SECRET) as AccessTokenJwtPayload
    return { decoded, expired: false }
  } catch (err: any) {
    if (err.name != null && err.name === 'TokenExpiredError') {
      return { expired: true, decoded: null }
    } else {
      throw err
    }
  }
}

const validateRefreshToken = async (refreshToken: string, username: string): Promise<boolean> => {
  try {
    jwt.verify(refreshToken, JWT_SECRET)
    const session = await SessionModel.getSession(username, refreshToken)
    if (
      session.Item?.sessionId != null &&
      session.Item.sessionId === refreshToken &&
      session.Item.username === username
    ) {
      return true
    }
    return false
  } catch (err) {
    return false
  }
}

const createAccessToken = (username: string): string => {
  return createToken({ username }, { expiresIn: Number(ACCESS_TOKEN_EXPIRATION) })
}

const createRefreshToken = (username: string): string => {
  return createToken({ username }, { expiresIn: Number(REFRESH_TOKEN_EXPIRATION) })
}

const createToken = (data: object, options: jwt.SignOptions): string => {
  return jwt.sign(data, JWT_SECRET, options)
}

const decodeAccessToken = (accessToken: string): AccessTokenJwtPayload => {
  return jwt.decode(accessToken, { json: true }) as AccessTokenJwtPayload
}

export default {
  generateJwtToken,
  validateAccessToken,
  validateRefreshToken,
  createAccessToken,
  createRefreshToken,
  createToken,
  decodeAccessToken
}
