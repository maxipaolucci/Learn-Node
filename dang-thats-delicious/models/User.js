const mongoose = require('mongoose');
const Schema = mongoose.Schema;
mongoose.Promise = global.Promise; //this is already defined in app js but mongoose has a bug that sometimes forgot this so nothing happens if we redefine it in the schema
const md5 = require('md5');
const validator = require('validator'); //validator package in nodejs, check doc online
const mongodbErrorHandler = require('mongoose-mongodb-errors');
const passportLocalMongoose = require('passport-local-mongoose');

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
  },
  resetPasswordToken : String,
  resetPasswordExpires : Date,
  hearts : [
    { type : mongoose.Schema.ObjectId, ref : 'Store' }
  ]
});


//this is a virtual field, it is not actually stored in DB but it is virtually generated and added to the object returned from DB querys.
//Useful for unit conversion for example. We only store a value in kg bet then we use virtual fields to retrieve it pounds value.
userSchema.virtual('gravatar').get(function() {
  //if this return a link to an image that image is going to be in user.gravatar in my views as below
  //return 'https://vignette1.wikia.nocookie.net/simpsons/images/7/7f/Mmm.jpg/revision/latest?cb=20121205194537';
  const hash = md5(this.email); //gravatar uses md5
  return `https://gravatar.com/avatar/${hash}?s=200`; //if you donnot have a gravatar in your url it going to return a default image.
                //we do this to simplify the avatar thing. But maybe you want to let the users upload their images.
});

userSchema.plugin(passportLocalMongoose, { usernameField: 'email' }); //this plugin is going to add password and whatever else we need for login to our schema. 
                                                                      //We tell it that email is our user field. It is going to create an index by email in the DB.
userSchema.plugin(mongodbErrorHandler); //this make mongoDB errors show a more comprensible message. 
                                        //We use it here cause when i.e. unique validation fails the 
                                        //error is pretty hard to understand. This plugin helps on that.

module.exports = mongoose.model('User', userSchema); //Mongo stores a table called "users" in the DB (it lowecase the model name and add an s automatically at the end)