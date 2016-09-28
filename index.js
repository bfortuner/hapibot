'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const moment = require('moment')
const request = require('request-promise')
const app = express()

const token = process.env.FB_PAGE_ACCESS_TOKEN

app.set('port', (process.env.PORT || 5000))

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
    if (req.query['hub.verify_token'] === 'my_voice_is_my_password_verify_me') {
        res.send(req.query['hub.challenge'])
    }
    res.send('Error, wrong token')
})

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
    let messaging_events = req.body.entry[0].messaging
    for (let i = 0; i < messaging_events.length; i++) {
        let event = req.body.entry[0].messaging[i]
        let facebookUserId = event.sender.id
        request('https://graph.facebook.com/v2.6/'+facebookUserId+'?access_token='+token)
        .then(function (response) {
            console.log("Success retreiving profile for "+facebookUserId); // Show the HTML for the Modulus homepage.
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
    console.log("USER_PROFILE:"+JSON.stringify(userProfile) + "\nEvent:"+JSON.stringify(event))
    if (event.message && event.message.text) {
        let msgText = event.message.text
        console.log("MSGText:"+msgText)
        let msgStruct = buildMsgStructFromMsg(event.message)
        console.log("MSGStruct:"+JSON.stringify(msgStruct))
        console.log("SenderId:" + userProfile.id
                    + " FacebookUserId:" + userProfile.id
                    + " UserInputText:" + msgStruct.userInputText)
        if (msgText.toLowerCase() == 'track') {
            msgStruct.eventType = 'TRACK'
            console.log("Creating new event")
            sendTrackQuickReply(userProfile.id, "FAKE_EVENT_ID")
        } else if (msgText.toLowerCase() == 'chart') {
            msgStruct.eventType = 'CHART'
            sendChartMessage(userProfile.id, userProfile.id)
        } else if (msgStruct.eventType == "TYPE_OF_EVENT") {
            console.log("Saving type of event:" + msgStruct.userInputText)
            console.log("durationuserprofileid:" + userProfile.id)
            sendDurationMessage(userProfile, msgStruct.userInputText, "FAKE_EVENT_ID")
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
        console.log("Saving eventDuration")
        let eventId = msgStruct.eventId
        let userInputText = msgStruct.userInputText
        let replyText = msgStruct.replyText
        console.log("EVENT:"+ eventId + " RESPONSE:"+replyText + " USERINPUT:"+userInputText)
        sendTextMessage(userProfile.id, replyText)
    }
}


function sendDurationMessage(user, episodeType, eventId) {
    let currentTime = getUserTime(user.timezone)
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
                        "payload": "EventType:DURATION::EventId:FAKE_ID::UserInputText:<1 minute::ReplyText:I'm recording your " + episodeType + " at " + currentTime+"::",
                    }, {
                        "type": "postback",
                        "title": "2-5 minutes",
                        "payload": "EventType:DURATION::EventId:FAKE_ID::UserInputText:2-5 minutes::ReplyText:I'm recording your " + episodeType + " at " + currentTime+"::",
                    }, {
                        "type": "postback",
                        "title": ">5 minutes",
                        "payload": "EventType:DURATION::EventId:FAKE_ID::UserInputText:>5 minutes::ReplyText:I'm recording your " + episodeType + " at " + currentTime+"::",
                    }],
                }]
            }
        },
        "metadata": "eventId:" + eventId
    }
    //messageData["attachment"]["payload"]["elements"]["buttons"]["payload"] = "I'm recording your "
    //+ episodeType + " at " + currentTime + ". Hope you feel better!"
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


function sendTrackQuickReply(sender, eventId) {
    console.log("Sending Track Quick Reply")
    let messageData = {
    "text":"What happened? (Select an option):",
    "quick_replies":[
        {
            "content_type":"text",
            "title":"Seizure",
            "payload": "EventType:TYPE_OF_EVENT::EventId:FAKE_ID::UserInputText:SEIZURE::ReplyText:None::"
        },
        {
            "content_type":"text",
            "title":"Aura",
            "payload": "EventType:TYPE_OF_EVENT::EventId:FAKE_ID::UserInputText:AURA::ReplyText:None::"
        }
    ],
    "metadata": "eventId:" + eventId
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


function sendChartMessage(sender, facebookUserId) {
    console.log("Sending Chart Message")
    let messageData = {
        "attachment":{
            "type":"image",
            "payload": {
                "url":"https://amazon.com"
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


function getUserProfile(facebookUserId) {
    return request('https://graph.facebook.com/v2.6/'+facebookUserId+'?access_token='+token)
        .then(function (response) {
            console.log("Success retreiving profile for "+facebookUserId); // Show the HTML for the Modulus homepage.
            let bodyJson = JSON.parse(response)
            console.log(bodyJson)
            return bodyJson
        })
        .catch(function (err) {
            console.log("Error retreiving user profile:"+err)
        });
}


function getUserTime(offsetHours) {
    offsetHours = parseInt(offsetHours)
    return moment.utc().add(offsetHours,'h').format('YYYY-MM-DD HH:mm:ss')
}



// function sendComplexMessage(sender) {
//     console.log("Sending Complex Message")
//     let messageData = {
//         "attachment": {
//             "type": "template",
//             "payload": {
//                 "template_type": "generic",
//                 "elements": [{
//                     "title": "First card",
//                     "subtitle": "Element #1 of an hscroll",
//                     "image_url": "http://messengerdemo.parseapp.com/img/rift.png",
//                     "buttons": [{
//                         "type": "web_url",
//                         "url": "https://www.messenger.com",
//                         "title": "web url"
//                     }, {
//                         "type": "postback",
//                         "title": "Postback",
//                         "payload": "Payload for first element in a generic bubble",
//                     }],
//                 }, {
//                     "title": "Second card",
//                     "subtitle": "Element #2 of an hscroll",
//                     "image_url": "http://messengerdemo.parseapp.com/img/gearvr.png",
//                     "buttons": [{
//                         "type": "postback",
//                         "title": "Postback",
//                         "payload": "Payload for second element in a generic bubble",
//                     }],
//                 }]
//             }
//         }
//     }
//     request({
//         url: 'https://graph.facebook.com/v2.6/me/messages',
//         qs: {access_token:token},
//         method: 'POST',
//         json: {
//             recipient: {id:sender},
//             message: messageData,
//         }
//     }, function(error, response, body) {
//         if (error) {
//             console.log('Error sending messagesz: ', error)
//         } else if (response.body.error) {
//             console.log('Error: ', response.body.error)
//         }
//     })
// }


// Spin up the server
app.listen(app.get('port'), function() {
    console.log('running on port', app.get('port'))
})

