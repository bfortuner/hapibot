'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const moment = require('moment')
const request = require('request-promise')
const config = require('./environment')
const app = express()

const token = config.facebook.access_token

app.set('port', config.epilepsy_frontend.port)

// Process application/x-www-form-urlencoded - ok
app.use(bodyParser.urlencoded({extended: false}))

// Process application/json
app.use(bodyParser.json())


// Index route
app.get('/', function (req, res) {
    res.send('Hello world, I am a chat bot')
})


app.get('/time/:offsethours', function(req,res) {
    console.log("offsethours:"+req.params.offsethours)
    let time = getUserTime(parseInt(req.params.offsethours))
    res.send('Time: '+time)
})


// for Facebook verification
app.get('/webhook/', function (req, res) {
    if (req.query['hub.verify_token'] === config.facebook.verification_token) {
        res.send(req.query['hub.challenge'])
    }
    res.send('Error, wrong token')
})


//Example Async Calling
app.get('/test', function (req, res) {
    let username = "admin"
    let user = {"id":username}
    let chart_url
    createEvent(user).then(function(eventId) {
        console.log("Fetched async event"+eventId)
        return getEvent(eventId)
    }).then(function(event) {
        console.log("retreived event"+event)
        event.event_duration = 99
        return updateEvent(event)
    }).then(function(eventId) {
        console.log("eventId from 3rd call:"+eventId)
        return createEvent(user)
    }).then(function(eventId) {
        console.log("eventId from 4th call:"+eventId)
        return getChart(username)
    }).then(function(chartUrl) {
        console.log("chartUrl"+chartUrl)
        res.send("charturl:"+chartUrl)
    })
})


function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}


function createEvent(user) {
    console.log("Creating Event for User:"+JSON.stringify(user))
    return request({
        url: config.epilepsy_backend.endpoint+"/event/create",
        method: 'POST',
        headers: {
            'content-type': 'application/json'
        },
        body: {
            username: user.id
        },
        json: true // Automatically stringifies response body to JSON
    }).then(function (response) {
        console.log("succeeded in creating event")
        return response.event_id
    })
}


function getEvent(eventId) {
    console.log("Getting Event:"+eventId)
    return request({
        url: config.epilepsy_backend.endpoint+"/event/"+eventId,
        method: 'GET',
        headers: {
            'content-type': 'application/json'
        },
        json: true // Automatically stringifies response body to JSON
    }).then(function (event) {
        console.log("Success retreiving event for "+eventId)
        return event
    }).catch(function (err) {
        console.log("Error retreiving event data:"+err)
    })
}


function updateEvent(event) {
    console.log("Updating Event:"+JSON.stringify(event))
    return request({
        url: config.epilepsy_backend.endpoint+"/event/update",
        method: 'POST',
        headers: {
            'content-type': 'application/json'
        },
        body: event,
        json: true // Automatically stringifies response body to JSON
    }).then(function (resp) {
        console.log("Success updating event for "+event.id)
        return resp.event_id
    }).catch(function (err) {
        console.log("Error update event:"+err)
    })
}


function getChart(username) {
    console.log("Getting Chart for user:"+username)
    return request({
        url: config.epilepsy_backend.endpoint+"/chart/"+username,
        method: 'GET',
        headers: {
            'content-type': 'application/json'
        },
        json: true // Automatically stringifies response body to JSON
    }).then(function (resp) {
        console.log("Success retreiving chart for "+username)
        console.log("chart response:"+resp)
        return resp.chart_url
    }).catch(function (err) {
        console.log("Error retreiving chart:"+err)
    })
}


function extractTypeOfMessage(message) {
    if (message.quick_reply) {
        return "QUICK_REPLY"
    } else if (message.payload) {
        return "PAYLOAD"
    }
    return "TEXT"
}


