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
    photo : String 
});

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

//statics is the wat to add methods to my model in mongoDB. We don't use arrow fn because we wanna use this inside the fn
storeSchema.statics.getTagsList = function() {
    //for aggregate google mongoDB aggregate operators
    return this.aggregate([
        { $unwind : '$tags' }, //using $ in front of tags it means it is a field
        { $group : { _id: '$tags', count: { $sum : 1 } } }, //group the result of unwind base on tags field and then count them (count is going to sum by 1)
        { $sort : { count : -1 } } //sort by count descending
    ]);
};

module.exports = mongoose.model('Store', storeSchema);