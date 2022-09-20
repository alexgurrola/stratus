// MdChipsDraggable Directive
// -----------------
//
// Forked from: https://gist.github.com/h0merjam/aec5bb1c68a3bfb0ae95c1b83344a4cf
//
// Example Usage:
//
// <md-chips ng-model="ctrl.fruitNames">
//     <md-chip-template>
//         <div md-chip-draggable>{{$chip}}</div>
//     </md-chip-template>
// </md-chips>
//
// Note: This works by adding the logic to the md-chip-template, so we can
// effectively break out of the limitations set by the original Angular
// Material Directive.

// Runtime
import _ from 'lodash'
import {
    Stratus
} from '@stratusjs/runtime/stratus'
import angular, {
    IScope,
    IParseService,
    IDocumentService,
    ITimeoutService
} from 'angular'

// Angular 1 Modules
import 'angular-material'

// Environment
// const min = !cookie('env') ? '.min' : ''
const name = 'mdChipDraggable'
// const localPath = '@stratusjs/angularjs-extras/src/directives'

// This directive intends to handle binding of a model to a function,
// triggered upon true
Stratus.Directives.MdChipDraggable = (
    $parse: IParseService
) => ({
    restrict: 'A',
    require: 'ngModel',
    scope: {},
    link: (
        $document: IDocumentService,
        $scope: IScope & any,
        $element: JQLite & any,
        $timeout: ITimeoutService,
    ) => {
        // Initialize
        const $ctrl: any = this
        $ctrl.uid = _.uniqueId(_.snakeCase(name) + '_')
        Stratus.Instances[$ctrl.uid] = $scope
        $scope.elementId = $element.elementId || $ctrl.uid
        $scope.initialized = false

        const options = {
            axis: 'horizontal',
        }
        const handle = $element[0]
        const draggingClassName = 'dragging'
        const droppingClassName = 'dropping'
        const droppingBeforeClassName = 'dropping--before'
        const droppingAfterClassName = 'dropping--after'
        let dragging = false
        let preventDrag = false
        let dropPosition: any
        let dropTimeout: any

        const move = function (from: any, to: any) {
            this.splice(to, 0, this.splice(from, 1)[0])
        }

        $element = angular.element($element[0].closest('md-chip'))

        $element.attr('draggable', true)

        $element.on('mousedown', (event: any) => {
            if (event.target !== handle) {
                preventDrag = true
            }
        })

        $document.on('mouseup', () => {
            preventDrag = false
        })

        $element.on('dragstart', (event: any) => {
            if (preventDrag) {
                event.preventDefault()

            } else {
                dragging = true

                $element.addClass(draggingClassName)

                const dataTransfer = event.dataTransfer || event.originalEvent.dataTransfer

                dataTransfer.effectAllowed = 'copyMove'
                dataTransfer.dropEffect = 'move'
                dataTransfer.setData('text/plain', $scope.$parent.$mdChipsCtrl.items.indexOf($scope.$parent.$chip))
            }
        })

        $element.on('dragend', () => {
            dragging = false

            $element.removeClass(draggingClassName)
        })

        const dragOverHandler = (event: any) => {
            if (dragging) {
                return
            }

            event.preventDefault()

            const bounds = $element[0].getBoundingClientRect()

            const props = {
                width: bounds.right - bounds.left,
                height: bounds.bottom - bounds.top,
                x: (event.originalEvent || event).clientX - bounds.left,
                y: (event.originalEvent || event).clientY - bounds.top,
            }

            const offset = options.axis === 'vertical' ? props.y : props.x
            const midPoint = (options.axis === 'vertical' ? props.height : props.width) / 2

            $element.addClass(droppingClassName)

            if (offset < midPoint) {
                dropPosition = 'before'
                $element.removeClass(droppingAfterClassName)
                $element.addClass(droppingBeforeClassName)

            } else {
                dropPosition = 'after'
                $element.removeClass(droppingBeforeClassName)
                $element.addClass(droppingAfterClassName)
            }
        }

        const dropHandler = (event: any) => {
            event.preventDefault()

            const droppedItemIndex =
                parseInt(
                    (event.dataTransfer || event.originalEvent.dataTransfer).getData('text/plain'),
                    10
                )
            const currentIndex = $scope.$parent.$mdChipsCtrl.items.indexOf($scope.$parent.$chip)
            let newIndex: any = null

            if (dropPosition === 'before') {
                if (droppedItemIndex < currentIndex) {
                    newIndex = currentIndex - 1
                } else {
                    newIndex = currentIndex
                }
            } else {
                if (droppedItemIndex < currentIndex) {
                    newIndex = currentIndex
                } else {
                    newIndex = currentIndex + 1
                }
            }

            // prevent event firing multiple times in firefox
            $timeout.cancel(dropTimeout)
            dropTimeout = $timeout(() => {
                dropPosition = null

                move.apply($scope.$parent.$mdChipsCtrl.items, [droppedItemIndex, newIndex])

                $scope.$apply(() => {
                    $scope.$emit('mdChipDraggable:change', {
                        collection: $scope.$parent.$mdChipsCtrl.items,
                        item: $scope.$parent.$mdChipsCtrl.items[droppedItemIndex],
                        from: droppedItemIndex,
                        to: newIndex,
                    })
                })

                $element.removeClass(droppingClassName)
                $element.removeClass(droppingBeforeClassName)
                $element.removeClass(droppingAfterClassName)

                $element.off('drop', dropHandler)
            }, 1000 / 16)
        }

        $element.on('dragenter', () => {
            if (dragging) {
                return
            }

            $element.off('dragover', dragOverHandler)
            $element.off('drop', dropHandler)

            $element.on('dragover', dragOverHandler)
            $element.on('drop', dropHandler)
        })

        $element.on('dragleave', (event: any) => {
            $element.removeClass(droppingClassName)
            $element.removeClass(droppingBeforeClassName)
            $element.removeClass(droppingAfterClassName)
        })
    }
})
