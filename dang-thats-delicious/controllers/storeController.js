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
    res.render('stores', {title : 'Stores', stores })
}