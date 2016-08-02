//     Stratus.Views.Widgets.Calendar.js 1.0

//     Copyright (c) 2016 by Sitetheory, All Rights Reserved
//
//     All information contained herein is, and remains the
//     property of Sitetheory and its suppliers, if any.
//     The intellectual and technical concepts contained herein
//     are proprietary to Sitetheory and its suppliers and may be
//     covered by U.S. and Foreign Patents, patents in process,
//     and are protected by trade secret or copyright law.
//     Dissemination of this information or reproduction of this
//     material is strictly forbidden unless prior written
//     permission is obtained from Sitetheory.
//
//     For full details and documentation:
//     http://docs.sitetheory.io

// Examples
// ========

// Data Attributes to Control Options
// ----------------------------------
// If you need to manipulate the widget, you can set data attributes to change the default values. See the options in this.options below to know which attributes can be modified from the data attributes.

// Widget
// ======

// Function Factory
// ----------------

// Define AMD, Require.js, or Contextual Scope
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['stratus', 'jquery', 'underscore', 'moment', 'stratus.views.widgets.base', 'fullcalendar'], factory);
    } else {
        factory(root.Stratus, root.$, root._, root.moment);
    }
}(this, function (Stratus, $, _, moment) {

    // Views
    // -------------

    // This Backbone View intends to handle Generic rendering for a single Model.
    Stratus.Views.Widgets.Calendar = Stratus.Views.Widgets.Base.extend({

        model: Stratus.Models.Generic,
        template: _.template(''),
        url: '/Api/',
        /*routes: {
            'range/:dateStart': 'paginate',
            'range/:dateStart/:dateEnd': 'paginate'
        },*/

        options: {
            private: {
                requiredCssFile: [Stratus.BaseUrl + 'sitetheorystratus/stratus/bower_components/fullcalendar/dist/fullcalendar.min.css']
            }
        },

        /**
         * @param entries
         * @returns {boolean}
         */
        onRender: function (entries) {
            var that = this;
            this.$el.fullCalendar({
                header: {
                    left: 'prev,next today',
                    center: 'title',
                    right: 'month,agendaWeek,agendaDay'
                },
                eventLimit: false,//a number assigns the max number of events to display per day
                fixedWeekCount: false,//true = month sets there to always be 6 weeks displayed
                events: function (start, end, timezone, callback) {
                    var events = [];
                    _.each(that.collection.toJSON().payload, function (payload) {
                        events.push({
                            id: payload.id,
                            title: payload.viewVersion.title,
                            start: moment.unix(payload.viewVersion.timeCustom || payload.viewVersion.timePublish || payload.time).format(),//"YYYY-MM-DD"TODO add time? only if not all day?
                            url: payload.routingPrimary.url,
                            allDay: true //hides the time
                            //end: needs to be event to have end
                        });
                    });
                    callback(events);
                }
            });
            return true;
        },
        /**
         * @param dateStart
         * @param dateEnd
         */
        /*paginate: function (dateStart, dateEnd) {
            if (dateStart === undefined) dateStart = '1';
            if (dateEnd === undefined) dateEnd = '1';
            if (!Stratus.Environment.get('production')) {
                console.log('Range: dateStart=', dateStart, 'dateEnd=', dateEnd);
            }
            var collection = Stratus.Collections.get(_.ucfirst(entity));
            if (typeof collection === 'object') {
                if (collection.isHydrated()) {
                    if (collection.meta.has('pageCurrent') && collection.meta.get('pageCurrent') !== parseInt(page)) {
                        if (collection.meta.get('pageTotal') >= parseInt(page) && parseInt(page) >= 1) {
                            collection.meta.set('api.p', page);
                            collection.refresh({ reset: true });
                        } else {
                            if (!Stratus.Environment.get('production')) {
                                console.log('Page', page, 'of entity', entity, 'does not exist.');
                            }
                        }
                    }
                } else {
                    collection.once('reset', function () {
                        this.paginate(dateStart, dateEnd);
                    }, this);
                }
            } else {
                Stratus.Collections.once('change:' + _.ucfirst(entity), function () {
                    this.paginate(dateStart, dateEnd);
                }, this);
            }
        }*/
    });

}));