'use strict';

var fs    = require('fs'),
    util  = require('util'),
    path  = require('path'),
    spawn = require('child_process').spawn,
    im    = require('imagemagick'),
    request = require('request'),
    utils = require('./tools/utils');

var Zeno = function (app, server, io, params) {
    this.app           = app;
    this.io            = io;
    this.server        = server;

    // --log
    this.logFile       = params.log;

    // --fileUrl
    this.pageUrl       = params.fileUrl || false;

    // --file
    this.pageFile      = params.file || 'pages.json';

    // --cookieUrl
    this.cookieUrl     = params.cookieUrl || false;

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
    this.versionsByPage = {};
    this.results       = {};
    this.pages         = {};

    this.emitter = new (require('events').EventEmitter)();
    this.emitter.setMaxListeners(200);
    this.uaDesktop = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.11; rv:44.0) Gecko/20100101 Firefox/44.0';
    this.uaMobile  = 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_2_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13D15 Safari/601.1';
    this.uaTablet  = 'Mozilla/5.0 (iPad; CPU OS 9_0 like Mac OS X) AppleWebKit/601.1.17 (KHTML, like Gecko) Version/8.0 Mobile/13A175 Safari/600.1.4';
    this.vpDesktop = 1280;
    this.vpTablet  = 1024;
    this.vpMobile  = 640;
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

        this.updateVersionList(true);

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

        var loadConfigurationFile = function(err, file) {
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
        };

        // Fetch configuration file
        if (this.pageUrl) {
            request(this.pageUrl, function (err, response, file) {
                loadConfigurationFile(err, file);
            });
        } else {
            fs.readFile(this.pageFile, 'utf-8', function (err, file) {
                loadConfigurationFile(err, file);
            });
        }

        // Fetch cookies file
        if (this.cookieUrl) {
            request(this.cookieUrl, function (err, response, file) {
                if (err) {
                    this.log(err);
                }
                else {
                    self.cookiesList = JSON.parse(file);
                }
            });
        } else {
            fs.readFile(this.cookieFile, 'utf-8', function (err, file) {
                if (err) {
                    this.log(err);
                }
                else {
                    self.cookiesList = JSON.parse(file);
                }
            });
        }
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
                if(env.alias === req.params.env || "all" === req.params.env) {
                    self.envScreenshot(env, 'desktop');
                    self.envScreenshot(env, 'mobile');
                    self.envScreenshot(env, 'tablet');
                }
            });
            res.send('Update ' + req.params.env + ' in progress\n');
        });

        this.app.get('/update/:env/:screenshotId', function(req, res) {
            self.instance.forEach(function (env) {
                if(env.alias === req.params.env) {
                    self.envScreenshot(env, 'desktop', req.params.screenshotId);
                    self.envScreenshot(env, 'mobile', req.params.screenshotId);
                    self.envScreenshot(env, 'tablet', req.params.screenshotId);
                }
            });
            res.send('Update ' + req.params.env + ' with ' + req.params.screenshotId+ 'in progress\n');
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

        this.app.get('/versions/page/', function(req, res) {
            res.send(JSON.stringify(self.versionsByPage));
        });

        this.app.get('/versions/page/:page', function(req, res) {
            res.send(JSON.stringify(self.versionsByPage[req.params.page]));
        });

        this.app.get('/results', function(req, res) {
            res.send(JSON.stringify(self.results));
        });
        this.app.get('/results/:device', function(req, res) {
            res.send(JSON.stringify(self.results[req.params.device]));
        });
        this.app.get('/ua', function(req, res) {
            var data = {};
            var userAgents = {};
            userAgents.uaDesktop = self.uaDesktop;
            userAgents.uaTablet = self.uaTablet;
            userAgents.uaMobile = self.uaMobile;

            var viewPorts = {};
            viewPorts.vpDesktop = self.vpDesktop;
            viewPorts.vpTablet= self.vpTablet;
            viewPorts.vpMobile= self.vpMobile;
            data.userAgents = userAgents;
            data.viewPorts = viewPorts;
            res.send(JSON.stringify(data));
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

        this.on('onEnvUpdate', function (data){
            self.io.sockets.emit('queueChangeEvent', self.listtoshot);
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
                self.envScreenshot(data.env, data.type, 'manual', socket);
            });

            /*
             * Get if pages are loaded by url or filesystem
             */
            socket.on('getConfType', function (cb) {
                var conf = {
                    file: self.pageUrl || self.pageFile,
                    url: self.pageUrl ? true : false
                };
                cb(conf)
            });

            /*
             * Update conf file
             */
            socket.on('updateConfFile', function (cb) {
                if (self.pageUrl) {
                    request(self.pageUrl, function (err, response, file) {
                        try {
                            self.pages = JSON.parse(file);
                            self.pages.refreshing = {
                                desktop: [],
                                tablet : [],
                                mobile : []
                            };
                            self.instance = self.pages.envs;
                            self.log('Configuration reloaded with success');
                            cb(self.pages);
                        } catch (e) {
                            console.log("Error reloading conf: " + e);
                        }
                    });
                } else {
                    fs.readFile(self.pageFile, 'utf-8', function (err, file) {
                        try {
                            self.pages = JSON.parse(file);
                            self.pages.refreshing = {
                                desktop: [],
                                tablet : [],
                                mobile : []
                            };
                            self.instance = self.pages.envs;
                            self.log('Configuration reloaded with success');
                            cb(self.pages);
                        } catch (e) {
                            console.log("Error reloading conf: " + e);
                        }
                    });
                }
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
                self.pages.tablet  = data.list.tablet;
                self.instance      = self.pages.envs;
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

            socket.on('addDevicePage', function (page, device, cb) {
                delete page.percentage;
                delete page.$$hashKey;
                delete page.confRefreshing;
                delete page.classRefreshing;
                if (page) {
                    self.pages[device].push(page);
                    cb('ok');
                } else {
                    cb('ko');
                }
            });
            var hasSameAlternativeAndCookies = function(page1, page2) {
                return (page1.alternative == page2.alternative
                && JSON.stringify(page1.cookies) == JSON.stringify(page2.cookies));
            };

            var isSamePage = function (page1, page2) {
                return (page1.url == page2.url && hasSameAlternativeAndCookies(page1, page2));
            };

            socket.on('removeDevicePage', function (page, device, cb) {
                var i = self.pages[device].length;
                while (i--) {
                    var k = self.pages[device][i];
                    if (isSamePage(k, page)) {
                        self.pages[device].splice(i, 1);
                        cb('ok');
                        return;
                    }
                }
                cb('ko');
            });

            socket.on('updateUrlPage', function (page, devices, cb) {
                var urlBase;
                var present = false;
                var firstDevice = devices[0];
                devices.shift();
                self.pages[firstDevice].some(function (k) {
                    if (k.name == page.name
                        && hasSameAlternativeAndCookies(k, page)) {
                        urlBase = k.url;
                        k.url = page.url;
                        return present = true;
                    }
                });
                if (!present) {
                    cb('ko');
                    return;
                }
                devices.some(function (device) {
                    self.pages[device].some(function (k) {
                        if (k.url == urlBase
                            && hasSameAlternativeAndCookies(k, page)) {
                            k.url = page.url;
                            return;
                        }
                    });
                });
                cb('ok');
            });

            socket.on('getCookiesList', function (cb) {
                cb(self.cookiesList)
            });

            socket.on('modifyCookieValue', function(cookie, cb) {
                try {
                    var cookieName = cookie.name;
                    self.cookiesList[cookieName].value = cookie.value;
                    cb("ok")
                } catch(exception) {
                    self.log(exception);
                    cb("ko")
                }
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
                if (dir[0] == '.') {
                    return
                }
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

        if (options.hasOwnProperty('date')) {
            d = options.date;
        }

        // directory name pattern : mm-dd-yyyy-hh-mm-ss(?-screenshotId)
        var versionPath = (d.getMonth() + 1) + '-' + d.getDate() + '-' + d.getFullYear() + '-' + d.getHours() + '-' + d.getMinutes() + '-' + d.getSeconds();
        if (options.hasOwnProperty('screenshotId')) {
            versionPath += '-' + options.screenshotId;
        }

        var screenshotPackDir = p.join(this.dir, this.versioning, versionPath);

        if (!fs.existsSync(screenshotPackDir)) {
            fs.mkdir(screenshotPackDir, function (err){
                var screenShotName = options.env + name + self.ext;
                self.updateVersionList(false, screenShotName, versionPath);
            });
        }

        var args = [this.engine.ssl, this.phantomScript, JSON.stringify({
                ua          : options.userAgent,
                viewportSize: options.viewportSize,
                cookies     : options.cookies,
                blacklist   : self.pages.blacklist,
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
            stream.pipe(fs.createWriteStream(screenshotPackDir + '/' + options.env + name + self.ext));
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
                stream.pipe(fs.createWriteStream(screenshotPackDir + '/' + options.env + name + '_thumb' + self.ext));
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

        this.io.sockets.emit('queueChangeEvent', this.listtoshot);

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
     * @param packScreenshotId id of screenshot pack
     */
    envScreenshot: function (env, device, paramScreenshotId) {
        var server,
            cookies = [],
            self    = this,
            pages   = this.pages[device],
            details = {};

        if (device === 'mobile') {
            details.viewport = {width: this.vpMobile, height: 1100};
            details.ua = self.uaMobile;
        } else if (device === 'desktop') {
            details.viewport = {width: this.vpDesktop, height: 1100};
            details.ua = self.uaDesktop;
        } else if (device === 'tablet') {
            details.viewport = {width: this.vpTablet, height: 1100};
            details.ua = self.uaTablet;
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
                        viewportSize : details.viewport,
                        date         : new Date(),
                    };

                    if (typeof paramScreenshotId !== "undefined") {
                        options.screenshotId = paramScreenshotId;
                    }

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

        if (device === 'tablet') {
            ua = this.uaTablet;
            width = this.vpTablet;
        } else if (device === 'mobile') {
            ua = this.uaMobile;
            width = this.vpMobile;
        } else if (device === 'desktop') {
            ua = this.uaDesktop;
            width = this.vpDesktop;
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
            date       : new Date(),
            viewportSize :
                {width: width, height: height}
        };

        if (typeof alternative !== 'undefined'){
            server = alternative;
        } else {
            server = env.server;
        }

        var realUrl = this.parseUrl(server, url, env.port);

        this.listtoshot.push({
            url     : realUrl,
            name    : name,
            options : options
        });

        this.io.sockets.emit('queueChangeEvent', this.listtoshot);

        // do not trigger update if it's already running, just queue it
        if(this.listtoshot.length === 1) {
            this.takeScreenshot(realUrl, name, options);
        }
    },

    /*
     * Read versionning folder to update and sort the list
     */
    updateVersionList: function (withFullRead, file, version) {
        this.log('Fetch versions list');
        var self = this;
        var pathVersioning = path.join(this.dir, this.versioning);
        var functionCompareDate = function (a, b) {
            // read mm-dd-yyyy-hh-mm-ss(?-screenshotId)
            var as = a.split('-');
            var bs = b.split('-');
            if (as.length == 3) {
                var date1 = new Date(as[2], parseInt(as[0], 10) - 1, as[1]);
            } else {
                var date1 = new Date(as[2], parseInt(as[0], 10) - 1, as[1], as[3], as[4], as[5]);
            }
            if (bs.length == 3) {
                var date2 = new Date(bs[2], parseInt(bs[0], 10) - 1, bs[1]);
            } else {
                var date2 = new Date(bs[2], parseInt(bs[0], 10) - 1, bs[1], bs[3], bs[4], bs[5]);
            }
            var diff = date1 - date2;

            return diff;
        };
        var makeVersionsByPage = function (file, version) {
            if (self.versionsByPage.hasOwnProperty(file)) {
                if (self.versionsByPage[file].indexOf(version) == -1) {
                    self.versionsByPage[file].push(version);
                    self.versionsByPage[file].sort(functionCompareDate);
                } else {

                }
            } else {
                self.versionsByPage[file] = [version];
            }
        };
        if (withFullRead) {
            fs.readdir(pathVersioning, function (err, dirs) {
                if (err) {
                    return self.log(err);
                }

                dirs.sort(functionCompareDate);

                self.versions = dirs;
                self.io.sockets.emit('updateVersionEvent', {versions: self.versions});
                dirs.forEach(function (version) {
                    fs.readdir(path.join(pathVersioning, version), function (err, files) {
                        if (files) {
                            files.forEach(function (file) {
                                makeVersionsByPage(file, version);
                            });
                            self.io.sockets.emit('updateVersionByPageEvent', {versionsByPage: self.versionsByPage});
                        }
                    });
                });
            });
        } else {
            if (self.versions.indexOf(version) == -1) {
                self.versions.push(version);
                self.versions.sort(functionCompareDate)
            }
            makeVersionsByPage(file, version);
            self.io.sockets.emit('updateVersionEvent', {versions: self.versions});
            self.io.sockets.emit('updateVersionByPageEvent', {versionsByPage: self.versionsByPage});
        }
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
