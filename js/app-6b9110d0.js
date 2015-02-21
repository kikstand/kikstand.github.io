(function () {
    'use strict';

    angular
        .module ( 'app', [
        'app.core',
        'app.layout'
    ] );
}) ();

(function () {
    'use strict';

    angular
        .module ( 'app.core', [

        /*   Angular     */
        'ngAnimate',
        'ngRoute',
        'ngMessages',
        'ngSanitize',

        /* Inter App */
        'blocks.logservice',
        'blocks.router',
        'blocks.exception',

        /*   3rd Party   */
        'angular-loading-bar',
        'velocity.ui'
    ] );
}) ();

(function () {
   'use strict';

   angular
      .module ( 'app.layout', ['app.core'] );
}) ();

(function () {
   'use strict';

   angular
      .module ( 'blocks.exception', ['blocks.logservice'] );
}) ();

(function () {
   'use strict';

   angular
      .module ( 'blocks.logservice', [] );
}) ();

(function () {
   'use strict';

   angular
      .module ( 'blocks.router', ['blocks.logservice'] );
}) ();

/**
 *  Created by Kikstand, Inc.
 *  Author: Bo Coughlin
 *  Project: kikstand.github.io
 *  File: config
 *  Date: Feb 21 2015
 *  Time: 2:06 PM
 */

(function () {
    'use strict';
    var core = angular.module ( 'app.core' );


    var config = {
        appErrorPrefix : '[ Kikstand - Error: ] ',
        appTitle : 'Kikstand'
    };
    core.value ( 'config', config );
    core.config ( configure );

    /* @ngInject */
    function configure ( $logProvider, $routeProvider, $sceDelegateProvider, cfpLoadingBarProvider,  $locationProvider, routehelperConfigProvider, exceptionHandlerProvider ) {

        if ( $logProvider.debugEnabled ) {
            $logProvider.debugEnabled ( true );
        }

        // Html5
        $locationProvider.html5Mode ( true );
        cfpLoadingBarProvider.includeSpinner = true;

        // Configure the common route provider
        routehelperConfigProvider.config.$routeProvider = $routeProvider;
        routehelperConfigProvider.config.docTitle = 'Kikstand ';


        //  Common exception handler
        exceptionHandlerProvider.configure ( config.appErrorPrefix );
    }
    configure.$inject = ['$logProvider', '$routeProvider', '$sceDelegateProvider', 'cfpLoadingBarProvider', '$locationProvider', 'routehelperConfigProvider', 'exceptionHandlerProvider'];

} ());

/**
 *  Created by Kikstand, Inc.
 *  Author: Bo Coughlin
 *  Project: kikstand.github.io
 *  File: shell
 *  Date: Feb 21 2015
 *  Time: 2:30 PM
 */

(function () {
    'use strict';
    angular.module ( 'app.layout' )
        .controller ( 'Shell', Shell );

    /* @ngInject */
    function Shell (config) {
        var vm = this;
        vm.title = config.appTitle
    }
    Shell.$inject = ['config'];
} ());

/**
 *  Created by Kikstand, Inc.
 *  Author: Bo Coughlin
 *  Project: kikstand.github.io
 *  File: exception.handler
 *  Date: Feb 21 2015
 *  Time: 3:53 PM
 */

(function () {
   'use strict';
    angular.module ( 'blocks.exception' )
        .provider ( 'exceptionHandler', exceptionHandlerProvider )
        .config ( config );

    function exceptionHandlerProvider () {

        /* jshint validthis:true */
        this.config = {
            appErrorPrefix : undefined
        };

        this.configure = function ( appErrorPrefix ) {
            this.config.appErrorPrefix = appErrorPrefix;
        };

        this.$get = function () {
            return {config : this.config};
        };
    }

    /*@ngInject*/
    function config ( $provide ) {
        $provide.decorator ( '$exceptionHandler', extendExceptionHandler );
    }
    config.$inject = ['$provide'];

    /*@ngInject*/
    function extendExceptionHandler ( $delegate, exceptionHandler, logservice ) {
        return function ( exception, cause ) {
            var appErrorPrefix = exceptionHandler.config.appErrorPrefix || '';
            var errorData = {exception : exception, cause : cause};
            exception.message = appErrorPrefix + exception.message;
            $delegate ( exception, cause );
            /**
             * Could add the error to a service's collection,
             * add errors to $rootScope, log errors to remote web server,
             * or log locally. Or throw hard. It is entirely up to you.
             * throw exception;
             *
             * @example
             *     throw { message: 'error message we added' };
             */
            logservice.error ( exception.message, errorData );
        };
    }
    extendExceptionHandler.$inject = ['$delegate', 'exceptionHandler', 'logservice'];
} ());

