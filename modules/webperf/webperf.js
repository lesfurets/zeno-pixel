/**********************
 * Plugins: WebPerformance plugin
 * @author: @mfourtina
 * @version: 0.1
 **********************/
exports.module = function (zeno) {
    var webperf         = {},
        list            = [];

    webperf.desktop = {};
    webperf.tablet  = {};
    webperf.mobile  = {};

    zeno.on('onScreenshotDone', function (data) {
        zeno.pages[data.options.device].forEach(function(page) {
            if (data.name && page.name === data.name) {
                var d          = new Date(),
                    dateFormat = d.getMonth()+'-'+d.getDate()+'-'+d.getFullYear();

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
            }
        });
    });

    zeno.app.get('/webperf', function(req, res) {
        res.send(JSON.stringify(webperf));
    });

    zeno.app.get('/webperf/date/:date', function(req, res) {
        if (webperf[req.params.date])
            res.send(JSON.stringify(webperf[req.params.date]));
        else
            res.send('{"status":"Incorrect date or date format (mm-dd-yyyy)"}');
    });

    zeno.app.get('/webperf/:env/:name', function(req, res) {
        if (webperf[req.params.env][req.params.name])
            res.send(JSON.stringify(webperf[req.params.env][req.params.name]));
        else
            res.send('{"status":"Incorrect name or no result available"}');
    });

    zeno.app.post('/webperf/:env/:name', function(req, res) {
        if (!req.body) return res.sendStatus(400);

        var body = {};
        try {
            body = JSON.parse(req.body);
        } catch (err) {
            res.send('{"status":"request refused, bad request", "error":"' + err + '"}');
        }

        if(req.params.env && req.params.name && webperf[req.params.env]) {
            if (!webperf[req.params.env][req.params.name]) {
                webperf[req.params.env][req.params.name] = body;
                res.send('{"status":"ok"}');
            } else
                res.send('{"status":"request refused, already created"}');
        } else {
            res.send('{"status":"request refused, bad parameters"}');
        }
    });
};