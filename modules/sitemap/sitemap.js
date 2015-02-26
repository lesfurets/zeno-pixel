var parseString = require('xml2js').parseString,
    https       = require('https');
    http        = require('http');

/**********************
 * Plugins: Site Map
 * @author: @mfourtina
 * @version: 0.1
 **********************/
exports.module = function (zeno) {
    if (zeno.pages.sitemap) {

        // Get sitemap lists from configuration
        var rawHost = zeno.pages.host.replace('{$alias}', '');

        zeno.pages.sitemap.forEach(function(url) {
            getHttpsList(url, function(data) {
                data.forEach(function (raw) {
                    var url  = raw.replace(rawHost, "$host"),
                        name = raw.replace(rawHost + '/', '');

                    // add each url to the configuration for desktop, tablet and mobile
                    zeno.pages.desktop.push({
                        url: url,
                        name: name
                    });

                    zeno.pages.tablet.push({
                        url: url,
                        name: 'tablet-' + name
                    });

                    zeno.pages.mobile.push({
                        url: url,
                        name: 'mobile-' + name
                    });
                });
            });
        });
    }

    function getHttpsList (file, cb) {
        https.get(file, function(res) {
            var xml = '';
            res.on('data', function(chunk) {
                xml += chunk;
            });
            res.on('end', function() {
                parseString(xml, function (err, result) {
                    var list = [];
                    result.urlset.url.forEach(function (url) {
                        var link = JSON.stringify(url.loc[0]);
                        list.push(url.loc[0].replace('https://', '').replace('www.', ''));
                    });

                    cb(list);
                });
            });
        }).on('error', function(e) {
            log('Error reading sitemap : ' + file);
        });
    }

    function getHttpList (file, cb) {
        http.get(file, function(res) {
            var xml = '';
            res.on('data', function(chunk) {
                xml += chunk;
            });
            res.on('end', function() {
                parseString(xml, function (err, result) {
                    var list = [];
                    result.urlset.url.forEach(function (url) {
                        list.push(JSON.stringify(url.loc).replace('http', ''));
                    });

                    cb(list);
                });
            });
        }).on('error', function(e) {
            log('Error reading sitemap : ' + file);
        });
    }
};