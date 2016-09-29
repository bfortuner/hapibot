'use strict';

module.exports = {

  epilepsy_frontend: {
    port: process.env.PORT || 8000
  },

  epilepsy_backend: {
    endpoint: 'https://epilepsydiary.herokuapp.com'
  },

  facebook: {
    verification_token: process.env.EPILEPSY_FB_VERIFICATION_TOKEN,
    access_token: process.env.EPILEPSY_FB_PAGE_ACCESS_TOKEN
  },

  testing: false,

};
