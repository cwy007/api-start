import send from '@/config/MailConfig'
import bcrypt from 'bcrypt'
import moment from 'dayjs'
import jsonwebtoken from 'jsonwebtoken'
import config from '@/config'
import { checkCode, generateToken } from '@/common/Utils'
import User from '@/model/User'
import SignRecord from '../model/SignRecord'
import { getValue, setValue, delValue } from '@/config/RedisConfig'
import { getJWTPayload } from '../common/Utils'
import { v4 as uuidv4 } from 'uuid'
import { wxGetUserInfo, wxGetOpenData } from '../common/WxUtils'
import WXBizDataCrypt from '../common/WXBizDataCrypt'

const addSign = async (user) => {
  const userObj = user.toJSON()
  const signRecord = await SignRecord.findByUid(userObj._id)
  if (signRecord !== null) {
    if (moment(signRecord.created).format('YYYY-MM-DD') === moment().format('YYYY-MM-DD')) {
      userObj.isSign = true
    } else {
      userObj.isSign = false
    }
    userObj.lastSign = signRecord.created
  } else {
    // 用户无签到记录
    userObj.isSign = false
  }
  return userObj
}

class LoginController {
  // 忘记密码，发送邮件
  async forget (ctx) {
    const { body } = ctx.request
    const user = await User.findOne({ username: body.username })
    if (!user) {
      ctx.body = {
        code: 404,
        msg: '请检查账号！'
      }
      return
    }
    try {
      const key = uuidv4()
      setValue(
        key,
        jsonwebtoken.sign({ _id: user._id }, config.JWT_SECRET, {
          expiresIn: '30m'
        }),
        30 * 60
      )
      // body.username -> database -> email
      const result = await send({
        type: 'reset',
        data: {
          key: key,
          username: body.username
        },
        expire: moment()
          .add(30, 'minutes')
          .format('YYYY-MM-DD HH:mm:ss'),
        email: body.username,
        user: user.name ? user.name : body.username
      })
      ctx.body = {
        code: 200,
        data: result,
        msg: '邮件发送成功'
      }
    } catch (e) {
      console.log(e)
    }
  }

  // 用户登录
  async login (ctx) {
    // 接收用户的数据
    // 返回token
    const { body } = ctx.request
    const sid = body.sid
    const code = body.code
    // 验证图片验证码的时效性、正确性
    const result = await checkCode(sid, code)
    if (result) {
      // 验证用户账号密码是否正确
      let checkUserPasswd = false
      const user = await User.findOne({ username: body.username })
      if (user === null) {
        ctx.body = {
          code: 404,
          msg: '用户名或者密码错误'
        }
        return
      }
      if (await bcrypt.compare(body.password, user.password)) {
        checkUserPasswd = true
      }
      // mongoDB查库
      if (checkUserPasswd) {
        // 验证通过，返回Token数据
        const userObj = await addSign(user)
        const arr = ['password', 'username']
        arr.forEach((item) => {
          delete userObj[item]
        })
        const token = generateToken({ _id: userObj._id })
        // 加入isSign属性

        ctx.body = {
          code: 200,
          data: userObj,
          token: token
        }
      } else {
        // 用户名 密码验证失败，返回提示
        ctx.body = {
          code: 404,
          msg: '用户名或者密码错误'
        }
      }
    } else {
      // 图片验证码校验失败
      ctx.body = {
        code: 401,
        msg: '图片验证码不正确,请检查！'
      }
    }
  }

