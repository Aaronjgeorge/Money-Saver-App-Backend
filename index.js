const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');
const authRoutes = require('./routes/auth');
const receiptRoutes = require('./routes/receipt');


const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.urlencoded({extended: true}));
app.use(express.json())

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg'
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

app.use(multer({ storage: storage, fileFilter: fileFilter }).single('image'));
app.use('/images', express.static(path.join(__dirname, 'images')));

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
      'Access-Control-Allow-Methods',
      'OPTIONS, GET, POST, PUT, PATCH, DELETE'
    );
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); //this authorization header is  required for json web tokens
    next();
  });

  app.use('/auth', authRoutes);
  app.use('/receipt', receiptRoutes);




  // app.use(errorController.get404);
  // app.get('/500', errorController.get500); //This requires a url path unlike 404 because 404 applies to all undefined urls
  
  
  // app.use((error, req, res, next) => { //this is a special middleware that renders the 500 status code error page because we passed in the error parameter in next in our controllers in admin and auth.js for error handling. This executes only in cases of database failures and such
  //   // res.status(error.httpStatusCode).render(...);
  //   // res.redirect('/500');
  //   res.status(500).render('500', {
  //     pageTitle: 'Error!',
  //     path: '/500',
  //     isAuthenticated: req.session.isLoggedIn
  //   });
  // });
  
  mongoose
    .connect(
      'mongodb+srv://kalibacardi:PKm2o4jldyraeeAA@cluster0.ahtv1kq.mongodb.net/',
    
  {useNewUrlParser: true,
  useUnifiedTopology: true,
})
    .then(result => {
      app.listen(8080);
    })
    .catch(err => console.log(err));


// const inputImage = './1af7r52mmXsEGqlpeM0mhiQ.jpeg';
// const outputImage = './editedimage.jpeg';
// const cannyEdgeDetector = require('canny-edge-detector');
// const Image = require('image-js').Image;

// Image.load(inputImage).then((img) => {
//   const grey = img.grey();
//   const edge = cannyEdgeDetector(grey);
//   return edge.save(outputImage);
// })
  
// const Tesseract= require('tesseract.js');

// Tesseract.recognize(
// // this first argument is for the location of an image it can be a //url like below or you can set a local path in your computer
// "./editedimage.jpeg",// this second argument is for the laguage 
// 'eng',
// { logger: m => console.log(m) }
// ).then(({ data: { text } }) => {
// console.log(text);
// })
