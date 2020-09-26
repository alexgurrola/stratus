// Angular Core
import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    Inject,
    OnDestroy,
    OnInit
} from '@angular/core'
import {
    FormBuilder,
    FormGroup
} from '@angular/forms'
import {
    MAT_DIALOG_DATA,
    MatDialogRef
} from '@angular/material/dialog'

// RXJS
import {
    debounceTime,
    finalize,
    switchMap,
    tap
} from 'rxjs/operators'

// External
import _ from 'lodash'
import {Stratus} from '@stratusjs/runtime/stratus'

// Angular 1 Services
import {Model} from '@stratusjs/angularjs/services/model'

// Services
import {HttpResponse} from '@angular/common/http'
import {BackendService} from '@stratusjs/angular/backend.service'

// Interfaces
import {Convoy} from '@stratusjs/angular/data/convoy.interface'
import {Content} from '@stratusjs/angular/data/content.interface'

// Data Types
export interface DialogData {
    backend: BackendService
    id: number
    name: string
    target: string
    level: string
    content: any
    url: string
    model: Model
    collection: any
    parent: any
    nestParent: any
}

// Local Setup
const installDir = '/assets/1/0/bundles'
const systemDir = '@stratusjs/angular'
const moduleName = 'tree-dialog'
const parentModuleName = 'tree'

// Directory Template
const localDir = `${installDir}/${boot.configuration.paths[`${systemDir}/*`].replace(/[^/]*$/, '')}`

/**
 * @title Dialog for Nested Tree
 */