function buildMsgStructFromMsg(message) {
    console.log("Building Message Struct From: "+JSON.stringify(message))
    let typeOfMessage = extractTypeOfMessage(message)
    console.log("TYPE_OF_MESSAGE: "+typeOfMessage)
    let msgText
    if (typeOfMessage == "QUICK_REPLY") {
        msgText = message.quick_reply.payload
    } else if (typeOfMessage == "PAYLOAD") {
        msgText = message.payload
    } else {
        msgText = message.text
    }
    console.log("MSG_TEXT: "+msgText)
    let eventId = msgText.substring(msgText.indexOf("EventId:")+8,msgText.indexOf("::",msgText.indexOf("EventId:")))
    let eventType = msgText.substring(msgText.indexOf("EventType:")+10,msgText.indexOf("::",msgText.indexOf("EventType:")))
    let userInputText = msgText.substring(msgText.indexOf("UserInputText:")+14,msgText.indexOf("::",msgText.indexOf("UserInputText:"))).toLowerCase()
    let replyText = msgText.substring(msgText.indexOf("ReplyText:")+10,msgText.indexOf("::",msgText.indexOf("ReplyText:")))
    let msgStruct = {
        "eventId":eventId,
        "eventType":eventType,
        "userInputText":userInputText,
        "replyText":replyText
    }
    return msgStruct
}


app.post('/webhook/', function (req, res) {
    console.log("Recieved new user message")
    let messaging_events = req.body.entry[0].messaging
    for (let i = 0; i < messaging_events.length; i++) {
        let event = req.body.entry[0].messaging[i]
        let facebookUserId = event.sender.id
        request('https://graph.facebook.com/v2.6/'+facebookUserId+'?access_token='+token)
        .then(function (response) {
            console.log("Success retreiving profile for "+facebookUserId)
            var userProfile = JSON.parse(response)
            userProfile.id = facebookUserId
            handleUserEvent(userProfile, event)
        })
        .catch(function (err) {
            console.log("Error retreiving user profile:"+err)
        });
    }
    res.sendStatus(200)
})


function handleUserEvent(userProfile, event) {
    console.log("Handing event for user:"+JSON.stringify(userProfile))
    console.log("Event:"+JSON.stringify(event))
    if (event.message && event.message.text) {
        let msgText = event.message.text
        console.log("MSGText:"+msgText)
        let msgStruct = buildMsgStructFromMsg(event.message)
        console.log("MSGStruct:"+JSON.stringify(msgStruct))
        console.log(" FacebookUserId:" + userProfile.id
                    + " UserInputText:" + msgStruct.userInputText)
        if (msgText.toLowerCase() == 'track') {
            msgStruct.eventType = 'TRACK'
            createEvent(userProfile).then(function(eventId) {
                sendTrackQuickReply(userProfile.id, eventId)
            })
        } else if (msgText.toLowerCase() == 'chart') {
            msgStruct.eventType = 'CHART'
            sendChartMessage(userProfile.id)
        } else if (msgStruct.eventType == "TYPE_OF_EVENT") {
            let eventId = msgStruct.eventId
            getEvent(eventId).then(function(event) {
                event.event_type = msgStruct.userInputText
                updateEvent(event)
            })
            sendDurationMessage(userProfile, msgStruct.userInputText, eventId)
        } else {
            msgStruct.eventType = "GENERIC"
            msgStruct.replyText = "Hello! "
            + " Type 'Track' to record a seizure or aura."
            + " 'Chart' to view your weekly report."
            sendTextMessage(userProfile.id, msgStruct.replyText)
        }
        console.log("FacebookUserId: " + userProfile.id
                    + ", EventType: " + msgStruct.eventType
                    + ", UserInputText: " + msgStruct.userInputText
                    + ", ReplyText: " + msgStruct.replyText)
    }
    if (event.postback) {
        let json = JSON.stringify(event.postback)
        console.log("Handling Postback: " + JSON.stringify(json))
        let message = event.postback
        let msgStruct = buildMsgStructFromMsg(message)
        let eventId = msgStruct.eventId
        let userInputText = msgStruct.userInputText
        let replyText = msgStruct.replyText

        getEvent(eventId).then(function(event) {
            event.event_duration = userInputText
            updateEvent(event)
        })

        console.log("EVENT:"+ eventId + " RESPONSE:"+replyText + " USERINPUT:"+userInputText)
        sendTextMessage(userProfile.id, replyText)
    }
}


