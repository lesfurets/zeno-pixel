describe('Zeno App', function () {

    describe('Zeno view', function () {

        beforeEach(function () {
            browser.get('/');
        });

        it('should have a title', function () {
            expect(browser.getTitle()).toEqual('Zeno');
        });

        it('should be displayed correctly', function () {
            var deviceButton = element.all(by.css('.tab'));
            expect(deviceButton.count()).toBe(3);

            // it should filtered the url list as the user enter a query
            var urls = element.all(by.repeater('url in (filtered = (list[device] | filter: filterList))'));

            element(by.css('.search div')).click();
            var query = element(by.model('query'));
            expect(query).toBeDefined();

            query.sendKeys('homepage');
            urls.then(function (arr) {
                expect(arr.length).toEqual(10);
            });
        });

        it('should do a comparaison after a dragAndDrop', function () {
            var draggable = element.all(by.css('.pages img'));
            var first = draggable.get(0);
            var second = draggable.get(2);

            browser.actions().dragAndDrop(first, second).perform();

            //expect(element(by.css('.diffHeader')).isPresent()).toBe(true);
        });

        it('should switch /history page atfer a click on a screenshot', function () {
            var homeImg = element.all(by.css('.pages img'));
            homeImg.get(0).isDisplayed()
                .then(function(result) {
                if (result){
                    homeImg.get(0).click();
                    browser.getLocationAbsUrl().then(function (url) {
                        expect(url).toBe('/history/homepage');
                    });

                    var versions = element.all(by.repeater('date in versions.slice().reverse()'));
                    expect(versions).toBeDefined();
                }
            })
        });
    });
});