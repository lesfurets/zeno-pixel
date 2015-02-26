'use strict';

describe('the tests of the Global Controller', function() {
	var scope, $httpBackend, ctrl, rootScope, location;

    var list = {
        host : "host.com",
        envs : ["env1", "env2", "env3"],
        desktop : [
            {url: "google", name: "google"},
            {url: "yahoo", name: "yahoo"},
        ],
        tablet : {
            results: []
        },
        mobile : {
            results: []
        },
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
		},
        tablet : {
            results: []
        },
        mobile : {
            results: []
        }
    };

    var versions = {
        versions: [
        "7-11-2014",
        "7-24-2014"]
    };

    beforeEach(module('zeno'));
    beforeEach(inject(function(_$httpBackend_, $rootScope, $controller, $location) {
        $httpBackend = _$httpBackend_;
        $httpBackend.when('GET', '/pages').respond(list);
        $httpBackend.when('GET', '/results').respond(results);
        $httpBackend.when('GET', '/versions').respond(versions);

        location  = $location;
        location.path('desktop');

        rootScope = $rootScope;

        scope = $rootScope.$new();
        scope.device = 'desktop';
        ctrl  = $controller('GlobalController', {$scope: scope});
    }));

    it('should fetch a list of pages from json file', function(){
        $httpBackend.flush();

        expect(scope.list).toBeDefined();
        expect(scope.list.envs.length).toBe(3);
        expect(scope.list.desktop.length).toBe(2);
    });

    it('should be init to 0 success and 0 failure', function(){
        $httpBackend.flush();

        expect(scope.list).toBeDefined();
        expect(scope.list.success).toBe(0);
        expect(scope.list.failures).toBe(2);
    });

    it('should fetch results from server', function(){
        $httpBackend.flush();

        expect(scope.results).toBeDefined();
        expect(scope.results.desktop.results.length).toBe(2);
    });

    it('should be in desktop mode', function(){
        $httpBackend.flush();

        expect(scope.location.path()).toBe('/desktop');
        expect(scope.device).toBe('desktop');
    });

    it('should be able to change of device', function(){
        $httpBackend.flush();

        location.path('/mobile');
        rootScope.$apply();
        expect(scope.device).toBe('mobile');

        location.path('/tablet');
        rootScope.$apply();
        expect(scope.device).toBe('tablet');
    });
});