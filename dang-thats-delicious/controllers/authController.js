const passport = require('passport'); //it is a library to login people in the app
const crypto = require('crypto'); //get crytographic strings
const mongoose = require('mongoose');
const User = mongoose.model('User');
const promisify = require('es6-promisify');
const mail = require('../handlers/mail');

exports.login = passport.authenticate('local', {
    failureRedirect : '/login',
    failureFlash: 'Failed Login!',
    successRedirect : '/',
    successFlash : 'You are logged in!'
}); //authenticate is a middleware on passport. local means we are using our local authentication with email and password. 
    //But we can put ther 'facebook' to use facebook. Check documentation. 
    //This uses the passport handler in handlers folder

exports.logout = (req, res) => {
    req.logout(); //this was added in passport
    req.flash('success', 'You are now logged out');
    res.redirect('/');
};

exports.isLogggedIn = (req, res, next) => {
    if (req.isAuthenticated()) { //check in passport for authentication
        next();
        return;
    }

    req.flash('error', 'Oops you must be logged in to do that!');
    res.redirect('/login');
};

exports.forgot = async (req, res) => {
    //1 see user with that exitst
    const user = await User.findOne({ email : req.body.email });
    if (!user) {
        req.flash('error', 'No account with that email exists.');
        return res.redirect('/login');
    }
    //2 set reset tokens and expiry on their account
    user.resetPasswordToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordExpires = Date.now() + 3600000; //1 hour from now
    await user.save();
    //3 send them email with the token
    const resetURL = `http://${req.headers.host}/account/reset/${user.resetPasswordToken}`;
    await mail.send({
        user,
        subject : 'Password reset',
        resetURL,
        filename : 'password-reset' //this is going to be the mail template file
    });
    req.flash('success', `You have been emailed a password reset link.`);
    //4 redirect to login page
    res.redirect('/login');
};

exports.reset = async (req, res) => {
    
    const user = await User.findOne({
        $and : [
            { resetPasswordToken : req.params.token },
            { resetPasswordToken : { $gt : Date.now() } }
        ]
    });
    
    if (!user) {
        req.flash('error', 'Password reset is invalid or has expired.');
        return res.redirect('/login');
    }

    res.render('reset', { title : 'Reset your Password' });
};

exports.confirmedPasswords = (req, res, next) => {
    if (req.body.password === req.body['password-confirm']) {
        next();
        return;
    }

    req.flash('error', 'Passwords do not match!');
    res.redirect('back');
};

exports.update = async (req, res) => {
    const user = await User.findOne({
        $and : [
            { resetPasswordToken : req.params.token },
            { resetPasswordToken : { $gt : Date.now() } }
        ]
    });

    if (!user) {
        req.flash('error', 'Password reset is invalid or has expired.');
        return res.redirect('/login');
    }

    const setPassword = promisify(user.setPassword, user); //this User.setPassword function was added to model by passportLocalMongoose plugin in the user schema. 
                                                            // User.setPassword is a callback based method as register in userController so with promisify we convert it into a promise based method.
    await setPassword(req.body.password); // set the new password to the user in MongoDB
    user.resetPasswordToken = undefined; //the way to remove fields from mongo is set to undefined
    user.resetPasswordExpires = undefined;
    const updatedUser = await user.save(); //here is when we save in the database the deleted values before 
    await req.login(updatedUser); //this comes from passport js
    req.flash('success', 'Nice! Your password has been reset! You are now logged in!');
    res.redirect('/');
};