function sendDurationMessage(user, episodeType, eventId) {
    console.log("Sending Duration Message to user:"+user.id)
    let currentTime = getUserTime(user.timezone)
    let recordingMsg = "I'm recording your " + episodeType + " on " + currentTime
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
                        "payload": "EventType:DURATION::EventId:"+eventId+"::UserInputText:<1::ReplyText:"+recordingMsg+"::"
                    }, {
                        "type": "postback",
                        "title": "1-3 minutes",
                        "payload": "EventType:DURATION::EventId:"+eventId+"::UserInputText:1-3::ReplyText:"+recordingMsg+"::"
                    }, {
                        "type": "postback",
                        "title": ">3 minutes",
                        "payload": "EventType:DURATION::EventId:"+eventId+"::UserInputText:>3::ReplyText:"+recordingMsg+"::"
                   }],
                }]
            }
        },
        "metadata": "eventId:" + eventId
    }
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token:token},
        method: 'POST',
        json: {
            recipient: {id:user.id},
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


function sendTrackQuickReply(facebookUserId, eventId) {
    console.log("Sending Track Quick Reply to user:"+facebookUserId)
    let messageData = {
    "text":"What happened? (Select an option):",
    "quick_replies":[
        {
            "content_type":"text",
            "title":"Seizure",
            "payload": "EventType:TYPE_OF_EVENT::EventId:"+eventId+"::UserInputText:SEIZURE::ReplyText:None::"
        },
        {
            "content_type":"text",
            "title":"Aura",
            "payload": "EventType:TYPE_OF_EVENT::EventId:"+eventId+"::UserInputText:AURA::ReplyText:None::"
        }
    ],
    "metadata": "eventId:" + eventId
    }
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token:token},
        method: 'POST',
        json: {
            recipient: {id:facebookUserId},
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


function sendTextMessage(facebookUserId, userInputText) {
    console.log("Sending Text Message to user:"+facebookUserId)
    let messageData = { text:userInputText }
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token:token},
        method: 'POST',
        json: {
            recipient: {id:facebookUserId},
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


function sendChartMessage(facebookUserId) {
    console.log("Sending Chart Message to user:"+facebookUserId)
    getChart(facebookUserId).then(function(chartUrl) {
        let messageData = {
            "attachment":{
                "type":"image",
                "payload": {
                    "url": chartUrl
                }
            }
        }
        request({
            url: 'https://graph.facebook.com/v2.6/me/messages',
            qs: {access_token:token},
            method: 'POST',
            json: {
                recipient: {id:facebookUserId},
                message: messageData,
            }
        }, function(error, response, body) {
            if (error) {
                console.log('Error sending messages: ', error)
            } else if (response.body.error) {
                console.log('Error: ', response.body.error)
            }
        })
    })
}


function getUserProfile(facebookUserId) {
    console.log("Fetching fb profile for user:"+facebookUserId)
    return request('https://graph.facebook.com/v2.6/'+facebookUserId+'?access_token='+token)
        .then(function (response) {
            console.log("Success retreiving profile for "+facebookUserId); // Show the HTML for the Modulus homepage.
            let bodyJson = JSON.parse(response)
            return bodyJson
        })
        .catch(function (err) {
            console.log("Error retreiving user profile:"+err)
        });
}


function getUserTime(offsetHours) {
    offsetHours = parseInt(offsetHours)
    return moment.utc().add(offsetHours,'h').format('MMM Do h:mm a')
}


// Spin up the server
app.listen(app.get('port'), function() {
    console.log('running on port', app.get('port'))
})

