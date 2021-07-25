// 记录微信相关的接口， API项目 -> 微信官方服务器
import axios from 'axios'
import config from '@/config'
import crypto from 'crypto'
import WXBizDataCrypt from './WXBizDataCrypt'

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
