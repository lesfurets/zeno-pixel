'use strict'

# Home Controller : #/compare/:env
# ===================================
zenoCtrl = ($scope, $location, $timeout, ZenoService, PagesFactory, ResultsFactory, socket, $routeParams) ->
  $scope.sorted      = false
  $scope.hasFiltered = false # to help lazyload and filtering: true first time filtered is used

  if $routeParams.device && contains($scope.devices, $routeParams.device)
    $scope.setDevice($routeParams.device)

  if ($location.search()).filter?
    $scope.query = ($location.search()).filter

  # trigger lazzy load init
  $timeout () ->
    $(window).trigger('angularEvt')
  , 100

  # Watchers
  # ----------
  $scope.$watch 'compareform.env', () ->
    $scope.compareform.valid = 0
    $scope.env = [] #envs list to compare

    for k,v of $scope.compareform.env
      if v
        $scope.compareform.valid++
        for env in $scope.list.envs
          if env.alias == k
            if env.offset
              $scope.env.push("versioning/" + $scope.versions[$scope.versions.length - 1 + env.offset] + "/" + env.server)
            else
              $scope.env.push(env.server)
            break
    return
  , true

  # Returns a valid path uri for a choosen environement
  $scope.resolveDiskPath = (env, name, param, offset) ->
    if offset
      screenShotName = env + name + $scope.ext
      versions = $scope.versionsByPage[screenShotName]
      if versions == "undefined"
        return
      version = versions[versions.length - 1 + offset]
      path = $scope.dir + "versioning/" + version + "/" + screenShotName
    else
      end = ''
      if typeof param != "undefined"
        end = param
      path = $scope.dir + env + name + $scope.thumb + end
    return path

  # Returns a valid host for a choosen environement
  $scope.resolveHost = (env, url) ->
    return PagesFactory.parseHost(url, env, $scope.list.host)

  # Recompute lazyload if collapsing, wait for DOM to be repaint
  $scope.rowReduce = () ->
    $timeout () ->
      $(window).trigger('rowReduce')
    , 10
    return

  $scope.emailDropCallback = (event, ui, src, $index) ->
    prevVersion = $scope.versions[$scope.versions.length - 2]
    first       = $scope.dir + src + $scope.ext
    second      = $scope.dir + "versioning/" + prevVersion + "/" + src + $scope.ext

    #start comparaison
    if first != second
      $last   =  $('.emailRatio' + $index)
      offsets = []
      offsets[1] = -1
      ZenoService.compare($index, first, second, $last, offsets, true)
    return

  # Callback function after a drag n drop
  $scope.dropCallback = (event, ui, envIndex, src, $index) ->
    first   = ui.draggable.attr('src').replace('_thumb', '')
    dropEnv = $scope.list.envs[envIndex]

    if first.indexOf('?') != -1
      first = first.substring(0, first.indexOf('?'))

    if dropEnv.offset
      second = $scope.dir + "versioning/" + $scope.versions[$scope.versions.length - 1 + dropEnv.offset] + "/" + dropEnv.server + src + $scope.ext
    else
      second = $scope.dir + dropEnv.server + src + $scope.ext

    realIndex  = $index # real index and not the filtered one

    # check if the list is filtered and adapt the index
    if $scope.filtered.length != $scope.list[$scope.device].length
      name = first.substring(0, first.indexOf($scope.ext)).replace($scope.dir, '')

      for env in $scope.list.envs
        name = name.replace(env.server, '')

      realIndex = $scope.getRealIndex(name)

    if first != second
      $last = $('.ratio' + $index)

      offsets    = []
      offsets[0] = parseInt(ui.draggable.attr('data-offset'), 10)
      offsets[1] = dropEnv.offset

      #start comparaison
      ZenoService.compare(realIndex, first, second, $last, offsets, true)
    return

  $scope.dragStart = (event, ui) ->
    ui.helper[0].className = ui.helper[0].className + ' draging'
    return
  $scope.dragStop = (event, ui) ->
    ui.helper[0].className = ui.helper[0].className.replace(' draging', '')
    return

  # Fired when a comparaison is finished
  # data.index      : url id
  # data.percentage : mistmatch value
  # data.src        : base64 result image
  $scope.$on 'result', (evt, data) ->
    updatedRow = $scope.list[$scope.device][data.index]
    $scope.$apply ->
      if data.success
        updatedRow.success = true
        updatedRow.failure = false
      else
        updatedRow.success  = false
        updatedRow.failure  = true
      updatedRow.percentage = data.percentage

      # do not keep success image
      if data.percentage != '0.00'
        updatedRow.src = data.src
        # try to add the image in the browser local storage
        # do not keep offset results because there is no thumb (too large)
        if data.offsets != undefined
          if !data.offsets[0] and !data.offsets[1]
            ResultsFactory.setStorageImage(updatedRow.name, data.src)
      else
        # clean error data
        ResultsFactory.removeStorageImage(updatedRow.name)
        delete updatedRow.src
      return

    socket.emit "updateResults",
      device  : $scope.device,
      name    : $scope.list[$scope.device][data.index].name,
      percentage: data.percentage

    # Update error model
    $scope.updateResultsByName(updatedRow.name, $scope.device, data.percentage)

    # Compare the next page if necessary
    $scope.listToCompare.shift()
    if $scope.listToCompare.length
      name     = $scope.listToCompare[0].name
      newIndex = $scope.getRealIndex(name) #to update results after comparaison
      $last    = $('.ratio' + $scope.getFilteredIndex(name))
      first    = name + $scope.ext
      offsets  = [$scope.list.envs[0].offset, $scope.list.envs[1].offset]
      ZenoService.compare(newIndex, $scope.dir + $scope.env[0] + first, $scope.dir + $scope.env[1] + first, $last, offsets, true)
    else
      $scope.$apply ->
        $scope.compareform.comparing = false
        $scope.compareform.text = 'Compare'
        return
    return

  $scope.updateResultsByName = (name, device, percentage) ->
    found = false
    for result, index in $scope.results[device].results
      if name is result.name
        found = true

        if percentage is '0.00'
            $scope.results[device].results.splice(index ,1)
        else
            result.percentage = percentage;
            $scope.results[device].date = new Date()
        break

    if !found && percentage != '0.00'
      $scope.results[device].results.push({name: name, percentage: percentage})
      $scope.results[device].date = new Date()
    return

  $scope.hasImage = (url, index) ->
    if !angular.element('.ratio' + index + ' a.computed').length && (url.src || ResultsFactory.getStorageImage(url.name))
      return true
    return false

  $scope.getStoredImage = (url) ->
    url.src || ResultsFactory.getStorageImage(url.name)

  # hide/show a row
  $scope.hide = (index) ->
    res = true
    if $scope.hideSuccess
      res = res && !$scope.list[$scope.device][index].success

    if $scope.hideFailures
      res = res && !$scope.list[$scope.device][index].failure
    return res

  # refresh all urls for one environement
  $scope.refreshEnv = (env, $index) ->
    angular.forEach $scope.list[$scope.device], (page) ->
      page.refreshing[$index] = true
      return

    socket.emit "refreshEnv",
      env : env,
      type: $scope.device
    return

  # refresh only one url for one environement
  $scope.refreshImage = (col, row) ->
    $scope.filtered[row].refreshing[col] = true

    socket.emit "refreshOneScreen",
      env  : col
      name : $scope.filtered[row].name
      type : $scope.device
    return

  # refresh only one email
  $scope.refreshEmail = (row) ->
    $scope.filteredEmail[row].refreshing = true

    socket.emit "refreshOneEmail",
      email    : $scope.filteredEmail[row].email
      path     : $scope.dir + $scope.filteredEmail[row].name + $scope.ext
    return

  $scope.isRefreshing = (url, col) ->
    return url.hasOwnProperty('refreshing') && url.refreshing[col]

  # compare the current page or stop the comparaison
  $scope.$on 'compareAll', (evt, data) ->
    if !$scope.compareform.comparing #no comparaison ongoing
      if $scope.compareform.valid
        $scope.compareform.text      = 'Stop'
        $scope.compareform.comparing = true
        $scope.listToCompare         = $scope.filtered.slice(0) #copy the list

        $scope.$emit "remaining", $scope.listToCompare

        name     = $scope.listToCompare[0].name
        index    = $scope.getRealIndex(name) #to update results after comparaison
        $last    = $('.ratio' + $scope.getFilteredIndex(name))
        first    = name + $scope.ext
        offsets  = [$scope.list.envs[0].offset, $scope.list.envs[1].offset]
        ZenoService.compare(index, $scope.dir + $scope.env[0] + first, $scope.dir + $scope.env[1] + first, $last, offsets, true)
    else
      #need to stop the comparaison, compareText will be set by the last result
      $scope.listToCompare = []
    return

  $scope.getRealIndex = (name) ->
    index = -1
    angular.forEach $scope.list[$scope.device], (url, i) ->
      if url.name == name
        index = i
      return
    return index

  $scope.getFilteredIndex = (name) ->
    index = -1
    angular.forEach $scope.filtered, (url, i) ->
      if url.name == name
        index = i
      return
    return index

  $scope.getComputedUrl = (url, index) ->
    offsets = []
    offsets[0] = $scope.list.envs[0].offset
    offsets[1] = $scope.list.envs[1].offset

    name0 = $scope.list.envs[0].server + url.name
    name1 = $scope.list.envs[1].server + url.name
    ZenoService.getComputedUrl(name0, name1, offsets)

  # Method use to filter the home page
  # @params element needed to force the browser to redisplay the image
  # @return true if the element is displayed, false otherwise
  $scope.filterList = (element) ->
    isfiltered = [true, true] # filter by name or by slider
    if $scope.query
      $scope.hasFiltered = true

      if element.name.indexOf($scope.query) != -1
        element.params = "?redisplay"
      else
        isfiltered[0] = false
    else
      if $scope.filtered && $scope.hasFiltered
        element.params = "?redisplay"
    if $scope.sliderOffset > 0
      isfiltered[1] = false
      for error in $scope.results[$scope.device].results
        if error.name is element.name and $scope.sliderOffset < error.percentage
          isfiltered[1] = true
      $(window).trigger('rowReduce')
    return isfiltered[0] && isfiltered[1]

  # socketIO listeners
  # ------------------

  # fired when one image update is done
  # @params update.name
  # @params update.env
  socket.on "updateOneScreen", (update) ->
    col  = -1
    name = update.name

    $scope.list.envs.forEach (env, i) ->
      name = name.replace(env.server, '')
      if env.server == update.env && !env.offset
        col = i
      return

    angular.forEach $scope.filtered, (page) ->
      if page.name == name
        page.refreshing[col] = false
        page.params = "?" + new Date().getTime() # trick to force the image refresh by changing the url
      return
    return

  # fired when one image update is done
  socket.on "updateOneWebPerf", (update) ->
    angular.forEach $scope.list[update.device], (url) ->
      if url.name == update.name
        url.webperf = update.wp
      return
    return

  return

