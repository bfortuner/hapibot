'use strict';

const AUTH_USER="default"
const AUTH_PASS=process.env.EPILEPSY_CLIENT_AUTH_KEY

module.exports = {

  epilepsy_frontend: {
    port: process.env.PORT || 8000
  },

  epilepsy_backend: {
    endpoint: 'https://epilepsydiary.herokuapp.com',
    auth: "Basic " + new Buffer(AUTH_USER+":"+AUTH_PASS).toString("base64"),
  },

  facebook: {
    verification_token: process.env.EPILEPSY_FB_VERIFICATION_TOKEN,
    access_token: process.env.EPILEPSY_FB_PAGE_ACCESS_TOKEN
  },

  testing: false,

};