/**
 *  Created by Kikstand, Inc.
 *  Author: Bo Coughlin
 *  Project: kikstand.github.io
 *  File: exception.service
 *  Date: Feb 21 2015
 *  Time: 3:52 PM
 */

(function () {
   'use strict';
    angular.module ( 'blocks.exception' )
        .factory ( 'exception', exception );

    /*@ngInject*/
    function exception ( logservice ) {
        var service = {
            catcher : catcher
        };

        return service;

        function catcher ( msg ) {
            return function ( reason ) {
                logservice.error ( msg, reason );
            };
        }
    }
    exception.$inject = ['logservice'];
} ());

/**
 *  Created by Kikstand, Inc.
 *  Author: Bo Coughlin
 *  Project: kikstand.github.io
 *  File: logservice.js
 *  Date: Feb 21 2015
 *  Time: 3:45 PM
 */

(function () {
    'use strict';
    angular.module ( 'blocks.logservice' )
        .factory ( 'logservice', logservice );

    logservice.$inject = ['$log'];
    /*@ngInject*/
    function logservice ( $log ) {

        var service = {
            flashOn : false,

            error : error,
            info : info,
            success : success,
            warning : warning,

            log : $log
        };

        return service;

        function error ( msg, data, title ) {
            $log.error ( 'Error: ' + msg, data );
        }

        function info ( msg, data, title ) {
            $log.info ( 'Info: ' + msg, data );
        }

        function success ( msg, data, title ) {
            $log.info ( 'Success: ' + msg, data );
        }

        function warning ( msg, data, title ) {
            $log.warn ( 'Warning: ' + msg, data );
        }
    }
} ());

/**
 *  Created by Kikstand, Inc.
 *  Author: Bo Coughlin
 *  Project: kikstand.github.io
 *  File: router-helper.provider
 *  Date: Feb 21 2015
 *  Time: 3:35 PM
 */

(function () {
    'use strict';
    angular.module ( 'blocks.router' )
        .provider ( 'routehelperConfig', routehelperConfig )
        .factory ( 'routehelper', routehelper );

    /*@ngInject*/
    function routehelperConfig () {
        this.config = {};

        this.$get = function () {
            return {
                config : this.config
            };
        };
    }

    routehelper.$inject = [
        '$location', '$rootScope', '$route',
        'logservice', 'routehelperConfig'
    ];

    /*@ngInject*/
    function routehelper ( $location, $rootScope, $route, logservice, routehelperConfig ) {
        var handlingRouteChangeError = false;
        var routeCounts = {
            errors : 0,
            changes : 0
        };

        var routes = [];

        var $routeProvider = routehelperConfig.config.$routeProvider;

        var service = {
            configureRoutes : configureRoutes,
            getRoutes : getRoutes,
            routeCounts : routeCounts
        };

        init ();

        return service;


        function configureRoutes ( routes ) {
            routes.forEach ( function ( route ) {
                route.config.resolve = angular.extend ( route.config.resolve || {}, routehelperConfig.config.resolveAlways );
                $routeProvider.when ( route.url, route.config );
            } );
            $routeProvider.otherwise ( {
                redirectTo : '/login'
            } );
        }

        function handleRoutingErrors () {
            // Route cancellation:
            // On routing error, go to the dashboard.
            // Provide an exit clause if it tries to do it twice.
            $rootScope.$on ( '$routeChangeError', function ( event, current, previous, rejection ) {
                if ( handlingRouteChangeError ) {
                    return;
                }
                routeCounts.errors++;
                handlingRouteChangeError = true;
                var destination = (current && ( current.title || current.name || current.loadedTemplateUrl )) || 'unknown target';
                var msg = 'Error routing to ' + destination + '.' + (rejection.msg || '');
                logservice.warning ( msg, [current] );
                $location.path ( '/login' );
            } );
        }

        function init () {
            handleRoutingErrors ();
            updateDocTitle ();
        }

        function getRoutes () {
            for ( var prop in $route.routes ) {
                if ( $route.routes.hasOwnProperty ( prop ) ) {
                    var route = $route.routes[prop];
                    var isRoute = !!route.title;
                    if ( isRoute ) {
                        routes.push ( route );
                    }
                }
            }
            return routes;
        }

        function updateDocTitle () {
            $rootScope.$on ( '$routeChangeSuccess', function ( event, current, previous ) {
                routeCounts.changes++;
                handlingRouteChangeError = false;
                var title = routehelperConfig.config.docTitle + ' ' + (current.title || '');
                $rootScope.title = title;
            } );
        }
    }
} ());

angular.module("app.core").run(["$templateCache", function($templateCache) {$templateCache.put("app/layout/shell.tpl.html","<div data-ng-controller=\"Shell as vm\"><div data-ng-view></div></div>");}]);