const restify = require('restify');
const builder = require('botbuilder');
const dotenv = require('dotenv');
const request = require("request");
const querystring = require('querystring');

// Para utilizar variables de entorno
dotenv.config();

// No te preocupes por estas credenciales por ahora, luego las usaremos para conectar los canales.
var connector = new builder.ChatConnector({
    appId: process.env.APP_ID,
    appPassword: process.env.APP_KEY
});

// Ahora utilizamos un UniversalBot
var bot = new builder.UniversalBot(connector);

// Levantar restify
var server = restify.createServer();
server.use(restify.bodyParser());

server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});

server.post('/api/messages', connector.listen());

server.post('/api/auth', function authorization(req, res, next){
   bot.beginDialog(req.body.address, "*:/resume", req.body.access_token);
   res.send(200);
   return next();
});


let apiUrl = process.env.API_URL;
let luisApp = process.env.LUIS_APP;
let luisKey = process.env.LUIS_KEY;
let signinUrl = process.env.SIGNIN_URL;
let authUrl = process.env.BOT_AUTH_URL;

var model = `https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/${luisApp}?subscription-key=${luisKey}&timezoneOffset=0&verbose=true`;

var recognizer = new builder.LuisRecognizer(model);
var dialog = new builder.IntentDialog({ recognizers: [recognizer] });

bot.dialog('/', dialog);

// Dialogos
dialog.matches('wellcome', [
    function (session, results, next) {
        if(session.userData.access_token == undefined) {
            session.beginDialog('/auth');
        } else {
            // TODO > Chequear si no tengo que volver a buscar los devices.
            session.send('Wellcome! I am LugLoc bot. How can I help you?');   
        }
    }
]);    

dialog.matches('findDevice', [
    function (session, args, next) {  
        if(session.userData.access_token == undefined) {
            session.beginDialog('/auth');
        } 
        else if(session.userData.devices == undefined ||
                session.userData.devices == null ||
                session.userData.devices.length == 0) {
            session.send("I'm sorry, but you don't have any device.");
            session.endDialog();
        }
        else if(session.userData.devices.length == 1) {            
            session.userData.currentDevice = session.userData.devices[0];
            session.beginDialog('/detail');
        }
        else {
            // Buscar el device por nombre si fue especificado.
            var deviceNames = builder.EntityRecognizer.findAllEntities(args.entities, 'deviceName');

            if(deviceNames.length == 0)
                deviceNames = builder.EntityRecognizer.findAllEntities(args.entities, 'deviceNameSimple');
            
            if(deviceNames.length > 0){
                var findedDevice = session.userData.devices.find(o => o.DeviceName === deviceNames[0].entity.toLowerCase());

                if(findedDevice == undefined || findedDevice == null){
                    session.send("I'm sorry but no finded devices with this name. Please, try with other name.");
                    session.endDialog();
                } else {
                    session.send("A moment, please...");        
                    session.userData.currentDevice = findedDevice;
                    session.beginDialog('/detail');                    
                }                
            } else {
                session.userData.resumeInDialog = "/detail";
                session.send("You have many devices, chosee one please!");
                session.beginDialog('/choise');
            }
        }
    }
]);

dialog.matches('getBattery', [
    function (session, args, next) {  
        if(session.userData.access_token == undefined) {
            session.beginDialog('/auth');
        } 
        else if(session.userData.devices == undefined ||
                session.userData.devices == null ||
                session.userData.devices.length == 0) {
            session.send("I'm sorry, but you don't have any device.");
            session.endDialog();
        }
        else if(session.userData.devices.length == 1) {            
            session.userData.currentDevice = session.userData.devices[0];
            session.beginDialog('/detail_battery');
        }
        else {
            // Buscar el device por nombre si fue especificado.
            var deviceNames = builder.EntityRecognizer.findAllEntities(args.entities, 'deviceName');
            
            if(deviceNames.length > 0){            
                var findedDevice = session.userData.devices.find(o => o.DeviceName === deviceNames[0].entity);

                if(findedDevice == undefined || findedDevice == null){
                    session.send("I'm sorry but no finded devices with this name. Please, try with other name.");
                    session.endDialog();
                } else {
                    session.send("A moment, please...");        
                    session.userData.currentDevice = findedDevice;
                    session.beginDialog('/detail_battery');                    
                }                
            } else {
                session.userData.resumeInDialog = "/detail_battery";
                session.send("You have many devices, chosee one please!");
                session.beginDialog('/choise');
            }
        }
    }
]);

