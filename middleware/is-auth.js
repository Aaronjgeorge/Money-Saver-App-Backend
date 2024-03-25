const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.get('Authorization'); //gets the stored token from the authorization header
  if (!authHeader) {
    const error = new Error('Not authenticated.'); //if no header is found user will be unauthenticated
    error.statusCode = 401;
    throw error;
  }
  const token = authHeader.split(' ')[1];  
  let decodedToken;
  try {
    decodedToken = jwt.verify(token, 'abcd122432'); //the verify function checks and verifies the token with the signature given on auth.js controller
  } catch (err) {
    err.statusCode = 500; //if it cannot be verified due to some error
    throw err;
  }
  if (!decodedToken) {
    const error = new Error('Not authenticated.'); //if token cannot be decoded means its not a server generated token and hence user remains unathenticated
    error.statusCode = 401;
    throw error;
  }
  req.userId = decodedToken.userId; //userId from the token is set as the useId in the request to make it easier to verify which users can delete posts
  next();
};
