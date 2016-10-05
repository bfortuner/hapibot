## Hapi FB Messenger Bot

Hapi API for handling user messages Facebook Messenger


### Key Links

* HapiBot Facebook Page: [View Page](https://www.facebook.com/hapibot)
* Message HapiBot: [Message Me](http://l.facebook.com/l.php?u=http%3A%2F%2Fm.me%2Fhapibot&h=1AQFFtodm)
* Backend Repo: [Github](https://github.com/bfortuner/epilepsy_diary)
* Hapi FB Developer Page: [Developers](https://developers.facebook.com/apps/1062967727132759/dashboard)


### Setup

Clone github repository:

```
$ git clone https://github.com/bfortuner/hapibot.git
```

Setup virtualenv:
```
$ sudo pip install nodeenv
$ nodeenv hapienv
$ . hapienv/bin/activate
```

Now install the required modules:
```
$ cd hapibot
$ npm install
```

Create required ENV variables (add to ~/.bash_profile or ~/.zshrc)
```
export EPILEPSY_CONFIG='TestConfig'
export EPILEPSY_FB_VERIFICATION_TOKEN=''
export EPILEPSY_FB_PAGE_ACCESS_TOKEN=''
export EPILEPSY_CLIENT_AUTH_KEY=''
```
*Email admins for keys

Launch App
```
$ node index.js
```
App running on http://localhost:8000


### Deployment

Deploy to Heroku:
```
$ git add --all
$ git commit -m 'My Commit Message'
$ git push heroku master
```

Helpful Heroku Commands
```
$ git push -f heroku master  #Override everything in the Heroku Repo with your local changes
$ git push heroku mydevbranch:master  #Deploy your development branch changes to Heroku
$ heroku run bash  #ssh into dyno
$ heroku pg:psql --app hapibackend DATABASE  #login to postgres db
```


### Other Commands

```
ngrok http 8000  # Host app locally for faster development (update FB developer page webhook)
```



