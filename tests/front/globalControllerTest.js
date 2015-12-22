'use strict';

describe('Global Controller', function() {
	var scope, $httpBackend, createController, ctrl, rootScope;

    var list = {
        host : "host.com",
        envs : ["env1", "env2", "env3"],
        desktop : [
            {url: "google", name: "google"},
            {url: "yahoo", name: "yahoo"}
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
    var versions = ["7-11-2014", "7-24-2014"];

    beforeEach(module('zeno'));
    beforeEach(inject(function($injector) {
        $httpBackend = $injector.get('$httpBackend');
        $httpBackend.when('GET', '/pages').respond(list);
        $httpBackend.when('GET', '/queue').respond([]);
        $httpBackend.when('GET', '/results').respond(results);
        $httpBackend.when('GET', '/versions').respond(versions);

        rootScope = $injector.get('$rootScope');
        scope = rootScope.$new();

        ctrl = $injector.get('$controller');
        createController = function() {
            return ctrl('GlobalController', {'$scope' : scope });
        };
    }));

    it('should fetch a list of pages from json file', function(){
        $httpBackend.expectGET('/queue');
        $httpBackend.expectGET('/pages');
        createController();
        $httpBackend.flush();
        expect(scope.list).toBeDefined();
        expect(scope.list.envs.length).toBe(3);
        expect(scope.list.desktop.length).toBe(2);
    });

    it('should set storage directory from ZenoService', function(){
        createController();
        expect(scope.dir).toBe('screenshots/');
    });

    it('should set image extensions from ZenoService', function(){
        createController();
        expect(scope.ext).toBe('.png');
        expect(scope.thumb).toBe('_thumb.png');
    });

    it('should toggle compare mode if requirements are ok', function(){
        createController();
        scope.filtered = list.desktop; // mock the filtered array from ng-repeat
        scope.$apply(); //to trigger the watch in a digest cycle

        scope.compareAll();
        expect(scope.compareform.valid).toBe(0);
        expect(scope.compareform.comparing).toBe(false);
        expect(scope.listToCompare.length).toBe(0);
    });

});