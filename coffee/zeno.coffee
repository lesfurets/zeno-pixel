angular.element(document.getElementsByTagName('head')).append(angular.element('<base href="' + window.location.pathname + '" />'))
# ---------------------
# Angular JS
# ---------------------
angular.module('zeno', [
  'zeno.controllers',
  'zeno.directives',
  'zeno.filters',
  'zeno.services',
  'ngRoute',
  'ngResource',
  'ngSanitize',

  # 3rd party dependencies
  'btford.socket-io',
  'ui.sortable',
  'ngDragDrop',
  'sticky'
]).config ['$routeProvider', ($routeProvider) ->
  $routeProvider
    .when('/compare', {
      templateUrl: 'routes/zeno',
      controller: 'ZenoController'
    })
    .when('/compare/:device', {
      templateUrl: 'routes/zeno',
      controller: 'ZenoController'
    })
    .when('/history/:pageId', {
      templateUrl: 'routes/detail',
      controller: 'HistoryController'
    })
    .when('/result/:file1/:file2', {
      templateUrl: 'routes/compare',
      controller: 'CompareController'
    })
    .when('/env/:env/:device', {
      templateUrl: 'routes/env',
      controller: 'EnvController'
    })
    .when('/summary', {
        templateUrl: 'routes/summary',
        controller: 'SummaryController'
    })
    .when('/settings', {
      templateUrl: 'routes/settings',
      controller: 'SettingsController'
    })
    .when('/log', {
      templateUrl: 'routes/log',
      controller: 'LogController'
    })
    .otherwise({
      redirectTo: '/compare'
    })

  return
]

# ---------------------
# Jquery
# ---------------------
$(document).ready ->

  $(document).on
    scroll: ->
      scrollTop = $(this).scrollTop()
      if(scrollTop > 200 && !$('#back-to-top').hasClass("visible"))
        $('#back-to-top')
          .animate({ 'right': 0 }, 500, 'easeOutBounce')
          .addClass('visible')
      else if (scrollTop < 200 && $('#back-to-top').hasClass("visible"))
        $('#back-to-top')
          .animate({ 'right': '-50px' }, 500, 'easeOutBounce')
          .removeClass('visible')

  $(document).on
    click: ->
      $('#back-to-top').removeClass('visible')
      $("html, body").animate({ scrollTop: 0 }, "slow")
      return false
  , '#back-to-top'

  return