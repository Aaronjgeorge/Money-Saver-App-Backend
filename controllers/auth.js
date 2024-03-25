const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
// const sendConfirmationEmail = require('../middleware/sendConfirmationEmail');
const Cloud = require('@google-cloud/storage')
const {Storage} = Cloud

exports.signup = async (req, res, next) => {

  const email = req.body.email;
  const name = req.body.name;
  const password = req.body.password;
  const mobile = req.body.mobile;
  console.log(password)
  try {
    const hashedPw = await bcrypt.hash(password, 12);

    const user = new User({
      email: email,
      password: hashedPw,
      name: name,
      imageUrl: '',
      mobile:mobile
    });
    const result = await user.save();
    res.status(200).json({ message: 'User created!', userId: result._id });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};



exports.login = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  console.log(email,password)
  let loadedUser; //to store the matched user in the database
  User.findOne({ email: email })
    .then(user => {
      if (!user) { //if user doesnt exist
        const error = new Error('A user with this email could not be found.');
        error.statusCode = 401;
        throw error;
      }
      loadedUser = user;
      return bcrypt.compare(password, user.password); //compare hashed p[asswords]
    })
    .then(isEqual => {
      if (!isEqual) {
        const error = new Error('Wrong password!');
        error.statusCode = 401;
        throw error;
      }
      if(loadedUser.confirmed == true){
      const token = jwt.sign( //this creates a new signature and stores it as a web token
        {
          email: loadedUser.email,
          userId: loadedUser._id.toString()
        },
        'abcd122432', //this is the signature
        { expiresIn: '1h' }
      );
      res.status(200).json({ token: token, userId: loadedUser._id.toString() , email: loadedUser.email,name:loadedUser.name,mobile: loadedUser.mobile,imageUrl:loadedUser.imageUrl});}
      else{
        res.status(401).json({Message: "User has not confirmed his email"})
      }
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.updateProfile = async (req, res, next) => {
  console.log("Test")
 let imgUrl;

  if(req.file){
    const storage = new Storage({
      keyFilename: './controllers/grounded-will-401605-b2323bae386c.json'
  });
  
  // Upload image to Google Cloud Storage
        const bucketName = 'receiptsfyp';
        const filename = `receipts/${Date.now()}.jpeg`;
        const bucket = storage.bucket(bucketName);
        const file = bucket.file(filename);
  
        await file.save(req.file.buffer, {
            contentType: 'image/jpeg',
            public: true
        });
  
      imgUrl = `https://storage.googleapis.com/${bucketName}/${filename}`;
  }

    const userId = req.params.id
    const user = await User.findById(userId);
    const password = req.body.password;
    if(user.password === password){
      user.password=password;
    }else if(!req.body.password){
    }else{
    const hashedPw = await bcrypt.hash(password, 12);
    user.password = hashedPw;}
    const imageUrl= imgUrl?imgUrl:user.imageUrl;
    const name = req.body.name
    const email = req.body.email;
    const mobile = req.body.mobile
    try {
      user.name =name;
      user.email=email;
      user.imageUrl = imageUrl;
      user.mobile=mobile;
      const updatedUser = await user.save();
      // const user = await User.findById(req.userId);
      // user.posts.push(post);
      // await user.save();
      res.status(200).json({
        message: 'user updated successfully!',
        user: updatedUser,
        // creator: { _id: user._id, name: user.name }
      });
    } catch (err) {
      res.status(400).send('Bad Request');
      next(err);
    }
  };


