describe('Zeno App', function() {

  describe('Pages view', function() {

    beforeEach(function() {
      browser.get('/#/pages');
    });

    it('should have a title', function() {
      expect(browser.getTitle()).toEqual('Zeno');
    });

  });

});