# Environement Controller : #/env/:envName
# ============================================
envCtrl = ($scope, $routeParams, $timeout, socket) ->
  $scope.title           = $routeParams.env
  $scope.firstPage       = $scope.list[$scope.device][0].name + $scope.ext
  $scope.device          = $routeParams.device
  $scope.thumb           = '_thumb.png'
  $scope.current         = 0
  versions = $scope.versionsByPage[$scope.firstPage]
  $scope.selectedVersion = versions[versions.length - 1]
  $scope.pdfExctrating   = false

  angular.forEach $scope.list.envs, (env)->
    if env.alias is $scope.title && $scope.list[$scope.device]?
      $scope.value        = env.server
      $scope.mainImageUrl = $scope.dir + $scope.value + $scope.firstPage
    return

  $scope.$watch 'current', () ->
    if $scope.filtered
      $scope.mainImageUrl = $scope.dir + $scope.value + $scope.filtered[$scope.current].name + $scope.ext
    return

  $scope.isSelected = ($index) ->
    $scope.current == $index

  $scope.setImage = ($index) ->
    $scope.current = $index
    return

  # call when a version is selected
  $scope.update = () ->
    $scope.mainImageUrl = $scope.dir + 'versioning/' + $scope.selectedVersion + '/' + $scope.value + $scope.list[$scope.device][$scope.current].name + $scope.ext
    return

  $scope.pdfExtraction = () ->
    socket.emit "pdfExtraction",
      env     : $scope.title,
      device  : $scope.device,
      version : $scope.selectedVersion
    return

  socket.on "pdfExtracted", () ->
    $scope.pdfExctrating = false
    return

  return

