'use strict';

describe('Zeno Controller', function() {

    var scope, $httpBackend, ctrl, rootScope, location, zenoService;
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

        scope               = $rootScope.$new();
        scope.list          = list;
        scope.listToCompare = [];
        scope.results       = results;
        zenoService = {
            bind: function () {},
            compare: function () {}
        };
        ctrl  = $controller('ZenoController', {$scope: scope, ZenoService: zenoService});
    }));

    // tests start here
    // ==================

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
});