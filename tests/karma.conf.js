module.exports = function (config) {
    config.set({

        basePath: '../',

        files: [
            'js/bower_components/jquery/jquery.js',
            'js/bower_components/jquery-ui/jquery-ui.js',
            'js/bower_components/angular/angular.js',
            'js/bower_components/angular-route/angular-route.js',
            'js/bower_components/angular-resource/angular-resource.js',
            'js/bower_components/angular-sanitize/angular-sanitize.js',
            'js/bower_components/angular-mocks/angular-mocks.js',
            'js/bower_components/angular-socket-io/socket.js',
            'js/bower_components/angular-socket-io/mock/*.js',
            'js/bower_components/angular-dragdrop/src/angular-dragdrop.min.js',
            'js/bower_components/ngSticky/lib/sticky.js',
            'node_modules/n3-charts/build/LineChart.min.js',
            'js/libs/resemble.min.js',
            'js/libs/sortable.js',
            'js/*.js',
            'tests/front/*.js'
        ],

        preprocessors: {
            'js/*.js': 'coverage'
        },

        exclude: ['js/zeno.min.js'],

        autoWatch: true,
        singleRun: true,

        reporters: ['progress', 'coverage'],

        frameworks: ['jasmine'],

        browsers: ['PhantomJS'],

        plugins: [
            'karma-jasmine',
            'karma-phantomjs-launcher',
            'karma-coverage'
        ]
    });
};