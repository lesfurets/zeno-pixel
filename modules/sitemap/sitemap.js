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
            url = url.replace('$host', rawHost);
            getListUrls(url, [], function(data) {
                data.forEach(function (raw) {
                    var url  = raw.replace(rawHost, "$host"),
                        name = raw.replace(rawHost + '/', '');

                    var pageDesktop = {
                        url: url,
                        name: name
                    };


                    // add each url to the configuration for desktop, tablet and mobile
                    if (zeno.pages.desktop.indexOf(pageDesktop) == -1) {
                        zeno.pages.desktop.push(pageDesktop);

                        zeno.pages.tablet.push({
                            url: url,
                            name: 'tablet-' + name
                        });

                        zeno.pages.mobile.push({
                            url: url,
                            name: 'mobile-' + name
                        });
                    }
                });
            });
        });
    }

    function getListUrls (file, list, cb) {
        if (file.indexOf('http://') > -1) {
            http.get(file, function (res) {
                var xml = '';
                res.on('data', function (chunk) {
                    xml += chunk;
                });
                res.on('end', function () {
                    parseString(xml, function (err, result) {
                        computeSitemap(list, cb, result, file)
                    });
                });
            }).on('error', function (e) {
                zeno.log('Error reading sitemap : ' + file);
            });
        } else if (file.indexOf('https://') > -1) {
            https.get(file, function (res) {
                var xml = '';
                res.on('data', function (chunk) {
                    xml += chunk;
                });
                res.on('end', function () {
                    parseString(xml, function(err, result){
                        computeSitemap(list, cb, result, file)
                    });
                });
            }).on('error', function (e) {
                zeno.log('Error reading sitemap : ' + e);
            });
        }

    }

    var computeSitemap = function (list, cb, result, link) {
        if (result != undefined && result.urlset != undefined) {
            result.urlset.url.forEach(function (url) {
                var link = JSON.stringify(url.loc[0]);
                list.push(url.loc[0].replace('https://', '').replace('http://', '').replace('www.', ''));
            });
            cb(list);
        } else if (result != undefined && result.sitemapindex != undefined) {
            result.sitemapindex.sitemap.forEach(function (url) {
                getListUrls(url.loc[0], list, cb);
            });
        } else {
            zeno.log('Bad sitemap : ' + link);
        }
    };
};