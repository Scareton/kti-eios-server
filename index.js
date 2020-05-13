const express = require("express")
// let morgan = require('morgan')
// let path = require('path')
// let fs = require('fs')
const passport = require("passport")
const LocalStrategy = require('passport-local').Strategy;
const mongoose = require("mongoose")
const UserModel = require("./app/models/user-model")

const config = require("./config/index")

const bodyParser = require('body-parser');

let app = express();

// let accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' })
// app.use(morgan('combined', { stream: accessLogStream }))

let cors = require('cors')
app.use(cors())

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// app.use(require('serve-static')(__dirname + '/../../public'));
app.use(require('cookie-parser')());
const session = require('express-session')
const MongoStore = require('connect-mongo')(session)
app.use(session({
  store: new MongoStore({ mongooseConnection: mongoose.connection }),
  secret: config.secret,
  resave: true,
  rolling: true,
  saveUninitialized: false,
  cookie: {
    // 7 Дней
    maxAge: 604800000,
    httpOnly: false,
    sameSite: "none",
    hostOnly: false
  },
}))

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  UserModel.findById(id, function (err, user) {
    done(err, user);
  });
});


app.use(passport.initialize());
app.use(passport.session());

// Инициализация базы данных
mongoose.set('useCreateIndex', true);
mongoose.set('useNewUrlParser', true);
mongoose.set('useUnifiedTopology', true);
mongoose.connect(config.dbURL);

mongoose.connection.on('error', (err) => {
  console.error("Database Connection Error: " + err);
  process.exit(2);
});

mongoose.connection.on('connected', () => {
  console.info("Succesfully connected to MongoDB Database");
  app.listen(config.port, function (err) {
    if (err) console.error(err);
    else console.log(`Running server at port ${config.port} `)
  });
});

passport.use(new LocalStrategy(
  function (username, password, done) {
    UserModel.findOne({ username: username }, function (err, user) {
      if (err) { return done(err); }
      if (!user) {
        return done(null, false, { message: 'Incorrect username.' });
      }
      if (false) {
        return done(null, false, { message: 'Incorrect password.' });
      }
      return done(null, user);
    });
  }
));

function mustAuthenticated(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.status(401).send();
  }
  next();
}

function getUserSafeBody(user) {
  let result = {
    "email": user.email,
    "username": user.username,
    "role": user.role,
    "_id": user._id,
    "name": user.name,
    "surname": user.surname,
    "patronymic": user.patronymic,
    "image": user.image,
  }
  if (user.role === 1) {
    result.student = user.student
  } else if (user.role === 2) {
    result.teacher = user.teacher
  }
  return result;
}

app.post('/api/users/login', passport.authenticate('local'), (req, res) => {
  res.send(getUserSafeBody(req.user))
})

app.get('/api/users/logout', (req, res) => {
  req.logout();
  res.send();
});

app.get('/api/users/refresh-session', mustAuthenticated, (req, res) => {
  res.send(getUserSafeBody(req.user))
})

module.exports.mustAuthenticated = mustAuthenticated;
module.exports.app = app;

require('./app/routes/courses')