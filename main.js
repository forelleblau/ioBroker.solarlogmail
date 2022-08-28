'use strict';

/*
 * Created with @iobroker/create-adapter v1.26.3
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');
const MailListener = require("mail-listener2");
const HtmlTableToJson = require('html-table-to-json');

// Load your modules here, e.g.:
// const fs = require("fs");

/**
 * The adapter instance
 * @type {ioBroker.Adapter}
 */
let adapter;

var mailListener;
var username;
var password;
var host;
var port;
var tls;
var mailbox;
var searchFilter;
var markSeen;
var fetchUnreadOnStart;

var datatables = [];

/**
 * Starts the adapter instance
 * @param {Partial<utils.AdapterOptions>} [options]
 */
function startAdapter(options) {
  // Create the adapter and define its methods
  return adapter = utils.adapter(Object.assign({}, options, {
    name: 'solarlogmail',

    // The ready callback is called when databases are connected and adapter received configuration.
    // start here!
    ready: main, // Main method defined below for readability

    // is called when adapter shuts down - callback has to be called under any circumstances!
    unload: (callback) => {
      try {
        // Here you must clear all timeouts or intervals that may still be active
        // clearTimeout(timeout1);
        // clearTimeout(timeout2);
        // ...
        // clearInterval(interval1);
        mailListener.stop();
        callback();
      } catch (e) {
        callback();
      }
    },

    // If you need to react to object changes, uncomment the following method.
    // You also need to subscribe to the objects with `adapter.subscribeObjects`, similar to `adapter.subscribeStates`.
    // objectChange: (id, obj) => {
    //     if (obj) {
    //         // The object was changed
    //         adapter.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
    //     } else {
    //         // The object was deleted
    //         adapter.log.info(`object ${id} deleted`);
    //     }
    // },

    // is called if a subscribed state changes
    stateChange: (id, state) => {
      if (state) {
        // The state was changed
        adapter.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
      } else {
        // The state was deleted
        adapter.log.info(`state ${id} deleted`);
      }
    },

    // If you need to accept messages in your adapter, uncomment the following block.
    // /**
    //  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
    //  * Using this method requires "common.message" property to be set to true in io-package.json
    //  */
    // message: (obj) => {
    //     if (typeof obj === 'object' && obj.message) {
    //         if (obj.command === 'send') {
    //             // e.g. send email or pushover or whatever
    //             adapter.log.info('send command');

    //             // Send response in callback if required
    //             if (obj.callback) adapter.sendTo(obj.from, obj.command, 'Message received', obj.callback);
    //         }
    //     }
    // },
  }));
}

