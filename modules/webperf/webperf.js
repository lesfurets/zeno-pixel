/**********************
 * Plugins: WebPerformance plugin
 * @author: @mfourtina
 * @updathor: @jfitoussi
 * @version: 0.2
 **********************/
var fs = require('fs');

exports.module = function (zeno) {
    var webperf = {};

    webperf.desktop = {};
    webperf.tablet  = {};
    webperf.mobile  = {};

    var backupWebperf      = __dirname + '/backup/webperf-1.json';
    var currentFileWebperf = __dirname + '/current/webperf.json';

    fs.stat(currentFileWebperf, function (err, stat) {
        if (err == null) {
            webperf = JSON.parse(fs.readFileSync(currentFileWebperf));
        } else if (err.code = "ENOENT") {
            fs.stat(backupWebperf, function (err, stat) {
                if (err == null) {
                    webperf = JSON.parse(fs.readFileSync(backupWebperf))
                } else {
                    zeno.log("No webperf file found: creating webperf.json");

                    // fallback: create the webperf file
                    var defaultWebPerf = {
                       desktop: {},
                       tablet: {},
                       mobile: {}
                    };

                    fs.writeFile(__dirname + "/current/webperf.json", JSON.stringify(defaultWebPerf), function(err) {
                        if(err) {
                            return zeno.log(err);
                        }
                    });
                }
            });
        }
    });

    zeno.on('onScreenshotDone', function (data) {
        if (zeno.pages !== undefined && data !== undefined && data.hasOwnProperty('options') && zeno.pages.hasOwnProperty(data.options.devices)) {
            zeno.pages[data.options.device].forEach(function (page) {
                if (data.name && page.name === data.name) {
                    var d = new Date(),
                        dateFormat = (d.getMonth() + 1) + '-' + d.getDate() + '-' + d.getFullYear();

                    page.webperf = data.metrics;

                    // Push webperf to all connected clients
                    zeno.io.sockets.emit('updateOneWebPerf', {
                        name: page.name,
                        device: data.options.device,
                        wp: data.metrics
                    });

                    if (!webperf[data.options.device].hasOwnProperty(page.name)) {
                        webperf[data.options.device][page.name] = {};
                    }
                    if (!webperf[data.options.device][page.name].hasOwnProperty(dateFormat)) {
                        webperf[data.options.device][page.name][dateFormat] = {};
                    }

                    webperf[data.options.device][page.name][dateFormat] = data.metrics;

                    var webPerfString = JSON.stringify(webperf);
                    fs.writeFile(currentFileWebperf, webPerfString, function (err) {
                        if (err) {
                            console.log(err);
                        }
                    });
                }
            });
        }
    });

    zeno.app.get('/webperf', function(req, res) {
        res.send(JSON.stringify(webperf, null, 4));
    });

    zeno.app.get('/webperf/date/:date', function(req, res) {
        res.send('{"status":"not implemented yet"}');
    });

    zeno.app.get('/webperf/env/:env/:name', function (req, res) {
        res.send('{"status":"not implemented yet"}');
    });


    zeno.app.get('/webperf/device/:device', function(req, res) {
        if (webperf[req.params.device])
            res.send(JSON.stringify(webperf[req.params.device]));
        else
            res.send('{"status":"Incorrect name or no result available"}');
    });

    zeno.app.get('/webperf/device/:device/:name', function(req, res) {
        if (webperf[req.params.device][req.params.name])
            res.send(JSON.stringify(webperf[req.params.device][req.params.name]));
        else
            res.send('{"status":"Incorrect name or no result available"}');
    });
};
