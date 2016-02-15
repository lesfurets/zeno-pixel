/**********************
 * Plugins: WebPerformance plugin
 * @author: @mfourtina
 * @updathor: @jfitoussi
 * @version: 0.2
 **********************/
exports.module = function (zeno) {
    var webperf         = {},
        list            = [];

    webperf.desktop = {};
    webperf.tablet  = {};
    webperf.mobile  = {};

    var pathWebperf = './modules/webperf';
    var backupWebperf = pathWebperf + '/backup/webperf-1.json';
    var currentFileWebperf = pathWebperf + '/current/webperf.json';

    var fs = require('fs');
    fs.stat(currentFileWebperf, function (err, stat) {
        if (err == null) {
            webperf = JSON.parse(fs.readFileSync(currentFileWebperf));
        } else if (err.code = "ENOENT") {
            fs.stat(backupWebperf, function (err, stat) {
                if (err == null) {
                    webperf = JSON.parse(fs.readFileSync(backupWebperf))
                }
            });
        }
    });

    zeno.on('onScreenshotDone', function (data) {
        zeno.pages[data.options.device].forEach(function(page) {
            if (data.name && page.name === data.name) {
                var d          = new Date(),
                    dateFormat = d.getMonth()+'-'+d.getDate()+'-'+d.getFullYear();

                page.webperf    = data.metrics;

                // Push webperf to all connected clients
                zeno.io.sockets.emit('updateOneWebPerf', {
                    name   : page.name,
                    device : data.options.device,
                    wp     : data.metrics
                });

                if (!webperf[data.options.device].hasOwnProperty(page.name)) {
                    webperf[data.options.device][page.name] = {};
                }
                if(!webperf[data.options.device][page.name].hasOwnProperty(dateFormat)) {
                    webperf[data.options.device][page.name][dateFormat] = {};
                }

                webperf[data.options.device][page.name][dateFormat] = data.metrics;

                var webPerfString = JSON.stringify(webperf);
                fs.writeFile(currentFileWebperf, webPerfString, function (err) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log("screenshot saved");
                    }
                });
            }
        });
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