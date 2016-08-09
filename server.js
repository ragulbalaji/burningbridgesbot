'use strict'
 
const Telegram = require('telegram-node-bot')
const TelegramBaseController = Telegram.TelegramBaseController
const tg = new Telegram.Telegram('KEY') // Get a key from @botfather
 
class GameController extends TelegramBaseController {
    pingHandler($) {
        $.sendMessage('pong')
    }
 
    get routes() {
        return {
            'start': 'pingHandler'
        }
    }
}

class StartController extends TelegramBaseController {
    handle($) {
        console.log('Started')
        $.runInlineMenu({
    layout: 2, //some layouting here
    method: 'sendMessage', //here you must pass the method name
    params: ['text'], //here you must pass the parameters for that method
    menu: [
        {
            text: '1', //text of the button
            callback: (callbackQuery, message) => { //to your callback will be passed callbackQuery and response from method
                console.log(1)
            }
        },
        {
            text: 'Exit',
            message: 'Are you sure?',
            layout: 2,
            menu: [ //Sub menu (current message will be edited)
                {
                    text: 'Yes!',
                    callback: () => {

                    }
                },
                {
                    text: 'No!',
                    callback: () => {

                    }
                }
            ]
        }
    ]
})
    }
}

class StopController extends TelegramBaseController {
    handle() {
        console.log('Stopped')
    }
}
 
tg.router
    .when('/start', new StartController())
    .when('/stop', new StopController())
    .otherwise(new GameController())