// PropertyList Component
// --------------

// Runtime
import * as _ from 'lodash'
import * as Stratus from 'stratus'
import * as angular from 'angular'

// Angular 1 Modules
import 'angular-sanitize'
import 'angular-material'

// Libraries
import moment from 'moment'

// Services
import 'stratus.services.idx'
// import '@stratusjs/idx/services/idx' The reference for later

// Component Preload
import 'stratus.components.propertyDetails'

// Stratus Dependencies
import {isJSON} from '@stratusjs/core/misc'
import {camelToSnake} from '@stratusjs/core/conversion'

// Environment
const min = Stratus.Environment.get('production') ? '.min' : ''
const moduleName = 'propertyList'
// FIXME need to get relative
const localDir = Stratus.BaseUrl + 'content/common/stratus_test/node_modules/@stratusjs/idx/src/'

Stratus.Components.PropertyList = {
    bindings: {
        elementId: '@',
        detailsLinkPopup: '@',
        detailsLinkUrl: '@',
        detailsLinkTarget: '@',
        detailsTemplate: '@',
        orderOptions: '@',
        googleApiKey: '@',
        options: '@',
        template: '@'
    },
    controller(
        $scope: object | any,
        $attrs: any,
        $mdDialog: any,
        $window: any,
        $timeout: any,
        $q: any,
        $sce: any,
        Idx: any,
    ) {
        // Initialize
        const $ctrl = this
        $ctrl.uid = _.uniqueId(camelToSnake(moduleName) + '_')
        Stratus.Instances[$ctrl.uid] = $scope
        $scope.elementId = $attrs.elementId || $ctrl.uid
        /* Stratus.Internals.CssLoader(
            Stratus.BaseUrl +
            'content/property/stratus/components/' +
            // 'propertyList' +
            ($attrs.template || 'propertyList') +
            min + '.css'
        ) */
        Stratus.Internals.CssLoader(`${localDir}/${moduleName}/${$attrs.template || moduleName}.component${min}.css`)

        /**
         * All actions that happen first when the component loads
         * Needs to be placed in a function, as the functions below need to the initialized first
         */
        $ctrl.$onInit = async () => {
            /**
             * Allow options to be loaded initially from the URL
             * type {boolean}
             */
            $scope.urlLoad = $attrs.urlLoad && isJSON($attrs.urlLoad) ? JSON.parse($attrs.urlLoad) : true
            /** type {boolean} */
            $scope.detailsLinkPopup = $attrs.detailsLinkPopup && isJSON($attrs.detailsLinkPopup) ?
                JSON.parse($attrs.detailsLinkPopup) : true
            /** type {string} */
            $scope.detailsLinkUrl = $attrs.detailsLinkUrl || '/property/details'
            /** type {string} */
            $scope.detailsLinkTarget = $attrs.detailsLinkTarget || '_self'
            /** type {string|null} */
            $scope.detailsTemplate = $attrs.detailsTemplate || null

            $scope.options = $attrs.options && isJSON($attrs.options) ? JSON.parse($attrs.options) : {}

            $scope.options.order = $scope.options.order || null // will be set by Service
            $scope.options.page = $scope.options.page || null // will be set by Service
            $scope.options.perPage = $scope.options.perPage || 25
            $scope.options.images = $scope.options.images || {limit: 1}

            $scope.options.where = $scope.options.where || {}
            $scope.options.where.City = $scope.options.where.City || ''
            $scope.options.where.Status = $scope.options.where.Status || ['Active', 'Contract']
            $scope.options.where.ListingType = $scope.options.where.ListingType || ['House', 'Condo']
            $scope.options.where.AgentLicense = $scope.options.where.AgentLicense || []

            $ctrl.defaultOptions = JSON.parse(JSON.stringify($scope.options.where)) // Extend/clone doesn't work for arrays

            $scope.orderOptions = $scope.orderOptions || {
                'Price (high to low)': '-ListPrice',
                'Price (low to high)': 'ListPrice'
            }

            $scope.googleApiKey = $attrs.googleApiKey || null

            // Register this List with the Property service
            Idx.registerListInstance($scope.elementId, $scope)

            let urlOptions: object | any = {}
            if ($scope.urlLoad) {
                // first set the UrlOptions via defaults (cloning so it can't be altered)
                Idx.setUrlOptions('Search', JSON.parse(JSON.stringify($ctrl.defaultOptions)))
                // Load Options from the provided URL settings
                urlOptions = Idx.getOptionsFromUrl()
                // If a specific listing is provided, be sure to pop it up as well
                if (
                    // urlOptions.hasOwnProperty('Listing') &&
                    urlOptions.Listing.service &&
                    urlOptions.Listing.ListingKey
                ) {
                    $scope.displayPropertyDetails(urlOptions.Listing)
                }
            }

            await $scope.searchProperties(urlOptions.Search, true, false)
        }

        /**
         * Inject the current URL settings into any attached Search widget
         * Due to race conditions, sometimes the List made load before the Search, so the Search will also check if it's missing any values
         */
        $scope.refreshSearchWidgetOptions = () => {
            const searchScopes: object[] | any[] = Idx.getListInstanceLinks($scope.elementId)
            searchScopes.forEach((searchScope) => {
                // FIXME search widgets may only hold certain values. Later this needs to be adjust
                //  to only update the values in which a user can see/control
                searchScope.setQuery(Idx.getUrlOptions('Search'))
                searchScope.listInitialized = true
            })
        }

        /**
         * Functionality called when a search widget runs a query after the page has loaded
         * may update the URL options, so it may not be ideal to use on page load
         * Returns Collection
         */
        $scope.searchProperties = async (options?: object | any, refresh?: boolean, updateUrl?: boolean) =>
            $q((resolve: any) => {
                options = options || {}
                updateUrl = updateUrl === false ? updateUrl : true

                // If refreshing, reset to page 1
                if (refresh) {
                    $scope.options.page = 1
                }
                // If search options sent, update the Widget. Otherwise use the widgets current where settings
                if (Object.keys(options).length > 0) {
                    delete ($scope.options.where)
                    $scope.options.where = options
                    if ($scope.options.where.Page) {
                        $scope.options.page = $scope.options.where.Page
                        delete ($scope.options.where.Page)
                    }
                    if ($scope.options.where.Order) {
                        $scope.options.order = $scope.options.where.Order
                        delete ($scope.options.where.Order)
                    }
                } else {
                    options = $scope.options.where || {}
                }
                // If a different page, set it in the URL
                if ($scope.options.page) {
                    options.Page = $scope.options.page
                }
                // Don't add Page/1 to the URL
                if (options.Page <= 1) {
                    delete (options.Page)
                }
                if ($scope.options.order && $scope.options.order.length > 0) {
                    options.Order = $scope.options.order
                }

                // Set the URL options
                Idx.setUrlOptions('Search', options)
                // TODO need to avoid adding default variables to URL (Status/order/etc)

                // Display the URL options in the address bar
                if (updateUrl) {
                    Idx.refreshUrlOptions($ctrl.defaultOptions)
                }

                // Keep the Search widgets up to date
                $scope.refreshSearchWidgetOptions()

                // Grab the new property listings
                resolve(Idx.fetchProperties($scope, 'collection', $scope.options, refresh))
            })

        /**
         * Move the displayed listings to a different page, keeping the current query
         * @param pageNumber - The page number
         * @param ev - Click event
         */
        $scope.pageChange = async (pageNumber: number, ev?: any) => {
            if (ev) {
                ev.preventDefault()
            }
            $scope.options.page = pageNumber
            await $scope.searchProperties()
        }

        /**
         * Move the displayed listings to the next page, keeping the current query
         * @param ev - Click event
         */
        $scope.pageNext = async (ev?: any) => {
            if (!$scope.options.page) {
                $scope.options.page = 1
            }
            if ($scope.collection.completed && $scope.options.page < $scope.collection.meta.data.totalPages) {
                await $scope.pageChange($scope.options.page + 1, ev)
            }
        }

        /**
         * Move the displayed listings to the previous page, keeping the current query
         * @param ev - Click event
         */
        $scope.pagePrevious = async (ev?: any) => {
            if (!$scope.options.page) {
                $scope.options.page = 1
            }
            if ($scope.collection.completed && $scope.options.page > 1) {
                const prev = parseInt($scope.options.page, 10) - 1 || 1
                await $scope.pageChange(prev, ev)
            }
        }

        /**
         * Change the Order/Sorting method and refresh new results
         * @param order -
         * @param ev - Click event
         */
        $scope.orderChange = async (order: string | string[], ev?: any) => {
            if (ev) {
                ev.preventDefault()
            }
            $scope.options.order = order
            await $scope.searchProperties(null, true, true)
        }

        /**
         * Return a string path to a particular property listing
         */
        $scope.getDetailsURL = (property: object | any): string =>
            $scope.detailsLinkUrl + '#!/Listing/' + property._ServiceId + '/' + property.ListingKey + '/'

        /**
         * Returns the processed street address
         */
        $scope.getStreetAddress = (property: object | any): string => {
            let address = ''
            if (
                Object.prototype.hasOwnProperty.call(property, 'UnparsedAddress') &&
                property.UnparsedAddress !== ''
            ) {
                address = property.UnparsedAddress
                // console.log('using unparsed ')
            } else {
                const addressParts: string[] = [];
                [
                    'StreetNumberNumeric',
                    'StreetName',
                    'StreetSuffix',
                    'UnitNumber' // Added Unit string?
                ]
                    .forEach((addressPart) => {
                        if (Object.prototype.hasOwnProperty.call(property, addressPart)) {
                            if (addressPart === 'UnitNumber') {
                                addressParts.push('Unit')
                            }
                            addressParts.push(property[addressPart])
                        }
                    })
                address = addressParts.join(' ')
            }
            // console.log('address',  address)
            return address
        }

        $scope.getMLSVariables = (): object => {
            // TODO this might need to be reset at some point
            if (!$ctrl.mlsVariables) {
                $ctrl.mlsVariables = Idx.getMLSVariables()
            }
            return $ctrl.mlsVariables
        }

        /**
         * Display an MLS' Name
         */
        $scope.getMLSName = (serviceId: number): string => {
            const services = $scope.getMLSVariables()
            let name = 'MLS'
            if (services[serviceId]) {
                name = services[serviceId].name
            }
            return name
        }

        /**
         * Process an MLS' required legal disclaimer to later display
         * @param html - if output should be HTML safe
         */
        $scope.processMLSDisclaimer = (html?: boolean): string => {
            const services: object[] | any[] = $scope.getMLSVariables()
            let disclaimer = ''
            services.forEach(service => {
                if (disclaimer) {
                    disclaimer += '<br>'
                }
                disclaimer += service.disclaimer
            })

            if ($scope.collection.meta.data.fetchDate) {
                disclaimer = `Last checked ${moment($scope.collection.meta.data.fetchDate).format('M/D/YY')}. ${disclaimer}`
            }

            return html ? $sce.trustAsHtml(disclaimer) : disclaimer
        }

        /**
         * Display an MLS' required legal disclaimer
         * @param html - if output should be HTML safe
         */
        $scope.getMLSDisclaimer = (html?: boolean): string => {
            if (!$ctrl.disclaimerHTML) {
                $ctrl.disclaimerHTML = $scope.processMLSDisclaimer(true)
            }
            if (!$ctrl.disclaimerString) {
                $ctrl.disclaimerString = $scope.processMLSDisclaimer(false)
            }
            return html ? $ctrl.disclaimerHTML : $ctrl.disclaimerString
        }

        /**
         * Either popup or load a new page with the
         * @param property property object
         * @param ev - Click event
         */
        $scope.displayPropertyDetails = (property: object | any, ev?: any) => {
            if (ev) {
                ev.preventDefault()
                // ev.stopPropagation()
            }
            if ($scope.detailsLinkPopup === true) {
                // Opening a popup will load the propertyDetails and adjust the hashbang URL
                const templateOptions: object | any = {
                    element_id: 'property_detail_popup_' + property.ListingKey,
                    service: property._ServiceId,
                    'listing-key': property.ListingKey,
                    'default-list-options': JSON.stringify($ctrl.defaultOptions),
                    'page-title': true// update the page title
                }
                if ($scope.googleApiKey) {
                    templateOptions['google-api-key'] = $scope.googleApiKey
                }
                if ($scope.detailsTemplate) {
                    templateOptions.template = $scope.detailsTemplate
                }

                let template =
                    '<md-dialog aria-label="' + property.ListingKey + '">' +
                    '<stratus-property-details '
                Object.keys(templateOptions).forEach(optionKey => {
                    if (Object.prototype.hasOwnProperty.call(templateOptions, optionKey)) {
                        template += optionKey + '=\'' + templateOptions[optionKey] + '\' '
                    }
                })
                template +=
                    '></stratus-property-details>' +
                    '</md-dialog>'

                $mdDialog.show({
                    template, // equates to `template: template`
                    parent: angular.element(document.body),
                    targetEvent: ev,
                    clickOutsideToClose: true,
                    fullscreen: true // Only for -xs, -sm breakpoints.
                })
                    .then(() => {
                    }, () => {
                        Idx.setUrlOptions('Listing', {})
                        Idx.refreshUrlOptions($ctrl.defaultOptions)
                        // Revery page title back to what it was
                        Idx.setPageTitle()
                        // Let's destroy it to save memory
                        $timeout(Idx.unregisterDetailsInstance('property_detail_popup'), 10)
                    })
            } else {
                $window.open($scope.getDetailsURL(property), $scope.detailsLinkTarget)
            }
        }

        /**
         * Destroy this widget
         */
        $scope.remove = function remove() {

        }
    },
    templateUrl: ($element: any, $attrs: any): string => {
        // let templateMin = $attrs.templateMin && _.isJSON($attrs.templateMin) ? JSON.parse($attrs.templateMin) : true
        /*return Stratus.BaseUrl +
            'content/property/stratus/components/' +
            ($attrs.template || 'propertyList') +
            min + '.html'*/
        return `${localDir}/${moduleName}/${$attrs.template || moduleName}.component${min}.html`
    }
}