@Component({
    selector: `sa-${moduleName}`,
    templateUrl: `${localDir}/${parentModuleName}/${moduleName}.component.html`,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TreeDialogComponent implements OnInit, OnDestroy {

    // Basic Component Settings
    title = moduleName + '_component'
    uid: string

    // Timing Flags
    isInitialized = false
    isDestroyed = false
    isStyled = false

    // Dependencies
    _: any

    // Services
    backend: BackendService

    // View Elements
    // @ViewChild('nameInput') nameField: ElementRef

    // TODO: Move this to its own AutoComplete Component
    // AutoComplete Data
    filteredContentOptions: Array<any>
    dialogContentForm: FormGroup
    isContentLoading = false
    lastContentSelectorQuery: string

    // filteredParentOptions: any[]
    // dialogParentForm: FormGroup
    // isParentLoading = false
    // lastParentSelectorQuery: string

    constructor(
        public dialogRef: MatDialogRef<TreeDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: DialogData,
        private fb: FormBuilder,
        private ref: ChangeDetectorRef
    ) {
        // Manually render upon data change
        // ref.detach()
    }

    ngOnInit() {
        // Initialization
        this.uid = _.uniqueId(`sa_${moduleName}_component_`)
        Stratus.Instances[this.uid] = this

        // Dependencies
        this._ = _

        // TODO: Assess & Possibly Remove when the System.js ecosystem is complete
        // Load Component CSS until System.js can import CSS properly.
        // FIXME: This needs to work the same way the selector and editor do, which wait for the CSS until it is marked as "styled"
        Stratus.Internals.CssLoader(`${localDir}/${parentModuleName}/${moduleName}.component.css`)
            .then(() => {
                this.isStyled = true
                this.refresh()
            })
            .catch(() => {
                console.error('CSS Failed to load for Component:', this)
                this.isStyled = true
                this.refresh()
            })

        // Hoist Service
        this.backend = this.data.backend

        // Element Focus
        /* *
        if (this.nameField) {
            this.nameField.nativeElement.focus()
        } else {
            console.log('nameField:', this.nameField)
        }
        /* */

        // TODO: Move this to its own AutoComplete Component
        // AutoComplete Logic
        this.dialogContentForm = this.fb.group({
            contentSelectorInput: this.data.content || null
        })
        this.dialogContentForm
            .get('contentSelectorInput')
            .valueChanges
            .pipe(
                debounceTime(300),
                tap(() => this.isContentLoading = true),
                switchMap((value: any) => {
                        if (_.isString(value)) {
                            this.lastContentSelectorQuery = `/Api/Content?options[showCollection]=null&q=${value}`
                        } else {
                            this.data.content = value
                            this.data.url = null
                        }
                        return this.backend.get(this.lastContentSelectorQuery)
                            .pipe(
                                finalize(() => this.isContentLoading = false),
                            )
                    }
                )
            )
            .subscribe((response: HttpResponse<Convoy<any>>) => this.handleContent(response))

        // Initialize ContentSelector with Empty Input
        // this.dialogContentForm
        //     .get('contentSelectorInput')
        //     .setValue('')

        // Initial Call for Content
        this.backend.get('/Api/Content?options[showCollection]=null&q=')
            .pipe(
                finalize(() => this.isContentLoading = false),
            )
            .subscribe((response: HttpResponse<Convoy<any>>) => this.handleContent(response))

        // Handle Parent Selector
        // this.dialogParentForm = this.fb.group({
        //     parentSelectorInput: this.data.nestParent
        // })
        //
        // this.dialogParentForm
        //     .get('parentSelectorInput')
        //     .valueChanges
        //     .pipe(
        //         debounceTime(300),
        //         tap(() => this.isParentLoading = true),
        //         switchMap(value => {
        //                 if (_.isString(value)) {
        //                     this.lastParentSelectorQuery = `/Api/MenuLink?q=${value}`
        //                 } else {
        //                     this.data.nestParent = value
        //                 }
        //                 return this.backend.get(this.lastParentSelectorQuery)
        //                     .pipe(
        //                         finalize(() => this.isParentLoading = false),
        //                     )
        //             }
        //         )
        //     )
        //     .subscribe(response => {
        //         if (!response.ok || response.status !== 200 || _.isEmpty(response.body)) {
        //             return this.filteredParentOptions = []
        //         }
        //         const payload = _.get(response.body, 'payload') || response.body
        //         if (_.isEmpty(payload) || !Array.isArray(payload)) {
        //             return this.filteredParentOptions = []
        //         }
        //         return this.filteredParentOptions = payload
        //     })

        // Mark as complete
        this.isInitialized = true

        // FIXME: We have to go in this roundabout way to force changes to be detected since the
        // Dialog Sub-Components don't seem to have the right timing for ngOnInit
        this.refresh()
    }

    ngOnDestroy() {
        this.isDestroyed = true
    }

    public refresh() {
        if (this.isDestroyed) {
            return
        }
        if (!this.ref) {
            console.error('ref not available:', this)
            return
        }
        this.ref.detach()
        this.ref.detectChanges()
        this.ref.reattach()
    }

    onCancelClick(): void {
        this.dialogRef.close()
        // FIXME: We have to go in this roundabout way to force changes to be detected since the
        // Dialog Sub-Components don't seem to have the right timing for ngOnInit
        this.refresh()
    }

    displayContentText(content: Content) {
        // Ensure Content is Selected before Display Text
        if (!content) {
            return
        }
        // Routing Fallback
        const routing = _.get(content, 'routing[0].url')
        const routingText = !_.isUndefined(routing) ? `/${routing}` : null
        // ContentId Fallback
        const contentId = _.get(content, 'id')
        const contentIdText = !_.isUndefined(contentId) ? `Content: ${contentId}` : null
        // Return Version Title or Fallback Text
        return _.get(content, 'version.title') || routingText || contentIdText
    }

    // displayName(option: any) {
    //     if (option) {
    //         return _.get(option, 'name')
    //     }
    // }

    private handleContent(response:HttpResponse<Convoy<any>>) {
        if (!response.ok || response.status !== 200 || _.isEmpty(response.body)) {
            this.filteredContentOptions = []
            // FIXME: We have to go in this roundabout way to force changes to be detected since the
            // Dialog Sub-Components don't seem to have the right timing for ngOnInit
            this.refresh()
            return this.filteredContentOptions
        }
        const payload = _.get(response.body, 'payload') || response.body
        if (_.isEmpty(payload) || !Array.isArray(payload)) {
            this.filteredContentOptions = []
            // FIXME: We have to go in this roundabout way to force changes to be detected since the
            // Dialog Sub-Components don't seem to have the right timing for ngOnInit
            this.refresh()
            return this.filteredContentOptions
        }
        this.filteredContentOptions = payload
        // FIXME: We have to go in this roundabout way to force changes to be detected since the
        // Dialog Sub-Components don't seem to have the right timing for ngOnInit
        this.refresh()
        return this.filteredContentOptions
    }
}
