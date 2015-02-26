describe('Zeno App', function() {

  describe('Pages view', function() {

    beforeEach(function() {
      ptor = protractor.getInstance();
      browser.get('/#/pages');
    });

    it('should have a title', function() {
      expect(browser.getTitle()).toEqual('Zeno');
    });

  });

});