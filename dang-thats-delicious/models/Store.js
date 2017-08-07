const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const slug = require('slugs');

const storeSchema = new mongoose.Schema({
    name : {
        type : String,
        trim : true,
        required : 'Please enter a store name!'
    },
    slug : String,
    description : {
        type : String,
        trim : true
    },
    tags : [String],
    created : {
        type : Date,
        default: Date.now
    },
    location : {
        type : {
            type : String,
            default : 'Point'
        },
        coordinates : [{
            type : Number,
            required : 'You must supply coordinates!'
        }],
        address : {
            type : String,
            required : 'You must supply an address!'
        }
    },
    photo : String,
    author : {
        type : mongoose.Schema.ObjectId,
        ref : 'User',
        required : 'You must supply an author!'
    }
}, {
    toJSON : { virtuals : true }, // By default is FALSE. This means every time the document is converted into JSON (web service) then the virtuals 
                                // fields are going to be visible on it. Otherwise they are there but invisible you have to manualy ask 
                                // for store.<virtual_field_name> to see the content. It either way works but this is more easy to debug (not neccessary to do this in order to access the info)
    toObject : { virtuals : true }, // By default is FALSE. This means every time the document is converted into Object (a h.dump(store) in pug page) then the virtuals
                                // fields are going to be visible on it. Otherwise they are there but invisible you have to manualy ask 
                                // for store.<virtual_field_name> to see the content. It either way works but this is more easy to debug (not neccessary to do this in order to access the info)
});

//define our indexes for our searchs feature. This is going to create a compound index base on the two fields. Allowing us to search in both fields in one shot
storeSchema.index({
    name : 'text',
    description : 'text'
});

storeSchema.index({ location : '2dsphere' });

//before save in the schema populates slug with name
storeSchema.pre('save', async function(next) {
    if (!this.isModified('name')) {
        next(); //skip it
        return; //stop this function from running
    }
    this.slug = slug(this.name);
    //find other stores that have a slug of 'store', 'store-2', 'store-3' ...
    const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i');
    const storesWithSlug = await this.constructor.find({ slug: slugRegEx}); //RULE: at runtime this.contructor is going to be Store (the model)
    if (storesWithSlug.length) {
        this.slug = `${this.slug}-${storesWithSlug.length + 1}`;
    }
    //TODO make slugs unique
    next();
});

// retrieves the reviews for a store in a virtual field (not stored in the db). 
// This is like a innerjoin in SQL and is going to happen every time we get a store from mongo.
storeSchema.virtual('reviews', {
    ref : 'Review',
    localField : '_id',
    foreignField : 'store'
});

//statics is the way to add methods to my model in mongoDB. We don't use arrow fn because we wanna use this inside the fn
storeSchema.statics.getTagsList = function() {
    //for aggregate google mongoDB aggregate operators
    return this.aggregate([
        { $unwind : '$tags' }, //using $ in front of tags it means it is a field
        { $group : { _id: '$tags', count: { $sum : 1 } } }, //group the result of unwind base on tags field and then count them (count is going to sum by 1)
        { $sort : { count : -1 } } //sort by count descending
    ]);
};

storeSchema.statics.getTopStores = function() {
    //aggregate return a promise so we can await it when we call this methods
    return this.aggregate([
        // 1- lookup for Stores and papulate their reviews. 
        //    We cannot use the virtual field "reviews" because aggregate is a lower level MongoDB function, it does not know anything about virtual fields.
        { $lookup : { from : 'reviews', localField : '_id', foreignField : 'store', as : 'reviews' }}, //this is similar than the virtual field we created for reviews 
        //2 -  filter stores with 2 or more reviews
        { $match : { 'reviews.1' : { $exists : true } }}, //reviews.1 is how we access the 2nd review record in DB. review.0 is the 1st, review.2 the 3rd. 
        // add the average reviews field
        //      project is to create a new result based on field filtered before. $reviews means it is a field from data piped in. Project is going to return just the fields in the 
        //      projection so for that we pass again all the other fields we need in result (photo, name, reviews). Mongo 3.4 added $addField to just add a field like 
        //      averageRating instead of using projection and that is going to add the field to our previous resultset.
        { $project : { 
                photo : '$$ROOT.photo', //$$ROOT = original document
                name : '$$ROOT.name',
                reviews : '$$ROOT.reviews',
                slug : '$$ROOT.slug',
                averageRating : { $avg : '$reviews.rating'} //$reviews meand we are fetching the reviews field we piped int in the first step (1- lookup for Stores and papulate their reviews. )
            } 
        },
        // sort it by our new field, highest first
        { $sort : { averageRating : -1 }},
        // limit to at most 10
        { $limit : 10 }
    ]);
};

function autopopulate(next) {
    this.populate('reviews');
    next();
}

storeSchema.pre('find', autopopulate);
storeSchema.pre('findOne', autopopulate);

module.exports = mongoose.model('Store', storeSchema); //Mongo stores a table called "stores" in the DB (it lowecase the model name and add an s automatically at the end)