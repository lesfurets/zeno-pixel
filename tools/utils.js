var fs      = require('fs'),
    PNG     = require('pngjs').PNG,
    exports = module.exports = {};

exports.log      = log;
exports.contains = contains;

exports.compareImages  = compareImages;
exports.isColorSimilar = isColorSimilar;
exports.isRGBSimilar   = isRGBSimilar;

/*
 * Simple logger adding current time before the log
 */
function log() {
    var d = new Date(),
        month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        text  = '';

    for (var i = 0; i < arguments.length; i++) {
        text += arguments[i] + ' ';
    };

    console.log('['+month[d.getMonth()]+' '+d.getDate()+' '+d.getHours()+':'+ d.getMinutes()+':'+d.getSeconds()+'] : ' + text);
}

function contains(a,b) {return!!~a.indexOf(b); }

/*
 * =====================
 * Image utils methods
 * =====================
 */
var tolerance = { // between 0 and 255
    red: 16,
    green: 16,
    blue: 16,
    alpha: 16,
    minBrightness: 16,
    maxBrightness: 240
};
var dir = 'screenshots/';

function compareImages (img1, img2, cb) {
    var mismatchCount = 0;

    if (fs.existsSync(img1) && fs.existsSync(img2)) {
        fs.createReadStream(img1)
            .pipe(new PNG({
                filterType: 4
            }))
            .on('parsed', function() {
                var image1 = this;
                fs.createReadStream(img2)
                    .pipe(new PNG({
                        filterType: 4
                    }))
                    .on('parsed', function() {
                        var image2 = this;
                        var width  = image1.width > image2.width ? image1.width : image2.width;
                        var height = image1.height > image2.height ? image1.height : image2.height;

                        for (var y = 0; y < height; y++) {
                            for (var x = 0; x < width; x++) {
                                var idx = (width * y + x) << 2;

                                var p1 = {
                                    r: image1.data[idx],
                                    g: image1.data[idx+1],
                                    b: image1.data[idx+2]
                                };

                                var p2 = {
                                    r: image2.data[idx],
                                    g: image2.data[idx+1],
                                    b: image2.data[idx+2]
                                };

                                if (!isRGBSimilar(p1, p2)) {
                                    mismatchCount++;
                                }
                            }
                        }

                        var misMatchPercentage = (mismatchCount / (height*width) * 100).toFixed(2);
                        cb(misMatchPercentage);
                    });
            });
    } else {
        log('One image is missing: ' + img1 + ' / ' + img2);
        return false;
    }
}

function isRGBSimilar (p1, p2) {
    var red   = isColorSimilar(p1.r, p2.r, 'red');
    var green = isColorSimilar(p1.g, p2.g, 'green');
    var blue  = isColorSimilar(p1.b, p2.b, 'blue');

    return red && green && blue;
}

function isColorSimilar (a, b, color) {
    if(typeof a === 'undefined') {
        return false;
    }
    if(typeof b === 'undefined') {
        return false;
    }

    var absDiff = Math.abs(a - b);

    if(a === b) {
        return true;
    } else if ( absDiff < tolerance[color] ) {
        return true;
    } else {
        return false;
    }
}