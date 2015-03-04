'use strict';

/*
 * Phantom script to create a cookies.txt file with the serialized cookies
 * Usage : phantomjs phantomCookie.js {...}
 */
var page     = require('webpage').create(),
    system   = require('system'),
    options  = JSON.parse(system.args[1]),
    metrics  = {req: 0, size:0, time:0, errors: [], jsErrors: []};

if(options.cookies) {
    for (var i = 0; i < options.cookies.length; i++) {
        phantom.addCookie(options.cookies[i]);
    }
}

if(options.ua) {
    page.settings.userAgent = options.ua;
}

page.viewportSize = {
    width: options.viewportSize.width,
    height: options.viewportSize.height
};

// requests to exclude (trackers ...)
var blacklist     = ['google', 'analytics', 'marinsm', 'pingdom', 'doubleclick'];
var renderTimeout = 0;

page.resources = [];

if (options.url) {
    // ultimate check in case something is broken
    var security = securityTimer();

    page.onResourceRequested = function (req) {
        if(isblacklisted(req)){
            clearTimeout(renderTimeout);

            if(security.cleared){
                security = securityTimer();
            }

            page.resources[req.id] = {
                request: req,
                startReply: null,
                endReply: null
            };
        }
    };

    page.onResourceReceived = function (res) {
        if (!res.stage || res.stage === 'start' && isblacklisted(res)) {
            page.resources[res.id].startReply = res;
        }

        if ((!res.stage || res.stage === 'end') && isblacklisted(res)) {
            //mark saved request as finished
            page.resources[res.id].endReply = res;

            //render if no other request is made after 1000ms
            if (page.resources.filter(isNotFinished).length === 0) {
                security.clear();

                renderTimeout = setTimeout(doRender, 1000);
            }
        }
    };

    page.onError = function(msg) {
        metrics.jsErrors.push(msg);
    };

    page.open('http://' + options.url, function(status) {
        if (status !== 'success') {
            console.log("Error opening url \"" + page.reason_url + "\": " + page.reason);
            phantom.exit(1);
        }
    });
} else if(options.body) {
    page.content = options.body;
    doRender();
}

function isblacklisted (req) {
    var isOk = true;
    for (var i = 0; i < blacklist.length; i++) {
        if(req.url.indexOf(blacklist[i]) !== -1) {
            isOk = false;
        }
    }

    return isOk;
}

function securityTimer() {
    return new Timeout(function (){
        var notEnded = page.resources.filter(isNotFinished);
        for (var i = 0; i < notEnded.length; i++) {
            metrics.errors.push(notEnded[i].request.url);
        }
        doRender();
    }, 30000);
}

function Timeout(fn, interval) {
    var id = setTimeout(fn, interval);
    this.cleared = false;
    this.clear = function () {
        this.cleared = true;
        clearTimeout(id);
    };
}

function isNotFinished (el) {
    return (el.endReply === null);
}

function doRender() {
    metrics.req = page.resources.length;
    page.resources.forEach(function (resource) {
        var request    = resource.request,
            startReply = resource.startReply,
            endReply   = resource.endReply;

        if (!request || !startReply || !endReply) {
            return;
        }

        // console.log(startReply);

        if (request.url.match(/(^data:image\/.*)/i)) {
            return;
        }

        metrics.size += startReply.bodySize;
        metrics.time += endReply.time - request.time;
    });

    // Will be intercept by zeno
    console.log(JSON.stringify(metrics));

    setTimeout(function() {
        page.render(options.path);
        page.close();
        phantom.exit();
    }, 200);
}

function contains(a, b){return !!~a.indexOf(b); }
