const express = require('express');
const fileUpload = require('express-fileupload');
const path = require('path');

module.exports = (app) => {
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(fileUpload());
  app.use(express.static('public'));

  // Set view engine
  app.set('views', path.join(__dirname, '../views'));
  app.set('view engine', 'ejs');
};