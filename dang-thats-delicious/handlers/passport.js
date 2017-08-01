const passport = require('passport');
const mongoose = require('mongoose');
const User = mongoose.model('User');


//We need this to let passport know what to do and how to treat a User
passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());