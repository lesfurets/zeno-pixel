'use strict';

describe('the tests of the Zeno Controller', function() {

    var scope, $httpBackend, ctrl, rootScope, location;
    var list = {
        host : "{@alias}.google.com",
        envs : [
            {alias: "dev", server : "dev.", port: 8080},
            {alias: "prod", server: ""}
        ],
        desktop : [
            {url: "@host/search", name: "search"},
            {url: "@host/results", name: "results"},
        ],
        success: 0,
        failures: 0
    };

    var results = {
        desktop : {
            results: [
                {
                    name: "homepage",
                    pourcent: "1.1"
                },
                {
                    name: "about",
                    pourcent: "2.0"
                }
            ],
            date: "2014-07-28T15:17:01.038Z",
            total: 7,
            endDate: "2014-07-28T15:17:40.696Z"
        }
    };

    beforeEach(module('zeno'));
    beforeEach(inject(function($rootScope, $controller, $location) {

        location  = $location;
        location.path('desktop');

        rootScope = $rootScope;
        spyOn(rootScope, '$broadcast').andCallThrough();

        scope         = $rootScope.$new();
        scope.list    = list;
        scope.results = results;
        ctrl  = $controller('ZenoController', {$scope: scope});
    }));

    // tests start here
    // ==================

    it('should set storage directory from ZenoService', function(){
        expect(scope.dir).toBe('screenshots/');
    });

    it('should set image extensions from ZenoService', function(){
        expect(scope.ext).toBe('.png');
        expect(scope.thumb).toBe('_thumb.png');
        expect(scope.compareText).toBe('Compare');
    });

    it("should return real index using name", function() {
        scope.device = 'desktop'; // mock the http request from globalController

        var index = scope.getRealIndex('');
        expect(index).toBe(-1);

        var google = scope.getRealIndex('search');
        expect(google).toBe(0);
    });

    it("should return filtered index using name", function() {
        scope.filtered = scope.list.desktop; // mock the filtered array from ng-repeat

        var index = scope.getFilteredIndex('');
        expect(index).toBe(-1);

        var google = scope.getFilteredIndex('search');
        expect(google).toBe(0);

        scope.filtered = scope.filtered.slice(1);
        var google = scope.getFilteredIndex('results');
        expect(google).toBe(0);
    });

    it('should have a success after a broadcast', function(){
        scope.device = 'desktop'; // mock the http request from globalController
        expect(scope.list).toBeDefined();

        rootScope.$broadcast('result', {index: 0, success: true});
        expect(scope.list.success).toBe(1);

        rootScope.$broadcast('result', {index: 1, success: true});
        expect(scope.list.success).toBe(2);
    });

    it('should trigger an error if no env is selected', function(){
        expect(scope.form.invalid).toBe(false);
        scope.compareAll();
        expect(scope.form.invalid).toBe(true);
    });

    it('should toggle compare mode if requirements are ok', function(){
        scope.filtered = scope.list.desktop; // mock the filtered array from ng-repeat

        scope.form.env = {dev: true, prod: true};
        scope.$apply(); //to trigger the watch in a digest cycle

        scope.compareAll();
        expect(scope.form.invalid).toBe(false);
        expect(scope.comparing).toBe(true);
        expect(scope.lengthCompare).toBe(2);
    });
});