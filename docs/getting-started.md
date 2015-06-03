#Getting Started

This guide describes how to get started with Zeno.

##Introduction

Zeno is composed of a [NodeJS](http://nodejs.org) backend:
 - Take and save screenshots
 - Compare two images
 - Modular approach able to add additional feature

And a frontend build with [AngularJs](https://angularjs.org/):

 - Drag n drop one image to another to compare them
 - Client side comparaison
 - Configuration edition
 - Results filtering
 - Url history

##Setup

Install Nodejs :

    Linux    : sudo apt-get install node
    Mac Os X : brew install node

Install Imagemagick to create thumbnails:

    Linux    : sudo apt-get install imagemagick
    Mac Os X : brew install imagemagick

Install PhantomJS: see doc [here](http://phantomjs.org/download.html)

[Less](http://lesscss.org/) and [Coffeescript](coffeescript.org) are used to generate css and js.

If they are not alredy installed

    npm install -g less
    npm install -g coffee-script
    npm install -g grunt-cli

(or omit the -g if you'd prefer not to install globally).

Install the dependencies

    npm install
    bower install

To auto rebuild after each client code change:

    grunt watch


Grunt is also configured to use its Live reload on less files using *grunt watch* (see Gruntfile.js).<br>
Mobile and tablet rendering is done using *User Agent* and *viewport*.

##Config

You need to adapt the pages_template.json to your needs. Default file name is `pages.json`, you can specify another file using the `--file` parameter <br>
There is no limit to envs length but the first two environments will be considered as the reference couple.

```json
{
	"host" : "{$alias}my_host",
	"envs" : [
		{"alias": "dev", "server" : "myserver1.", "port": ":1234", "alternative": ["myserver2-"]},
    {"alias": "prod", "server" : ""},
		{"alias": "previous prod", "server" : "", "offset": -1}
	],
    "sitemap" : [
        "SitemapUrl1",
        "SitemapUrl2"
    ],
	"desktop" : [
		{"url": "$host", "name": "homepage"},
		{"url": "$host/auto", "name": "auto"},
        {"url": "$host/search", "name": "search", "alternative": 0}
	],
	"mobile" : {},
	"tablet" : {}
}
```

For each environement, you can specify:

* `alias`  : (mandatory) display name of an environement<br/>
* `server` : (mandatory) port of the urls, used through the string $alias in the host value<br/>
* `port`   : custom port, do not forget the colon ':'<br/>
* `offset` : negative integer matching the 'offset' with the current version<br/>
* `alternative` : array which contains alternative host chunk<br/>

For each page, you can specify:

* `url`     : web url to record, omit the protocol.<br/>
* `name`    : name on the file system<br/>
* `alternative` : index of the key to use from the alternative array<br/>
* `cookies` : array of cookies name needed for this page. See cookies section

Other root options are available:<br>
* `sitemap` : list of xml sitemaps urls, each link will populate desktop, mobile and tablet pages list<br/>
* `blacklist` : list of keywords which will exclude request containing them<br/>
* `proxy` : proxy url

##Usage

Example:

    node zenoServer.js --port 1234 --log logFile.log

And go to: http://localhost:1234.<br>

Available parameters:<br>
* `--port`: application port (default: 1337)<br>
* `--log`: log file name<br>
* `--file`: configuration file name (default: pages.json)
* `--cookie`: cookie file name (default: cookies.json)<br>
* `--folder`: folder name(default: screenshots)<br>
* `--engine`: headless engine phantomjs|slimerjs<br>
* `--startAction`: compare images from the reference couple at startup<br>

Available web services:

    http://localhost:1234/upadte/:environment
    http://localhost:1234/pages
    http://localhost:1234/compare/:env1/:env2
    http://localhost:1234/results
    http://localhost:1234/results/:device
    http://localhost:1234/versions
    http://localhost:1234/log

##Cookies

It is possible to inject prerecorded cookies to the rendering engine. In your pages.json, add for each line where your need cookies

    "cookies" : ["cookie1", "cookies2", ...]

cookies values are predefined in cookies.json.

```json
{
	"cookie1" : {
	    "name": "my_cookie",
	    "value": "my_value",
	    "domain": "www.lesfurets.com",
	    "path": "/"
	},
	"cookie2" : {...}
}
```
Be sure that your cookies are coherent on each environement or you will possibly not get the same rendering.

##Modules

see the [Modules](https://github.com/lesfurets/zeno-ui/blob/master/docs/modules.md) section

##Shortcuts

 * T: scroll to top
 * R: switch the display of each row

##Tests

Zeno uses the third party librairies for front end tests:

 * [Jasmine](http://pivotal.github.io/jasmine) as its test scaffolding for the unit and e2e tests.
 * [Karma](http://karma-runner.github.io/) as its test runner
 * [Protractor](https://github.com/angular/protractor) to run e2e tests

To run front unit tests (by default autowatch=true in karma.conf.js)

    npm test

To run e2e tests

    npm run protractor

To run back end tests (mocha test suite)

    npm run back

##Todo

 * Drop jquery and jquery-ui (D&D issue)
 * Windows suport
 * Easiest way to add and edit page config
 * See branch 1.1 for further evolutions
