// IdxDisclaimer Component
// @stratusjs/idx/disclaimer/disclaimer.component
// <stratus-idx-disclaimer>
// --------------

// Runtime
import _ from 'lodash'
import {Stratus} from '@stratusjs/runtime/stratus'
import * as angular from 'angular'

// Services
import '@stratusjs/angularjs/services/model'

// Stratus Dependencies
import {isJSON} from '@stratusjs/core/misc'
import {cookie} from '@stratusjs/core/environment'
import {IdxComponentScope, IdxEmitter, IdxService, MLSService} from '@stratusjs/idx/idx'
import moment from 'moment'

// Environment
const min = !cookie('env') ? '.min' : ''
const packageName = 'idx'
const moduleName = 'disclaimer'
const componentName = 'disclaimer'
// There is not a very consistent way of pathing in Stratus at the moment
const localDir = `${Stratus.BaseUrl}${Stratus.DeploymentPath}@stratusjs/${packageName}/src/${moduleName}/`

export interface CleanService extends MLSService {
    disclaimerString?: string
    disclaimerHTML?: any
}

export type IdxDisclaimerScope = IdxComponentScope & {
    initialized: boolean
    onWatchers: (() => void)[]

    service?: number | number[]
    type: 'Property' | 'Media' | 'Member' | 'Office' | 'OpenHouse'
    modificationTimestamp?: Date
    hideOnDuplicate?: boolean

    alwaysShow: boolean
    hideMe: boolean
    idxService: CleanService[]

    getMLSVariables(reset?: boolean): MLSService[]
    processMLSDisclaimer(reset?: boolean): void
}

