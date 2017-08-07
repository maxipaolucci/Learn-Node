const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const reviewSchema = new mongoose.Schema({
  created : {
    type : Date,
    default : Date.now
  },
  author : {
    type : mongoose.Schema.ObjectId,
    ref : 'User',
    required : 'You must supply an author!'
  },
  store : {
    type : mongoose.Schema.ObjectId,
    ref : 'Store',
    required : 'You must supply a store!'
  },
  text : {
    type : String,
    required : 'Your review must have text!'
  },
  rating : {
    type : Number,
    min : 1,
    max : 5
  }
});

/**
 * Populates the schema with the author information instead of doing it manually in the controller as we did in storeController.getStoreBySlug().
 * We do it this way here because we always want the author info in the reviews records to show its info
 * @param {*} next 
 */
function autopopulate(next) {
  this.populate('author');
  next();
}

reviewSchema.pre('find', autopopulate); //we add a hook to the find method in this schema
reviewSchema.pre('findOne', autopopulate); //we add a hook to the findOne method in this schema 

module.exports = mongoose.model('Review', reviewSchema); //Mongo stores a table called "reviews" in the DB (it lowecase the model name and add an s automatically at the end)