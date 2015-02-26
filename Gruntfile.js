module.exports = function (grunt) {
    grunt.loadNpmTasks('grunt-contrib-coffee');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-autoprefixer');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-jshint');

    grunt.initConfig({
        coffee: {
            compile: {
                files: {
                    'js/zeno.js': 'coffee/zeno.coffee',
                    'js/zeno-controllers.js': 'coffee/zeno-controllers.coffee',
                    'js/zeno-directives.js': 'coffee/zeno-directives.coffee',
                    'js/zeno-services.js': 'coffee/zeno-services.coffee',
                    'js/zeno-filters.js': 'coffee/zeno-filters.coffee'
                }
            }
        },

        uglify: {
            my_target: {
                files: {
                    'js/zeno.min.js': 'js/zeno.js'
                }
            }
        },

        jshint: {
            all: ['Gruntfile.js', 'tests/unit/*.js']
        },

        less: {
            development: {
                files: {
                    "css/zeno.css": "less/zeno.less"
                }
            }
        },

        autoprefixer: {
            myFiles: {
                options: {
                  browsers: ['last 10 version', 'Firefox > 10']
                },
                files: {
                    "css/zeno.css": "css/zeno.css"
                }
            }
        },

        cssmin: {
            minify: {
                files: {
                    'css/zeno.min.css': ['css/zeno.css']
                }
            }
        },

        watch: {
            coffee: {
                options: {
                    livereload: false,
                },
                files: ['coffee/*.coffee', 'less/*.less'],
                tasks: ['coffee']
            },
            less: {
                options: {
                    livereload: false,
                },
                files: ['less/*.less'],
                tasks: ['less', 'autoprefixer']
            },
            css: {
                options: {
                    livereload: true,
                },
                files: ['css/*.css'],
                tasks: []
            }
        }

    });

    grunt.registerTask('default', ['coffee', 'uglify', 'less', 'autoprefixer', 'cssmin']);
};