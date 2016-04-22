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
        location  = $location;
        location.path('desktop');

        rootScope = $rootScope;
        spyOn(rootScope, '$broadcast').andCallThrough();

        scope               = $rootScope.$new();
        scope.list          = list;
        scope.listToCompare = [];
        ctrl  = $controller('SettingsController', {$scope: scope});
    }));

    it('should exists', function() {
        expect(scope).toBeDefined();
        expect(scope.show).toBeDefined();
        expect(scope.show.desktop).toEqual(false);
    });

    it('should update cookie values', function() {
        scope.updateCookieValue({name: 'test', value: 'foo'});
    });

    it('should update rendering engine', function() {
        scope.updateEngine();
    });
});