Stratus.Components.IdxDisclaimer = {
    bindings: {
        elementId: '@',
        initNow: '=',
        service: '@',
        type: '@',
        hideOnDuplicate: '@',
        modificationTimestamp: '=',
    },
    controller(
        // $anchorScroll: angular.IAnchorScrollService,
        $attrs: angular.IAttributes,
        $sce: angular.ISCEService,
        $scope: IdxDisclaimerScope,
        Idx: IdxService,
    ) {
        // Initialize
        const $ctrl = this
        $ctrl.uid = _.uniqueId(_.camelCase(packageName) + '_' + _.camelCase(componentName) + '_')
        Stratus.Instances[$ctrl.uid] = $scope
        $scope.elementId = $attrs.elementId || $ctrl.uid
        $scope.initialized = false
        $scope.onWatchers = []
        $scope.service = $attrs.service && isJSON($attrs.service) ? JSON.parse($attrs.service) : []
        $scope.idxService = []
        $scope.type = $attrs.type ? JSON.parse($attrs.type) : 'Property'
        // FIXME if type !'Property' | 'Media' | 'Member' | 'Office' | 'OpenHouse', revert to Property
        // FIXME can later use this for last time checks
        $scope.alwaysShow = typeof $attrs.hideOnDuplicate === 'undefined'
        Stratus.Internals.CssLoader(`${localDir}${$attrs.template || componentName}.component${min}.css`)

        /**
         * All actions that happen first when the component loads
         * Needs to be placed in a function, as the functions below need to the initialized first
         */
        const init = async () => {
            // Register this Disclaimer with the IDX service
            Idx.registerDisclaimerInstance($scope.elementId, $scope)

            Idx.on('Idx', 'sessionInit', () => {
                if (!$scope.initialized) {
                    $scope.processMLSDisclaimer()
                    $scope.initialized = true
                }
                // This only gets called once
                Idx.on('Idx', 'fetchTimeUpdate', (scope: null, serviceId, modelName, fetchTime) => {
                    $scope.processMLSDisclaimer(true)
                    // console.log('Fetch Times have updated!!!', serviceId, modelName, fetchTime)
                })
            })
            Idx.on('Idx', 'sessionRefresh', () => {
                $scope.processMLSDisclaimer(true)
                $scope.initialized = true
            })

            $scope.$watch('$ctrl.hideOnDuplicate', (hideOnDuplicate) => {
                // console.log('$ctrl.hideOnDuplicate raw is', hideOnDuplicate, '$attrs.hideOnDuplicate is', $attrs.hideOnDuplicate)
                if (typeof $attrs.hideOnDuplicate !== 'undefined') {
                    $scope.alwaysShow = false
                    if (hideOnDuplicate !== true) {
                        // Check if if a raw value
                        $scope.hideOnDuplicate =
                            $attrs.hideOnDuplicate ? (_.isString($attrs.hideOnDuplicate) && isJSON($attrs.hideOnDuplicate) ?
                                JSON.parse($attrs.hideOnDuplicate) : false) : false
                    } else {
                        $scope.hideOnDuplicate = hideOnDuplicate || false
                    }

                    $scope.$applyAsync(() => {
                        $scope.hideMe = false
                        if ($scope.hideOnDuplicate) {
                            // console.log('$ctrl.hideOnDuplicate detects true looking for main disclaimer')
                            // check if there is a duplicate disclaimer showing
                            const instances = Idx.getDisclaimerInstance()
                            Object.keys(instances).forEach((elementId: string) => {
                                if (
                                    elementId !== $scope.elementId && // don't let it be yourself
                                    instances[elementId].alwaysShow === true && // We need to ensure this always stays here
                                    (
                                        instances[elementId].modificationTimestamp === null || // This needs to be a Global, not single
                                        _.isUndefined(instances[elementId].modificationTimestamp)
                                    )
                                ) {
                                    // console.log($scope.elementId, 'found a master disclaimer at', elementId)
                                    $scope.hideMe = true
                                } /*else {
                                    console.log(elementId, 'is bad', instances[elementId])
                                    if (elementId === $scope.elementId) {
                                        console.log('elementId === $scope.elementId')
                                    }
                                    if (instances[elementId].alwaysShow !== true) {
                                        console.log('instances[elementId].alwaysShow !== true')
                                    }
                                    if (instances[elementId].modificationTimestamp !== null) {
                                        console.log('instances[elementId].modificationTimestamp !== null')
                                    }
                                }*/
                            })
                        }
                    })
                }
            })

            Idx.emit('init', $scope)
        }

        $ctrl.$onInit = () => {
            $scope.Idx = Idx

            let initNow = true
            if (Object.prototype.hasOwnProperty.call($attrs.$attr, 'initNow')) {
                // TODO: This needs better logic to determine what is acceptably initialized
                initNow = isJSON($attrs.initNow) ? JSON.parse($attrs.initNow) : false
            }

            if (initNow) {
                init()
                return
            }

            $ctrl.stopWatchingInitNow = $scope.$watch('$ctrl.initNow', (initNowCtrl: boolean) => {
                // console.log('CAROUSEL initNow called later')
                if (initNowCtrl !== true) {
                    return
                }
                if (!$scope.initialized) {
                    init()
                }
                $ctrl.stopWatchingInitNow()
            })
        }

        /**
         * @param reset - set true to force reset
         */
        $scope.getMLSVariables = (reset?: boolean): MLSService[] => {
            if (!$ctrl.mlsVariables || reset) {
                $ctrl.mlsVariables = []
                let mlsServicesRequested: number[] = null
                // Ensure we are only requesting the services we are using
                if (
                    $scope.service &&
                    (
                        _.isNumber($scope.service) ||
                        !_.isEmpty($scope.service)
                    )
                ) {
                    if (!_.isArray($scope.service)) {
                        $scope.service = [$scope.service]
                    }
                    mlsServicesRequested = $scope.service
                }
                Idx.getMLSVariables(mlsServicesRequested).forEach((service: MLSService) => {
                    $ctrl.mlsVariables[service.id] = service
                })
            }
            return $ctrl.mlsVariables
        }

        /**
         * Process an MLS' required legal disclaimer to later display
         * @param reset - set true to force reset
         * TODO Idx needs to supply MLSVariables interface
         */
        $scope.processMLSDisclaimer = (reset?: boolean): void => {
            const services: MLSService[] = $scope.getMLSVariables(reset)
            $scope.idxService = []
            let disclaimerComplete = ''
            services.forEach(service => {
                let singleDisclaimer = ''

                if (service.fetchTime[$scope.type]) {
                    singleDisclaimer += `Last checked ${moment(service.fetchTime[$scope.type]).format('M/D/YY h:mm a')}. `
                } else if (Idx.getLastSessionTime()) {
                    singleDisclaimer += `Last checked ${moment(Idx.getLastSessionTime()).format('M/D/YY')}. `
                }
                if ($ctrl.modificationTimestamp) {
                    singleDisclaimer += `Listing last updated ${moment($ctrl.modificationTimestamp).format('M/D/YY h:mm a')}. `
                } /*else {
                    console.log('no mod time!')
                }*/
                singleDisclaimer += service.disclaimer
                // disclaimerComplete += service.disclaimer
                if (disclaimerComplete) {
                    disclaimerComplete += '<br>'
                }
                disclaimerComplete += singleDisclaimer // TODO removing soon
                // TODO above was old process. New process below

                const cleanService: CleanService = service
                cleanService.disclaimerString = singleDisclaimer
                cleanService.disclaimerHTML = $sce.trustAsHtml(singleDisclaimer)
                $scope.idxService.push(cleanService)
            })
        }

        $scope.on = (emitterName: string, callback: IdxEmitter) => Idx.on($scope.elementId, emitterName, callback)

        $scope.remove = (): void => {
            // TODO need to remove all on events/watchers. remove isn't being hit
            // console.log('This Disclaimer widget is getting killed')
            $scope.onWatchers.forEach(killOnWatcher => killOnWatcher())
        }
    },
    template: '<div id="{{::elementId}}" class="disclaimer-outer-container" data-ng-cloak data-ng-show="idxService.length > 0 && !hideMe" aria-label="Disclaimers"><div class="disclaimer-container" data-ng-repeat="service in idxService" data-ng-bind-html="service.disclaimerHTML"></div><div class="mls-logos-container" aria-label="Logos"><img class="mls-service-logo" data-ng-show="service.logo.default" data-ng-repeat="service in idxService" aria-label="{{service.name}}" data-ng-src="{{service.logo.medium || service.logo.default}}"></div></div>'
}
