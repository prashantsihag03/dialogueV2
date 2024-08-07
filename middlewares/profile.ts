/* eslint-disable @typescript-eslint/indent */
import { type Request, type Response, type NextFunction } from 'express'
import { getUser, getUserProfileKey, updateSingleProfileKey, updateUser } from '../models/user/users.js'
import CustomError from '../utils/CustomError.js'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'node:fs/promises'
import { handleAsyncMdw } from '../utils/error-utils.js'
import { userProfileSchema } from '../models/user/schema.js'
import ValidationUtils from '../utils/validation-utils.js'
import { type z } from 'zod'

// eslint-disable-next-line @typescript-eslint/naming-convention
const __filename = fileURLToPath(import.meta.url)
// eslint-disable-next-line @typescript-eslint/naming-convention
const __dirname = path.dirname(__filename)

export const getProfile = async (_req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const response = await getUser(_res.locals.profileToFetch)
  if (response.$metadata.httpStatusCode !== 200 || response.Item == null) {
    _res.status(500).send('Something went wrong! Please try again later!')
    return
  }
  let profilePicture = response.Item.profileImg
  if (response.Item.profileImg == null) {
    const fileContents = await fs.readFile(path.join(__dirname, '../public/images/no-profile-picture.jpg'))
    profilePicture = fileContents.toString('base64')
  }
  delete response.Item.password
  _res.send({
    id: response.Item.username,
    fullname: response.Item.fullname,
    email: _res.locals.jwt.username === response.Item.username ? response.Item.email : null,
    profileImgSrc: '',
    lastOnlineUTCDateTime: '',
    bio: response.Item.bio ?? '',
    profileImg: profilePicture
  })
}

export const updateProfile = handleAsyncMdw(
  async (_req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const response = await getUser(_res.locals.profileToUpdate)
    if (response.$metadata.httpStatusCode !== 200 || response.Item == null) {
      throw new CustomError('User couldnt be found.', { code: 404 })
    }

    const updateUserResponse = await updateUser({
      email:
        _res.locals.newProfileData.email != null
          ? _res.locals.newProfileData.email
          : response.Item.email != null
          ? response.Item.email
          : '',
      fullname:
        _res.locals.newProfileData.fullname != null
          ? _res.locals.newProfileData.fullname
          : response.Item.fullname != null
          ? response.Item.fullname
          : '',
      password: response.Item.password,
      username: response.Item.username,
      bio:
        _res.locals.newProfileData.bio != null
          ? _res.locals.newProfileData.bio
          : response.Item.bio != null
          ? response.Item.bio
          : '',
      profileImg:
        _res.locals.newProfileData.profileImg != null
          ? _res.locals.newProfileData.profileImg
          : response.Item.profileImg != null
          ? response.Item.profileImg
          : ''
    })

    if (updateUserResponse.$metadata.httpStatusCode !== 200) {
      throw new CustomError('User profile couldnt be updated.', { code: 500 })
    }
    _res.sendStatus(200)
  }
)

export const getSingleProfileKey = handleAsyncMdw(
  async (_req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!Object.keys(userProfileSchema.shape).includes(_req.params?.profileKey)) {
      throw new CustomError('Invalid parameters', { code: 400 })
    }
    const profileResp = await getUserProfileKey(
      _res.locals.jwt.username,
      _req.params.profileKey as keyof z.infer<typeof userProfileSchema>
    )
    if (profileResp.$metadata.httpStatusCode !== 200) {
      throw new CustomError("Couldn't retrieve user profile key.", { code: 500 })
    }

    let profileValue = profileResp.Item != null ? profileResp.Item[_req.params.settingKey] : null

    if (profileValue == null && _req.params.profileKey === 'profileImg') {
      const fileContents = await fs.readFile(path.join(__dirname, '../public/images/no-profile-picture.jpg'))
      profileValue = fileContents.toString('base64')
    }

    _res.locals.userProfile = {}
    _res.locals.userProfile[_req.params.profileKey] = profileValue
    next()
  }
)

export const updateSingleUserProfileKey = handleAsyncMdw(
  async (_req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (
      !Object.keys(userProfileSchema.shape).includes(_req.params?.profileKey) ||
      !ValidationUtils.isValidBoolean(_req.params?.profileValue)
    ) {
      throw new CustomError('Provided profile key or value is invalid!', { code: 400 })
    }

    let newValue = _req.params.profileValue
    if (_req.params.profileKey === 'profileImg') {
      newValue = _res.locals.newProfileData.profileImg
    }
    const settingResp = await updateSingleProfileKey(_res.locals.jwt.username, _req.params.profileKey, newValue)

    if (settingResp.$metadata.httpStatusCode !== 200) {
      throw new CustomError("Couldn't update user profile.", { code: 500 })
    }
    next()
  }
)
