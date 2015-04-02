'use strict'

angular.module('zeno.services', [])
  .constant('dir', 'screenshots/')
  .constant('ext', '.png')

  # 2 cycles of comparaison:
  # - the mains images which returns the mismatch value
  # - the thumbnails comapraison which returns a smaller image needed for UI
  .service 'ZenoService', ($rootScope, $timeout, ext) ->
    self        = this
    @index      = 0
    @percentage = 0
    @first      = false # true if the basic image is finished

    @compare = (index, file1, file2, block, offsets, first) ->
      xhr  = new XMLHttpRequest()
      xhr2 = new XMLHttpRequest()
      done = $.Deferred()
      dtwo = $.Deferred()

      xhr.open 'GET', file1, true
      xhr.responseType = 'blob'
      xhr.onload = ->
          done.resolve @response
      xhr.send()

      xhr2.open 'GET', file2, true
      xhr2.responseType = 'blob'
      xhr2.onload = ->
          dtwo.resolve @response
      xhr2.send()

      @first = first
      if first
        @index   = index
        @block   = block
        @file1   = file1
        @file2   = file2
        @offsets = offsets || []

      $.when(done, dtwo).done (f1, f2) ->
        if f1.type == "image/png" && f2.type == "image/png"
          resemble(f1).compareTo(f2).onComplete(self.onComplete)
        else # 404 with at least one image
          $rootScope.$broadcast('result', {
            index   : self.index,
            offsets : @offsets,
            success : false,
            percentage: -1
          })
        return
      return

    # callback on comparaison finished
    @onComplete = ((data) ->
      # we want to keep the image result of the thumbnail comparaison to display it
      # and the mismatch value of the main images
      if @first
        @percentage = data.misMatchPercentage
        file1_thumb = @file1
        file2_thumb = @file2

        if !@offsets[0] and !@offsets[1]
          file1_thumb = @file1.replace(ext, '_thumb' + ext)
          file2_thumb = @file2.replace(ext, '_thumb' + ext)

        @compare(@index, file1_thumb, file2_thumb, @block, @offsets, false)
      else
        diffBlock     = new Image()
        diffBlock.src = data.getImageDataUrl()

        # Keep only file name by removing directory and extension
        f1 = @getName(@file1)
        f2 = @getName(@file2)

        @block.find('a').remove()
        a = angular.element('<a href="'+ @getComputedUrl(f1, f2, @offsets) + '" class="computed"/>')
        @block.append a    # add link
        a.append diffBlock # add image

        if @percentage == '0.00' and data.misMatchPercentage == '0.00'
          success = true
        else
          success = false

        $rootScope.$broadcast('result', {
          index     : @index,
          offsets   : @offsets,
          success   : success,
          src       : data.getImageDataUrl(),
          percentage: @percentage
        })
      ).bind(this)

    @getComputedUrl = (name1, name2, offsets) ->
      if offsets[0]
        name1 += ':' + offsets[0]

      if offsets[1]
        name2 += ':' + offsets[1]
      url = '#/result/' + name1 + '/' + name2
      return url

    @getName = (file) ->
      return file.substring(file.lastIndexOf('/') + 1, file.length).replace(ext, '')
    return

  .service 'VersionService', ($resource, $rootScope, CompareService) ->
    self = this
    @getVersions = () ->
      return $resource('/versions')

    @compare = (file1, file2, block) ->
      @block   = block
      @file1   = file1
      @file2   = file2
      CompareService.compare(file1, file2, self.onComplete)
      return

    @onComplete = (data) ->
      $rootScope.$broadcast('compareResult', {src: data.getImageDataUrl()})
      return

    return

  # Basic service to compare 2 images
  .service 'CompareService', ($rootScope, dir ,ext) ->
    @compare = (file1, file2, onComplete, block) ->
      xhr  = new XMLHttpRequest()
      xhr2 = new XMLHttpRequest()
      done = $.Deferred()
      dtwo = $.Deferred()

      xhr.open 'GET', file1, true
      xhr.responseType = 'blob'
      xhr.onload = ->
          done.resolve @response
      xhr.send()

      xhr2.open 'GET', file2, true
      xhr2.responseType = 'blob'
      xhr2.onload = ->
          dtwo.resolve @response
      xhr2.send()

      $.when(done, dtwo).done (f1, f2) ->
        resemble(f1).compareTo(f2).onComplete(onComplete)
        return
      return

    @onComplete = (data) ->
      angular.element('.result').text('Mismatch: ' + data.misMatchPercentage)
      angular.element('.sliderThumb ul li:last img').attr('src', data.getImageDataUrl())

      $rootScope.$broadcast('compareResult', {src: data.getImageDataUrl()})
      return

    @extractParams = (versions, param) ->
      index = param.indexOf(':')
      if index != -1 #offset is present
        offset = parseInt(param.substring(index + 1, param.length), 10)
        return {
          title: param.substring(0, index) + ' (' + versions[versions.length - 1 + offset] + ')',
          file: dir + 'versioning/' + versions[versions.length - 1 + offset] + '/' + param.substring(0, index) + ext
          offset: offset
        }
      else
        return {
          title: param,
          file: dir + param + ext
        }
    return

  .factory 'socket', (socketFactory) ->
    return socketFactory()

  .factory 'PagesFactory', ($resource) ->
    factory = {}

    # Get configuration from node server
    # cb: callback method
    factory.getPages = (cb) ->
      $resource('/pages').get (data) ->
        cb(data)
        return
      return

    # Resolve the http url
    factory.parseHost = (url, env, host) ->
      resolved = 'http://'

      if env.port
        host += ':' + env.port

      resolved += url.url.replace('$host', host)

      if url.hasOwnProperty("alternative")
        resolved = resolved.replace('{$alias}', env.alternative[url.alternative])
      else
        resolved = resolved.replace('{$alias}', env.server)
      return resolved

    return factory

  .factory 'ResultsFactory', ($resource) ->
    factory = {}

    factory.getResults = (cb) ->
      $resource('/results').get (data) ->
        cb(data)
      return

    factory.setStorageImage = (name, src) ->
      localStorage.setItem(name, src)
      return

    factory.removeStorageImage = (name) ->
      localStorage.removeItem(name)
      return

    factory.getStorageImage = (name) ->
      if typeof localStorage != 'undefined'
        return localStorage.getItem(name)

    return factory