const mongoose = require('mongoose');
const User = mongoose.model('User');
const promisify = require('es6-promisify');

exports.loginForm = (req, res) => {
    res.render('login', { title : 'Login' });
}

exports.registerForm = (req, res) => {
    res.render('register', { title : 'Register'});
};

exports.validateRegister = (req, res, next) => {
    req.sanitizeBody('name'); //this method comes with the expressValidator plugin we added in app.js. With this we sanitze the value in req.body.name
    req.checkBody('name', 'You must supply a name!').notEmpty(); //same as above check for not empty
    req.checkBody('email', 'That Email is not valid!').isEmail(); //same as above. All this methods are in express validator
    req.sanitizeBody('email').normalizeEmail({
        remove_dots : false,
        remove_extension : false,
        gmail_remove_subaddress : false
    });
    req.checkBody('password', 'Password cannot be blank').notEmpty();
    req.checkBody('password-confirm', 'Confirmed password cannot be blank').notEmpty();
    req.checkBody('password-confirm', 'Oops! Your passwords do not match').equals(req.body.password);

    const errors = req.validationErrors();
    if (errors) {
        req.flash('error', errors.map(err => err.msg));
        res.render('register', { title : 'Register', body : req.body, flashes : req.flash() });
        return; //stop from running
    }

    next(); //call next middleware
};

exports.register = async (req, res, next) => {
    const user = new User({ email : req.body.email, name : req.body.name });
    const register = promisify(User.register, User); //with promisify if the method is in an object then we pass athe object as 2nd param. 
                                                    //this User.register function was added to model by passportLocalMongoose plugin in the user schema. 
    await register(user, req.body.password); //this stores a hash of the password in database (thanks to the plugin) 
    next(); //call next middleware
    
    //this does the same thing we did above but without promises.
    // User.register(user, req.body.password, function(err, user) {
    //     res.send('it works!!');
    //     next(); //call next middleware
    // });
};

exports.account = (req, res) => {
    res.render('account', { title : 'Edit your Account' });
};

exports.updateAccount = async (req, res) => {
    const updates = {
        name : req.body.name,
        email: req.body.email
    };

    const user = await User.findOneAndUpdate(
        { _id : req.user._id },
        { $set : updates },
        { new : true, runValidators : true, context : 'query' }
    );

    req.flash('success', 'Updated the profile!')
    res.redirect('back');
};