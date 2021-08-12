import mongoose from '@/config/DBHelpler'

const rand = (len = 8) => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let text = ''
  for (let i = 0; i < len; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }
  return text
}

const getTempName = () => {
  // 返回用户邮箱
  return 'toimc_' + rand() + '@toimc.com'
}

const Schema = mongoose.Schema

const UserSchema = new Schema({
  username: { type: String, index: { unique: true }, sparse: true },
  password: { type: String },
  name: { type: String },
  created: { type: Date },
  updated: { type: Date },
  favs: { type: Number, default: 100 },
  gender: { type: String, default: '' },
  roles: { type: Array, default: ['user'] },
  pic: { type: String, default: '/img/header.jpg' },
  mobile: { type: String, match: /^1[3-9](\d{9})$/, default: '' },
  status: { type: String, default: '0' },
  regmark: { type: String, default: '' },
  location: { type: String, default: '' },
  isVip: { type: String, default: '0' },
  count: { type: Number, default: 0 },
  openid: { type: String, default: '' },
  unionid: { type: String, default: '' }
})

UserSchema.pre('save', function (next) {
  this.created = new Date()
  next()
})

UserSchema.pre('update', function (next) {
  this.updated = new Date()
  next()
})

UserSchema.post('save', function (error, doc, next) {
  if (error.name === 'MongoError' && error.code === 11000) {
    next(new Error('Error: Monngoose has a duplicate key.'))
  } else {
    next(error)
  }
})

UserSchema.statics = {
  findOrCreateByUnionid: function (user) {
    return this.findOne({
      unionid: user.unionid
    // openid: user.openid
    }, {
      unionid: 0, password: 0
    }).then(obj => {
      return (
        obj || this.create({
          openid: user.openid,
          unionid: user.unionid,
          username: getTempName(),
          name: user.nickName,
          roles: ['user'],
          gender: user.gender,
          pic: user.avatarUrl,
          location: user.city
        })
      )
    })
  },
  findOrCreateByMobile: function (user) {
    return this.findOne({ mobile: user.mobile }, {
      unionid: 0, password: 0
    }).then(res => {
      return res || this.create({
        mobile: user.mobile,
        username: getTempName(),
        name: getTempName(),
        roles: ['user']
      })
    })
  },
  findByID: function (id) {
    return this.findOne(
      { _id: id },
      {
        password: 0,
        username: 0,
        mobile: 0
      }
    )
  },
  getList: function (options, sort, page, limit) {
    // 1. datepicker -> item: string, search -> array  startitme,endtime
    // 2. radio -> key-value $in
    // 3. select -> key-array $in
    let query = {}
    if (typeof options.search !== 'undefined') {
      if (typeof options.search === 'string' && options.search.trim() !== '') {
        if (['name', 'username'].includes(options.item)) {
          // 模糊匹配
          query[options.item] = { $regex: new RegExp(options.search) }
          // =》 { name: { $regex: /admin/ } } => mysql like %admin%
        } else {
          // radio
          query[options.item] = options.search
        }
      }
      if (options.item === 'roles') {
        query = { roles: { $in: options.search } }
      }
      if (options.item === 'created') {
        const start = options.search[0]
        const end = options.search[1]
        query = { created: { $gte: new Date(start), $lt: new Date(end) } }
      }
    }
    return this.find(query, { password: 0, mobile: 0 })
      .sort({ [sort]: -1 })
      .skip(page * limit)
      .limit(limit)
  },
  countList: function (options) {
    let query = {}
    if (typeof options.search !== 'undefined') {
      if (typeof options.search === 'string' && options.search.trim() !== '') {
        if (['name', 'username'].includes(options.item)) {
          // 模糊匹配
          query[options.item] = { $regex: new RegExp(options.search) }
          // =》 { name: { $regex: /admin/ } } => mysql like %admin%
        } else {
          // radio
          query[options.item] = options.search
        }
      }
      if (options.item === 'roles') {
        query = { roles: { $in: options.search } }
      }
      if (options.item === 'created') {
        const start = options.search[0]
        const end = options.search[1]
        query = { created: { $gte: new Date(start), $lt: new Date(end) } }
      }
    }
    return this.find(query).countDocuments()
  },
  getTotalSign: function (page, limit) {
    return this.find({})
      .skip(page * limit)
      .limit(limit)
      .sort({ count: -1 })
  },
  getTotalSignCount: function (page, limit) {
    return this.find({}).countDocuments()
  },
  getFavs: function (uid) {
    // 查询用户积分
    return this.findOne({ _id: uid }, { favs: 1 }).then((res) => {
      return res.favs
    })
  }
}

const UserModel = mongoose.model('users', UserSchema)

export default UserModel
