var Imap     = require('imap'),
    inspect  = require('util').inspect;

var imap = new Imap({
  user: '',
  password: '',
  host: '',
  port: 993,
  tls: true
});

/*
 * @param callback function with the body string as parameter
 */
exports.readEmail = function (cb) {
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