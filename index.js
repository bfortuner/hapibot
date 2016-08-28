'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const app = express()

const token = process.env.FB_PAGE_ACCESS_TOKEN

app.set('port', (process.env.PORT || 5000))

// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}))

// Process application/json
app.use(bodyParser.json())

// Index route
app.get('/', function (req, res) {
    res.send('Hello world, I am a chat bot')
})

// for Facebook verification
app.get('/webhook/', function (req, res) {
    if (req.query['hub.verify_token'] === 'my_voice_is_my_password_verify_me') {
        res.send(req.query['hub.challenge'])
    }
    res.send('Error, wrong token')
})

  app.post('/webhook/', function (req, res) {
    let messaging_events = req.body.entry[0].messaging
    for (let i = 0; i < messaging_events.length; i++) {
        let event = req.body.entry[0].messaging[i]
        let sender = event.sender.id
        let actionType
        let userInputText
        let botResponseText = "Complex Msg"
        if (event.message && event.message.text) {
            let userInputText = event.message.text.toLowerCase()
            console.log("Sender: " + sender
                        + " UserInputText: " + userInputText)
            if (userInputText == 'track') {
                actionType = "TRACK"
                sendTrackQuickReply(sender)
            } else if (userInputText == 'chart') {
                actionType = "CHART"
                botResponseText = "Your chart: :)"
                sendTextMessage(sender, botResponseText)
            } else if (userInputText == 'share') {
                actionType = "SHARE"
                botResponseText = "Sharing your weekly metrics with Dr. Miller at Harborview Medical Center"
                sendTextMessage(sender, botResponseText)
            } else if (userInputText == 'seizure' || userInputText == 'aura') {
                actionType = "DURATION"
                sendDurationMessage(sender, userInputText)
            } else {
                actionType = "GENERIC"
                botResponseText = "Hello! " 
                + " Type 'Track' to record a seizure or aura."
                + " 'Chart' to view your weekly metrics."
                + " 'Share' to share data with your Doctor."
                sendTextMessage(sender, botResponseText)
            }
            console.log("Sender: " + sender
                        + ", ActionType: " + actionType
                        + ", UserInputText: " + userInputText
                        + ", BotResponseText: " + botResponseText)
        }
      if (event.postback) {
            let json = JSON.stringify(event.postback)
            console.log("Handling Postback: " + JSON.stringify(json))
            let responseText = event.postback.payload
            sendTextMessage(sender, responseText.substring(0, 200), token)
            //sendTrackMessage(sender)
      }
    }
    res.sendStatus(200)
  })


function sendDurationMessage(sender, episodeType) {
    let currentTime = getUserTime()
    console.log("Sending Duration Message")
    let messageData = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "generic",
                "elements": [{
                    "title": "How long did your " + episodeType + " last?",
                    "subtitle": "Select an option",
                    "buttons": [{
                        "type": "postback",
                        "title": "<1 minute",
                        "payload": "I'm recording your " + episodeType + " at " + currentTime
                    }, {
                        "type": "postback",
                        "title": "2-5 minutes",
                        "payload": "I'm recording your " + episodeType + " at " + currentTime
                    }, {
                        "type": "postback",
                        "title": ">5 minutes",
                        "payload": "I'm recording your " + episodeType + " at " + currentTime
                    }],
                }]
            }
        }
    }
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token:token},
        method: 'POST',
        json: {
            recipient: {id:sender},
            message: messageData,
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
    })
}

function sendTrackMessage(sender) {
    console.log("Sending Tracker Message")
    let messageData = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "generic",
                "elements": [{
                    "title": "What happened?",
                    "subtitle": "Select an option",
                    "buttons": [{
                        "type": "postback",
                        "title": "Seizure",
                        "payload": "Got it. Seizure recorded at 6pm.",
                    }, {
                        "type": "postback",
                        "title": "Aura",
                        "payload": "Got it. Aura recorded at 6pm.",
                    }],
                }]
            }
        }
    }
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token:token},
        method: 'POST',
        json: {
            recipient: {id:sender},
            message: messageData,
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
    })
}

function sendTrackQuickReply(sender) {
    console.log("Sending Track Quick Reply")
    let messageData = {
     "text":"What happened? (Select an option):",
        "quick_replies":[
        {
        "content_type":"text",
        "title":"Seizure",
        "payload":"TRACK_REQUEST"
      },
      {
        "content_type":"text",
        "title":"Aura",
        "payload":"TRACK_REQUEST"
      }
    ]
      }
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token:token},
        method: 'POST',
        json: {
            recipient: {id:sender},
            message: messageData,
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
    })
}

function sendComplexMessage(sender) {
    console.log("Sending Complex Message")
    let messageData = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "generic",
                "elements": [{
                    "title": "First card",
                    "subtitle": "Element #1 of an hscroll",
                    "image_url": "http://messengerdemo.parseapp.com/img/rift.png",
                    "buttons": [{
                        "type": "web_url",
                        "url": "https://www.messenger.com",
                        "title": "web url"
                    }, {
                        "type": "postback",
                        "title": "Postback",
                        "payload": "Payload for first element in a generic bubble",
                    }],
                }, {
                    "title": "Second card",
                    "subtitle": "Element #2 of an hscroll",
                    "image_url": "http://messengerdemo.parseapp.com/img/gearvr.png",
                    "buttons": [{
                        "type": "postback",
                        "title": "Postback",
                        "payload": "Payload for second element in a generic bubble",
                    }],
                }]
            }
        }
    }
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token:token},
        method: 'POST',
        json: {
            recipient: {id:sender},
            message: messageData,
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending messagesz: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
    })
}

function sendTextMessage(sender, userInputText) {
    console.log("Sending Text Message")
    let messageData = { text:userInputText }
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token:token},
        method: 'POST',
        json: {
            recipient: {id:sender},
            message: messageData,
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
    })
}

function getUserTime() {
    let timeInMillis = Date.now()
    console.log("timeInMillis: " + timeInMillis)
    console.log("time in UTC: " + new Date().toUTCString())
    var time = new Date().getTime()
    var date = new Date(time)
    var dateStr = date.toString() // Wed Jan 12 2011 12:42:46 GMT-0800 (PST)
    console.log("DateStr: " + dateStr)
    return dateStr
}

// Spin up the server
app.listen(app.get('port'), function() {
    console.log('running on port', app.get('port'))
})

