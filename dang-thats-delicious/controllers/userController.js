const mongoose = require('mongoose');

exports.loginForm = (req, res) => {
    res.render('login', { title : 'Login' });
}

exports.registerForm = (req, res) => {
    res.render('register', { title : 'Register'});
};

exports.validateRegister = (req, res, next) => {
    req.sanitazeBody('name'); //this method comes with the expressValidator plugin we added in app.js. With this we sanitze the value in req.body.name
    req.checkBody('name', 'You must supply a name!').notEmpty(); //same as above check for not empty
    req.checkBody('email', 'That Email is not valid!').notEmpty().isEmail(); //same as above. All this methods are in express validator
};