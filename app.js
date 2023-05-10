require('dotenv').config();
const express = require('express');
const ejs = require('ejs');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize()); 
app.use(passport.session());

async function main () {
    const connectionOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true
     }
     
     try {
         await mongoose.connect("mongodb://127.0.0.1:27017/internDB", connectionOptions);
        console.log(`Connected to MongoDB`)
     } catch (err) {
      console.log(`Couldn't connect: ${err}`)
     }
  }
  
  main();

  const userSchema = new mongoose.Schema({
      email: {
          type: String,
          unique:false
      },
      password: {
        type: String
      },
      username:{
            type: String,
          unique:false
      },
      googleId: String,
  })
    
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model('Users', userSchema);

//cookies and session
passport.use(User.createStrategy());
passport.serializeUser(function(user, done) {
      done(null, {id: user.id});
  });
  
  passport.deserializeUser(function(user, done) {
      const res = User.findById(user.id);
      res.then((result) => {
          if (result !== null)
              done(null, user);
          else
              console.log(err);
      });
  });

//google auth
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/booking"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ username:profile.displayName, email:profile.email,googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

async function findO(RequestedObj)
{
    const result = await User.findOne(
        {
            email: RequestedObj.email,
        });
    // console.log(result);
    if (result !== null)
        return result;
    else 
        return null
}

//google authenticate is req
//google callback is res
app.route('/auth/google')
    .get(passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/booking', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/booking');
    });


    const RegRsponse = [
        {
            Title:'Uh oh!',
            Message:'There was a problem in signing you up. Please try again or contact the developer',
            BtnMsg:'Try Again'
        },
        {
            Title: 'Awesome !!',
            Message: "You've been Successfully signed up to our Newsletter, look forward to lots of awesome content",
            BtnMsg: 'Login !!'
        }
    ]
    const logResponse = [{
        Title:'Uh oh!',
        Message:'There was a problem in login you up. Please try again or contact the developer',
        BtnMsg:'Login Again'
    }]
app.get('/', function (req, res) {
    res.redirect('/login');
})

app.route('/login')
    
    .get(function (req, res) {
        if (!req.isAuthenticated())
            res.render('login',{Title:'Login ', Body:'Log In',flag:1});
            // res.render('login');

        else
            res.redirect('/booking');
        
    })
    .post(
        passport.authenticate('local', { failureRedirect: '/Response', failureMessage: true }),
        function (req, res) {
            res.redirect('/booking');
        });
    

app.route('/register')
    
    .get(function (req, res) {
        res.render('login',{Title:'Register ', Body:'Sign Up',flag:0});
        // res.render('register');
    })
    .post(function (req, res) {
        User.register({ username: req.body.username, email:req.body.username }, req.body.password, function (err, user)
        {
            if (err)
            {
                console.log(err);
                res.render('Response1', { Obj: RegRsponse[0] });
            }
            else
            {
                passport.authenticate("local")(req, res, function ()
                {
                    res.render('Response1', { Obj: RegRsponse[1] });
                })
            }
        })

    });
app.route('/booking')
    .get(function (req, res)
    {
        if (req.isAuthenticated())
        res.sendFile(__dirname+'/booking.html');
        else
        res.redirect('/login');
    })

app.route('/Response')
    .get(function (req, res) {
        res.render('Response1', { Obj: logResponse[0] });
    })
    .post(function (req, res) {
        const BtnMsg = req.body.BtnMsg;
        if (BtnMsg == RegRsponse[0].BtnMsg)
            res.redirect('/register');
        else
            res.redirect('/login');
    });
    
    app.route('/logout')
        .get(function (req, res)
        {
            req.logout(function (err) {
                if (err)
                    return next(err); 
            });
            res.redirect('/login');
    })
    
app.listen(3000, function () {
    console.log("Server is running on port 3000.");
})
  