async function main() {

  // The adapters config (in the instance object everything under the attribute "native") is accessible via
  // adapter.config:
  username = adapter.config.username;
  password = adapter.config.password;
  host = adapter.config.host;
  port = adapter.config.port;
  tls = adapter.config.tls;
  mailbox = adapter.config.mailbox;
  searchFilter = adapter.config.searchFilter;
  markSeen = adapter.config.markSeen;
  fetchUnreadOnStart = adapter.config.fetchUnreadOnStart;

  adapter.log.debug('username ' + username);
  adapter.log.debug('password ' + password);
  adapter.log.debug('host ' + host);
  adapter.log.debug('port ' + port);
  adapter.log.debug('tls ' + tls);
  adapter.log.debug('mailbox ' + mailbox);
  adapter.log.debug('searchFilter' + searchFilter);
  adapter.log.debug('markSeen ' + markSeen);
  adapter.log.debug('fetchUnreadOnStart ' + fetchUnreadOnStart);






  mailListener = new MailListener({
    username: username,
    password: password,
    host: host,
    port: port, // imap port
    tls: tls,
    connTimeout: 10000, // Default by node-imap
    authTimeout: 5000, // Default by node-imap,
    //debug: , // Or your custom function with only one incoming argument. Default: null
    tlsOptions: {
      rejectUnauthorized: false
    },
    mailbox: mailbox, // mailbox to monitor
    searchFilter: searchFilter, // the search filter being used after an IDLE notification has been retrieved
    markSeen: markSeen, // all fetched email willbe marked as seen and not fetched next time
    fetchUnreadOnStart: fetchUnreadOnStart, // use it only if you want to get all unread email on lib start. Default is `false`,
    mailParserOptions: {
      streamAttachments: false
    }, // options to be passed to mailParser lib.
    attachments: false, // download attachments as they are encountered to the project directory
    attachmentOptions: {
      directory: "attachments/"
    } // specify a download directory for attachments
  });


  mailListener.start();

  mailListener.on("server:connected", function() {
    adapter.log.info("imapConnected");
  });

  mailListener.on("server:disconnected", function() {
    adapter.log.debug("imapDisconnected");
  });

  mailListener.on("error", function(err) {
    adapter.log.debug(err);
  });


  mailListener.on("mail", function(mail, seqno, attributes) {
    // do something with mail object including attachments
    adapter.log.debug("emailParsed", mail);
    adapter.log.debug("emailParsed" + JSON.stringify(mail));
    adapter.log.debug("seqno " + seqno);
    adapter.log.debug("attributes " + JSON.stringify(attributes));
    // mail processing code goes here

    var mailcontent = mail.eml;
    var datatables = [];

    var tabelnumber = mailcontent.split('<table').length - 1;

    for (var i = 0; i < tabelnumber; i++) {

      datatables[i] = mailcontent.split('<table')[i + 1].split('</table')[0];
      adapter.log.debug('datatables: ' + i + ': ' + datatables[i]);

    };

    var solardatax = '<table>' + datatables[0].slice(datatables[0].indexOf('</tr>') + 5) + '</table>';
    solardatax = '<table ' + solardatax + '</table>';
    solardatax = solardatax.replace('Summe<', 'SummeTag<');
    solardatax = solardatax.replace('Summe<', 'SummeMonat<');
    solardatax = solardatax.replace('Summe<', 'SummeJahr<');
    solardatax = solardatax.replace('Spez.<', 'SpezTag<');
    solardatax = solardatax.replace('Spez.<', 'SpezMonat<');
    solardatax = solardatax.replace('Spez.<', 'SpezJahr<');
    solardatax = solardatax.replace('Soll<', 'SollTag<');
    solardatax = solardatax.replace('Soll<', 'SollMonat<');
    solardatax = solardatax.replace('Ist-Ertrag<', 'Ist-ErtragTag<');
    solardatax = solardatax.replace('Ist-Ertrag<', 'Ist-ErtragMonat<');

    var jsonsolardata = HtmlTableToJson.parse(solardatax);

    var yielddata = [];
    for (var key in jsonsolardata.results[0]) {

      if (jsonsolardata.results[0][key][1] == "") {

      } else {
        console.log("Data!");
        yielddata.push(jsonsolardata.results[0][key]);
      }

    };

    adapter.log.debug('yielddata: ' + JSON.stringify(yielddata));



    var consdata = '<table ' + datatables[1] + '</table>';

    var jsonconsdata = HtmlTableToJson.parse(consdata);

    var consumptiondata = [];

    for (var key in jsonconsdata.results[0]) {

      if (jsonconsdata.results[0][key][1] == "") {

      } else {
        console.log("Data!");
        consumptiondata.push(jsonconsdata.results[0][key]);
      }

    };

    adapter.log.debug('consdata: ' + JSON.stringify(consumptiondata));



  });
  /*
      For every state in the system there has to be also an object of type state
      Here a simple template for a boolean variable named "testVariable"
      Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables

  await adapter.setObjectNotExistsAsync('testVariable', {
    type: 'state',
    common: {
      name: 'testVariable',
      type: 'boolean',
      role: 'indicator',
      read: true,
      write: true,
    },
    native: {},
  });
  */

  // In order to get state updates, you need to subscribe to them. The following line adds a subscription for our variable we have created above.
  adapter.subscribeStates('*.*');
  // You can also add a subscription for multiple states. The following line watches all states starting with "lights."
  // adapter.subscribeStates('lights.*');
  // Or, if you really must, you can also watch all states. Don't do this if you don't need to. Otherwise this will cause a lot of unnecessary load on the system:
  // adapter.subscribeStates('*');

  /*
      setState examples
      you will notice that each setState will cause the stateChange event to fire (because of above subscribeStates cmd)

  // the variable testVariable is set to true as command (ack=false)
  await adapter.setStateAsync('testVariable', true);

  // same thing, but the value is flagged "ack"
  // ack should be always set to true if the value is received from or acknowledged from the target system
  await adapter.setStateAsync('testVariable', {
    val: true,
    ack: true
  });

  // same thing, but the state is deleted after 30s (getState will return null afterwards)
  await adapter.setStateAsync('testVariable', {
    val: true,
    ack: true,
    expire: 30
  });

  // examples for the checkPassword/checkGroup functions
  adapter.checkPassword('admin', 'iobroker', (res) => {
    adapter.log.info('check user admin pw iobroker: ' + res);
  });

  adapter.checkGroup('admin', 'admin', (res) => {
    adapter.log.info('check group user admin group admin: ' + res);
  });
    */
}

// @ts-ignore parent is a valid property on module
if (module.parent) {
  // Export startAdapter in compact mode
  module.exports = startAdapter;
} else {
  // otherwise start the instance directly
  startAdapter();
}