# History page Controller : #/history/:pageId
# ============================================
historyCtrl = ($scope, VersionService, $routeParams) ->
  $scope.title        = $routeParams.pageId
  $scope.dir          = $scope.dir + 'versioning/'
  versionsByCurrent   = $scope.versionsByPage[$scope.title + $scope.ext]
  $scope.available    = versionsByCurrent.slice(versionsByCurrent.length-100, versionsByCurrent.length).reverse()
  $scope.current      = $scope.available[0]
  $scope.mainImageUrl = $scope.dir + $scope.title + $scope.ext

  # methods to determine initial mainImageurl
  # @param date of a 404 image
  $scope.addError = (date) ->
    for d, i in $scope.available
      if d is date
        $scope.available.splice(i, 1)
        $scope.current = $scope.available[0]
        $scope.$apply()
        break
    return

  $scope.$watch 'current', (newValue, OldValue) ->
    $scope.mainImageUrl = $scope.dir + newValue + '/' + $scope.title + $scope.ext
    return

  $scope.getThumbSrc = (date) ->
    $scope.dir + date + '/' + $scope.title + '_thumb' + $scope.ext

  $scope.getSrc = (date) ->
    $scope.dir + date + '/' + $scope.title + $scope.ext

  $scope.setImage = (date) ->
    $scope.current = date
    return

 	$scope.isSelected = (date) ->
    $scope.current == date

  $scope.dropCallback = (event, ui, date) ->
    first  = $scope.dir + ui.draggable.attr('err-src') + '/' + $scope.title + $scope.ext
    second = $scope.dir + date + '/' + $scope.title + $scope.ext

    VersionService.compare(first, second, VersionService.onComplete)
    return

  $scope.$on 'compareResult', (evt, data) ->
    $scope.mainImageUrl = data.src
    $scope.$apply()
    return
  return

