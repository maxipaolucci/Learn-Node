const mongoose = require('mongoose');
const Store = mongoose.model('Store'); //I can do this because I already setup Store as a mongo model in Store.js
const User = mongoose.model('User'); //I can do this because I already setup User as a mongo model in User.js
const multer = require('multer'); //manage images
const jimp = require('jimp'); //resize images
const uuid = require('uuid'); //unique names for the images files

const multerOptions = {
    storage : multer.memoryStorage(), //setup to storage in memory at this point cause we are going to resize files before store in disk
    fileFilter(req, file, next) {
        const isPhoto = file.mimetype.startsWith('image/');
        if (isPhoto) {
            next(null, true); //next works like promises. If we pass just one, that means that the promise fails
                              //and it is going to be catch as an error, if we set it to null and pass a true
                              // the promise is process as a success
        } else {
            next({ message : 'That filetype is not allowed!' }, false); //here the promise is set to fail
        }
    }
};


exports.homePage = (req, res) => {
    res.render('index')
};

exports.addStore = (req, res) => {
    res.render('editStore', {title: 'Add Store'});
};

exports.upload = multer(multerOptions).single('photo'); //this stores the file temporary in the memory of the server as multerOptions is config.

exports.resize = async (req, res, next) => {
    //check if there is no file to resize
    if (!req.file) { //check req.file because multer is going to put the photo, if present, in a property called file in req object
        next(); //skip to the next middleware
        return;
    }

    //set the filename using uuid
    const extension = req.file.mimetype.split('/')[1];
    req.body.photo = `${uuid.v4()}.${extension}`;
    //now we resize
    const photo = await jimp.read(req.file.buffer); //read the buffer where we temporary have stored the image in memory
                                            //jimp is based on Promises so we can await them
    await photo.resize(800, jimp.AUTO);
    await photo.write(`./public/uploads/${req.body.photo}`);
    //once we have written the photo to our filesystem, keep going!
    next();
}


exports.createStore = async (req, res) => {
    req.body.author = req.user._id;
    const store = await (new Store(req.body)).save(); //saves the store in the DB, return a Promise as we configure it in start.js. Check routes index.js to see how we catch possible errors
    req.flash('success', `Successfully created ${store.name}. Care to leave a review?`);
    res.redirect(`/store/${store.slug}`);
};

exports.getStores = async (req, res) => {
    const stores = await Store.find(); //get all the stores from the database.
    res.render('stores', {title : 'Stores', stores });
};

const confirmOwner = (store, user) => {
    if (!store.author.equals(user._id)) {
        throw Error('You must own a store in order to edit it!');
    }
};

exports.editStore = async (req, res) => {
    const store = await Store.findOne({ _id : req.params.id });
    confirmOwner(store, req.user);
    res.render('editStore', { title : `Edit ${store.name}`, store });
};

exports.updateStore = async (req, res) => {
    //set the location type to be a point. 
    //For some reason mongoDB loose the location type when we edit a location, but works 
    //fine when we create it the first time, so lets force it here
    req.body.location.type = 'Point';

    const store = await Store.findOneAndUpdate({_id : req.params.id}, req.body, {
        new : true, //return the new store instead of the old one
        runValidators : true //run the required and other validators declared in the model
    }).exec();

    req.flash('success', `Successfully updated <strong>${store.name}</strong>. 
            <a href="/stores/${store.slug}">View Store</a>`);
    res.redirect(`/stores/${store._id}/edit`);
};

exports.getStoreBySlug = async (req, res, next) => {
    const store = await Store.findOne({ slug : req.params.slug})
        .populate('author')   // with populate automatically fills the foreing key author with all the author object
        .populate('reviews'); // this populate automatically fills the review foreign key with the review info. 
                              // we could do all the populates with at once with .populate('author reviews')
    
    if (!store) return next(); //this calls the next middleware after routes that is notFound (check app.js). 
                                //In this case we do this manually because mongo db returned a null over a valid route

    res.render('store', { store, title : store.name });
};

exports.getStoresByTag = async (req, res, next) => {
    const tag = req.params.tag;
    const tagQuery = tag || { $exists : true }; //if no tag => exists as true returns every record with at least one tag in it.
    const tagsPromise = Store.getTagsList(); //instead of do await here that resolves a promise returned by mongoDB as we configure it in app.js
    const storesPromise = Store.find({ tags : tagQuery }); //same as above
    const [tags, stores] = await Promise.all([tagsPromise, storesPromise]); //all proccess the promises
    res.render('tag', { tags, title : 'Tags', tag, stores });
};

exports.searchStores = async (req, res) => {
    const stores = await Store.find({
        $text : { //the $text operator works because I created an index for the schema base on text type for name and description (check doc in mongoDB for $text)
            $search : req.query.q
        }
    }, {
        score : { $meta : 'textScore' } //this projection add a field score to each result with a value representing how related is each result to the value searched
    }).sort({
        score : { $meta : 'textScore' } //we sort by this field
    }).limit(5);
    
    res.json(stores);
}

exports.mapStores = async (req, res) => {
    const coordinates = [req.query.lng, req.query.lat].map(parseFloat);
    const q = {
        location : {
            $near : {
                $geometry : {
                    type : 'Point',
                    coordinates
                },
                $maxDistance : 10000 //10000m = 10km
            }
        }
    };

    const stores = await Store.find(q)
        .select('slug name description location photo') //this is like doing projection in the original query with the field to return. 
                                                 // We can also use negative values like -author to say we want all except than author
        .limit(10);

    res.json(stores);
};

exports.mapPage = (req, res) => {
    res.render('map', { title : 'Map' });
};

exports.heartStore = async (req, res) => {
    //If the user didn't add this store to his hearts array before we are going to add it otherwise we remove it.

    const hearts = req.user.hearts.map(obj => obj.toString()); //this works because mongoDB attachs toString methods to their objects
    const operator = hearts.includes(req.params.id) ?  '$pull' : '$addToSet'; //$pull is the operator to remove data from MongoDB array and $addToSet to add it.
                                                                            //the reason we use $addToSet instead of $push is because addToSet inserts unique elements on it while push does not care about uniqueness
    const user = await User.findByIdAndUpdate(req.user._id,
        { [operator] : { hearts : req.params.id }},
        { new : true } //this is to make this function "findByIdAndUpdate" returns the updated user once updated rather than the previous to update instance
    );
    res.json(user);
};

exports.getTopStores = async (req, res) => {
    const stores = await Store.getTopStores(); //complex queries fits better in the model than in the controller. (That's what the teacher said).
    res.render('topStores', { stores, title : 'Top Stores!' });
};