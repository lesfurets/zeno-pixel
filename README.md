#ZENO

Improve your Continuous Delivery workflow by automating visual/css regression detection.
Zeno is [NodeJS](http://nodejs.org) based application able to take screenshots and compare them with a previous version or another environment.<br>
Using [PhantomJS](http://phantomjs.org/) or [SlimerJS](http://slimerjs.org/), Zeno has the ability to emulate the mobile or tablet version of a website

See the [Getting started guide](https://github.com/lesfurets/zeno-pixel/blob/master/docs/getting-started.md) to have further explanations on how to use Zeno.

To see a real demo, come to Zeno *Tool in Actions* at ***DevoxxFR 2015***: [link](http://cfp.devoxx.fr/2015/talk/KFR-5145/Armez-vous_d'un_pixel_monitoring_avec_Zeno_!)

## Requirements

* [NodeJS](http://nodejs.org)
* [PhantomJS 2.0+](http://phantomjs.org/)
* [SlimerJS](http://slimerjs.org/)
* [Imagemagick](http://www.imagemagick.org/)

## Installation

if the [prerequistes](https://github.com/lesfurets/zeno-pixel/blob/master/docs/getting-started.md#setup) are completed, just do:

    npm install

Zeno has never been tested on windows and probably don't work. Need to migrate the path concatenation with path.join()

## Usage

[Configure](https://github.com/lesfurets/zeno-pixel/blob/master/docs/getting-started.md#config) the pages using page_template.json<br>
Build and run:

    grunt
    node zenoServer.js [parameters]

Available parameters:<br>
* `--port`: application port (default: 1337)<br>
* `--log`: log file name<br>
* `--file`: configuration file name (default: pages.json)

## Todo

see [TODO](https://github.com/lesfurets/zeno-pixel/blob/master/docs/getting-started.md#setup) file

## License

see [LICENSE]() file

## Changelog

 * 1.0
 > * Hello World !
