// 记录微信相关的接口， API项目 -> 微信官方服务器
import config from '@/config'
import log4js from '@/config/Log4j'
import { getValue, setValue } from '@/config/RedisConfig'
import axios from 'axios'
import crypto from 'crypto'
import WXBizDataCrypt from './WXBizDataCrypt'

const logger = log4js.getLogger('error')

const instance = axios.create({
  timeout: 10000
})

// 获取session_key，openid 等OpenData数据
export const wxGetOpenData = async (code) => {
  // sessin_key, openid, unoinid
  const res = await instance.get(`https://api.weixin.qq.com/sns/jscode2session?appid=${config.AppID}&secret=${config.AppSecret}&js_code=${code}&grant_type=authorization_code`)
  // console.log('🚀 ~ file: WxUtils.js ~ line 11 ~ wxGetOpenData ~ res', res)
  return res.data
}

// 获取解密用户的信息
export const wxGetUserInfo = async (user, code) => {
  // 1.获取用户的openData -> session_key
  const data = await wxGetOpenData(code)
  const { session_key: sessionKey } = data
  if (sessionKey) {
    // 2.用户数据进行签名校验 -> sha1 -> session_key + rawData + signature
    const { rawData, signature, encryptedData, iv } = user
    const sha1 = crypto.createHash('sha1')
    sha1.update(rawData)
    sha1.update(sessionKey)
    if (sha1.digest('hex') !== signature) {
      // 校验失败
      return Promise.reject(
        new Error({
          code: 500,
          msg: '签名校验失败'
        })
      )
    }
    const wxBizDataCrypt = new WXBizDataCrypt(config.AppID, sessionKey)
    // 3.用户加密数据的解密
    const userInfo = wxBizDataCrypt.decryptData(encryptedData, iv)
    return { ...userInfo, ...data, errcode: 0 }
  } else {
    // data -> errcode非0 ，请求失败
    return data
  }
}

// flag 强制刷新，默认false - 不强制刷新
export const wxGetAccessToken = async (flag = false) => {
  // https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=APPID&secret=APPSECRET
  // 1.判断redis中是否有accessToken
  // 2.有 & flag -> 则直接返回
  // 3.没有 -> 请求新的token
  let accessToken = await getValue('accessToken')
  if (!accessToken || flag) {
    try {
      const result = await instance.get(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${config.AppID}&secret=${config.AppSecret}`)
      // console.log('🚀 ~ file: WxUtils.js ~ line 60 ~ wxGetAccessToken ~ result', result)
      if (result.status === 200) {
        await setValue('accessToken', result.data.access_token, result.data.expires_in)
        accessToken = result.data.access_token
        if (result.data.errcode && result.data.errmsg) {
          logger.error(`wxGetAccessToken error${result.data.errcode} - ${result.data.errmsg}`)
        }
      }
    } catch (error) {
      logger.error(`wxGetAccessToken error: ${error.message}`)
    }
  }
  return accessToken
}

export const wxSendMessage = async (options) => {
  // POST https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=ACCESS_TOKEN
  let accessToken = await wxGetAccessToken()
  try {
    const { data } = await instance.post(`https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${accessToken}`, options)
    return data
  } catch (error) {
    logger.error(`wxSendMessage error: ${error.message}`)
  }
}