# Compare page Controller : #/results/:file1/:file2
# ==================================================
compareCtrl = ($scope, $routeParams, CompareService) ->
  extract1 = CompareService.extractParams($scope.versions, $routeParams.file1);
  $scope.title1 = extract1.title
  $scope.file1  = extract1.file

  extract2 = CompareService.extractParams($scope.versions, $routeParams.file2);
  $scope.title2  = extract2.title
  $scope.file2   = extract2.file
  $scope.current = 3 # default displayed image

  # init main image by starting a comparaison
  CompareService.compare($scope.file1, $scope.file2, CompareService.onComplete)

  $scope.setImage = (src, id) ->
    $scope.current = id
    if src is 'result'
      $scope.mainImageUrl = angular.element('.sliderThumb ul li:last img').attr('src')
    else
      $scope.mainImageUrl = src
    return

  $scope.isSelected = (id) ->
    if id == $scope.current
      return true
    else
      return false

  $scope.$on 'compareResult', (evt, data) ->
    $scope.mainImageUrl = data.src
    $scope.$apply()
    return
  return

# Page configuration Controller : #/settings
# ==================================================
settingsCtrl = ($scope, socket, ResultsFactory, $timeout) ->
  socket.emit "getConfType", (data) ->
    $scope.pagesJson = data

  $scope.updateConfFile = () ->
    $scope.refreshConf = true
    socket.emit "updateConfFile", (data) ->
      $scope.list = data
      $scope.refreshConf = false

  $scope.show =
    desktop: false
    tablet : false
    mobile : false

  $scope.cookies = [];
  $scope.cookiesLength = 0

  socket.emit "getCookiesList", (cookies) ->
    $scope.cookies = cookies
    $scope.cookiesLength = Object.keys($scope.cookies).length


  $scope.showListSettings = true
  $scope.showListCookiesSettings = true

  isSamePage = (page1, page2) ->
    page1.url == page2.url \
      and page1.alternative == page2.alternative \
      and JSON.stringify(page1.cookies) == JSON.stringify(page2.cookies)

  transformListIntoListSetting = () ->
    list = []
    angular.copy($scope.list.desktop, list)
    angular.forEach(list, (listItem) ->
      listItem.isDesktop = true
    )
    angular.forEach($scope.list.tablet, (tabletItem) ->
      isPresent = false
      angular.forEach(list, (listItem) ->
        if (isSamePage(listItem, tabletItem))
          listItem.isTablet = isPresent = true
      )
      if (!isPresent)
        tabletItem.isTablet = true
        list.push(tabletItem)
    )
    angular.forEach($scope.list.mobile, (mobileItem) ->
      isPresent = false
      angular.forEach(list, (listItem) ->
        if (isSamePage(listItem, mobileItem))
          listItem.isMobile = isPresent = true
      )
      if (!isPresent)
        mobileItem.isMobile = true
        list.push(mobileItem)
    )
    return list

  $scope.listSettings = transformListIntoListSetting()

  $scope.updateCookieValue = (cookie) ->
    socket.emit("modifyCookieValue", cookie, (result) ->
      if (result == "ok")
        cookie.confRefreshing = false
        cookie.classRefreshing = 'success'
        $timeout(() ->
          cookie.classRefreshing = ''
        , 3000)
      else
        cookie.confRefreshing = false
        cookie.classRefreshing = 'error'
        $timeout(() ->
          cookie.classRefreshing = ''
        , 3000)
    )

  $scope.updateUrlPage = (page) ->
    page.confRefreshing = true
    devices = []
    if page.isDesktop
      devices.push 'desktop'
    if page.isTablet
      devices.push 'tablet'
    if page.isMobile
      devices.push 'mobile'
    socket.emit('updateUrlPage', page, devices, (result) ->
      if (result == "ok")
        page.confRefreshing = false
        page.classRefreshing = 'success'
        $timeout(() ->
          page.classRefreshing = ''
        , 3000)
      else
        page.confRefreshing = false
        page.classRefreshing = 'error'
        $timeout(() ->
          page.classRefreshing = ''
        , 3000)
    )

  $scope.updateDevicePage = (page, device, oldState) ->
    page.confRefreshing = true
    presentState = !oldState
    arg = 'is' + device.charAt(0).toUpperCase() + device.slice(1);
    if (presentState)
      socket.emit('addDevicePage', page, device, (result) ->
        if (result == "ok")
          page[arg] = presentState
          page.confRefreshing = false
          page.classRefreshing = 'success'
          $timeout(() ->
            page.classRefreshing = ''
          , 3000)
        else
          page.confRefreshing = false
          page.classRefreshing = 'error'
          $timeout(() ->
            page.classRefreshing = ''
          , 3000)
      )
    else
      socket.emit('removeDevicePage', page, device, (result) ->
        if (result == "ok")
          page[arg] = presentState
          page.confRefreshing = false
          page.classRefreshing = 'success'
          $timeout(() ->
            page.classRefreshing = ''
          , 3000)
        else
          page.confRefreshing = false
          page.classRefreshing = 'error'
          $timeout(() ->
            page.classRefreshing = ''
          , 3000)
      )

  $scope.updateEngine = () ->
    value = $scope.engine

    $scope.$emit "updateEngine", value

    socket.emit "updateEngine",
      engine: value
    return

  # call when a disk save is asked by client
  $scope.updateModel = () ->
    socket.emit "saveList"
    return

  # clean each localStorage record
  $scope.cleanStorage = () ->
    $scope.list.desktop.forEach (page) ->
      ResultsFactory.removeStorageImage(page.name)
      return

    $scope.list.mobile.forEach (page) ->
      ResultsFactory.removeStorageImage(page.name)
      return

    $scope.list.tablet.forEach (page) ->
      ResultsFactory.removeStorageImage(page.name)
      return
    return

  $scope.sortableOptions =
    axis: 'y'

  return

