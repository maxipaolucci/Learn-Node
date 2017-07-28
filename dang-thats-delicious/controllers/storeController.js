const mongoose = require('mongoose');
const Store = mongoose.model('Store'); //I can do this because I already setup Store as a mongo model in Store.js

exports.homePage = (req, res) => {
    res.render('index')
};

exports.addStore = (req, res) => {
    res.render('editStore', {title: 'Add Store'});
};

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