'use strict'

angular.module('zeno.directives', [])
  .directive 'errSrc', () ->
    return link: (scope, element, attrs) ->
      element.bind 'error', () ->
        this.parentNode.parentNode.style.display = 'none'
        scope.addError(attrs.errSrc)
        return
      element.bind 'load', () ->
        scope.addSuccess(attrs.src)
        return
      return
  # Directive which add the focus inside the search field when it's opening
  .directive 'focusInput', ($timeout) ->
    return link: (scope, element, attrs) ->
        element.bind 'click', () ->
          $timeout () ->
            if(element.hasClass('search-open'))
              element.find('input').focus()
            return
          return
      return
  # Directive which trigger the image load according to custom events
  .directive 'lazyImg', () ->
    return link: (scope, element, attrs) ->
      $(window).on "angularEvt resize scroll rowReduce", (e) ->
        $('table img').each ()->
          $this = $(this)
          if isElementInViewport($this) && !$this.attr('src')
            $this.attr('src', $this.attr('data-original'))
          return
        return

      isElementInViewport = (el) ->
        if typeof jQuery == "function" && el instanceof jQuery
          el = el[0]
        rect = el.getBoundingClientRect()

        return (
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
          rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        )
      return
  # Directive which overide basic behaviour of lazyload plugin by
  # replacing 'src' when an update is finished
  .directive 'original', ($window) ->
    return link: (scope, element, attrs) ->
      attrs.$observe 'original', (value)->
        # refresh the src only if the image has been updated
        if(value.indexOf('?') != -1)
         attrs.$set("src", value)
        return
      return
  # Directive to control the slider
  .directive 'slider', ($window)->
    return link: (scope, element, attrs) ->
      element.bind 'mousedown', (ev) ->
        offset = Math.round((ev.pageX - element[0].getBoundingClientRect().left) * 100 / element.prop('offsetWidth'))

        if offset < 0
          offset = 0

        angular.element(element[0].querySelector('.slider-button')).css({left: offset + '%'})

        scope.filterBySliderValue(offset)
        scope.$apply('sliderOffser')
        return
      return