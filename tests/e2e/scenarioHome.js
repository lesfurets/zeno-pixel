describe('Zeno App', function() {

  describe('Zeno view', function() {

    beforeEach(function() {
      ptor = protractor.getInstance();
      browser.get('/');
    });

    it('should have a title', function() {
      expect(browser.getTitle()).toEqual('Zeno');
    });

    it('should find an element by binding', function() {
      var success  = element(by.binding('{{list.success}}'));
      var failures = element(by.binding('{{list.failures}}'));
      expect(success.getText()).toBeDefined();
      expect(failures.getText()).toBeDefined();
    });

    it('should be displayed correctly', function() {
      var deviceButton = element.all(by.css('.bt-switch'));
      expect(deviceButton.count()).toBe(4);

      // it should filtered the url list as the user enter a query
      var urls = element.all(by.repeater('url in (filtered = (list[device] | filter:query))'));

      element(by.css('.search div')).click();
      var query = element(by.model('query'));
      expect(query).toBeDefined();

      query.sendKeys('homepage');
      urls.then(function (arr) {
        expect(arr.length).toEqual(2);
      });
    });

    it('should do a comparaison after a dragAndDrop', function() {
      var draggable = element.all(by.css('.screens td img'));
      var first     = draggable.get(0);
      var second    = draggable.get(2);

      ptor.actions().dragAndDrop(first, second).perform();

      //expect(element(by.css('.diffHeader')).isPresent()).toBe(true);
    });

    it('should display icons on hover', function() {
      var block = element.all(by.css('.screens td img'));

      for (var i = 0; i < 2; i++) {
        ptor.actions().mouseMove(block.get(i)).perform();

        var refresh = element.all(by.css('.refreshScreen'));
        expect(refresh.get(i).isDisplayed()).toBe(true);
      }
    });

    it('should switch to /pages', function() {
      element(by.css('.nav-logo')).click();
      expect(element(by.css('.nav-menu')).isDisplayed()).toBe(true);

      var lis = element.all(by.css('.nav-menu ul li'));
      lis.get(2).click();

      browser.getLocationAbsUrl().then(function(url) {
        expect(url.split('#')[1]).toBe('/pages');
      });

      var menuTabs = element.all(by.css('nav ul li')).then(function(arr) {
        expect(arr.length).toEqual(4);
      });
    });

    it('should switch /history page atfer a click on a screenshot', function() {
      var homeImg = element.all(by.css('.screens td img'));
      homeImg.get(0).click();
      browser.getLocationAbsUrl().then(function(url) {
        expect(url.split('#')[1]).toBe('/history/stage.homepage');
      });

      var versions = element.all(by.repeater('date in versions.slice().reverse()'));
      expect(versions).toBeDefined();
    });
  });
});