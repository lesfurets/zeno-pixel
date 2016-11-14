'use strict';

describe('Version Controller', function() {

    var scope, $httpBackend, ctrl, timeout;
    var list = {
        envs : [
            {alias: "stage", server : "stage."},
            {alias: "pre-prod", server : "pre-prod."},
            {alias: "prod", server: ""}
        ],
        desktop : [
            {url: "lesfurets.com", name: "homepage"}
        ]
    };
    var versions = ["7-11-2014", "7-24-2014"];
    var versionsByPage = {"homepage.png" : versions};

    beforeEach(module('zeno'));

    beforeEach(inject(function(_$httpBackend_, $rootScope, $controller, $timeout) {
        scope      = $rootScope.$new();
        scope.list = list;

        scope.ext = '.png';
        scope.versions = versions;
        scope.versionsByPage = versionsByPage;

        $httpBackend = _$httpBackend_;
        $httpBackend.when('GET', '/versions/page').respond(versionsByPage);
        $httpBackend.when('GET', '/pages').respond(list);

        timeout = $timeout;

        ctrl  = $controller('EnvController', {
            $scope: scope,
            $routeParams: {env :'prod', device: 'desktop'}
        });
    }));

    // tests start here
    // ==================

    it('should have variables', function(){
        expect(scope.current).toBe(0);
        expect(scope.title).toBe('prod');
        expect(scope.device).toBe('desktop');
    });

    it('should have changed focus image', function(){
        scope.setImage(1);
        expect(scope.current).toBe(1);
    });

    it('should have environment set', function(){
        timeout(function() {
            expect(scope.value).toBe('');
        }, 200);
    });
});