'use strict';

describe('Directives tests :', function() {
    describe('errSrc directive', function() {
        var $compile, $rootScope;

        beforeEach(function () {
            module('zeno');

            inject(function (_$compile_, _$rootScope_) {
                $compile   = _$compile_;
                $rootScope = _$rootScope_;
            });
        });

        it('should hide image in error', function() {
            var element = $compile("<div focus-input></div>")($rootScope);
            $rootScope.$digest();
        });
    });

    describe('lazyImg directive', function() {
        var $compile, $rootScope;

        beforeEach(function () {
            module('zeno');

            inject(function (_$compile_, _$rootScope_) {
                $compile   = _$compile_;
                $rootScope = _$rootScope_;
            });
        });

        it('should focus the search input', function() {
            var element = $compile("<div lazy-img></div>")($rootScope);
            $rootScope.$digest();
        });
    });

    describe('slider directive', function() {
        var $compile, $rootScope;

        beforeEach(function () {
            module('zeno');

            inject(function (_$compile_, _$rootScope_) {
                $compile   = _$compile_;
                $rootScope = _$rootScope_;
            });
        });

        it('Input should be focus', function() {
            var element = $compile("<div slider></div>")($rootScope);
            $rootScope.$digest();
        });
    });
});