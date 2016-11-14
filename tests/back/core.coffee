'use strict'

request  = require('request')
should   = require('should')
path     = require('path')
fs       = require('fs')
express  = require('express')
io       = require("socket.io").listen(server)
base     = '../../'
Zeno     = require(base + 'zeno')
utils    = require(base + 'tools/utils')
port     = 1340
zeno     = {}
socket   = {}

app    = express()
server = require('http').Server(app)
app.set('port', port)
app.set('view engine', 'jade');
app.set('views', path.join(__dirname, base, 'views'))
app.use(express.static(path.join(__dirname)))

#add fake web page to render
app.get '/mock', (req, res) ->
    res.send('<img src="' + __dirname + '/mock/mockImage1.png"/>')

#test app params
params = {
    file: __dirname + '/mock/pagesMock.json',
    folder: __dirname + '/mock/temp/'
}
zeno = new Zeno(app, server, io, params)

after (done)->
    rmDir(params.folder)
    done()
    return

describe 'Core tests', ->
    it "should be initialized", (done) ->
        zeno.init.should.be.ok
        zeno.init ->
            fs.exists params.folder, (exists)->
                exists.should.be.true
                done()
                return
        return

    it "should get configuration", ->
        zeno.pages.should.be.ok
        zeno.pages.host.should.be.ok

        zeno.pages.envs.should.be.ok.and.be.a.Array
        zeno.pages.envs[0].alternative.should.be.ok
        zeno.pages.envs.length.should.be.above(0)

        zeno.pages.desktop.should.be.ok.and.be.a.Object
        zeno.pages.mobile.should.be.ok.and.be.a.Object
        zeno.pages.tablet.should.be.ok.and.be.a.Object
        return

    it "should get version list from disk", ->
        zeno.versions.should.be.ok
        zeno.versions.should.have.length(0)
        return

    # basic modules tests, each plugin must include its own tests
    it "should get modules list from plugin directory", ->
        zeno.modules.should.be.ok
        zeno.modules.length.should.be.above(0)
        zeno.modules.forEach (dir) ->
            if (dir[0] == '.')
                return
            module = require(base + 'modules/' + dir + '/' + dir)
            (typeof module).should.be.equal('object')
            return
        return

    it "should get cookies from json", ->
        zeno.cookiesList.should.be.ok
        Object.keys(zeno.cookiesList).length.should.be.above(0)
        return

    it "should be able to decode Urls", ->
        zeno.parseUrl(zeno.pages.envs[0].server, zeno.pages.desktop[0].url, zeno.pages.envs[0].port)
            .should.be.equal('localhost:1340/mock')

        zeno.parseUrl(zeno.pages.envs[0].server, zeno.pages.desktop[0].url)
            .should.be.equal('localhost/mock')

        zeno.parseUrl(zeno.pages.envs[0].alternative, zeno.pages.mobile[1].url)
            .should.be.equal('mobile.localhost')
        return

describe 'APIs tests', ->
    it "should respond with log or not", ->
        request 'http://localhost:' + port + '/log', (error, response, body) ->
            body.should.equal("log mode not activated")
            response.statusCode.should.equal(200)
        return

    it "should respond with results", (done) ->
        request 'http://localhost:' + port + '/results', (error, response, body) ->
            results = JSON.parse(body)
            results.should.be.ok
            response.statusCode.should.equal(200)

            results.desktop.should.be.ok
            results.mobile.should.be.ok
            results.tablet.should.be.ok
            done()
        return

    it "should respond with results for one device", (done) ->
        request 'http://localhost:' + port + '/results/desktop', (error, response, body) ->
            results = JSON.parse(body)
            results.should.be.ok
            response.statusCode.should.equal(200)

            results.results.should.be.ok
            done()
        return

describe 'Utils tests', ->
    it "should be able to compare 2 images", (done) ->
        utils.compareImages.should.be.ok
        utils.compareImages __dirname + '/mock/mockImage1.png', __dirname + '/mock/mockImage2.png', (pourcent)->
            pourcent.should.be.ok
            (typeof pourcent).should.be.a.string
            pourcent.should.equal("0.00")
            done()
        return

    it "should be able to compare 2 colors", ->
        utils.isRGBSimilar.should.be.ok

        c1 = {r: 15, g:200, b:174}
        c2 = {r: 15, g:170, b:174}
        c3 = {r: 15, g:192, b:174}
        utils.isRGBSimilar(c1, c2).should.be.false
        utils.isRGBSimilar(c1, c3).should.be.true

        utils.isColorSimilar.should.be.ok
        utils.isColorSimilar(40, undefined).should.be.false
        utils.isColorSimilar(undefined, 40).should.be.false
        utils.isColorSimilar(c1.r, c2.r, 'red').should.be.true
        utils.isColorSimilar(c1.g, c2.g, 'green').should.be.false


    it "should log console.log", ->
        utils.log.should.be.ok

describe 'Rendering tests',  ->
    it "should respond with the test page", (done) ->
        request 'http://localhost:' + port + '/mock', (error, response, body) ->
            body.length.should.be.above(0)
            response.statusCode.should.equal(200)
            done()
        return

    it "should be able to take a screenshot for mobile", ->
        zeno.unitScreenshot(zeno.pages.envs[0], 'mobile-mock', 'mobile')
        return

    it "should emit event onScreenshotDone", (done)->
        this.timeout(20000)
        zeno.on 'onScreenshotDone', (data) ->
            data.name.should.equal('mobile-mock')
            done()
            return
        return

    it "should emit event onCopyDone", (done)->
      this.timeout(20000)
      zeno.on 'onCopyDone', (data) ->
            data.name.should.equal('mobile-mock')
            fs.exists params.folder + data.name + zeno.ext, (exists)->
                exists.should.be.true
                done()
                return
            return
        return

    it "should have update the versions", ->
        zeno.versions.should.have.length(1)
        return
    return

rmDir = (dirPath) ->
    try
        files = fs.readdirSync(dirPath)
    catch e
        return
    if files.length > 0
        for file in files
            filePath = path.join(dirPath, file)
            if (fs.statSync(filePath).isFile())
                fs.unlinkSync(filePath)
            else
                rmDir(filePath)
        fs.rmdirSync(dirPath)
    return
