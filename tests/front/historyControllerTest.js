'use strict';

describe('the tests of the History Controller', function() {

    var scope, $httpBackend, ctrl;
    var list = {
        envs : ["stage.", "pre-prod.", ""],
        desktop : [
            {url: "lesfurets.com", name: "homepage", delay: 2000}
        ]
    };

    var versions = ['2-2-2014', '3-3-2014'];

    beforeEach(module('zeno'));

    beforeEach(inject(function($rootScope, $controller) {
        scope = $rootScope.$new();
        scope.versions = versions;
        scope.current  = scope.versions[scope.versions.length - 1];

        ctrl  = $controller('HistoryController', {
            $scope: scope,
            VersionService : {},
            $routeParams: {pageId :'homepage'}
        });
    }));

    // tests start here
    // ==================

    it('should have variables', function(){
        expect(scope.dir).toBe('screenshots/versioning/');
        expect(scope.ext).toBe('.png');
        expect(scope.current).toBe('3-3-2014');
        expect(scope.title).toBe('homepage');
    });

    it('should have changed focus image', function(){
        scope.setImage('2-2-2014');
        expect(scope.current).toBe('2-2-2014');
    });
});