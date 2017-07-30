const mongoose = require('mongoose');
const Store = mongoose.model('Store'); //I can do this because I already setup Store as a mongo model in Store.js
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
    const store = await (new Store(req.body)).save(); //saves the store in the DB, return a Promise as we configure it in start.js. Check routes index.js to see how we catch possible errors
    req.flash('success', `Successfully created ${store.name}. Care to leave a review?`);
    res.redirect(`/store/${store.slug}`);
};

exports.getStores = async (req, res) => {
    const stores = await Store.find(); //get all the stores from the database
    res.render('stores', {title : 'Stores', stores });
};

exports.editStore = async (req, res) => {
    const store = await Store.findOne({ _id : req.params.id });
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