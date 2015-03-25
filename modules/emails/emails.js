var Imap     = require('imap'),
    inspect  = require('util').inspect;

var imap = new Imap({
  user: '',
  password: '',
  host: '',
  port: 993,
  tls: true
});

/**********************
 * Plugins: Email Comparaison plugin
 * @author: @mfourtina
 * @version: 0.1
 **********************/
exports.module = function (zeno) {

  /*
   * @param data.device : device to render
   * @param data.env    : environment name
   */
  zeno.on('onEnvUpdate', function (data) {
    if (zeno.pages.emails) {
        console.log('Update Emails');
        zeno.pages.emails.forEach(function (email) {
            renderEmail(email.email, email.name);
        });
    }
  });

  zeno.io.sockets.on('connection', function (socket) {
    /*
     * Fired when an email is refreshed by a client
     * @param data.name : name to search in mail box
     * @param data.path : path to write the image
     */
    socket.on('refreshOneEmail', function (data) {
        renderEmail(data.name, data.path);
    });
  });

  function renderEmail(name, path) {
    var options = {};
    readEmail(name, function(body) {
      options = {
            viewportSize: {width: 1600, height: 1100},
            body        : body
      };

      zeno.emit('takeScreenshot', {
            url: undefined,
            path: path,
            options: options
      });
    });
  };

  function readEmail(search, cb) {
      var buffer = '';

      imap.once('ready', function() {
            openInbox(function(err, box) {
                if (err) throw err;

                var f = imap.seq.fetch(box.messages.total, { bodies: '' });
                f.on('message', function(msg, seqno) {
                    msg.on('body', function(stream, info) {
                        stream.on('data', function(chunk) {
                            buffer += chunk.toString('utf8');
                        });
                        stream.once('end', function() {
                            buffer = buffer.substring(buffer.indexOf('<html>'), buffer.indexOf('</html>') + 7);
                        });
                    });
                    msg.once('attributes', function(attrs) {});
                    msg.once('end', function() {
                        if(cb)
                            cb(buffer);
                    });
                });
                f.once('error', function(err) {
                    console.log('Fetch error: ' + err);
                });
                f.once('end', function() {
                    imap.end();
                });
          });
    });

    imap.once('error', function(err) {
        console.log('Imap error: ' + err);
    });

    imap.once('end', function() {});
    imap.connect();
  };

  function openInbox(cb) {
    imap.openBox('INBOX', true, cb);
  }
};