# Log page Controller : #/log
# ==================================================
logCtrl = ($scope, socket, $http, $interval) ->
  $scope.title = 'Log console'

  angular.element('.terminal').height(window.screen.height / 2)

  $interval () ->
    $http.get('/log').success (data) ->
      $scope.logContent = data
      return
  , 1000

  return

# Summary Controller : #/summary
# ==================================================
summaryCtrl = ($scope, $http) ->
  $scope.webperf = {}
  $scope.pagesDesktop = []
  $scope.pagesTablet = []
  $scope.pagesMobile = []
  $scope.metrics = ["req", "size", "time", "errors", "jsErrors"]
  $scope.selectedMetrics = "time"

  $scope.dataDesktop = {dataset0: []}
  $scope.dataTablet = {dataset0: []}
  $scope.dataMobile = {dataset0: []}

  $http.get('/ua').success (data) ->
    $scope.userAgents = data.userAgents
    $scope.viewPorts = data.viewPorts

  $http.get('/webperf').success (data) ->
    $scope.webperf = data
    for page of data.desktop
      $scope.pagesDesktop.push(page)
    for page of data.tablet
      $scope.pagesTablet.push(page)
    for page of data.mobile
      $scope.pagesMobile.push(page)

    for key, value of data.desktop
      $scope.selectedDesktopPage = value
      $scope.dataDesktop.dataset0 = fromObjectWPtoList(data.desktop[key])
      break

    for key, value of data.tablet
      $scope.selectedTabletPage = value
      $scope.dataTablet.dataset0 = fromObjectWPtoList(data.tablet[key])
      break

    for key, value of data.mobile
      $scope.selectedMobilePage = value
      $scope.dataMobile.dataset0 = fromObjectWPtoList(data.mobile[key])
      break

  fromObjectWPtoList = (page) ->
    i = 0
    listTmp = []
    for date of page
      month  = date.split('-')[0]
      day    = date.split('-')[1]
      year   = date.split('-')[2]
      jsDate = new Date(year, (month-1), day)
      listTmp.push({
        x        : jsDate
        req      : page[date].req
        size     : page[date].size / 10000
        time     : page[date].time / 1000
        errors   : page[date].errors.length
        jsErrors : page[date].jsErrors.length
      })
    return listTmp

  $scope.updateDesktop = () ->
    page = $scope.webperf.desktop[$scope.selectedDesktopPage]
    $scope.dataDesktop.dataset0 = fromObjectWPtoList(page)

  $scope.updateTablet = () ->
    page = $scope.webperf.tablet[$scope.selectedTabletPage]
    $scope.dataTablet.dataset0 = fromObjectWPtoList(page)

  $scope.updateMobile = () ->
    page = $scope.webperf.mobile[$scope.selectedMobilePage]
    $scope.dataMobile.dataset0 = fromObjectWPtoList(page)

  $scope.updateMetrics = () ->
    console.log($scope.selectedMetrics)
    $scope.options.series.key = $scope.selectedMetrics
    $scope.options.series.label = $scope.selectedMetrics
    $scope.$digest()

  $scope.options = {
    series: [
      {
        axis: "y",
        dataset: "dataset0",
        key: "time",
        label: "Time (s)",
        color: "#1f77b4",
        type: ['line', 'dot', 'area'],
        id: 'time'
      },
      {
        axis: "y",
        dataset: "dataset0",
        key: "req",
        label: "Requests Number",
        color: "rgba(70,191,189,1)",
        type: ['line', 'dot', 'area'],
        id: 'req'
      },
      {
        axis: "y",
        dataset: "dataset0",
        key: "size",
        label: "Size(ko)*10",
        color: "rgba(253,180,92,1)",
        type: ['line', 'dot', 'area'],
        id: 'size'
      },
      {
        axis: "y",
        dataset: "dataset0",
        key: "errors",
        label: "Errors",
        color: "rgba(247,70,74,1)",
        type: ['line', 'dot', 'area'],
        id: 'errors'
      },
      {
        axis: "y",
        dataset: "dataset0",
        key: "jsErrors",
        label: "Errors JS",
        color: "rgb(247, 70, 147)",
        type: ['line', 'dot', 'area'],
        id: 'jsErrors'
      }
    ],
    axes: {x: {
      key: "x",
      type: "date"
    }}
  };

  return

