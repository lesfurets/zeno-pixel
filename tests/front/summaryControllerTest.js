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
        tablet : [
            {url: "@host/search", name: "search"},
            {url: "@host/results", name: "results"},
        ],
        mobile : [
            {url: "@host/search", name: "search"},
            {url: "@host/results", name: "results"},
        ],
        success: 0,
        failures: 0
    };

    beforeEach(module('zeno'));
    beforeEach(inject(function(_$httpBackend_, $rootScope, $controller, $location) {
        $httpBackend = _$httpBackend_;
        $httpBackend.expectGET('/ua').respond([
            {id:1}
        ]);
        $httpBackend.expectGET('/webperf').respond([
            {desktop: {homepage: {}}, tablet: {}, mobile: {}}
        ]);

        location  = $location;
        location.path('desktop');

        rootScope = $rootScope;
        spyOn(rootScope, '$broadcast').andCallThrough();

        scope               = $rootScope.$new();
        scope.list          = list;
        scope.listToCompare = [];
        ctrl  = $controller('SummaryController', {$scope: scope});
    }));

    it('should exists', function() {
        expect(scope).toBeDefined();
        expect(scope.webperf).toBeDefined();
        expect(scope.metrics.length).toEqual(5);
    });

    it('should fetch data', function() {
        $httpBackend.flush();
    });
});