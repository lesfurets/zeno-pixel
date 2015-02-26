'use strict';

describe('the tests of the Compare Controller', function() {

    var scope, $httpBackend, ctrl, rootScope;
    var list = {
        envs : ["stage.", "pre-prod.", ""],
        desktop : [
            {url: "lesfurets.com", name: "homepage"}
        ]
    };

    beforeEach(module('zeno'));

    beforeEach(inject(function(_$httpBackend_, $rootScope, $controller) {
        rootScope = $rootScope;
        scope = $rootScope.$new();
        ctrl  = $controller('CompareController', {
            $scope: scope,
            $routeParams: {file1 :'homepage', file2: 'stage.homepage'},
            CompareService : {compare : function (file1, file2, block) {
                // do nothing
            },
                extractParams : function(versions, param) {
                    return {
                        title : param
                    }
                }
            }
        });
    }));

    // tests start here
    // ==================

    it('should have variables', function(){
        expect(scope.title1).toBe('homepage');
        expect(scope.title2).toBe('stage.homepage');
    });

    it('should have a main image', function(){
        expect(scope.mainImageUrl).toBeUndefined();

        rootScope.$broadcast('compareResult', {src: 'test'});
        expect(scope.mainImageUrl).toBe('test');
    });
});