#ZENO email module

Monitore in Zeno your emails to avoid visual regressions

### Configuration

In email.js, you must configure your inbox
``` js
var imap = new Imap({
    user: '',
    password: '',
    host: '',
    port: 993,
    tls: true
});
```
