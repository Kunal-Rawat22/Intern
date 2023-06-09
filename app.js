require('dotenv').config();
const express = require('express');
const ejs = require('ejs');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
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
         await mongoose.connect(process.env.MONGODB, connectionOptions);
        console.log(`Connected to MongoDB`)
     } catch (err) {
      console.log(`Couldn't connect: ${err}`)
     }
}
  
main();

//User Schema
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
      phoneNo: Number,
      facebookId: String
  })

//Flight Schema
const flightSchema = new mongoose.Schema({
    Date: {
        type: String,
        unique: false
    },
    To: {
        type: String,
        unique: false
    },
    From: {
        type: String,
        unique: false
    },
    Flights: [
        {
            AirlineName: String,
            Price: String,
            Type: String
        }
    ]
});

//Suggestion Schema
const suggestionSchema = new mongoose.Schema({
    Name: {
        type: String,
        unique: false
    },
    Phno: {
        type: Number,
        unique: false
    },
    Email: {
        type: String,
        unique: false
    },
    Msg: {
        type: String,
        unique: false 
    }
})

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model('Users', userSchema);
const Flight = mongoose.model('Flights', flightSchema);
const Suggestion = mongoose.model('Suggestions', suggestionSchema);

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
    callbackURL: "https://intern-yatri.onrender.com/auth/google/booking"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ username:profile.displayName, email:profile.email,googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

//facebook auth
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "https://intern-yatri.onrender.com/auth/facebook/booking"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id , username: profile.displayName }, function (err, user) {
      return cb(err, user);
    });
  }
));

//Finding Flight Details
async function findO(RequestedObj)
{
    const result = await Flight.findOne(
        {
            Date: RequestedObj.Date,
            To: RequestedObj.To,
            From : RequestedObj.From
        });
    // console.log(result);
    if (result !== null)
        return result;
    else 
        return null
}


//google 
app.route('/auth/google')
    .get(passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/booking', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/booking');
    });


//facebook
app.get('/auth/facebook',
  passport.authenticate('facebook'));

app.get('/auth/facebook/booking',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/booking');
  });

//Some Responses
const RegRsponse = [
    {
        Title: 'Uh oh!',
        Message: 'There was a problem in signing you up. Please try again or contact the developer',
        BtnMsg: 'Try Again'
    },
    {
        Title: 'Awesome !!',
        Message: "You've Successfully signed up to our website, look forward to lots of comfortable journey",
        BtnMsg: 'Login !!'
    },
    {
        Title: 'Thank You !!',
        Message: "You've Successfully submitted the suggestion, we will definately consider your Suggestion",
        BtnMsg: "Let's Go Back !!"
    }
];
const logResponse = [{
    Title: 'Uh oh!',
    Message: 'There was a problem in login you up. Please try again or contact the developer',
    BtnMsg: 'Login Again'
}];


//Express Js

//Landing Redirect
app.get('/', function (req, res) {
    res.redirect('/login');
})

//Login Route
app.route('/login')  
.get(function (req, res) {
    if (!req.isAuthenticated())
        res.render('login',{Title:'Login ', Body:'Log In',flag:1});
    else
        res.redirect('/booking');
})
.post(
    passport.authenticate('local', { failureRedirect: '/Response', failureMessage: true }),
    function (req, res) {
        res.redirect('/booking');
});

//Register Route
app.route('/register')
.get(function (req, res) {
    res.render('login',{Title:'Register ', Body:'Sign Up',flag:0});
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

//Booking Route
app.route('/booking')
.get(function (req, res)
{
    if (req.isAuthenticated())
        res.render('booking', { flag: 0 });

    else
    res.redirect('/login');
})
.post(function (req, res)
{
    if (req.isAuthenticated())
    {
        if (req.body.From==="" || req.body.To==="" || req.body.Departure_Date==="")
            res.render('booking',{flag:0});

        const FlightDetails = {
            From: req.body.From,
            To: req.body.To,
            Date: req.body.Departure_Date
        } 
        const R = findO(FlightDetails);
        R.then(result => {
            let Res = "No flights Available for the day !!";
            console.log(result);
            if (result !== null)
                res.render('booking', { flag: 1,flag2:1, Flights: result.Flights });
            else
            {
                res.render('booking', { flag: 1, flag2: 0, Res : Res });
            }
        })
        console.log(FlightDetails);
    }
    else
        res.redirect('/login');
       
})

//Response Route
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

//Logout Route
app.route('/logout')
.get(function (req, res)
{
    req.logout(function (err) {
        if (err)
            return next(err); 
    });
    res.redirect('/login');
})

//Suggestion Route
app.post('/Suggestion', function (req, res)
{
    const suggestion = new Suggestion({
        Name: req.body.name,
        Phno: req.body.phn,
        Email: req.body.email,
        Msg: req.body.msg
    })
    console.log(suggestion);
    suggestion.save();
    res.render('Response1', { Obj: RegRsponse[2] });
})

app.listen(3000, function () {
    console.log("Server is running on port 3000.");
})
  