# Global Controller : One controller to rule them all
# ===================================================
globalCtrl = ($scope, $location, PagesFactory, ResultsFactory, VersionService, socket, dir, ext) ->
  $scope.listToCompare = [] # list of pages comparaison in progress
  $scope.devices      = ['desktop', 'tablet', 'mobile']
  $scope.compareform  = {env: {}, valid: 0, comparing: false, text: 'Compare'} # object handling the compare form
  $scope.device       = $scope.devices[0]
  $scope.dir          = dir
  $scope.ext          = ext
  $scope.location     = $location # needed in view
  $scope.sliderOffset = 0
  $scope.thumb        = '_thumb.png'
  $scope.hideFailures = false
  $scope.hideSuccess  = false

  $scope.$on "updateEngine", (evt, data) ->
    $scope.results.engine = data
    return

  $scope.$on "remaining", (evt, data) ->
    $scope.listToCompare = data
    return

  VersionService.getVersions().query (res)->
    $scope.versions = res
    return

  VersionService.getVersionsByPageAll().query (res)->
    $scope.versionsByPage = res
    return

  PagesFactory.getQueue (data) ->
    $scope.queue = data.length
    $scope.queuePages = data
    return

  PagesFactory.getPages (data) ->
    $scope.list = data

    ResultsFactory.getResults (data) ->
      $scope.results = data

      for device in $scope.devices
        for page in $scope.list[device]
          page.refreshing = []

          # add failure information
          for result in $scope.results[device].results
            if result.name == page.name
              page.percentage = result.percentage
              page.success    = false
              page.failure    = true


          $scope.engine = $scope.results.engine

          # add success information if page no error
          if !page.hasOwnProperty('percentage')
            page.percentage = 0
            page.success    = true
            page.failure    = false
      return
    return

  $scope.filterBySliderValue = (offset) ->
    $scope.sliderOffset = offset
    return

  $scope.compareAll = () ->
    $scope.$broadcast 'compareAll'
    return

  $scope.keyPress = (ev) ->
    if ev.which is 116 #T
      angular.element('#back-to-top').click()
    else if ev.which is 114 # R
      angular.forEach $scope.list[$scope.device], (page)->
        if page.low
          page.low = !page.low
        else
          page.low = true
        return
    return

  $scope.setDevice = (device) ->
    $scope.device = device
    return

  $scope.isTabActive = (device) ->
    $scope.device == device

  $scope.isIconActive = () ->
    $location.path().indexOf('compare') != -1 ||
    $location.path().indexOf('history') != -1 ||
    $location.path().indexOf('result') != -1 ||
    $location.path().indexOf('env') != -1

  # fired when a version update is done
  socket.on "updateVersionEvent", (update) ->
    $scope.versions = update.versions
    return

  # fired when a version update is done
  socket.on "updateVersionByPageEvent", (update) ->
    $scope.versionsByPage = update.versionsByPage
    return

  # fired when the queue is updated
  socket.on "queueChangeEvent", (update) ->
    $scope.queue = update.length
    $scope.queuePages = update
    return

  return

