// Idx Service

// Runtime
import * as _ from 'lodash'
import * as Stratus from 'stratus'
import * as angular from 'angular'

// Services
import 'stratus.services.collection'

// Environment
const min = Stratus.Environment.get('production') ? '.min' : ''
// FIXME need to get relative
const localDir = Stratus.BaseUrl + 'content/common/stratus_test/node_modules/@stratusjs/idx/src/'

Stratus.Services.Idx = [
    '$provide',
    ($provide: any) => {
        $provide.factory('Idx', [(
            $http: any,
            $injector: any,
            $q: any,
            $location: any,
            $window: any,
            $rootScope: any,
            Collection: any,
            Model: any,
            orderByFilter: any
        ) => {
            // TODO need to allow setting own tokenRefreshURL
            let tokenRefreshURL = '/ajax/request?class=property.token_auth&method=getToken'
            let refreshLoginTimer: any // Timeout object
            let defaultPageTitle: string
            console.log('Idx Service inited')
            /* const instance: {
                List: object,
                Search: object,
                Details: object,
                MemberList: object,
                MemberSearch: object,
                MemberDetails: object,
                OfficeList: object,
                OfficeSearch: object,
                OfficeDetails: object
            } */
            const instance: any = { // FIXME theres a number of queries that need dynamic calls
                List: {},
                Search: {},
                Details: {},
                MemberList: {},
                MemberSearch: {},
                MemberDetails: {},
                OfficeList: {},
                OfficeSearch: {},
                OfficeDetails: {}
            }

            /** type {{List: Object<[String]>, Search: Object<[String]>}} */
            const instanceLink: {
                List: object | any,
                Search: object | any
            } = {
                List: {},
                Search: {}
            }

            /** type {{services: Array<MLSService>, lastCreated: Date, lastTtl: number}} */
            const session: {
                services: any[],
                lastCreated: Date,
                lastTtl: number,
                expires?: Date
            } = {
                services: [],
                lastCreated: new Date(),
                lastTtl: 0
            }

            const urlOptions: {
                Listing: object | any,
                Search: object | any
            } = {
                Listing: {},
                Search: {}
            }

            /**
             * The last where query that was sent we're holding on to. This is mostly so we can move from page to page properly.
             * type {{whereFilter: {}, pages: Array<Number>, perPage: number}}
             */
            const lastQueries: {
                whereFilter: object | any,
                pages: number[],
                perPage: number
            } = {
                whereFilter: {},
                pages: [],
                perPage: 0
            }

            /**
             * Add List instance to the service
             * @param uid - The elementId of a widget
             * @param $scope - angular scope
             * @param listType - Property / Member / Office
             */
            function registerListInstance(uid: string, $scope: any, listType?: string): void {
                listType = listType || ''
                if (listType === 'Property') {
                    listType = ''
                }
                // if (!instance[listType + 'List']) {
                if (!Object.prototype.hasOwnProperty.call(instance, listType + 'List')) {
                    instance[listType + 'List'] = {}
                }
                instance[listType + 'List'][uid] = $scope
                if (!Object.prototype.hasOwnProperty.call(instanceLink.List, uid)) {
                    instanceLink.List[uid] = []
                }
            }

            /**
             * Add Search instance to the service, potentially connecting to a List
             * @param uid - The elementId of a widget
             * @param $scope - angular scope
             * @param listUid -  uid name
             * @param listType - Property / Member / Office
             */
            function registerSearchInstance(uid: string, $scope: any, listUid?: string, listType?: string): void {
                listType = listType || ''
                if (listType === 'Property') {
                    listType = ''
                }
                instance[listType + 'Search'][uid] = $scope
                if (!Object.prototype.hasOwnProperty.call(instanceLink.Search, uid)) {
                    instanceLink.Search[uid] = []
                }
                if (listUid) {
                    instanceLink.Search[uid].push(listUid)
                    if (!Object.prototype.hasOwnProperty.call(instanceLink.List, listUid)) {
                        instanceLink.List[listUid] = []
                    }
                    instanceLink.List[listUid].push(uid)
                }
            }

            /**
             * Add Search instance to the service
             * @param uid - The elementId of a widget
             * @param $scope - angular scope
             */
            function registerDetailsInstance(uid: string, $scope: any): void {
                instance.Details[uid] = $scope
            }

            /**
             * Destroy a reference and Instance of a Details widget
             * @param uid - The elementId of a widget
             */
            function unregisterDetailsInstance(uid: string): void {
                if (Object.prototype.hasOwnProperty.call(instance.Details, uid)) {
                    const detailUid = instance.Details[uid].getUid()
                    delete instance.Details[uid]
                    Stratus.Instances.Clean(detailUid)
                }
            }

            /**
             * Return the List scopes of a those connected to a particular Search widget
             * @param searchUid - uid of search component
             * @param listType - Property / Member / Office
             */
            function getSearchInstanceLinks(searchUid: string, listType?: string): any[] {
                listType = listType || ''
                if (listType === 'Property') {
                    listType = ''
                }
                const linkedLists: any = []
                if (Object.prototype.hasOwnProperty.call(instanceLink.Search, searchUid)) {
                    instanceLink.Search[searchUid].forEach((listUid: any) => {
                        if (Object.prototype.hasOwnProperty.call(instance[listType + 'List'], listUid)) {
                            linkedLists.push(instance[listType + 'List'][listUid])
                        }
                    })
                }
                return linkedLists
            }

            /**
             * Return a List scope
             * @param listUid - uid of List
             * @param listType - Property / Member / Office
             */
            function getListInstance(listUid: string, listType?: string): any | null {
                listType = listType || ''
                if (listType === 'Property') {
                    listType = ''
                }
                return Object.prototype.hasOwnProperty.call(instanceLink.List, listUid) ? instance[listType + 'List'][listUid] : null
            }

            /**
             * Return the Search scopes of a those connected to a particular List widget
             * @param listUid - uid of list
             * @param listType - Property / Member / Office
             */
            function getListInstanceLinks(listUid: string, listType?: string): any[] {
                listType = listType || ''
                if (listType === 'Property') {
                    listType = ''
                }
                const linkedSearches: any[] = []
                if (Object.prototype.hasOwnProperty.call(instanceLink.List, listUid)) {
                    instanceLink.List[listUid].forEach((searchUid: any) => {
                        if (Object.prototype.hasOwnProperty.call(instance[listType + 'Search'], searchUid)) {
                            linkedSearches.push(instance[listType + 'Search'][searchUid])
                        }
                    })
                }
                return linkedSearches
            }

            /**
             * Apply a new Page title or revert to the original; page title
             * @param title - Page Title
             */
            function setPageTitle(title: string): void {
                if (!defaultPageTitle) {
                    // save default title first
                    defaultPageTitle = JSON.parse(JSON.stringify($window.document.title))
                }
                if (!title) {
                    // Revert to default
                    $window.document.title = defaultPageTitle
                } else {
                    // Apply new title
                    $window.document.title = title
                }
            }

            /**
             * Updates the token url to another path
             * @param url = URL to change to
             */
            function setTokenURL(url: string): void {
                tokenRefreshURL = url
            }

            /**
             * Ensures there is a active session and performs token fetching if need be.
             * @param keepAlive -
             */
            function tokenKeepAuth(keepAlive?: boolean): Promise<void> {
                return $q(async (resolve: void | any, reject: any) => {
                    try {
                        if (
                            session.services.length < 1 ||
                            session.expires < new Date() // if expiring in the next 15 seconds
                        ) {
                            await tokenRefresh(keepAlive)
                            resolve()
                        } else {
                            resolve()
                        }
                    } catch (err) {
                        console.error('error', err)
                        reject(err)
                    }
                })
            }

            /**
             * Fetches a new set of Tokens for data fetching
             * @param keepAlive -
             */
            function tokenRefresh(keepAlive?: boolean): Promise<void> {
                return $q((resolve: void | any, reject: void | any) => {
                    $http({
                        method: 'GET',
                        url: tokenRefreshURL
                    }).then((response: { data?: { services?: any[] } }) => { // TODO interface a response
                        if (
                            typeof response === 'object' &&
                            Object.prototype.hasOwnProperty.call(response, 'data') &&
                            Object.prototype.hasOwnProperty.call(response.data, 'services') &&
                            Object.prototype.hasOwnProperty.call(response.data.services, 'length')
                        ) {
                            tokenHandleGoodResponse(response)
                            resolve()
                        } else {
                            tokenHandleBadResponse(response)
                            reject()
                        }
                    }, (response: { data?: { services?: any[] } }) => { // TODO interface a response
                        tokenHandleBadResponse(response)
                        reject()
                    })
                })
            }

            /**
             * Functions to do once successfully retrieve a new set of tokens.
             * Currently will set a timer to refresh tokens after XXX
             * @param response - valid token response
             * @param keepAlive -
             * @param response.data.services Array<MLSService>
             *     TODO interface a response
             */
            function tokenHandleGoodResponse(response: { data?: { services?: any[] } }, keepAlive?: boolean): void {
                session.services = []
                /** {MLSService} service */
                response.data.services.forEach((service: any) => {
                    if (Object.prototype.hasOwnProperty.call(service, 'id')) {
                        session.services[service.id] = service
                        session.lastCreated = new Date(service.created)// The object is a String being converted to Date
                        session.lastTtl = service.ttl
                        // Set to expire 15 secs before it actually does
                        session.expires = new Date(session.lastCreated.getTime() + (session.lastTtl - 15) * 1000)
                    }
                })
                if (keepAlive) {
                    tokenEnableRefreshTimer()
                }
            }

            /**
             * Functions to do if the token retrieval fails. For now it just outputs the errors
             * @param {Object} response
             */
            function tokenHandleBadResponse(response) {
                if (
                    typeof response === 'object' &&
                    Object.prototype.hasOwnProperty.call(response, 'data') &&
                    Object.prototype.hasOwnProperty.call(response.data, 'errors') &&
                    Object.prototype.hasOwnProperty.call(response.data.errors, 'length')
                ) {
                    console.error(response.data.errors)
                } else {
                    console.error(response)
                }
            }

            /**
             * Set a timer to attempt to run a token fetch again 15 secs before the current tokens expire
             */
            function tokenEnableRefreshTimer() {
                clearTimeout(refreshLoginTimer)
                refreshLoginTimer = setTimeout(function () {
                    tokenRefresh()
                }, (session.lastTtl - 15) * 1000) // 15 seconds before the token expires
            }

            /**
             * Collection constructor helper that will help properly create a new Collection.
             * Will do nothing else.
             * @param {Object} request - Standard Registry request object
             * @returns {Model}
             */
            function createModel(request) {
                // request.direct = true;
                const model = new Model(request)
                if (request.api) {
                    model.meta.set('api', _.isJSON(request.api)
                        ? JSON.parse(request.api)
                        : request.api)
                }
                return model
            }

            /**
             * Model constructor helper that will help properly create a new Model.
             * Will do nothing else.
             * @param {Object} request - Standard Registry request object
             * @returns {Model}
             */
            function createCollection(request) {
                request.direct = true
                const collection = new Collection(request)
                if (request.api) {
                    collection.meta.set('api', _.isJSON(request.api)
                        ? JSON.parse(request.api)
                        : request.api)
                }
                return collection
            }

            /**
             * Fetch the results of multiple 'collections', then merge those results together into a single Collection
             * These resulting Collections may not be properly set up to perform their usual action and are only intended to hold Model data
             * @param {Collection} originalCollection
             * @param {Array<Collection>} collections
             * @param {Boolean} append
             * @returns {Promise<Collection>}
             */
            async function fetchMergeCollections(originalCollection, collections, append) {
                // The Collection is now doing something. Let's label it as such.
                originalCollection.pending = true
                originalCollection.completed = false

                let totalCount = 0

                // Make Promises that each of the collections shall fetch their results
                const fetchPromises = []
                collections.forEach(function (collection) {
                    const options = {}
                    if (session.services[collection.serviceId].token !== null) {
                        options.headers = {
                            Authorization: session.services[collection.serviceId].token
                        }
                    }
                    fetchPromises.push(
                        $q(function (resolve, reject) {
                            collection.fetch('POST', null, options)
                                .then(function (models) {
                                    resolve(models)
                                })
                                // Inject the local server's Service Id loaded from
                                .then(function () {
                                    resolve(modelInjectProperty(collection.models, {
                                        _ServiceId: collection.serviceId
                                    }))
                                })
                                .then(function () {
                                    const countRecords = collection.header.get('x-total-count')
                                    if (countRecords) {
                                        totalCount += parseInt(countRecords)
                                    }
                                })
                        })
                    )
                })
                if (!append) {
                    originalCollection.models.splice(0, originalCollection.models.length) // empties the array
                }
                return $q.all(fetchPromises)
                    .then(
                        /**
                         * @param {Array<Array<Object>>} fetchedData - Array of models from other Collections
                         * @param fetchedData
                         * @returns {Collection}
                         */
                        function (fetchedData) {
                            // Once all the Results are returned, starting merging them into the original Collection
                            fetchedData.forEach(function (models) {
                                if (_.isArray(models)) {
                                    originalCollection.models.push(...models)
                                }
                            })
                            return originalCollection
                        }
                    )
                    .then(function () {
                        originalCollection.header.set('x-total-count', totalCount)
                        originalCollection.meta.set('fetchDate', new Date())

                        // The Collection is now ready, let's make sure we label it as such
                        originalCollection.pending = false
                        originalCollection.completed = true
                        originalCollection.filtering = false
                        originalCollection.paginate = false

                        return originalCollection
                    })
            }

            /**
             * Fetch the results of one Model, then merge those results together into a single existing Model
             * These resulting Model may not be properly set up to perform their usual action and are only intended to hold Model data
             * @param {Model} originalModel
             * @param {Model} newModel
             * @returns {Promise<Collection>}
             */
            function fetchReplaceModel(originalModel, newModel) {
                // The Model is now doing something. Let's label it as such.
                originalModel.pending = true
                originalModel.completed = false

                // Make Promises that each of the Models shall fetch their results. We're only using a single one here
                const fetchPromises = []
                const options = {}
                if (session.services[newModel.serviceId].token !== null) {
                    options.headers = {
                        Authorization: session.services[newModel.serviceId].token
                    }
                }
                fetchPromises.push(
                    $q(function (resolve, reject) {
                        console.log('sending fetchReplaceModel', newModel, options)
                        newModel.fetch('POST', null, options)
                            .then(function (data) {
                                resolve(data)
                            })
                            // Inject the local server's Service Id loaded from
                            .then(function () {
                                resolve(modelInjectProperty([newModel.data], {
                                    _ServiceId: newModel.serviceId
                                }))
                            })
                    })
                )
                return $q.all(fetchPromises)
                    .then(
                        /**
                         * @param {Array<Array<Object>>} fetchedData - Array of data from other Models
                         * @param fetchedData
                         * @returns {Model}
                         */
                        function (fetchedData) {
                            // Once all the Results are returned, shove them into the original Model
                            fetchedData.forEach(function (data) {
                                originalModel.data = data
                            })
                            return originalModel
                        }
                    )
                    .then(function () {
                        originalModel.meta.set('fetchDate', new Date())

                        // The Model is now ready, let's make sure we label it as such
                        originalModel.pending = false
                        originalModel.completed = true

                        return originalModel
                    })
            }

            /**
             * Inject Data into an array of models
             * @param {Array<Object>} modelDatas (either collection.models || model.data)
             * @param {Object<String, *>} properties
             */
            function modelInjectProperty(modelDatas, properties) {
                modelDatas.forEach(function (modelData) {
                    _.extend(modelData, properties)
                })
            }

            /**
             * Sync a Collection with all members of a certain instance
             * @param {String} instanceType
             * @param {String} scopedCollectionVarName
             * @returns {Collection}
             */
            function createOrSyncCollectionVariable(instanceType, scopedCollectionVarName) {
                let collection
                Object.keys(instance[instanceType]).forEach(function (listName) {
                    if (
                        !collection &&
                        Object.prototype.hasOwnProperty.call(instance[instanceType], listName) &&
                        Object.prototype.hasOwnProperty.call(instance[instanceType][listName], scopedCollectionVarName)
                    ) {
                        collection = instance[instanceType][listName][scopedCollectionVarName]
                    }
                })
                if (!collection) {
                    collection = new Collection()
                }
                Object.keys(instance[instanceType]).forEach(function (listName) {
                    if (
                        !Object.prototype.hasOwnProperty.call(instance[instanceType][listName], scopedCollectionVarName) ||
                        instance[instanceType][listName][scopedCollectionVarName] !== collection
                    ) {
                        instance[instanceType][listName][scopedCollectionVarName] = collection
                    }
                }, this)
                return collection
            }

            /**
             * @param {WhereOptions} where
             * @returns {Object}
             */
            function compilePropertyWhereFilter(where) {
                const whereQuery = {}
                // ListingKey
                if (Object.prototype.hasOwnProperty.call(where, 'ListingKey') && where.ListingKey !== '') {
                    whereQuery.ListingKey = where.ListingKey
                }
                // ListType
                if (Object.prototype.hasOwnProperty.call(where, 'ListingType') && where.ListingType !== '') {
                    if (typeof where.ListingType === 'string') {
                        where.ListingType = [where.ListingType]
                    }
                    whereQuery.ListingType = where.ListingType
                }
                // Status
                if (Object.prototype.hasOwnProperty.call(where, 'Status') && where.Status !== '') {
                    if (typeof where.Status === 'string') {
                        where.Status = [where.Status]
                    }
                    whereQuery.Status = {
                        inq: where.Status
                    }
                }
                // Agent License
                if (Object.prototype.hasOwnProperty.call(where, 'AgentLicense') && where.AgentLicense !== '') {
                    if (typeof where.AgentLicense === 'string') {
                        where.AgentLicense = [where.AgentLicense]
                    }
                    if (where.AgentLicense.length > 0) {
                        whereQuery.AgentLicense = where.AgentLicense
                    }
                }
                // City
                if (Object.prototype.hasOwnProperty.call(where, 'City') && where.City !== '') {
                    whereQuery.City = {
                        like: where.City,
                        options: 'i'
                    }
                }
                // List Price Min
                if (Object.prototype.hasOwnProperty.call(where, 'ListPriceMin') && where.ListPriceMin && where.ListPriceMin !== 0) {
                    whereQuery.ListPrice = {gte: parseInt(where.ListPriceMin, 10)}
                }
                // List Price Max
                if (Object.prototype.hasOwnProperty.call(where, 'ListPriceMax') && where.ListPriceMax && where.ListPriceMax !== 0) {
                    if (
                        Object.prototype.hasOwnProperty.call(whereQuery, 'ListPrice') &&
                        Object.prototype.hasOwnProperty.call(whereQuery.ListPrice, 'gte')
                    ) {
                        whereQuery.ListPrice = {
                            between: [
                                parseInt(where.ListPriceMin, 10),
                                parseInt(where.ListPriceMax, 10)
                            ]
                        }
                    } else {
                        whereQuery.ListPrice = {lte: parseInt(where.ListPriceMax, 10)}
                    }
                }
                // Baths Min
                if (Object.prototype.hasOwnProperty.call(where, 'BathroomsFullMin') && where.BathroomsFullMin && where.BathroomsFullMin !== 0) {
                    whereQuery.BathroomsFull = {gte: parseInt(where.BathroomsFullMin, 10)}
                }
                // Beds Min
                if (Object.prototype.hasOwnProperty.call(where, 'BedroomsTotalMin') && where.BedroomsTotalMin && where.BedroomsTotalMin !== 0) {
                    whereQuery.BedroomsTotal = {gte: parseInt(where.BedroomsTotalMin, 10)}
                }
                return whereQuery
            }

            /**
             * @param {WhereOptions} where
             * @returns {Object}
             */
            function compileMemberWhereFilter(where) {
                const whereQuery = {}
                // MemberKey
                if (Object.prototype.hasOwnProperty.call(where, 'MemberKey') && where.MemberKey !== '') {
                    whereQuery.MemberKey = where.MemberKey
                }
                // MemberStateLicense
                if (Object.prototype.hasOwnProperty.call(where, 'MemberStateLicense') && where.MemberStateLicense !== '') {
                    whereQuery.MemberStateLicense = where.MemberStateLicense
                }
                // MemberNationalAssociationId
                if (Object.prototype.hasOwnProperty.call(where, 'MemberNationalAssociationId') && where.MemberNationalAssociationId !== '') {
                    whereQuery.MemberNationalAssociationId = where.MemberNationalAssociationId
                }
                // MemberStatus
                if (Object.prototype.hasOwnProperty.call(where, 'MemberStatus') && where.MemberStatus !== '') {
                    whereQuery.MemberStatus = where.MemberStatus
                }
                // MemberFullName
                if (Object.prototype.hasOwnProperty.call(where, 'MemberFullName') && where.MemberFullName !== '') {
                    whereQuery.MemberFullName = {
                        like: where.MemberFullName,
                        options: 'i'
                    }
                }
                return whereQuery
            }

            /**
             * @param {WhereOptions} where
             * @returns {Object}
             */
            function compileOfficeWhereFilter(where) {
                const whereQuery = {}
                // OfficeKey
                if (Object.prototype.hasOwnProperty.call(where, 'OfficeKey') && where.OfficeKey !== '') {
                    whereQuery.OfficeKey = where.OfficeKey
                }
                // OfficeNationalAssociationId
                if (Object.prototype.hasOwnProperty.call(where, 'OfficeNationalAssociationId') && where.OfficeNationalAssociationId !== '') {
                    whereQuery.OfficeNationalAssociationId = where.OfficeNationalAssociationId
                }
                // OfficeStatus
                if (Object.prototype.hasOwnProperty.call(where, 'OfficeStatus') && where.OfficeStatus !== '') {
                    whereQuery.OfficeStatus = where.OfficeStatus
                }
                // OfficeName
                if (Object.prototype.hasOwnProperty.call(where, 'OfficeName') && where.OfficeName !== '') {
                    whereQuery.OfficeName = {
                        like: where.OfficeName,
                        options: 'i'
                    }
                }
                return whereQuery
            }

            /**
             * Convert the human given Order parameters to Loopback filter usable
             * @param {[String]} orderUnparsed
             * @returns {Object}
             */
            function compileOrderFilter(orderUnparsed) {
                if (typeof orderUnparsed === 'string') {
                    orderUnparsed = orderUnparsed.split(',')
                }
                const orderQuery = []

                orderUnparsed.forEach(function (orderName) {
                    let direction = 'ASC'
                    if (orderName.charAt(0) === '-') {
                        orderName = orderName.substring(1, orderName.length)
                        direction = 'DESC'
                    }
                    orderQuery.push(orderName + ' ' + direction)
                })
                return orderQuery
            }

            /**
             *
             * @param {Object} options
             * @param {WhereOptions} options.where
             * @param {[String]=} options.order
             * @param {[String]=} options.fields - Which Fields to return
             * @param {Boolean || Object =} options.images - Include Image data
             * @param {Number=} options.images.limit
             * @param {[String]=} options.images.fields
             */
            function compilePropertyFilter(options) {
                let skip = 0
                if (options.page) {
                    skip = (options.page - 1) * options.perPage
                }
                const filterQuery = {
                    where: compilePropertyWhereFilter(options.where),
                    fields: options.fields,
                    limit: options.perPage,
                    skip: skip
                }

                if (options.order && options.order.length > 0) {
                    filterQuery.order = compileOrderFilter(options.order)
                }

                // Handle included collections
                const includes = []

                // Included Images
                if (options.images) {
                    const imageInclude = {
                        relation: 'Images',
                        scope: {
                            order: 'Order', // FIXME should be ordered by default on db side (default scopes)
                            fields: [
                                'MediaURL'
                            ]
                        }
                    }
                    if (typeof options.images === 'object') {
                        if (Object.prototype.hasOwnProperty.call(options.images, 'limit')) {
                            imageInclude.scope.limit = options.images.limit
                        }
                        if (Object.prototype.hasOwnProperty.call(options.images, 'fields')) {
                            if (options.images.fields === '*') {
                                delete imageInclude.scope.fields
                            } else {
                                imageInclude.scope.fields = options.images.fields
                            }
                        }
                    }

                    includes.push(imageInclude)
                }

                // Included Open Houses
                if (options.openhouses) {
                    const openHouseInclude = {
                        relation: 'OpenHouses',
                        scope: {
                            order: 'OpenHouseStartTime', // FIXME should be ordered by default on db side (default scopes)
                            fields: [
                                'OpenHouseStartTime',
                                'OpenHouseEndTime'
                            ]
                        }
                    }
                    if (typeof options.openhouses === 'object') {
                        if (Object.prototype.hasOwnProperty.call(options.openhouses, 'limit')) {
                            openHouseInclude.scope.limit = options.openhouses.limit
                        }
                        if (Object.prototype.hasOwnProperty.call(options.openhouses, 'fields')) {
                            if (options.openhouses.fields === '*') {
                                delete openHouseInclude.scope.fields
                            } else {
                                openHouseInclude.scope.fields = options.openhouses.fields
                            }
                        }
                    }

                    includes.push(openHouseInclude)
                }

                if (includes.length === 1) {
                    filterQuery.include = includes[0]
                } else if (includes.length > 1) {
                    filterQuery.include = includes
                }

                if (filterQuery.fields.length <= 0) {
                    delete filterQuery.fields
                }

                return filterQuery
            }

            /**
             *
             * @param {Object} options
             * @param {WhereOptions} options.where
             * @param {[String]=} options.order
             * @param {[String]=} options.fields - Which Fields to return
             * @param {Boolean || Object =} options.images - Include Image data
             * @param {Number=} options.images.limit
             * @param {[String]=} options.images.fields
             * @param {Boolean || Object =} options.office - Include Office data
             */
            function compileMemberFilter(options) {
                let skip = 0
                if (options.page) {
                    skip = (options.page - 1) * options.perPage
                }
                const filterQuery = {
                    where: compileMemberWhereFilter(options.where),
                    fields: options.fields,
                    limit: options.perPage,
                    skip: skip
                }

                if (options.order && options.order.length > 0) {
                    filterQuery.order = compileOrderFilter(options.order)
                }

                // Handle included collections
                const includes = []

                // Included Images
                if (options.images) {
                    const imageInclude = {
                        relation: 'Images',
                        scope: {
                            order: 'Order',
                            fields: [
                                'MediaURL'
                            ]
                        }
                    }
                    if (typeof options.images === 'object') {
                        if (Object.prototype.hasOwnProperty.call(options.images, 'limit')) {
                            imageInclude.scope.limit = options.images.limit
                        }
                        if (Object.prototype.hasOwnProperty.call(options.images, 'fields')) {
                            if (options.images.fields === '*') {
                                delete imageInclude.scope.fields
                            } else {
                                imageInclude.scope.fields = options.images.fields
                            }
                        }
                    }

                    includes.push(imageInclude)
                }

                // Include Office
                if (options.office) {
                    const includeItem = {
                        relation: 'Office',
                        scope: {
                            fields: [
                                'OfficeName',
                                'OfficeKey'
                            ]
                        }
                    }
                    if (typeof options.office === 'object') {
                        if (Object.prototype.hasOwnProperty.call(options.office, 'fields')) {
                            if (options.office.fields === '*') {
                                delete includeItem.scope.fields
                            } else {
                                includeItem.scope.fields = options.office.fields
                            }
                        }
                    }

                    includes.push(includeItem)
                }

                if (includes.length === 1) {
                    filterQuery.include = includes[0]
                } else if (includes.length > 1) {
                    filterQuery.include = includes
                }

                if (filterQuery.fields.length <= 0) {
                    delete filterQuery.fields
                }

                return filterQuery
            }

            /**
             *
             * @param {Object} options
             * @param {WhereOptions} options.where
             * @param {[String]=} options.order
             * @param {[String]=} options.fields - Which Fields to return
             * @param {Boolean || Object =} options.images - Include Image data
             * @param {Number=} options.images.limit
             * @param {[String]=} options.images.fields
             * @param {Boolean || Object =} options.managingBroker - Include Managing Broker Member data
             * @param {Boolean || Object =} options.members - Include Member data
             * @param {Number=} options.members.limit
             * @param {[String]=} options.members.fields
             */
            function compileOfficeFilter(options) {
                let skip = 0
                if (options.page) {
                    skip = (options.page - 1) * options.perPage
                }
                const filterQuery = {
                    where: compileOfficeWhereFilter(options.where),
                    fields: options.fields,
                    limit: options.perPage,
                    skip: skip
                }

                if (options.order && options.order.length > 0) {
                    filterQuery.order = compileOrderFilter(options.order)
                }

                // Handle included collections
                const includes = []

                // Included Images
                if (options.images) {
                    const imageInclude = {
                        relation: 'Images',
                        scope: {
                            order: 'Order',
                            fields: [
                                'MediaURL'
                            ]
                        }
                    }
                    if (typeof options.images === 'object') {
                        if (Object.prototype.hasOwnProperty.call(options.images, 'limit')) {
                            imageInclude.scope.limit = options.images.limit
                        }
                        if (Object.prototype.hasOwnProperty.call(options.images, 'fields')) {
                            if (options.images.fields === '*') {
                                delete imageInclude.scope.fields
                            } else {
                                imageInclude.scope.fields = options.images.fields
                            }
                        }
                    }

                    includes.push(imageInclude)
                }

                // Include Managing Broker Member Data
                if (options.managingBroker) {
                    const includeItem = {
                        relation: 'Member',
                        scope: {
                            fields: [
                                'MemberFullName',
                                'MemberStateLicense',
                                'MemberKey'
                            ]
                        }
                    }
                    if (typeof options.managingBroker === 'object') {
                        if (Object.prototype.hasOwnProperty.call(options.managingBroker, 'fields')) {
                            if (options.managingBroker.fields === '*') {
                                delete includeItem.scope.fields
                            } else {
                                includeItem.scope.fields = options.managingBroker.fields
                            }
                        }
                    }

                    includes.push(includeItem)
                }

                // Include Members/Agents
                if (options.members) {
                    const includeItem = {
                        relation: 'Member',
                        scope: {
                            fields: [
                                'MemberFullName',
                                'MemberStateLicense',
                                'MemberKey'
                            ]
                        }
                    }
                    if (typeof options.members === 'object') {
                        if (Object.prototype.hasOwnProperty.call(options.members, 'fields')) {
                            if (options.members.fields === '*') {
                                delete includeItem.scope.fields
                            } else {
                                includeItem.scope.fields = options.members.fields
                            }
                        }
                    }

                    includes.push(includeItem)
                }

                if (includes.length === 1) {
                    filterQuery.include = includes[0]
                } else if (includes.length > 1) {
                    filterQuery.include = includes
                }

                if (filterQuery.fields.length <= 0) {
                    delete filterQuery.fields
                }

                return filterQuery
            }

            /**
             * Return the MLS' required variables
             * @param {[Number]=} serviceIds - Specify a certain MLS Service get the variables from
             * @returns {Array<Object>}
             */
            function getMLSVariables(serviceIds) {
                const serviceList = []
                if (serviceIds && _.isArray(serviceIds)) {
                    serviceIds.forEach(function (service) {
                        if (Object.prototype.hasOwnProperty.call(session.services, service)) {
                            serviceList[session.services[service].id] = {
                                id: session.services[service].id,
                                name: session.services[service].name,
                                disclaimer: session.services[service].disclaimer
                            }
                        }
                    })
                } else {
                    session.services.forEach(function (service) {
                        serviceList[service.id] = {
                            id: service.id,
                            name: service.name,
                            disclaimer: service.disclaimer
                        }
                    })
                }
                // console.log('serviceList', serviceList);
                return serviceList
            }

            /**
             * Parse the hangbang Url for the serviceId and ListingKey of a listings
             * TODO give options on different ways to parse? (e.g. Url formatting)
             * @returns {Object}
             */
            function getOptionsFromUrl() {
                let path = $location.path()

                path = getListingOptionsFromUrlString(path)
                getSearchOptionsFromUrlString(path)

                return urlOptions
            }

            /**
             * Parse the hangbang Url for the serviceId and ListingKey of a listings
             * Save variables in urlOptions.Listing
             * @returns {String} - Remaining unparsed hashbang variables
             */
            function getListingOptionsFromUrlString(path) {
                // FIXME can't read unless ListingKey must end with /
                // /Listing/1/81582540/8883-Rancho/
                const regex = /\/Listing\/(\d+?)\/(.*?)\/([\w-_]*)?\/?/
                const matches = regex.exec(path)
                path = path.replace(regex, '')
                if (
                    matches !== null &&
                    matches[1] &&
                    matches[2]
                ) {
                    // Save the variables inot
                    urlOptions.Listing.service = matches[1]
                    urlOptions.Listing.ListingKey = matches[2]
                }
                return path
            }

            /**
             * Parse the hangbang Url for any Search options
             * Save variables in urlOptions.Search
             * @returns {String} - Remaining unparsed hangbang variables
             */
            function getSearchOptionsFromUrlString(path) {
                // /Search/ListPriceMin/500000/SomeVar/aValue
                let regex = /\/Search\/(.*)?\/?/
                let matches = regex.exec(path)
                path = path.replace(regex, '')
                if (
                    matches !== null &&
                    matches[1]
                ) {
                    const rawSearchOptions = matches[1]
                    // Time to separate all the values out in pairs between /'s
                    // standard had me remove regex = /([^\/]+)\/([^\/]+)/g  (notice the missing \'s)
                    regex = /([^/]+)\/([^/]+)/g
                    while ((matches = regex.exec(rawSearchOptions)) != null) {
                        if (
                            matches[1] &&
                            matches[2]
                        ) {
                            // Check for a comma to break into an array. This might need to be altered as sometimes a comma might be used for something
                            if (matches[2].includes(',')) {
                                matches[2] = matches[2].split(',')
                            }
                            // S ave the pairing results into urlOptions.Search
                            urlOptions.Search[matches[1]] = matches[2]
                        }
                    }
                }

                // Math is performed in Page and needs to be converted
                if (Object.prototype.hasOwnProperty.call(urlOptions.Search, 'Page')) {
                    urlOptions.Search.Page = parseInt(urlOptions.Search.Page)
                }

                return path
            }

            /**
             * Internally set Listing or Search options to later update the URL
             * @param {'Listing'||'Search'} listingOrSearch
             * @param {Object} options
             */
            function setUrlOptions(listingOrSearch, options) {
                urlOptions[listingOrSearch] = options || {}
                // console.log('updated urlOptions', listingOrSearch, options);
            }

            /**
             * Return either Listing or Search Options
             * @param {'Listing'||'Search'} listingOrSearch
             * @returns {Object}
             */
            function getUrlOptions(listingOrSearch) {
                return urlOptions[listingOrSearch]
            }

            /**
             * Process the currently set options returns what the URL hashbang should be
             * @returns {string}
             */
            function getUrlOptionsPath(defaultOptions) {
                defaultOptions = defaultOptions || {}
                let path = ''

                // Set the Search List url variables
                const searchOptionNames = Object.keys(urlOptions.Search)
                if (searchOptionNames.length > 0) {
                    let searchPath = ''
                    searchOptionNames.forEach(function (searchOptionName) {
                        if (
                            Object.prototype.hasOwnProperty.call(urlOptions.Search, searchOptionName) &&
                            urlOptions.Search[searchOptionName] !== null &&
                            // && urlOptions.Search[searchOptionName] !== ''
                            // && urlOptions.Search[searchOptionName] !== 0// may need to correct this
                            !_.isEqual(defaultOptions[searchOptionName], urlOptions.Search[searchOptionName])
                        ) {
                            // console.log(searchOptionName, defaultOptions[searchOptionName], urlOptions.Search[searchOptionName]);
                            searchPath += searchOptionName + '/' + urlOptions.Search[searchOptionName] + '/'
                        }
                    })
                    if (searchPath !== '') {
                        path += 'Search/' + searchPath
                    }
                }

                // Set the Listing Details url variables
                if (
                    Object.prototype.hasOwnProperty.call(urlOptions.Listing, 'service') &&
                    Object.prototype.hasOwnProperty.call(urlOptions.Listing, 'ListingKey') &&
                    !isNaN(urlOptions.Listing.service) &&
                    urlOptions.Listing.ListingKey
                ) {
                    path += 'Listing' + '/' + urlOptions.Listing.service + '/' + urlOptions.Listing.ListingKey + '/'
                    if (
                        Object.prototype.hasOwnProperty.call(urlOptions.Listing, 'address') &&
                        urlOptions.Listing.address &&
                        typeof urlOptions.Listing.address === 'string'
                    ) {
                        path += urlOptions.Listing.address.replace(/ /g, '-') + '/'
                    }
                }
                return path
            }

            /**
             * Process the currently set options and update the URL with what should be known
             */
            function refreshUrlOptions(defaultOptions) {
                setLocationPath(getUrlOptionsPath(defaultOptions))
                // console.log('Refreshed url with', urlOptions, defaultOptions);
            }

            /**
             * Update the hashbang address bar. The path will always begin with #!/
             * @param {String} path
             */
            function setLocationPath(path) {
                $rootScope.$applyAsync(function () {
                    $location.path(path).replace()
                    // $location.path(path);
                })
            }

            /**
             * Reorder/sort a collection's models by a defined value
             * If using multiple property values, the first in the array take precedence
             * @param {Collection} collection
             * @param {String || [String]} propertyNames - value(s) to reorder/sort by
             * @param {Boolean=} reverse - If it should reverse sort by the value
             */
            function orderBy(collection, propertyNames, reverse) {
                if (propertyNames && propertyNames !== []) {
                    collection.models = orderByFilter(collection.models, propertyNames, reverse)
                }
            }

            /**
             *
             * @param {Object} $scope
             * @param {String} collectionVarName - The variable name assigned in the scope to hold the Collection results
             * @param {Object=} options
             * @param {[Number]=} options.service - Specify certain MLS Services to load from
             * @param {WhereOptions=} options.where
             * @param {[String]=} options.order
             * @param {Boolean || Object =} options.images - Include Image data
             * @param {Number=} options.images.limit
             * @param {[String]=} options.images.fields
             * @param {[String]=} options.fields - Which Fields to return
             * @param {Boolean=} refresh - Which Fields to return
             * @param {String} instanceName
             * @param {String} apiModel
             * @param {Function} compileFilterFunction
             * @returns {Promise<Collection>}
             */
            async function genericSearchCollection($scope, collectionVarName, options, refresh, instanceName, apiModel, compileFilterFunction) {
                options = options || {}
                options.service = options.service || []
                options.where = options.where || {}
                options.order = options.order || []
                options.page = options.page || 1
                options.perPage = options.perPage || 10
                options.images = options.images || false
                options.fields = options.fields || [
                    '_id'
                ]
                refresh = refresh || false

                if (typeof options.order === 'string') {
                    options.order = options.order.split(',')
                }

                let apiModelSingular = ''
                switch (apiModel) {
                    case 'Properties':
                        apiModelSingular = 'Property'
                        break
                    case 'Members':
                        apiModelSingular = 'Member'
                        break
                    case 'Offices':
                        apiModelSingular = 'Office'
                        break
                    case 'OpenHouses':
                        apiModelSingular = 'OpenHouse'
                        break
                }

                // Prepare the same Collection for each List
                const collection = await createOrSyncCollectionVariable(instanceName, collectionVarName)

                // Set API paths to fetch listing data for each MLS Service
                const filterQuery = compileFilterFunction(options)
                // options.page items need to happen after here

                const collections = []

                // check if this filterQuery is any different from the 'last one' used
                // if this is a new query rather than a page change
                if (
                    !_.isEqual(lastQueries.whereFilter, filterQuery.where) ||
                    lastQueries.order !== options.order ||
                    lastQueries.perPage !== options.perPage ||
                    refresh
                ) {
                    // clear the current models to refresh a new batch
                    collection.models.splice(0, collection.models.length)
                    refresh = true
                    lastQueries.pages = []
                    filterQuery.count = true // request the Total Count of all results
                } else {
                    refresh = false
                }

                // the page on doesn't have listings in buffer
                if (collection.models.length < (options.page * options.perPage)) {
                    // need to fetch more
                    // need to also have all previous pages to ensure that sorting is correct (need to track previous pages loaded)
                    if (
                        options.page > 1 &&
                        !lastQueries.pages.includes(options.page - 1, options.page - 2)
                    ) {
                        // console.log('The previous pages weren\'t buffered yet');
                        // we'll need to load pages 1 through options.page
                        filterQuery.limit = options.perPage * options.page
                        filterQuery.skip = 0
                        // add those page to lastQueries.pages
                        for (let addPage = 1; addPage < options.page; addPage++) {
                            // settings as loaded page {addPage}
                            // console.log('settings as loaded previous page #', addPage);
                            lastQueries.pages.push(addPage)
                        }
                    }

                    // fetch Tokens
                    await tokenKeepAuth()

                    // Fetch from each service allowed
                    if (options.service.length === 0) {
                        options.service = Object.keys(session.services)
                    }

                    options.service.forEach(
                        /** @param {Number} serviceId */
                        function (serviceId) {
                            // Only load from a specific MLS Service
                            if (Object.prototype.hasOwnProperty.call(session.services, serviceId)) {
                                const request = {
                                    serviceId: serviceId,
                                    urlRoot: session.services[serviceId].host,
                                    target: apiModel + '/search',
                                    api: {
                                        filter: filterQuery,
                                        // route and controller needed and only used by Sitetheory
                                        meta: {
                                            method: 'get',
                                            action: 'search'
                                        },
                                        route: {
                                            controller: apiModelSingular // There might be a better way to do this
                                        }
                                    }
                                }

                                collections.push(
                                    createCollection(request)
                                )
                            }
                        }
                    )

                    // When using the same WHERE and only changing the page, results should pool together (append)
                    // Fetch and Merge all results together into single list
                    await fetchMergeCollections(collection, collections, !refresh)

                    // If the query as updated, adjust the TotalRecords available
                    if (refresh) {
                        const totalRecords = collection.header.get('x-total-count') || 0
                        collection.meta.set('totalRecords', totalRecords)
                        collection.meta.set('totalPages', Math.ceil(totalRecords / options.perPage))
                    }

                    // Sort once more on the front end to ensure it's ordered correctly
                    orderBy(collection, options.order)

                    // Ensure the changes update on the DOM
                    Object.keys(instance[instanceName]).forEach(function (listName) {
                        // instance.List[listName].$digest(); // Digest to ensure the DOM/$watch updates with new model data
                        instance[instanceName][listName].$applyAsync() // Digest to ensure the DOM/$watch updates with new model data
                    })
                }

                // then save this in the last queries
                lastQueries.whereFilter = _.clone(filterQuery.where)
                lastQueries.order = options.order
                lastQueries.perPage = options.perPage
                lastQueries.pages.push(options.page)
                // console.log('lastQueries:', lastQueries);

                return collection
            }

            /**
             *
             * @param {Object} $scope
             * @param {String} modelVarName - The variable name assigned in the scope to hold the model results
             * @param {Object=} options
             * @param {Number} options.service - Specify a certain MLS Service to load from
             * @param {WhereOptions=} options.where
             * @param {Boolean || Object =} options.images - Include Image data
             * @param {Number=} options.images.limit
             * @param {Array<String>=} options.images.fields
             * @param {Array<String>=} options.fields - Which Fields to return
             * @param {Boolean=} options.append - Append to currently loaded collection or fetch freshly
             * @param {String} apiModel
             * @param {Function} compileFilterFunction
             * @returns {Promise<Model>}
             */
            async function genericSearchModel($scope, modelVarName, options, apiModel, compileFilterFunction) {
                await tokenKeepAuth()

                let apiModelSingular = ''
                switch (apiModel) {
                    case 'Properties':
                        apiModelSingular = 'Property'
                        break
                    case 'Members':
                        apiModelSingular = 'Member'
                        break
                    case 'Offices':
                        apiModelSingular = 'Office'
                        break
                    case 'OpenHouses':
                        apiModelSingular = 'OpenHouse'
                        break
                }

                options = options || {}
                options.service = options.service || 0
                options.where = options.where || {}
                options.images = options.images || false
                options.fields = options.fields || []
                options.perPage = 1

                // Prepare the Model and ensure we don't keep replacing it
                let model
                if (Object.prototype.hasOwnProperty.call($scope, modelVarName)) {
                    model = $scope[modelVarName]
                }
                if (!model) {
                    model = new Model()
                }
                if (
                    !Object.prototype.hasOwnProperty.call($scope, modelVarName) ||
                    $scope[modelVarName] !== model
                ) {
                    $scope[modelVarName] = model
                }

                if (
                    Object.prototype.hasOwnProperty.call(session.services, options.service)
                ) {
                    // Set API paths to fetch listing data for the specific MLS Service
                    // let filterQuery = compileFilterFunction(options);

                    const request = {
                        serviceId: options.service,
                        urlRoot: session.services[options.service].host,
                        target: apiModel + '/search',
                        api: {
                            filter: compileFilterFunction(options),
                            // route and controller needed and only used by Sitetheory
                            meta: {
                                method: 'get',
                                action: 'search'
                            },
                            route: {
                                controller: apiModelSingular // There might be a better way to do this
                            }
                        }
                    }

                    const tempModel = createModel(request)

                    fetchReplaceModel(model, tempModel)
                        .then(function () {
                            // $scope.$digest();
                            $scope.$applyAsync()
                        })
                }

                return $scope[modelVarName]
            }

            /**
             *
             * @param {Object} $scope
             * @param {String} collectionVarName - The variable name assigned in the scope to hold the Collection results
             * @param {Object=} options
             * @param {[Number]=} options.service - Specify certain MLS Services to load from
             * @param {WhereOptions=} options.where
             * @param {[String]=} options.order
             * @param {Number=} options.page
             * @param {Number=} options.perPage
             * @param {Boolean || Object =} options.images - Include Image data
             * @param {Number=} options.images.limit
             * @param {[String]=} options.images.fields
             * @param {Boolean || Object =} options.openhouses - Include Openhouse data
             * @param {[String]=} options.fields - Which Fields to return
             * @param {Boolean=} refresh - Which Fields to return
             * @returns {Promise<Collection>}
             */
            async function fetchProperties($scope, collectionVarName, options, refresh) {
                options = options || {}
                options.service = options.service || []
                options.where = options.where || urlOptions.Search || {} // TODO may want to sanitize the urlOptions
                options.order = options.order || urlOptions.Search.Order || []
                options.page = options.page || urlOptions.Search.Page || 1
                options.perPage = options.perPage || 10
                options.images = options.images || false
                options.fields = options.fields || [
                    '_id',
                    '_Class',
                    'MlsStatus',
                    'PropertyType',
                    'PropertySubType',
                    'UnparsedAddress',
                    'StreetNumberNumeric',
                    'StreetName',
                    'StreetSuffix',
                    'UnitNumber',
                    'City',
                    'CountyOrParish',
                    'StateOrProvince',
                    'ListPrice',
                    'ClosePrice',
                    'ListingId',
                    'ListingKey',
                    'BathroomsFull',
                    'BedroomsTotal'
                ]
                // options.where['ListType'] = ['House','Townhouse'];
                refresh = refresh || false

                return genericSearchCollection($scope, collectionVarName, options, refresh,
                    'List',
                    'Properties',
                    compilePropertyFilter
                )
            }

            /**
             *
             * @param {Object} $scope
             * @param {String} modelVarName - The variable name assigned in the scope to hold the model results
             * @param {Object=} options
             * @param {Number} options.service - Specify a certain MLS Service to load from
             * @param {WhereOptions=} options.where
             * @param {Boolean || Object =} options.images - Include Image data
             * @param {Number=} options.images.limit
             * @param {Array<String>=} options.images.fields
             * @param {Boolean || Object =} options.openhouses - Include Openhouse data
             * @param {Array<String>=} options.fields - Which Fields to return
             * @param {Boolean=} options.append - Append to currently loaded collection or fetch freshly
             * @returns {Promise<Model>}
             */
            async function fetchProperty($scope, modelVarName, options) {
                options = options || {}
                options.service = options.service || null
                options.where = options.where || {}
                options.images = options.images || false
                options.openhouses = options.openhouses || false
                options.fields = options.fields || []

                return genericSearchModel($scope, modelVarName, options,
                    'Properties',
                    compilePropertyFilter
                )
            }

            /**
             *
             * @param {Object} $scope
             * @param {String} collectionVarName - The variable name assigned in the scope to hold the Collection results
             * @param {Object=} options
             * @param {[Number]=} options.service - Specify certain MLS Services to load from
             * @param {WhereOptions=} options.where
             * @param {[String]=} options.order
             * @param {Number=} options.page
             * @param {Number=} options.perPage
             * @param {Boolean || Object =} options.images - Include Image data
             * @param {Number=} options.images.limit
             * @param {[String]=} options.images.fields
             * @param {[String]=} options.fields - Which Fields to return
             * @param {Boolean || Object =} options.office - Include Office data
             * @param {Boolean=} refresh - Which Fields to return
             * @returns {Promise<Collection>}
             */
            async function fetchMembers($scope, collectionVarName, options, refresh) {
                options = options || {}
                options.service = options.service || []
                options.listName = options.listName || 'MemberList'
                options.where = options.where || {}
                options.order = options.order || []
                options.page = options.page || 1
                options.perPage = options.perPage || 10
                options.images = options.images || false
                options.office = options.office || false
                options.fields = options.fields || [
                    '_id',
                    'MemberKey',
                    'MemberStateLicense',
                    'MemberNationalAssociationId',
                    'MemberFirstName',
                    'MemberLastName',
                    'MemberFullName',
                    'MemberStatus',
                    'MemberMlsAccessYN',
                    'MemberType',
                    'OfficeKey',
                    'OfficeName',
                    'OriginatingSystemName',
                    'SourceSystemName'
                ]
                // options.where['ListType'] = ['House','Townhouse'];
                refresh = refresh || false

                return genericSearchCollection($scope, collectionVarName, options, refresh,
                    options.listName,
                    'Members',
                    compileMemberFilter
                )
            }

            /**
             *
             * @param {Object} $scope
             * @param {String} collectionVarName - The variable name assigned in the scope to hold the Collection results
             * @param {Object=} options
             * @param {[Number]=} options.service - Specify certain MLS Services to load from
             * @param {WhereOptions=} options.where
             * @param {[String]=} options.order
             * @param {Number=} options.page
             * @param {Number=} options.perPage
             * @param {[String]=} options.order
             * @param {Boolean || Object =} options.images - Include Image data
             * @param {Number=} options.images.limit
             * @param {[String]=} options.images.fields
             * @param {Boolean || Object =} options.managingBroker - Include Managing Broker Member data
             * @param {Boolean || Object =} options.members - Include Member data
             * @param {[String]=} options.fields - Which Fields to return
             * @param {Boolean=} refresh - Which Fields to return
             * @returns {Promise<Collection>}
             */
            async function fetchOffices($scope, collectionVarName, options, refresh) {
                options = options || {}
                options.service = options.service || []
                options.where = options.where || {}
                options.order = options.order || []
                options.page = options.page || 1
                options.perPage = options.perPage || 10
                options.images = options.images || false
                options.managingBroker = options.managingBroker || false
                options.members = options.members || false
                options.fields = options.fields || [
                    '_id',
                    'OfficeKey',
                    'OfficeName',
                    'OfficeNationalAssociationId',
                    'OfficeStatus',
                    'OfficePhone',
                    'OfficeAddress1',
                    'OfficePostalCode',
                    'OfficeBrokerKey'
                ]
                // options.where['ListType'] = ['House','Townhouse'];
                refresh = refresh || false

                return genericSearchCollection($scope, collectionVarName, options, refresh,
                    'OfficeList',
                    'Offices',
                    compileOfficeFilter
                )
            }

            return {
                fetchMembers: fetchMembers,
                fetchOffices: fetchOffices,
                fetchProperties: fetchProperties,
                fetchProperty: fetchProperty,
                getListInstance: getListInstance,
                getListInstanceLinks: getListInstanceLinks,
                getSearchInstanceLinks: getSearchInstanceLinks,
                getUrlOptionsPath: getUrlOptionsPath,
                getMLSVariables: getMLSVariables,
                getOptionsFromUrl: getOptionsFromUrl,
                getUrlOptions: getUrlOptions,
                tokenKeepAuth: tokenKeepAuth,
                registerListInstance: registerListInstance,
                registerSearchInstance: registerSearchInstance,
                registerDetailsInstance: registerDetailsInstance,
                setPageTitle: setPageTitle,
                setTokenURL: setTokenURL,
                setUrlOptions: setUrlOptions,
                refreshUrlOptions: refreshUrlOptions,
                unregisterDetailsInstance: unregisterDetailsInstance
            }
        }
        ])
    }
]
