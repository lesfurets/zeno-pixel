#Plugins

Zeno uses [EventEmitter](http://nodejs.org/docs/latest/api/events.html) to trigger events where each module can attach handlers to. The idea is to keep the core as minimalist as possible and export features in modules.

## Availabale events

### onScreenshotDone

Trigger when phantomJs has rendered a page

``` js
zeno.on('onScreenshotDone', function(data) {
});
```

`data.name`   : image name <br>
`data.options`: options send to the engine to render the page <br>
`data.metrics`: webperf metrics returned by phantomsjs <br>

### onCopyDone

Trigger when a new image has been versioned

``` js
zeno.on('onCopyDone', function(data) {
});
```
`data.name` : image name<br>

You need antother event ? Feel free to fork the project and create a pull request.

## How to add module ?

Add a folder in 'modules' with a name that make sense and a file named like the folder.

| modules<br>
| | new_modules<br>
| | | new_modules.js<br>

The file must contains a module function which will be loaded during the server initialisation.

``` js
exports.module = function (zeno) {
};
```
You'll probably need to inject a parameter which is a wrapper for core available methods (see getWrapper())
