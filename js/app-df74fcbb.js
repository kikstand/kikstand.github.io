(function () {
    'use strict';

    angular
        .module ( 'app', [
        'app.core',
        'app.layout',

        'app.main'
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
      .module ( 'app.main', [] );
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
 *  Project: Kikstand
 *  File: compiler
 *  Date: Jan 31 2015
 *  Time: 4:39 PM
 *
 *  @credits 100% pure AngularJs Material.  Much more elegant than service previously in place and allows for better handling of 'toast-like' elements.
 */

(function () {
   'use strict';
   angular.module ( 'app.core' )
      .service ( 'ksCompiler', ksCompilerService );

   function ksCompilerService ( $q, $http, $injector, $compile, $controller, $templateCache ) {
      /* jshint validthis: true */
      this.compile = function ( options ) {
         var templateUrl = options.templateUrl;
         var template = options.template || '';
         var controller = options.controller;
         var controllerAs = options.controllerAs;
         var resolve = options.resolve || {};
         var locals = options.locals || {};
         var transformTemplate = options.transformTemplate || angular.identity;
         var bindToController = options.bindToController;

         // Take resolve values and invoke them.
         angular.forEach ( resolve, function ( value, key ) {
            if ( angular.isString ( value ) ) {
               resolve[key] = $injector.get ( value );
            }
            else {
               resolve[key] = $injector.invoke ( value );
            }
         } );
         //Add the locals, which are just straight values to inject
         //eg locals: { three: 3 }, will inject three into the controller
         angular.extend ( resolve, locals );

         if ( templateUrl ) {
            resolve.$template = $http.get ( templateUrl, {cache : $templateCache} )
               .then ( function ( response ) {
                  return response.data;
               } );
         }
         else {
            resolve.$template = $q.when ( template );
         }

         // Wait for all the resolves to finish if they are promises
         return $q.all ( resolve ).then ( function ( locals ) {

            var template = transformTemplate ( locals.$template );
            var element = angular.element ( '<div>' ).html ( template.trim () ).contents ();
            var linkFn = $compile ( element );

            //Return a linking function that can be used later when the element is ready
            return {
               locals : locals,
               element : element,
               link : function link ( scope ) {
                  locals.$scope = scope;

                  //Instantiate controller if it exists, because we have scope
                  if ( controller ) {
                     var ctrl = $controller ( controller, locals );
                     if ( bindToController ) {
                        angular.extend ( ctrl, locals );
                     }
                     //See angular-route source for this logic
                     element.data ( '$ngControllerController', ctrl );
                     element.children ().data ( '$ngControllerController', ctrl );

                     if ( controllerAs ) {
                        scope[controllerAs] = ctrl;
                     }
                  }
                  return linkFn ( scope );
               }
            };
         } );

      };
   }
   ksCompilerService.$inject = ['$q', '$http', '$injector', '$compile', '$controller', '$templateCache'];

} ());

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
 *  Project: Kikstand
 *  File: interimElement
 *  Date: Jan 31 2015
 *  Time: 4:44 PM
 *
 *  @credits Another 100% AngularJs Material -- very similar to existing service, but better.
 */

(function () {
   'use strict';
   angular.module ( 'app.core' )
      .provider ( '$interimElement', InterimElementProvider );

   /*@ngInject*/
   function InterimElementProvider () {
      createInterimElementProvider.$get = InterimElementFactory;
      InterimElementFactory.$inject = ['$document', '$q', '$rootScope', '$timeout', '$rootElement', '$animate', 'ksCompiler'];
      return createInterimElementProvider;

      function createInterimElementProvider ( interimFactoryName ) {
         var EXPOSED_METHODS = ['onHide', 'onShow', 'onRemove'];
         var customMethods = {};
         var providerConfig = {
            presets : {}
         };
         var provider = {
            setDefaults : setDefaults,
            addPreset : addPreset,
            addMethod : addMethod,
            $get : factory
         };

         /**
          * all interim elements will come with the 'build' preset
          */
         provider.addPreset ( 'build', {
            methods : ['controller', 'controllerAs', 'resolve',
                       'template', 'templateUrl', 'transformTemplate', 'parent']
         } );

         factory.$inject = ['$interimElement', '$animate', '$injector'];
         return provider;

         /**
          * Save the configured defaults to be used when the factory is instantiated
          */
         function setDefaults ( definition ) {
            providerConfig.optionsFactory = definition.options;
            providerConfig.methods = (definition.methods || []).concat ( EXPOSED_METHODS );
            return provider;
         }

         // Custom methods
         function addMethod ( name, fn ) {
            customMethods[name] = fn;
            return provider;
         }

         /**
          * Save the configured preset to be used when the factory is instantiated
          */
         function addPreset ( name, definition ) {
            definition = definition || {};
            definition.methods = definition.methods || [];
            definition.options = definition.options || function () {
               return {};
            };

            if ( /^cancel|hide|show$/.test ( name ) ) {
               throw new Error ( "Preset '" + name + "' in " + interimFactoryName + " is reserved!" );
            }
            if ( definition.methods.indexOf ( '_options' ) > -1 ) {
               throw new Error ( "Method '_options' in " + interimFactoryName + " is reserved!" );
            }
            providerConfig.presets[name] = {
               methods : definition.methods.concat ( EXPOSED_METHODS ),
               optionsFactory : definition.options,
               argOption : definition.argOption
            };
            return provider;
         }
         /* @ngInject */
         function factory ( $interimElement, $animate, $injector ) {
            var defaultMethods;
            var defaultOptions;
            var interimElementService = $interimElement ();

            /*
             * publicService is what the developer will be using.
             * It has methods hide(), cancel(), show(), build(), and any other
             * presets which were set during the config phase.
             */
            var publicService = {
               hide : interimElementService.hide,
               cancel : interimElementService.cancel,
               show : showInterimElement
            };

            defaultMethods = providerConfig.methods || [];
            // This must be invoked after the publicService is initialized
            defaultOptions = invokeFactory ( providerConfig.optionsFactory, {} );

            angular.forEach ( customMethods, function ( fn, name ) {
               publicService[name] = fn;
            } );

            angular.forEach ( providerConfig.presets, function ( definition, name ) {
               var presetDefaults = invokeFactory ( definition.optionsFactory, {} );
               var presetMethods = (definition.methods || []).concat ( defaultMethods );

               // Every interimElement built with a preset has a field called `$type`,
               // which matches the name of the preset.
               // Eg in preset 'confirm', options.$type === 'confirm'
               angular.extend ( presetDefaults, {
                  $type : name
               } );

               // This creates a preset class which has setter methods for every
               // method given in the `.addPreset()` function, as well as every
               // method given in the `.setDefaults()` function.
               // Set values will be passed to the options when interimElement.show() is called.
               function Preset ( opts ) {
                  this._options = angular.extend ( {}, presetDefaults, opts );
               }

               angular.forEach ( presetMethods, function ( name ) {
                  Preset.prototype[name] = function ( value ) {
                     this._options[name] = value;
                     return this;
                  };
               } );

               // Create shortcut method for one-linear methods
               if ( definition.argOption ) {
                  var methodName = 'show' + name.charAt ( 0 ).toUpperCase () + name.slice ( 1 );
                  publicService[methodName] = function ( arg ) {
                     var config = publicService[name] ( arg );
                     return publicService.show ( config );
                  };
               }

               // eg x.alert() will return a new alert preset
               publicService[name] = function ( arg ) {
                  // If argOption is supplied, eg `argOption: 'content'`,
                  // if the argument is not an options object then it is the `argOption` option .
                  //
                  // @example `$mdToast.simple('hello')` // sets options.content to hello
                  //                                     // because argOption === 'content'
                  if ( arguments.length && definition.argOption && !angular.isObject ( arg ) && !angular.isArray ( arg ) ) {
                     return (new Preset ())[definition.argOption] ( arg );
                  }
                  else {
                     return new Preset ( arg );
                  }

               };
            } );

            return publicService;

            function showInterimElement ( opts ) {
               // opts is either a preset which stores its options on an _options field,
               // or just an object made up of options
               if ( opts && opts._options ) {
                  opts = opts._options;
               }
               return interimElementService.show (
                  angular.extend ( {}, defaultOptions, opts )
               );
            }

            /**
             * Helper to call $injector.invoke with a local of the factory name for
             * this provider.
             * If a Dialog is providing options for a dialog and tries to inject
             * Dialog, a circular dependency error will happen.
             * We get around that by manually injecting Dialog as a local.
             */
            function invokeFactory ( factory, defaultVal ) {
               var locals = {};
               locals[interimFactoryName] = publicService;
               return $injector.invoke ( factory || function () {
                  return defaultVal;
               }, {}, locals );
            }

         }

      }

      /* @ngInject */
      function InterimElementFactory ( $document, $q, $rootScope, $timeout, $rootElement, $animate, ksCompiler ) {

         return function createInterimElementService () {
            /*
             * @description
             * A service used to control inserting and removing an element into the DOM.
             *
             */
            var stack = [];
            var service;
            return service = {
               show : show,
               hide : hide,
               cancel : cancel
            };

            /*
             * Adds the `$interimElement` to the DOM and returns a promise that will be resolved or rejected
             * with hide or cancel, respectively.
             *
             * @param {*} options is hashMap of settings
             * @returns a Promise
             *
             */
            function show ( options ) {
               if ( stack.length ) {
                  service.cancel ();
               }

               var interimElement = new InterimElement ( options );

               stack.push ( interimElement );
               return interimElement.show ().then ( function () {
                  return interimElement.deferred.promise;
               } );
            }

            /*
             * Removes the `interimElement` from the DOM and resolves the promise returned from `show`
             * @param {*} resolveParam Data to resolve the promise with
             * @returns a Promise that will be resolved after the element has been removed.
             *
             */
            function hide ( response ) {
               var interimElement = stack.shift ();
               interimElement && interimElement.remove ().then ( function () {
                  interimElement.deferred.resolve ( response );
               } );

               return interimElement ? interimElement.deferred.promise : $q.when ( response );
            }

            /*
             * Removes `interimElement` from the DOM and rejects the promise returned from `show`
             */
            function cancel ( reason ) {
               var interimElement = stack.shift ();
               interimElement && interimElement.remove ().then ( function () {
                  interimElement.deferred.reject ( reason );
               } );

               return interimElement ? interimElement.deferred.promise : $q.reject ( reason );
            }

            /*
             * Internal Interim Element Object
             * Used internally to manage the DOM element and related data
             */
            function InterimElement ( options ) {
               var self;
               var hideTimeout, element;

               options = options || {};
               options = angular.extend ( {
                  scope : options.scope || $rootScope.$new ( options.isolateScope ),
                  onShow : function ( scope, element, options ) {
                     return $animate.enter ( element, options.parent );
                  },
                  onRemove : function ( scope, element, options ) {
                     // Element could be undefined if a new element is shown before
                     // the old one finishes compiling.
                     return element && $animate.leave ( element ) || $q.when ();
                  }
               }, options );

               return self = {
                  options : options,
                  deferred : $q.defer (),
                  show : function () {
                     return ksCompiler.compile ( options ).then ( function ( compileData ) {
                        angular.extend ( compileData.locals, self.options );

                        // Search for parent at insertion time, if not specified
                        if ( angular.isString ( options.parent ) ) {
                           options.parent = angular.element ( $document[0].querySelector ( options.parent ) );
                        }
                        else if ( !options.parent ) {
                           options.parent = $rootElement.find ( 'body' );
                           if ( !options.parent.length ) {
                              options.parent = $rootElement;
                           }
                        }

                        element = compileData.link ( options.scope );
                        var ret = options.onShow ( options.scope, element, options );
                        return $q.when ( ret )
                           .then ( function () {
                           // Issue onComplete callback when the `show()` finishes
                           (options.onComplete || angular.noop) ( options.scope, element, options );
                           startHideTimeout ();
                        } );

                        function startHideTimeout () {
                           if ( options.hideDelay ) {
                              hideTimeout = $timeout ( service.cancel, options.hideDelay );
                           }
                        }
                     } );
                  },
                  cancelTimeout : function () {
                     if ( hideTimeout ) {
                        $timeout.cancel ( hideTimeout );
                        hideTimeout = undefined;
                     }
                  },
                  remove : function () {
                     self.cancelTimeout ();
                     var ret = options.onRemove ( options.scope, element, options );
                     return $q.when ( ret ).then ( function () {
                        options.scope.$destroy ();
                     } );
                  }
               };
            }
         };
      }
   }


} ());

(function () {
   'use strict';

   angular
      .module ( 'app.core' )
      .directive ( 'ksDialog', ksDialogDirective );

   ksDialogDirective.$inject = ['$$rAF'];

   /*@ngInject*/
   function ksDialogDirective ( $$rAF ) {
      var directive = {
         restrict : 'E',
         link : postLink
      };

      return directive;

      function postLink ( scope, elem, attr ) {
         $$rAF ( function () {
            var content = elem[0].querySelector ( 'ks-content' );
            if ( content && content.scrollHeight > content.clientHeight ) {
               elem.addClass ( 'ks-content-overflow' );
            }
         } );
      }
   }
}) ();

/**
 *  Created by Kikstand, Inc.
 *  Author: Bo Coughlin
 *  Project: Kikstand
 *  File: dialog.directive
 *  Date: Feb 05 2015
 *  Time: 11:43 PM
 */

(function () {
    'use strict';
    angular.module ( 'app.core' )
        .provider ( '$ksDialog', ksDialogProvider );
    ksDialogProvider.$inject = ['$interimElementProvider'];
    /*@ngInject*/
    function ksDialogProvider ( $interimElementProvider ) {
        var alertDialogMethods = ['title', 'content', 'ok'];
        advancedDialogOptions.$inject = ['$ksDialog'];
        dialogDefaultOptions.$inject = ['$timeout', '$rootElement', '$compile', '$animate', '$document', 'config', '$$rAF', '$q', '$ksDialog'];
        return $interimElementProvider ( '$ksDialog' )
            .setDefaults ( {
            methods : ['disableParentScroll', 'hasBackdrop', 'clickOutsideToClose', 'escapeToClose', 'targetEvent'],
            options : dialogDefaultOptions
        } )
            .addPreset ( 'alert', {
            methods : ['title', 'content', 'ok'],
            options : advancedDialogOptions
        } )
            .addPreset ( 'confirm', {
            methods : ['title', 'content', 'ok', 'cancel'],
            options : advancedDialogOptions
        } );

        /* @ngInject */
        function advancedDialogOptions ( $ksDialog ) {
            return {
                template : [
                    '<ks-dialog>',
                    '<ks-content>',
                    '<h2>{{ dialog.title }}</h2>',
                    '<p>{{ dialog.content }}</p>',
                    '<div class="card__actions">',
                    '<button class="ks-button ks-button--flat" ng-if="dialog.$type == \'confirm\'" ng-click="dialog.abort()">',
                    '{{ dialog.cancel }}',
                    '</button>',
                    '<button ng-click="dialog.hide()" class="ks-button ks-button--flat">',
                    '{{ dialog.ok }}',
                    '</button>',
                    '</div>',
                    '</ks-content>',
                    '</ks-dialog>'
                ].join ( '' ),
                controller : function ksDialogCtrl () {
                    var vm = this;
                    vm.hide = function () {
                        $ksDialog.hide ( true );
                    };
                    vm.abort = function () {
                        $ksDialog.cancel ();
                    };
                },
                controllerAs : 'dialog',
                bindToController : true
            };
        }

        /* @ngInject */
        function dialogDefaultOptions ( $timeout, $rootElement, $compile, $animate, $document, config, $$rAF, $q, $ksDialog ) {
            return {
                hasBackdrop : true,
                isolateScope : true,
                onShow : onShow,
                onRemove : onRemove,
                clickOutsideToClose : true,
                escapeToClose : true,
                targetEvent : null,
                disableParentScroll : true,
                transformTemplate : function ( template ) {
                    return '<div class="ks-dialog__container">' + template + '</div>';
                }
            };

            function onShow ( scope, element, options ) {
                options.parent = angular.element ( options.parent );
                options.popInTarget = angular.element ( (options.targetEvent || {}).target );

                var closeButton = findCloseButton ();

                if ( options.hasBackdrop ) {
                    var parentOffset = options.parent.prop ( 'scrollTop' );
                    options.backdrop = angular.element ( '<ks-backdrop class="ks-dialog-backdrop">' );
                    $animate.enter ( options.backdrop, options.parent );
                    element.css ( 'top', parentOffset + 'px' );
                }

                if ( options.disableParentScroll ) {
                    options.lastOverflow = options.parent.css ( 'overflow' );
                    options.parent.css ( 'overflow', 'hidden' );
                }

                return dialogPopIn (
                    element,
                    options.parent,
                    options.popInTarget && options.popInTarget.length && options.popInTarget
                )
                    .then ( function () {

                    if ( options.escapeToClose ) {
                        options.rootElementKeyupCallback = function ( e ) {
                            if ( e.keyCode === config.keycodes.ESC ) {
                                $timeout ( $ksDialog.cancel );
                            }
                        };
                        $rootElement.on ( 'keyup', options.rootElementKeyupCallback );
                    }

                    if ( options.clickOutsideToClose ) {
                        options.dialogClickOutsideCallback = function ( ev ) {
                            // Only close if we click the flex container outside the backdrop
                            if ( ev.target === element[0] ) {
                                $timeout ( $ksDialog.cancel );
                            }
                        };
                        element.on ( 'click', options.dialogClickOutsideCallback );
                    }
                    closeButton.focus ();
                } );

                function findCloseButton () {
                    //If no element with class dialog-close, try to find the last button
                    var closeButton = element[0].querySelector ( '.dialog-close' );
                    if ( !closeButton ) {
                        var actionButtons = element[0].querySelectorAll ( '.card_actions button' );
                        closeButton = actionButtons[actionButtons.length - 1];
                    }
                    return angular.element ( closeButton );
                }
            }

            function onRemove ( scope, element, options ) {

                if ( options.backdrop ) {
                    $animate.leave ( options.backdrop );
                }
                if ( options.escapeToClose ) {
                    $rootElement.off ( 'keyup', options.rootElementKeyupCallback );
                }
                if ( options.clickOutsideToClose ) {
                    element.off ( 'click', options.dialogClickOutsideCallback );
                }
                return dialogPopOut (
                    element,
                    options.parent,
                    options.popInTarget && options.popInTarget.length && options.popInTarget
                ).then ( function () {
                    options.scope.$destroy ();
                    element.remove ();
                    options.popInTarget && options.popInTarget.focus ();
                } );
            }

            function dialogPopIn ( container, parentElement, clickElement ) {
                var dialogEl = container.find ( 'ks-dialog' );
                parentElement.append ( container );
                //transformToClickElement ( dialogEl, clickElement );

                $$rAF ( function () {
                    dialogEl.addClass ( 'transition-in' );
                } );

                return $q.when ( dialogEl );

            }

            function dialogPopOut ( container, parentElement ) {
                var dialogEl = container.find ( 'ks-dialog' );

                dialogEl.addClass ( 'transition-out' ).removeClass ( 'transition-in' );

                return $q.when ( dialogEl );
            }


        }
    }
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
 *  File: config.route
 *  Date: Feb 21 2015
 *  Time: 10:13 PM
 */

(function () {
   'use strict';
    angular.module('app.main')
        .run( routeConfig);

    /* @ngInject */
    function routeConfig( routehelper ) {
        routehelper.configureRoutes (getRoutes());
    }
    routeConfig.$inject = ['routehelper'];

    function getRoutes() {
        return [
            {
                url:'/',
                config: {
                    templateUrl: 'app/main/main.tpl.html',
                    controller: 'MainController',
                    controllerAs: 'pageCtrl',
                    title: 'Welcome'
                }
            }
        ]
    }
} ());

(function () {
    'use strict';

    angular
        .module ( 'app.main' )
        .controller ( 'MainController', MainController );

    /* @ngInject */
    function MainController ( $scope ) {
        /* jshint validthis: true */
        var vm = this;

        vm.activate = activate;
        vm.title = 'main';

        activate ();

        ////////////////

        function activate () {

        }
    }
    MainController.$inject = ['$scope'];
}) ();

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

angular.module("app.core").run(["$templateCache", function($templateCache) {$templateCache.put("app/layout/shell.tpl.html","<div data-ng-controller=\"Shell as vm\"><section class=intro style=\"background-image: url(assets/images/intro-bg.png);\"><div class=container><div class=column-wrap><div class=\"column c-left\"><div class=navi><div class=\"nav-toggle nav-toggle-float\" data-offcanvas=open><span class=\"waves-effect waves-light\"><i class=flaticon-menu55></i></span></div><a href=# data-toggle=modal data-target=#signin-page data-modal-form=sign-in>Sign in</a></div><a href=#features class=\"scroll-more scroll\" data-offset-top=-5><i class=icon></i> <span>Scroll for more</span></a></div><div class=\"column c-middle\"><h1 class=logo><img src=assets/images/logo-big.png alt=\"Appica 2\"> Appica 2 <span>Flatter, lighter, droider, stronger</span></h1><div class=phone><img src=assets/images/screen.png alt=\"App Screen\"></div></div><div class=\"column c-right\"><div class=\"social-buttons text-right\"><a href=# class=sb-twitter><i class=bi-twitter></i></a> <a href=# class=sb-google-plus><i class=bi-gplus></i></a> <a href=# class=sb-facebook><i class=bi-facebook></i></a></div><div class=intro-features><div class=\"icon-block icon-block-horizontal box-float\" data-transition-delay=100><div class=\"icon va-middle\"><i class=flaticon-screen47></i></div><div class=text><h3>Thought-out UX</h3><p>Lorem ipsum dolor sit amet, consectetur adipisicing elit.</p></div></div><div class=\"icon-block icon-block-horizontal box-float\" data-transition-delay=300><div class=\"icon va-middle\"><i class=flaticon-cloud302></i></div><div class=text><h3>Cloud Storage</h3><p>Lorem ipsum dolor sit amet, consectetur adipisicing elit.</p></div></div><div class=\"icon-block icon-block-horizontal box-float\" data-transition-delay=500><div class=\"icon va-middle\"><i class=flaticon-magic20></i></div><div class=text><h3>Smart Design</h3><p>Lorem ipsum dolor sit amet, consectetur adipisicing elit.</p></div></div></div><div class=download><p>Phone and tablet versions</p><a href=# class=\"btn btn-default btn-float waves-effect btn-google-play\"><span>Get it on</span></a></div></div></div></div></section><div class=content-wrap><div data-ng-view></div></div></div>");
$templateCache.put("app/main/main.tpl.html","<header class=\"navbar navbar-sticky\"><div class=container><div class=\"nav-toggle waves-effect waves-light waves-circle\" data-offcanvas=open><i class=flaticon-menu55></i></div><a href=# class=\"logo scrollup\"><img src=assets/images/logo-small.png alt=\"Appica 2\"> Appica 2</a><div class=toolbar><a href=# class=\"btn btn-flat btn-light icon-left waves-effect waves-light\"><i class=flaticon-download164></i> Download</a> <a href=# data-toggle=modal data-target=#signin-page data-modal-form=sign-in class=action-btn>Sign in</a><div class=\"social-buttons text-right\"><a href=# class=sb-twitter><i class=bi-twitter></i></a> <a href=# class=sb-google-plus><i class=bi-gplus></i></a> <a href=# class=sb-facebook><i class=bi-facebook></i></a></div></div></div></header><section class=\"fw-bg bg-align-bottom\" style=\"background-image: url(assets/images/circles-25.jpg);\" id=features><div class=feature-tabs><div class=\"block-heading visible-when-stack\"><h2>Why is it special?</h2><span>Look what this app has to offer</span></div><div class=clearfix><div class=devices><div class=tablet><img src=assets/images/tablet.png alt=Tablet> <img class=reflection src=assets/images/tablet-reflection.png alt=Reflection><div class=mask><ul class=screens><li class=\"active in\" id=ts01><img src=assets/images/tablet.png alt=\"Screen 01\"></li><li id=ts02><img src=assets/images/tablet.png alt=\"Screen 02\"></li><li id=ts03><img src=assets/images/tablet.png alt=\"Screen 03\"></li><li id=ts04><img src=assets/images/tablet.png alt=\"Screen 04\"></li></ul></div></div><div class=phone><img src=assets/images/iphone.png alt=iPhone><div class=mask><ul class=screens><li class=\"active in\" id=ps01><img src=assets/images/iphone.png alt=\"Screen 01\"></li><li id=ps02><img src=assets/images/iphone.png alt=\"Screen 02\"></li><li id=ps03><img src=assets/images/iphone.png alt=\"Screen 03\"></li><li id=ps04><img src=assets/images/iphone.png alt=\"Screen 04\"></li></ul></div></div></div><div class=\"tabs text-center\"><div class=\"block-heading hidden-when-stack\"><h2>Why is it special?</h2><span>Look what this app has to offer</span></div><ul class=nav-tabs data-autoswitch=true data-interval=3000><li class=active><a href=#video-player data-toggle=tab data-tablet=#ts01 data-phone=#ps01><i class=flaticon-black397></i></a></li><li><a href=#settings data-toggle=tab data-tablet=#ts02 data-phone=#ps02><i class=flaticon-settings49></i></a></li><li><a href=#file-sharing data-toggle=tab data-tablet=#ts03 data-phone=#ps03><i class=flaticon-share39></i></a></li><li><a href=#chat data-toggle=tab data-tablet=#ts04 data-phone=#ps04><i class=flaticon-chat75></i></a></li></ul><div class=tab-content><div class=\"tab-pane transition scale fade in active\" id=video-player><h3>Built-in video player</h3><p>Lorem ipsum dolor sit amet, consectetur adipisicing elit. Eos iste distinctio sed architecto rem sapiente atque itaque soluta quisquam at ex praesentium sed exercitationem.</p></div><div class=\"tab-pane transition scale fade\" id=settings><h3>Advanced settings</h3><p>Lorem ipsum dolor sit amet, consectetur adipisicing elit. Eos iste distinctio sed architecto rem sapiente atque itaque soluta quisquam at ex praesentium sed exercitationem.</p></div><div class=\"tab-pane transition scale fade\" id=file-sharing><h3>Easy file sharing</h3><p>Lorem ipsum dolor sit amet, consectetur adipisicing elit. Eos iste distinctio sed architecto rem sapiente atque itaque soluta quisquam at ex praesentium sed exercitationem.</p></div><div class=\"tab-pane transition scale fade\" id=chat><h3>Built-in chat</h3><p>Lorem ipsum dolor sit amet, consectetur adipisicing elit. Eos iste distinctio sed architecto rem sapiente atque itaque soluta quisquam at ex praesentium sed exercitationem.</p></div></div></div></div></div><hr class=with-shadow><div class=\"container padding-bottom-2x\"><div class=\"badge badge-success badge-reverse\">No other app has this <span class=icon><i class=flaticon-bookmark45></i></span></div><div class=row><div class=\"col-lg-10 col-lg-offset-1\"><div class=row><div class=col-sm-6><div class=\"icon-block icon-block-horizontal\"><div class=\"text text-right\"><h3>Handcrafted UX</h3><p>Lorem ipsum dolor sit amet, consectetur adipisicing elit. Quas harum a aperiam pariatur totam impedit, sint quibusdam minus deserunt labore ipsum commodo.</p><a href=# class=link>See more</a></div><div class=\"icon icon-bigger va-middle\"><i class=flaticon-screen47></i></div></div></div><div class=col-md-6><div class=\"icon-block icon-block-horizontal\"><div class=\"icon icon-bigger va-middle\"><i class=flaticon-magic20></i></div><div class=text><h3>Smart Design</h3><p>Lorem ipsum dolor sit amet, consectetur adipisicing elit. Quas harum a aperiam pariatur totam impedit, sint quibusdam minus deserunt labore ipsum commodo.</p><a href=# class=link>See more</a></div></div></div></div><div class=row><div class=col-sm-6><div class=\"icon-block icon-block-horizontal\"><div class=\"text text-right\"><h3>Free Cloud Storage</h3><p>Lorem ipsum dolor sit amet, consectetur adipisicing elit. Quas harum a aperiam pariatur totam impedit, sint quibusdam minus deserunt labore ipsum commodo.</p><a href=# class=link>See more</a></div><div class=\"icon icon-bigger va-middle\"><i class=flaticon-cloud304></i></div></div></div><div class=col-md-6><div class=\"icon-block icon-block-horizontal\"><div class=\"icon icon-bigger va-middle\"><i class=flaticon-camera59></i></div><div class=text><h3>Easy Photo Sharing</h3><p>Lorem ipsum dolor sit amet, consectetur adipisicing elit. Quas harum a aperiam pariatur totam impedit, sint quibusdam minus deserunt labore ipsum commodo.</p><a href=# class=link>See more</a></div></div></div></div></div></div></div></section><section class=\"fw-bg top-inner-shadow gallery padding-top-3x padding-bottom-3x\" id=gallery style=\"background-color: #00b8d6;\"><div class=container><div class=row><div class=\"col-md-3 col-sm-4\"><div class=\"block-heading light-color text-right\"><h2>App Gallery</h2><span>The best way to show off</span></div><div class=text-right><div class=\"padding-top-2x hidden-sm hidden-xs\"></div><ul class=\"nav-tabs alt-tabs nav-vertical\"><li class=active><a class=waves-effect href=#screens data-toggle=tab>App Screenshots</a></li><li><a class=waves-effect href=#video-prev data-toggle=tab>Video Preview</a></li><li><a class=waves-effect href=#proto data-toggle=tab>Prototype</a></li></ul></div></div><div class=\"col-lg-8 col-lg-offset-1 col-md-9 col-sm-8\"><div class=tab-content><div class=\"tab-pane fade in active\" id=screens><div class=\"scroller app-gallery light-color\"><div class=item><a href=assets/images/01.png class=waves-effect><img src=assets/images/th01.png alt=Thumbnail></a></div><div class=item><a href=assets/images/02.png class=waves-effect><img src=assets/images/th02.png alt=Thumbnail></a> <a href=assets/images/02.png class=waves-effect><img src=assets/images/th02.png alt=Thumbnail></a></div><div class=item><a href=assets/images/01.png class=waves-effect><img src=assets/images/th01.png alt=Thumbnail></a></div><div class=item><a href=assets/images/02.png class=waves-effect><img src=assets/images/th02.png alt=Thumbnail></a> <a href=assets/images/02.png class=waves-effect><img src=assets/images/th02.png alt=Thumbnail></a></div></div></div><div class=\"tab-pane fade\" id=video-prev><div class=\"embed-responsive embed-responsive-16by9\"><iframe class=embed-responsive-item src=\"//player.vimeo.com/video/113575647?title=0&amp;byline=0&amp;portrait=0&amp;color=008fed\" width=500 height=281 allowfullscreen=\"\"></iframe></div></div><div class=\"tab-pane fade\" id=proto><img src=assets/images/prototype.png alt=Prototype></div></div></div></div></div></section><section class=\"fw-bg bg-align-bottom video-block\" style=\"background-image: url(assetso/images/video-bg.png);\" id=video><div class=container><a class=video-popup href=http://vimeo.com/113575647><i class=flaticon-play107></i> Video Presentation</a></div></section><section class=\"fw-bg top-inner-shadow padding-top-3x padding-bottom-3x\" id=posts style=\"background-color: #96cb4b;\"><div class=container><div class=row><div class=\"col-md-3 col-sm-4\"><div class=\"block-heading text-right light-color\"><h2>Happy Posts</h2><span>Make people read</span></div><div class=text-right><a href=# class=\"text-smaller light-color\">All Posts</a></div><div class=twitter-feed><div class=\"tweet tweet-float\"><a href=# class=author>@bedismo</a><p>Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod... <a href=#>#magna aliqua</a>.</p></div><div class=\"tweet tweet-float\"><a href=# class=author>@bedismo</a><p>Sed ut perspiciatis unde omnis iste natus error sit.</p></div><div class=text-right><a href=# class=\"text-smaller light-color\">Follow us on twitter</a></div></div><div class=\"space-bottom-2x visible-xs\"></div></div><div class=\"col-lg-8 col-lg-offset-1 col-md-9 col-sm-8\"><div class=\"scroller light-color posts\"><div class=item><div class=post-tile><a href=# class=\"post-thumb waves-effect\"><img src=assets/images/thumb.png alt=\"Great Interactions\"></a><div class=post-body><div class=post-title><a href=#><h3>Great Interactions</h3></a> <span>Support Android 5.0 Lollipop</span></div></div></div></div><div class=item><div class=post-tile><a href=# class=\"post-thumb waves-effect\"><img src=assets/images/thumb.png alt=\"Smart Keyboard\"></a><div class=post-body><div class=post-title><a href=blog-single.html><h3>Smart Keyboard</h3></a> <span>Easily switch between keyboards</span></div></div></div></div><div class=item><div class=post-tile><a href=# class=\"post-thumb waves-effect\"><img src=assets/images/thumb.png alt=\"Interactions Map\"></a><div class=post-body><div class=post-title><a href=blog-single.html><h3>Light Interface</h3></a> <span>Pleasant to touch</span></div></div></div></div><div class=item><div class=post-tile><a href=# class=\"post-thumb waves-effect\"><img src=assets/images/thumb.png alt=\"Interactions Map\"></a><div class=post-body><div class=post-title><a href=blog-single.html><h3>Share Your Moments</h3></a> <span>App that helps to share emotions</span></div></div></div></div></div></div></div></div></section><section class=\"split-block img-left\" id=app-story><div class=column><img src=assets/images/prototype.png alt=Prototyping></div><div class=column><div class=block-heading><h2>How We Build<br>This Awesome App</h2><span>Little story of app development</span></div><p>Lorem ipsum dolor sit amet, consectetur adipisicing elit. Aut voluptas dolor, neque adipisci ullam. Optio deleniti dolores ex doloribus, incidunt nisi veniam libero.</p><p>Voluptatibus recusandae magni aliquid ratione iste, eum quas incidunt alias molestias asperiores rem temporibus dolore repellat animi dolor, officia voluptates.</p><a href=# class=link>Read full interesting story</a></div></section><section class=\"fw-bg padding-top-3x padding-bottom-2x\" style=\"background-image: url(assets/images/circles-50.jpg);\" id=versions><div class=container><div class=\"block-heading text-center\"><h2>Check other Appica 2 versions</h2><span>They are are cool too, don`t miss it!</span></div><div class=\"row space-top-3x\"><div class=\"col-lg-8 col-lg-offset-2 col-md-10 col-md-offset-1\"><div class=\"row appica-versions\"><div class=col-xs-4><a href=../ios/index.html class=icon-block><div class=icon><img src=assets/images/ios.png alt=\"iOS Version\"></div><div class=text><h3>iOS</h3></div></a></div><div class=col-xs-4><a href=index.html class=icon-block><div class=icon><img src=assets/images/android.png alt=\"Android Version\"></div><div class=text><h3>Android</h3></div></a></div><div class=col-xs-4><div class=icon-block><div class=icon><img src=assets/images/universal.png alt=\"Universal Version\"></div><div class=text><h3>Universal</h3><span>Coming soon</span></div></div></div></div></div></div></div></section><section class=\"padding-top-3x space-bottom-3x\" id=figures><div class=container><div class=row><div class=col-sm-6><div class=\"block-heading text-right\"><h2>We Made Great App</h2><span>Optimization. Performance. Popularity</span></div><div class=\"row space-bottom\"><div class=\"col-lg-8 col-md-10 col-lg-offset-4 col-md-offset-2\"><p class=text-right>Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p></div></div><ul class=\"nav-tabs text-right\"><li class=active><a class=\"waves-effect waves-primary\" href=#speed data-toggle=tab>Loading Speed</a></li><li><a class=\"waves-effect waves-primary\" href=#downloads data-toggle=tab>Downloads</a></li><li><a class=\"waves-effect waves-primary\" href=#share data-toggle=tab>Market Share</a></li></ul></div><div class=col-sm-6><div class=tab-content><div class=\"tab-pane transition scale fade in active\" id=speed><img src=assets/images/speed.png alt=\"Loading Speed\"></div><div class=\"tab-pane transition right fade\" id=downloads><img src=assets/images/downloads.png alt=Downloads></div><div class=\"tab-pane transition flip fade\" id=share><img src=assets/images/share.png alt=\"Market Share\"></div></div></div></div></div></section><section class=space-top id=reviews><hr><div class=\"container padding-bottom\"><div class=\"badge badge-success\"><span class=icon><i class=flaticon-receipt9></i></span> Big boys about us</div><div class=row><div class=col-sm-4><div class=press-review><img src=assets/images/times.png alt=\"New Odessa Times\"><h3>New Odessa Times</h3><p>Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam quis.</p></div></div><div class=col-sm-4><div class=press-review><img src=assets/images/navigator.png alt=Navigator><h3>Navigator</h3><p>Ut enim ad minim veniam, quis nostrud exercitation.</p></div></div><div class=col-sm-4><div class=press-review><img src=assets/images/appicavillage.png alt=Appicavillage><h3>Appicavillage</h3><p>Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p></div></div></div><div class=row><div class=col-sm-4><div class=press-review><img src=assets/images/taptap.png alt=\"Tap-Tap Time\"><h3>Tap-Tap Time</h3><p>Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam quis.</p></div></div><div class=col-sm-4><div class=press-review><img src=assets/images/icaravely.png alt=iCaravely><h3>iCaravely</h3><p>Ut enim ad minim veniam, quis nostrud exercitation.</p></div></div><div class=col-sm-4><div class=press-review><img src=assets/images/moodesign.png alt=MooDesign><h3>MooDesign</h3><p>Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p></div></div></div></div></section><section class=\"fw-gray-bg padding-top-3x\" id=team><div class=container><div class=row><div class=col-sm-6><p class=text-smaller>Lorem ipsum dolor sit amet, consectetur adipisicing elit. Eligendi delectus recusandae ducimus, voluptates sequi laborum atque odio inventore iusto. Accusantium vel molestiae quo quam praesentium.</p></div><div class=\"col-lg-4 col-lg-offset-2 col-md-5 col-md-offset-1 col-sm-6\"><div class=block-heading><h2>Our Dream Team</h2><span>People behind this app</span></div></div></div><div class=\"row space-top-3x\"><div class=\"col-sm-4 team-member\"><h3>The Good</h3><span>CEO</span><div class=social-buttons><a href=# class=sb-twitter><i class=bi-twitter></i></a> <a href=# class=sb-google-plus><i class=bi-gplus></i></a> <a href=# class=sb-facebook><i class=bi-facebook></i></a></div><img src=assets/images/good.png alt=\"The Good\"></div><div class=\"col-sm-4 team-member\"><h3>The Bad</h3><span>IT Consultant</span><div class=social-buttons><a href=# class=sb-github><i class=bi-github></i></a> <a href=# class=sb-stackoverflow><i class=bi-stackoverflow></i></a> <a href=# class=sb-google-plus><i class=bi-gplus></i></a></div><img src=assets/images/bad.png alt=\"The Bad\"></div><div class=\"col-sm-4 team-member\"><h3>The Smiley</h3><span>Senior Web Designer</span><div class=social-buttons><a href=# class=sb-behance><i class=bi-behance></i></a> <a href=# class=sb-dribbble><i class=bi-dribbble></i></a> <a href=# class=sb-twitter><i class=bi-twitter></i></a></div><img src=assets/images/smiley.png alt=\"The Smiley\"></div></div></div></section><section class=\"fw-bg bottom-shadow padding-top-3x padding-bottom-2x\" id=pricing style=\"background-color: #008fed; z-index: 1;\"><div class=\"container light-color\"><div class=\"pricing-plan-switcher text-right\"><div class=label>Choose a plan you need</div><label class=\"radio-inline radio-alt\"><input type=radio name=plan id=plan01 checked> Monthly</label> <label class=\"radio-inline radio-alt\"><input type=radio name=plan id=plan02> Yearly</label> <span>Save 20%</span></div><div class=\"row space-top-2x\"><div class=col-sm-4><div class=pricing-plan><div class=icon><i class=flaticon-notifications1></i></div><div class=pricing-plan-title><span class=name>Starter Plan</span> Free <span class=period>/mo</span></div><a href=# class=\"btn btn-block btn-success btn-float waves-effect waves-light\">Sign Up</a><ul class=pricing-plan-description><li>1GB</li><li>E-mail</li></ul></div></div><div class=col-sm-4><div class=\"pricing-plan pricing-plan-float pricing-plan-success\"><div class=icon><i class=flaticon-graduate32></i></div><div class=pricing-plan-title><span class=name>For Students</span> $3.99 <span class=period>/mo</span></div><a href=# class=\"btn btn-block btn-default btn-float waves-effect\">Get</a><ul class=pricing-plan-description><li>5GB</li><li>Personal E-mail</li><li>Support 24/7</li><li>1 User</li></ul></div></div><div class=col-sm-4><div class=\"pricing-plan pricing-plan-float\"><div class=icon><i class=flaticon-screen47></i></div><div class=pricing-plan-title><span class=name>Web Agencies</span> $10.99 <span class=period>/mo</span></div><a href=# class=\"btn btn-block btn-success btn-float waves-effect waves-light\">Request</a><ul class=pricing-plan-description><li>10GB</li><li>Personal server</li><li>Premium Support</li><li>10 Users</li></ul></div></div></div></div></section><section class=\"fw-bg bottom-shadow padding-top-3x padding-bottom-2x\" style=\"background-color: #199aef;\" id=web-app><div class=\"container light-color\"><div class=row><div class=col-md-5><div class=\"block-heading text-right\"><h2>Web Interface</h2><span>Our app right in your browser</span></div></div></div><div class=\"row space-top-2x\"><div class=col-md-5><div class=\"icon-block icon-block-horizontal\"><div class=\"icon hidden-xs\"><i class=flaticon-earth205></i></div><div class=text><h3>Full Featured Web App</h3><p>Lorem ipsum dolor sit amet, consectetur adipisicing elit. Quas harum a aperiam pariatur totam impedit, sint quibusdam minus deserunt labore ipsum commodo. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa.</p><p class=space-top>Web Version</p><a href=# class=\"btn btn-success btn-float waves-effect waves-light btn-lg\">Visit Web Version</a></div></div></div><div class=col-md-7><img src=assets/images/macbook.png alt=\"Web App\"></div></div></div></section>");}]);