# Injectors
# =========
zenoCtrl.$inject     = ['$scope', '$location', '$timeout', 'ZenoService', 'PagesFactory', 'ResultsFactory', 'socket', '$routeParams']
envCtrl.$inject      = ['$scope', '$routeParams', '$timeout', 'socket']
historyCtrl.$inject  = ['$scope', 'VersionService', '$routeParams']
compareCtrl.$inject  = ['$scope', '$routeParams', 'CompareService']
settingsCtrl.$inject = ['$scope', 'socket', 'ResultsFactory', '$timeout']
logCtrl.$inject      = ['$scope', 'socket', '$http', '$interval']
summaryCtrl.$inject  = ['$scope', '$http']
globalCtrl.$inject   = ['$scope', '$location', 'PagesFactory', 'ResultsFactory', 'VersionService', 'socket', 'dir', 'ext']

angular.module('zeno.controllers', [])
	.controller('ZenoController', zenoCtrl)
  .controller('EnvController', envCtrl)
  .controller('HistoryController', historyCtrl)
  .controller('CompareController', compareCtrl)
  .controller('SettingsController', settingsCtrl)
  .controller('LogController', logCtrl)
  .controller('SummaryController', summaryCtrl)
	.controller('GlobalController', globalCtrl)

contains = (a, obj) ->
  i = a.length
  while (i--)
     if a[i] == obj
         return true
  return false