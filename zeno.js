'use strict';

var fs    = require('fs'),
    util  = require('util'),
    path  = require('path'),
    spawn = require('child_process').spawn,
    im    = require('imagemagick'),
    utils = require('./tools/utils');

var Zeno = function (app, server, io, params) {
    this.app           = app;
    this.io            = io;
    this.server        = server;

    // --log
    this.logFile       = params.log;

    // --file
    this.pageFile      = params.file || 'pages.json';

    // --cookie
    this.cookieFile    = params.cookie || 'cookies.json';

    // --folder
    this.dir           = params.folder || 'screenshots';

    // --engine
    this.engine        = require('./tools/engine').get(params.engine);

    // --startAction
    this.startAction   = params.startAction || false;

    this.log           = utils.log;
    this.devices       = ['desktop', 'tablet', 'mobile'];
    this.versioning    = 'versioning';
    this.ext           = '.png';
    this.phantomScript = path.join(__dirname, 'phantomScript.js');
    this.instance      = [];
    this.cookiesList   = [];
    this.modules       = [];
    this.listtoshot    = [];
    this.versions      = [];
    this.results       = {};
    this.pages         = {};

    this.emitter = new (require('events').EventEmitter)();
    this.emitter.setMaxListeners(200);
};

Zeno.prototype = {
    /*
     * Initialize the app and fetch configuration
     * @param cb end initialization callback
     */
    init: function(cb) {
        var self = this;

        if (!fs.existsSync(this.dir)) {
            fs.mkdirSync(this.dir);
        }
        if (!fs.existsSync(path.join(this.dir, this.versioning))) {
            fs.mkdirSync(path.join(this.dir, this.versioning));
        }

        this.updateVersionList();

        if (this.logFile) {
            var logFile   = fs.createWriteStream(this.logFile, {flags : 'a'});
            var logStdout = process.stdout;

            // copy stdout in the log file
            console.log = function(d) {
                logFile.write(util.format(d) + '\n');
                logStdout.write(util.format(d) + '\n');
            };
        }

        // Init results object
        this.devices.forEach(function(device) {
            self.results.engine = self.engine.name;
            self.results[device]         = {};
            self.results[device].results = [];
        });

        this.addCoreRoad();
        this.addListeners();
        this.addSocketIoListeners();

        this.log('Engine detected: ' + this.engine.name + ' ' + this.engine.version);

        // Fetch configuration file
        fs.readFile(this.pageFile, 'utf-8', function(err, file){
            if (err) {
                self.log('No file configuration founded');
            } else {
                self.pages            = JSON.parse(file);
                self.pages.refreshing = {
                    desktop: [],
                    tablet: [],
                    mobile: []
                };
                self.instance     = self.pages.envs;
            }

            self.loadModules(cb);

            if (self.startAction) {
                self.devicesComparaison(self.instance[0], self.instance[1]);
            }
        });

        // Fetch cookies file
        fs.readFile(this.cookieFile, 'utf-8', function(err, file){
            if (err) { this.log(err); }
            else {
                self.cookiesList = JSON.parse(file);
            }
        });
    },

    /*
     * Create core express road
     */
    addCoreRoad: function () {
        var self = this;

        this.app.get('/', function(req, res) {
            res.render('index');
        });

        this.app.get('/update/:env', function(req, res) {
            self.instance.forEach(function (env) {
                if(env.alias === req.params.env) {
                    self.envScreenshot(env, 'desktop');
                    self.envScreenshot(env, 'mobile');
                    self.envScreenshot(env, 'tablet');
                }
            });
            res.send('Update ' + req.params.env + ' in progress\n');
        });

        this.app.get('/routes/:name', function(req, res) {
            res.render('routes/' + req.params.name);
        });

        this.app.get('/pages', function(req, res) {
            res.send(JSON.stringify(self.pages));
        });

        this.app.get('/queue', function(req, res) {
            res.send(JSON.stringify(self.listtoshot));
        });

        this.app.get('/versions', function(req, res) {
            res.send(JSON.stringify(self.versions));
        });

        this.app.get('/results', function(req, res) {
            res.send(JSON.stringify(self.results));
        });
        this.app.get('/results/:device', function(req, res) {
            res.send(JSON.stringify(self.results[req.params.device]));
        });

        this.app.get('/log', function(req, res) {
            if (self.logFile) {
                fs.readFile(self.logFile, 'utf-8', function(err, file){
                    if (err) {self.log(err);}
                    var lines = file.trim().split('\n');

                    var log   = '';
                    var start = lines.length - 20 > 0 ? lines.length - 20 : 0;

                    for (var i = start; i < lines.length; i++) {
                        log += lines[i] + '<br/>';
                    }

                    res.send(log);
                });
            } else {
                res.send('log mode not activated');
            }
        });

        this.app.get('/compareall/:env1/:env2', function(req, res) {
            var env1, env2;
            for (var i = 0; i < self.instance.length; i++) {
                if (self.instance[i].alias === req.params.env1) {
                    env1 = self.instance[i];
                } else if (self.instance[i].alias === req.params.env2) {
                    env2 = self.instance[i];
                }
            }

            self.devicesComparaison(env1, env2);
            res.send('{status: "Comparaison started"}');
        });
    },

    /*
     * Attach core listeners
     */
    addListeners: function () {
        var self = this;
        this.on('takeScreenshot', function (data) {
            //check for fallbacks
            if(typeof data.options.device === 'undefined') {
                data.options.device = 'desktop';
            }

            if(typeof data.options.env === 'undefined') {
                data.options.env = '';
            }

            self.takeScreenshot(data.url, data.path, data.options);
        });
    },

    /*
     * Attach core socket IO listeners
     */
    addSocketIoListeners: function () {
        var self = this;

        /*
         * SocketIO listeners
         */
        this.io.sockets.on('connection', function (socket) {
            /*
             * Fired when an image is refreshed by a client
             */
            socket.on('refreshOneScreen', function (data) {
                self.unitScreenshot(
                    self.instance[data.env],
                    data.name,
                    data.type,
                    socket
                );
            });

            /*
             * Fired when an environment is refreshed by a client
             */
            socket.on('refreshEnv', function (data) {
                self.envScreenshot(data.env, data.type, socket);
            });

            /*
             * Fired when user update the configuration from /pages
             */
            socket.on('updateList', function (data) {
                self.devices.forEach(function (device){
                    data.list[device].forEach(function (url) {
                        delete url.percentage;
                    });
                });
                self.pages.desktop = data.list.desktop;
                self.pages.mobile  = data.list.mobile;
                self.pages.tablet = data.list.tablet;
                self.instance = self.pages.envs;
            });

            /*
             * Fired after each client side comparaison to update the server object
             */
            socket.on('updateResults', function (data) {
                self.updateResultsByName(data.name, data.device, data.percentage);
            });

            socket.on('updateEngine', function (data) {
                self.engine       = require('./tools/engine').get(data.engine);
                self.pages.engine = self.engine.name;
                self.log('Engine updated : ' + self.engine.name + ' ' + self.engine.version);
            });

            socket.on('saveList', function () {
                // todo
            });
        });
    },

    /*
     * Load modules
     * @param cb end initialization callback
     */
    loadModules: function (cb) {
        var self = this,
            name = 'modules';

        fs.readdir(name, function(err, dirs){
            if (err) {return self.log(err);}
            self.modules = dirs;

            self.modules.forEach(function(dir) {
                var module = require('./' + name + '/' + dir + '/' + dir);

                if (module.module) {
                    module.module(self.getWrapper());
                } else {
                    self.log('Module "' + dir + '" desactivated: no module Method');
                }
            });

            self.endInit();
            if(cb) {cb();}
        });
    },

    /*
     * finalize express configuration adn error handling
     */
    endInit: function () {
        var self = this;
        this.app.get('*', function(req, res, next) {
            self.log('Error 404 : ' + req.url);
            var err = new Error();
            err.status = 404;
            next(err);
        });

        /* Error handling */
        this.app.use(function(err, req, res, next){
            if(err.status !== 404) {
                return next();
            }

            res.status(404).render('404');
        });

        this.server.listen(this.app.get('port'), function(){
            self.log('Express server listening on port ' + self.app.get('port'));
        });
    },

    /*
     * Return a list of cookies value for a given page
     * @param page one page object of one device
     */
    getCookies: function (page) {
        var cookies = [];
        if (page.cookies) {
            for (var i = 0; i < page.cookies.length; i++) {
                if(this.cookiesList[page.cookies[i]]) {
                    cookies.push(this.cookiesList[page.cookies[i]]);
                }
            }
        }

        return cookies;
    },

    /*
     * Create a phantmJs process to take screenshot and create a thumbnail using imagemagick
     * @param url     page url to capture
     * @param name    image name according to configuration
     * @param options engine options
     */
    takeScreenshot: function (url, name, options) {
        var d    = new Date(),
            p    = require('path'),
            self = this,
            path = p.join(this.dir, options.env +  name + this.ext);

        // directory name pattern : mm-dd-yyyy
        var todayDir = p.join(this.dir, this.versioning, (d.getMonth() + 1) + '-' + d.getDate() + '-' + d.getFullYear());

        if (!fs.existsSync(todayDir)) {
            fs.mkdir(todayDir, function (err){
                self.updateVersionList();
            });
        }

        var args = [this.engine.ssl, this.phantomScript, JSON.stringify({
                ua          : options.userAgent,
                viewportSize: options.viewportSize,
                cookies     : options.cookies,
                path        : path, // path on disk
                url         : url,  // use to render a page from url
                body        : options.body  // use to render a page from html
            })],
            process = spawn(this.engine.path, args);

        process.stdout.on('data', function(data) {
            var chunk = '' + data, // cast as a string
                metrics;

            try {
                metrics = JSON.parse(chunk);
                if (metrics.errors.length) {
                    self.log('Request error: ' + metrics.errors);
                }

            } catch(err) {
                self.log('Phantom Error:' + chunk);
            }

            self.emit('onScreenshotDone', {
                name   : name,
                options: options,
                metrics: metrics
            });
        });

        // exit callback
        process.on('exit', function(code) {
            if(code) {
                self.log('Error during ' + self.engine.name + ' exec: ' + code);
                return self.next();
            }

            self.log('(' + this.pid + ') update done: ' + path);

            // Copy for versioning
            var stream = fs.createReadStream(path);
            stream.pipe(fs.createWriteStream(todayDir + '/' + options.env + name + self.ext));
            stream.on('end', function(){
                self.emit('onCopyDone', {
                    name: name
                });
            });

            // Create a thumbnail to reduce Ram blueprint on client
            im.resize({
                srcPath: path,
                dstPath: path.replace(self.ext, '_thumb.png'),
                height : 200
            }, function(err){
                if (err) {return console.warn(err);}

                // Copy for versioning
                var stream = fs.createReadStream(path);
                stream.pipe(fs.createWriteStream(todayDir + '/' + options.env + name + '_thumb' + self.ext));
                stream.on('end', function(){
                    self.emit('onCopyDone', {
                        name: name
                    });
                });

                // Push update url to each client
                self.io.sockets.emit('updateOneScreen', {
                    name: name,
                    env : options.env
                });

                self.next();
            });
        });
    },

    /*
     * Remove current element from the queue
     * and start the next one
     */
    next: function () {
        this.listtoshot.splice(0, 1);
        if (this.listtoshot.length){
            this.takeScreenshot(
                this.listtoshot[0].url,
                this.listtoshot[0].name,
                this.listtoshot[0].options
            );
        } else {
            // Start comparaison if at least one environment has been updated
            if (this.pages.refreshing.desktop.length || this.pages.refreshing.tablet.length || this.pages.refreshing.mobile.length){
                this.devicesComparaison(this.instance[0], this.instance[1]);
            }

            // wait that everthing is finished before allowing the next refresh
            this.pages.refreshing = {
                desktop: [],
                tablet: [],
                mobile: []
            };
        }
    },

    /*
     * Refresh a whole environment for one device
     * @param env environment object
     * @param device device name
     */
    envScreenshot: function (env, device) {
        var server,
            cookies = [],
            self    = this,
            pages   = this.pages[device],
            details = {};

        if (device === 'mobile') {
            details.viewport = {width: 640, height: 1100};
            details.ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 6_0 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/6.0 Mobile/10A5376e Safari/8536.25';
        } else if (device === 'desktop') {
            details.viewport = {width: 1600, height: 1100};
            details.ua = 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36';
        } else if (device === 'tablet') {
            details.viewport = {width: 1024, height: 1100};
            details.ua = 'Mozilla/5.0 (iPad; CPU OS 4_3_5 like Mac OS X; en-us) AppleWebKit/533.17.9 (KHTML, like Gecko) Version/5.0.2 Mobile/8L1 Safari/6533.18.5';
        } else {
            return;
        }

        if (!utils.contains(this.pages.refreshing[device], env.server)) {
            this.log('Update ' + device + ' screenshots (' + env.server + ')');
            this.pages.refreshing[device].push(env.server);

            pages.forEach(function (page) {
                if (page.url) {
                    var alternative = undefined;
                    self.getCookies(cookies, page);

                    if (page.hasOwnProperty('alternative') && env.hasOwnProperty('alternative')) {
                        alternative = env.alternative[page.alternative];
                    }

                    var options = {
                        env          : env.server,
                        cookies      : cookies,
                        device       : device,
                        userAgent    : details.ua,
                        viewportSize : details.viewport
                    };

                    if (typeof alternative !== 'undefined'){
                        server = alternative;
                    } else {
                        server = env.server;
                    }

                    self.listtoshot.push({
                        url    : self.parseUrl(server, page.url, env.port),
                        name   : page.name,
                        options: options
                    });
                }
            });

            self.emit('onEnvUpdate', {
                device : device,
                env    : env.server
            });
        } else {
            this.log('Refresh desktop already in progress: ' + env.server);
        }

        // do not trigger update if it's already running
        if(this.listtoshot.length === pages.length) {
            this.takeScreenshot(
                this.listtoshot[0].url,
                this.listtoshot[0].name,
                this.listtoshot[0].options
            );
        }
    },

    /*
     * Refresh one version of one image
     * @param env environment object
     * @param name id of the page object
     * @param device device name
     */
    unitScreenshot: function (env, name, device) {
        var ua,
            width,
            server,
            url,
            alternative,
            cookies = [],
            height  = 1100;

        if(device === 'tablet') {
            ua = 'Mozilla/5.0 (iPad; CPU OS 4_3_5 like Mac OS X; en-us) AppleWebKit/533.17.9 (KHTML, like Gecko) Version/5.0.2 Mobile/8L1 Safari/6533.18.5';
            width = 1024;
        } else if(device === 'mobile') {
            ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 6_0 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/6.0 Mobile/10A5376e Safari/8536.25';
            width = 640;
        } else if(device === 'desktop') {
            ua = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/30.0.1599.114 Safari/537.36';
            width = 1600;
        } else {
            return;
        }

        for (var i = 0; i < this.pages[device].length; i++) {
            if (this.pages[device][i].name === name) {
                cookies = this.getCookies(this.pages[device][i]);

                if (this.pages[device][i].hasOwnProperty('alternative') && env.hasOwnProperty('alternative')) {
                    alternative = env.alternative[this.pages[device][i].alternative];
                }

                url = this.pages[device][i].url;

                break;
            }
        }

        this.log('Updating "' + name + '" for ' + device + '/' + env.alias);

        var options = {
            env        : env.server,
            userAgent  : ua,
            cookies    : cookies,
            device     : device,
            viewportSize :
                {width: width, height: height}
        };

        if (typeof alternative !== 'undefined'){
            server = alternative;
        } else {
            server = env.server;
        }

        var realUrl = this.parseUrl(server, url, env.port);

        // do not trigger update if it's already running, just queue it
        if(!this.listtoshot.length) {
            this.takeScreenshot(realUrl, name, options);
        } else {
            this.listtoshot.push({
                url     : realUrl,
                name    : name,
                options : options
            });
        }
    },

    /*
     * Read versionning folder to update and sort the list
     */
    updateVersionList: function () {
        this.log('Fetch versions list');
        var self = this;
        fs.readdir(path.join(this.dir, this.versioning), function(err, dirs){
            if (err) { return self.log(err); }

            dirs.sort(function (a, b) {
                var as = a.split('-');
                var bs = b.split('-');
                var diff = new Date(as[2], parseInt(as[0], 10) - 1, as[1]) - new Date(bs[2], parseInt(bs[0], 10) - 1, bs[1]);

                return diff;
            });

            self.versions = dirs;
            self.io.sockets.emit('updateVersion', {versions: self.versions});
        });
    },

    /*
     * Return a valid http url to render
     * @param server property of environment object
     * @param url url to decode
     * @param port port number (optional)
     */
    parseUrl: function (server, url, port) {
        var decodeUrl;
        var host = this.pages.host.replace('{$alias}', server);

        if (port) {
            host += ':' + port;
        }

        decodeUrl = url.replace('$host', host);

        return decodeUrl;
    },

    /*
     * Update results list
     * @param name: image name described in configuration
     * @param device: device where the comparaison has been computed
     * @param percentage: result of the comparaison
     */
    updateResultsByName: function(name, device, percentage) {
        var found = false;

        for (var i = 0; i < this.results[device].results.length; i++) {
            var error = this.results[device].results[i];
            if (name === error.name) {
                found = true;

                if (percentage === '0.00') {
                    this.results[device].results.splice(i, 1);
                } else {
                    error.percentage = percentage;
                    this.results[device].date = new Date();
                }
                break;
            }
        }

        // new failure to add
        if (!found && percentage !== '0.00') {
            this.results[device].results.push({name: name, percentage: percentage});
            this.results[device].date = new Date();
        }
    },

    /*
     * Compare the whole set of images
     * @param env1: value of instance object
     * @param env2: value of instance object
     */
    devicesComparaison: function (env1, env2) {
        this.log('Comparaison started between: ' + env1.alias + '/' + env2.alias);

        var self = this;
        this.devices.forEach(function (device) {
            self.results[device].results = [];
            self.pages[device].forEach(function (page) {
                self.results[device].date  = new Date();

                var name = page.name;
                utils.compareImages(
                    path.join(self.dir, env1.server + name + self.ext),
                    path.join(self.dir, env2.server + name + self.ext),
                    function (percentage) {
                        self.updateResultsByName(name, device, percentage);
                    }
                );
            });
        });
    },

    on: function(ev, fn) {
        this.emitter.on(ev, fn);
    },

    emit: function(ev, fn) {
        this.emitter.emit(ev, fn);
    },

    getWrapper: function () {
        return {
            // configuration
            ext: this.ext,
            dir: this.dir,
            pages: this.pages,
            app: this.app,
            io: this.io,

            //log
            log: this.log,

            // events
            on: this.on.bind(this),
            emit: this.emit.bind(this)
        };
    }
};

exports = module.exports = Zeno;