dialog.matches('servicePlan', [
    function (session, args, next) {  
        if(session.userData.access_token == undefined) {
            session.beginDialog('/auth');
        } 
        else if(session.userData.devices == undefined ||
                session.userData.devices == null ||
                session.userData.devices.length == 0) {
            session.send("I'm sorry, but you don't have any device.");
            session.endDialog();
        }
        else if(session.userData.devices.length == 1) {            
            session.userData.currentDevice = session.userData.devices[0];
            session.beginDialog('/detail_serviceplan');
        }
        else {
            // Buscar el device por nombre si fue especificado.
            var deviceNames = builder.EntityRecognizer.findAllEntities(args.entities, 'deviceName');
            
            if(deviceNames.length > 0){            
                var findedDevice = session.userData.devices.find(o => o.DeviceName === deviceNames[0].entity);

                if(findedDevice == undefined || findedDevice == null){
                    session.send("I'm sorry but no finded devices with this name. Please, try with other name.");
                    session.endDialog();
                } else {
                    session.send("A moment, please...");        
                    session.userData.currentDevice = findedDevice;
                    session.beginDialog('/detail_serviceplan');                    
                }                
            } else {
                session.userData.resumeInDialog = "/detail_serviceplan";
                session.send("You have many devices, chosee one please!");
                session.beginDialog('/choise');
            }
        }
    }
]);


bot.dialog('/auth',[
    function (session, results, next) {
        const currentAddress = session.message.address;

        const addressParam = querystring.escape(JSON.stringify(currentAddress));        

        session.send('Wellcome! I am LugLoc bot and I need you to authenticate first.');   

        var sigingCard = new builder.SigninCard(session)
        .text("Please, login to LugLoc.")        
        .button("Signin", `${signinUrl}?a=${addressParam}&e=${authUrl}`);

        var msj = new builder.Message(session).addAttachment(sigingCard);
        session.send(msj);
        session.endDialog();   
    }
]);

bot.dialog('/resume', [
    function (session, results, next) {
        session.userData.access_token = results; 

        getDevices(session.userData.access_token, function(response){
            if(response == null){
                session.userData.devices = null;
            }
            else {  
                session.userData.devices = [];              
                var devices = "";

                response.forEach(function (item) {
                    session.userData.devices.push(item);
                    devices = devices + item.DeviceId + "|";
                });

                session.userData.deviceChoises = devices.slice(0, -1);
            }

            session.send("How can I help you?");   
            session.endDialog();   
        });
    }    
]);

bot.dialog('/detail',[
    function (session, results, next) {
        // TODO > Tener presente que puede no tener last position!
        if(session.userData.currentDevice != undefined && session.userData.currentDevice != null)
        {
            var heroCard = new builder.HeroCard(session)
                            .title(`Device ${session.userData.currentDevice.DeviceName}`)
                            .subtitle('We found your device')
                            .text(`The last position was ${session.userData.currentDevice.LastLocationGeneralDescription},
                                ${session.userData.currentDevice.LastLocationSpecificDescription} on ${session.userData.currentDevice.LastPositionUpdate}`)
                            .images([
                                builder.CardImage.create(session, session.userData.currentDevice.LastLocationPhotoUrl)
                            ]);

            var msj = new builder.Message(session).addAttachment(heroCard);
            session.send(msj);            
        }

        session.endDialog();
    }
]);

bot.dialog('/detail_battery',[
    function (session, results, next) {
        // TODO > Tener presente que puede no tener last position!
        if(session.userData.currentDevice != undefined && session.userData.currentDevice != null)
        {            
            session.send(`The last battery level was ${session.userData.currentDevice.Battery} on ${session.userData.currentDevice.LastBatteryUpdate}`);            
        }

        session.endDialog();
    }
]);

bot.dialog('/detail_serviceplan',[
    function (session, results, next) {        
        if(session.userData.currentDevice != undefined && session.userData.currentDevice != null)
        {    
            // Validar que si esta expirado recominde comprar uno nuevo. 
            session.send(`Your service plan expire on ${session.userData.currentDevice.TracesExpirationDate}`);            
        }

        session.endDialog();
    }
]);

bot.dialog('/choise', [
    function (session, results) {
        builder.Prompts.choice(session, 'Choise a device', session.userData.deviceChoises.slice(0, -1), { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        //session.send("Wait a moment...");    
        var findedDevice = session.userData.devices.find(o => o.DeviceId == results.response.entity);
        session.userData.currentDevice = findedDevice;
        session.beginDialog(session.userData.resumeInDialog);
    } 
]);

var getDevices = function(token, callback) {
    var options = { 
        method: 'GET',
        url: apiUrl + '/devices',
        headers: 
        {
            authorization: `Bearer ${token}`
        }
    };

    request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {            
            return callback(JSON.parse(body));
        }
        return callback(null);
    });
}

var getDevice = function(deviceId, token, callback) {
    var options = { 
        method: 'GET',
        url: apiUrl + `/devices/${deviceId}`,
        headers: 
        {
            authorization: `Bearer ${token}`
        }
    };

    request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {            
            return callback(JSON.parse(body));
        }
        return callback(null);
    });
}