  // 注册接口
  async reg (ctx) {
    // 接收客户端的数据
    const { body } = ctx.request
    // 校验验证码的内容（时效性、有效性）
    const sid = body.sid
    const code = body.code
    let msg = {}
    // 验证图片验证码的时效性、正确性
    const result = await checkCode(sid, code)
    let check = true
    if (result) {
      // 查库，看username是否被注册
      const user1 = await User.findOne({ username: body.username })
      if (user1 !== null && typeof user1.username !== 'undefined') {
        msg.username = ['此邮箱已经注册，可以通过邮箱找回密码']
        check = false
      }
      const user2 = await User.findOne({ name: body.name })
      // 查库，看name是否被注册
      if (user2 !== null && typeof user2.name !== 'undefined') {
        msg.name = ['此昵称已经被注册，请修改']
        check = false
      }
      // 写入数据到数据库
      if (check) {
        body.password = await bcrypt.hash(body.password, 5)
        const user = new User({
          username: body.username,
          name: body.name,
          password: body.password
          // created: moment().format('YYYY-MM-DD HH:mm:ss')
        })
        const result = await user.save()
        ctx.body = {
          code: 200,
          data: result,
          msg: '注册成功'
        }
        return
      }
    } else {
      // veevalidate 显示的错误
      msg.code = ['验证码已经失效，请重新获取！']
    }
    ctx.body = {
      code: 500,
      msg: msg
    }
  }

  // 密码重置
  async reset (ctx) {
    const { body } = ctx.request
    const sid = body.sid
    const code = body.code
    let msg = {}
    // 验证图片验证码的时效性、正确性
    const result = await checkCode(sid, code)
    if (!body.key) {
      ctx.body = {
        code: 500,
        msg: '请求参数异常，请重新获取链接'
      }
      return
    }
    if (!result) {
      msg.code = ['验证码已经失效，请重新获取！']
      ctx.body = {
        code: 500,
        msg: msg
      }
      return
    }
    const token = await getValue(body.key)
    if (token) {
      const obj = getJWTPayload('Bearer ' + token)
      body.password = await bcrypt.hash(body.password, 5)
      await User.updateOne(
        { _id: obj._id },
        {
          password: body.password
        }
      )
      ctx.body = {
        code: 200,
        msg: '更新用户密码成功！'
      }
    } else {
      ctx.body = {
        code: 500,
        msg: '链接已经失效'
      }
    }
  }

  // 微信登录
  async wxLogin (ctx) {
  // 1.解密用户信息
    const { body } = ctx.request
    const { user, code } = body
    if (!code) {
      ctx.body = {
        code: 500,
        data: '没有足够参数'
      }
      return
    }
    const res = await wxGetUserInfo(user, code)
    if (res.errcode === 0) {
    // 2.查询数据库 -> 判断用户是否存在
    // 3.如果不存在 —> 创建用户
    // 4.如果存在 -> 获取用户信息
      const tmpUser = await User.findOrCreateByUnionid(res)
      // 5.产生token，获取用户的签到状态
      const token = generateToken({ _id: tmpUser._id })
      const userInfo = await addSign(tmpUser)
      ctx.body = {
        code: 200,
        data: userInfo,
        token
      }
    } else {
      ctx.throw(501, res.errcode === 40163 ? 'code已失效，请刷新后重试' : '获取用户信息失败，请重试')
    }
  }

  // 获取用户手机号
  async getMobile (ctx) {
    const { body } = ctx.request
    const { code, encryptedData, iv } = body
    if (!code) {
      ctx.body = {
        code: 500,
        data: '没有足够参数'
      }
      return
    }
    const { session_key: sessionKey } = await wxGetOpenData(code)
    const wxBizDataCrypt = new WXBizDataCrypt(config.AppID, sessionKey)
    // 3.用户加密数据的解密
    const data = wxBizDataCrypt.decryptData(encryptedData, iv)
    ctx.body = {
      code: 200,
      data,
      msg: '获取手机号成功'
    }
  }

  // 手机号登录
  async loginByPhone (ctx) {
    const { body } = ctx.request
    // mobile + code
    const { mobile, code } = body
    // 验证手机号与短信验证码的正确性
    const sms = await getValue(mobile)
    if (sms && sms === code) {
      await delValue(mobile)
      // 查询并创建用户
      const user = await User.findOrCreateByMobile({
        mobile
      })
      // 查看用户是否签到
      const userObj = await addSign(user)
      // 响应用户
      ctx.body = {
        code: 200,
        token: generateToken({ _id: userObj._id }),
        data: userObj
      }
    } else {
      ctx.body = {
        code: 500,
        msg: '手机号与验证码不匹配'
      }
    }
  }
}

export default new LoginController()
