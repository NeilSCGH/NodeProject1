import express = require('express')
import { MetricsHandler, Metric } from './metrics'
import path = require('path')
import bodyparser = require('body-parser');
import morgan = require('morgan')
import session = require('express-session')
import levelSession = require('level-session-store')
import { UserHandler, User } from './user'

const dbMet: MetricsHandler = new MetricsHandler('./db/metrics')
const port: string = process.env.PORT || '8082'
const app = express()
const LevelStore = levelSession(session)
const dbUser: UserHandler = new UserHandler('./db/users')
const authRouter = express.Router()
const userRouter = express.Router()

app.use(express.static(path.join(__dirname, '/../public')))
app.use(bodyparser.urlencoded())
app.use(bodyparser.json())
app.use(morgan('dev'))
app.set('view engine', 'ejs');
app.set('views', __dirname + "/../views")

app.use(session({
  secret: 'my very secret phrase',
  store: new LevelStore('./db/sessions'),
  resave: true,
  saveUninitialized: true
}))

authRouter.get('/login', (req: any, res: any) => {
  res.render('login')
})

authRouter.get('/signup', (req: any, res: any) => {
  res.render('signup')
})

authRouter.get('/addmetric', (req: any, res: any) => {
  res.render('addmetric')
})

authRouter.get('/logout', (req: any, res: any) => {
  delete req.session.loggedIn
  delete req.session.user
  res.redirect('/login')
})

authRouter.get('/delete', (req: any, res: any) => {
  dbUser.delete(req.session.user,(err: Error | null) => {})
  delete req.session.loggedIn
  delete req.session.user

  res.redirect('/login')
})

app.use(authRouter)

app.post('/login', (req: any, res: any, next: any) => {
  dbUser.get(req.body.username, (err: Error | null, result?: User) => {
    if (err) next(err)
    if (result === undefined || !result.validatePassword(req.body.password)) {
      console.log("USER NOT FOUND")
      //res.redirect('/login')
    } else {
      req.session.loggedIn = true
      req.session.user = result
      res.redirect('/')
    }
  })
})

app.post('/addmetric', (req: any, res: any, next: any) => {
  let metrics: Metric[] = []
  let metric: Metric = new Metric(req.body.timestamp, req.body.value, req.session.user.username)
  metrics.push(metric)
  dbMet.save(req.body.key, metrics, (err: Error | null) => {
    if (err) throw err
    res.status(200).send()
  })
  console.log("ADDMETRIC: ",req.body)
  res.redirect('/')
})

userRouter.post('/', (req: any, res: any, next: any) => {
  dbUser.get(req.body.username, function (err: Error | null, result?: User) {
    if (!err || result !== undefined) {
      res.status(409).send("user already exists")
    } else {
      dbUser.save(req.body, function (err: Error | null) {
        if (err) next(err)
        else res.redirect('/login')
        //res.status(201).send("user persisted")
      })
    }
  })  
})

userRouter.get('/:username', (req: any, res: any, next: any) => {
  dbUser.get(req.params.username, function (err: Error | null, result?: User) {
    if (err || result === undefined) {
      res.status(404).send("user not found")
    }
    else res.status(200).json(result)
  })
})

app.use('/user', userRouter)

const authCheck = function (req: any, res: any, next: any) {
  if (req.session.loggedIn) {
    next()
  } else res.redirect('/login')
}

app.get('/', authCheck, (req: any, res: any) => {
  res.render('index', { name: req.session.username })
})


app.listen(port, (err: Error) => {
  if (err) {
    throw err
  }
  console.log(`Server is running on http://localhost:${port}`)
})

app.post('/metrics/:id', (req: any, res: any) => {
  dbMet.save(req.params.id, req.body, (err: Error | null) => {
    if (err) throw err
    res.status(200).send()
  })
})



app.get('/metrics/', (req: any, res: any) => {
  dbMet.getAllWithUsername(req.session.user.username ,(err: Error | null, result: any) => {
    if (err) throw err
    res.status(200).send(result)
  })
})

app.get('/metrics/:id', (req: any, res: any) => {
  dbMet.getOne(req.params.id,(err: Error | null, result: any) => {
    if (err) throw err
    res.status(200).send(result)
  })
})

app.delete('/metrics/:id/:timestamp/:username', (req: any, res: any) => {
  dbMet.getOne(req.params.id,(err: Error | null, result: any) => {
    if (err) throw err
    dbMet.deleteOne(req.params.id, result, req.params.username)
    res.status(200).send(result)
  })  
})

app.delete('/metrics/:id', (req: any, res: any) => {
  dbMet.deleteOne(req.params.id,req.params.timestamp, req.params.username)
  res.status(200).send()
})

/*
app.get('/metrics.json', (req: any, res: any) => {
  dbMet.get((err: Error | null, result?: any) => {
    if (err) {
      throw err
    }
    res.json(result)
  })
})


app.get('/', (req: any, res: any) => {
  res.write('Hello world')
  res.end()
})

app.get('/hello/:name', (req: any, res: any) => {
  res.render('hello.ejs', { name: req.params.name })
})

app.post('/signup', (req: any, res: any, next: any) => {
  dbUser.get(req.body.username, (err: Error | null, result?: User) => {
    if (err) next(err)
    if (result === undefined || !result.validatePassword(req.body.password)) {
      res.redirect('/login')
    } else {
      req.session.loggedIn = true
      req.session.user = result
      res.redirect('/')
    }
  })
})
*/