var pdfDoc = require('pdfkit'),
    path   = require('path'),
    fs     = require('fs'),
    pdf    = path.join(__dirname, 'pdfExtract');

/**********************
 * Plugins: PDF Exctraction
 * @author: @mfourtina
 * @version: 0.1
 **********************/
exports.module = function (zeno) {
    if (!fs.existsSync(pdf)) {
        fs.mkdirSync(pdf);
    }

    //Add a route to create a PDF for one environment
    zeno.app.get('/pdf/:env/:device', function(req, res) {
        var doc  = new pdfDoc(),
            d    = new Date(),
            date = d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate(),
            name = pdf + '/extract_' + req.params.env + '_' + date + '.pdf';

        doc.pipe(fs.createWriteStream(name));

        doc.info['Title'] = 'Zeno extract';
        doc.fontSize(25);
        doc.text('Zeno Extraction : ' + date, {
            align: 'center'
        });

        zeno.pages[req.params.device].forEach(function(page) {
            doc.addPage();
            doc.fontSize(12);
            doc.text(page.name, 10, 10, { link: page.url, underline: false });
            doc.image('screenshots/' + page.name + '.png', 80, 15, {width: 400});
        });

        doc.on('end', function(){
            zeno.io.sockets.emit('pdfExtracted');
            res.download(name);
        });

        doc.end();
    });
};
