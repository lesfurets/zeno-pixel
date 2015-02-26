/**
 *
 * @license
 * Zeno server file
 * Usage: node zenoserver.js
 * Parameter:
 *   --port [portNumber]
 *   --log  [logFile]
 *   --file [configuration file]
 *   --cookie [cookie definition file]
 *   --folder [folder to save images]
 */
var express = require('express'),
    path    = require('path'),
    args    = require('minimist')(process.argv.slice(2)),
    Zeno    = require('./zeno'),

    app        = express(),
    server     = require('http').Server(app),
    io         = require('socket.io').listen(server),
    bodyParser = require('body-parser'),
    port       = args.port || 1337;

/*
 * Server configuration
 */
app.set('port', port);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.static(path.join(__dirname)));
app.use(bodyParser.text());

var zeno = new Zeno(app, server, io, args);
zeno.init();
