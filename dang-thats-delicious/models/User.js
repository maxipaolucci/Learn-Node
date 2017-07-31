const mongoose = require('mongoose');
const Schema = mongoose.Schema;
mongoose.Promise = global.Promise; //this is already defined in app js but mongoose has a bug that sometimes forgot this so nothing happens if we redefine it in the schema
const md5 = require('md5');
const validator = require('validator'); //validator package in nodejs, check doc online
const mongodbErrorHandler = require('mongoose-mongodb-errors');
const passportLocalMongoose = require('password-local-mongoose');

const userSchema = new Schema({
  email: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    validate: [validator.isEmail, 'Invalid Email Address'],
    required: 'Please Supply an email address'
  },
  name: {
    type: String,
    required: 'Please supply a name',
    trim: true
  }
});

userSchema.plugin(passportLocalMongoose, { usernameField: 'email' }); //this plugin is going to add password and whatever else we need for login to our schema. We tell it that email is our user field
userSchema.plugin(mongodbErrorHandler); //this make mongoDB errors show a more comprensible message. 
                                        //We use it here cause when i.e. unique validation fails the 
                                        //error is pretty hard to understand. This plugin helps on that.

module.exports = mongoose.model('User', userSchema);