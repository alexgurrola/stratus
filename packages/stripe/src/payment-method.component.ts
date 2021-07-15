// Angular Core
import {
    Component,
    ElementRef,
    Inject,
    Input,
    OnDestroy,
    OnInit,
    Optional
} from '@angular/core'
import {DomSanitizer} from '@angular/platform-browser'
import {
    MAT_DIALOG_DATA,
    MatDialogRef
} from '@angular/material/dialog'
/*import {
    FormBuilder,
    FormGroup
} from '@angular/forms'*/

// Runtime
import _ from 'lodash'
import {keys} from 'ts-transformer-keys'

// Stratus Dependencies
import {
    Stratus
} from '@stratusjs/runtime/stratus'
import {RootComponent} from '@stratusjs/angular/core/root.component'
import {Model} from '@stratusjs/angularjs/services/model'
import {cookie} from '@stratusjs/core/environment'


// Services
import {StripeService} from '@stratusjs/stripe/stripe.service'

// Local Setup
const min = !cookie('env') ? '.min' : ''
const packageName = 'stripe'
const componentName = 'payment-method'
const localDir = `${Stratus.BaseUrl}${Stratus.DeploymentPath}@stratusjs/${packageName}/src/`

/**
 * @title Dialog for Nested Tree
 */
@Component({
    selector: `sa-${packageName}-${componentName}`,
    // templateUrl: `${localDir}/${parentModuleName}/${moduleName}.component.html`,
    templateUrl: `${localDir}${componentName}.component${min}.html`,
    // changeDetection: ChangeDetectionStrategy.OnPush
})
export class StripePaymentMethodComponent extends RootComponent implements OnDestroy, OnInit {

    // Basic Component Settings
    title = `${packageName}_${componentName}_component`
    uid: string
    @Input() elementId: string

    // Dependencies
    _: any

    // States
    styled = false
    initialized = false
    cardComplete = false
    cardSaved = false
    formPending = false

    // The SetupIntent Secret. This allows altering the SetupIntent that was created such as changing card details
    @Input() clientSecret: string
    @Input() publishKey = ''
    @Input() detailedBillingInfo?: boolean
    paymentMethodApiPath = 'PaymentMethod'
    billingInfo: stripe.BillingDetails = { // fixme should copy stripe.BillingDetails // PaymentBillingInfo
        address: {}
    }
    // card: stripe.elements.Element
    private cardId?: string

    constructor(
        private elementRef: ElementRef,
        private sanitizer: DomSanitizer,
        private Stripe: StripeService,
        @Optional() private dialogRef: MatDialogRef<StripePaymentMethodComponent>, // TODO detect if we are a dialog
        @Optional() @Inject(MAT_DIALOG_DATA) private dialogData: StripePaymentMethodDialogData,
    ) {
        // Chain constructor
        super()

        // Initialization
        this.uid = _.uniqueId(`sa_${_.snakeCase(this.title)}_`)
        Stratus.Instances[this.uid] = this
        this.elementId = this.elementId || this.uid

        // TODO: Assess & Possibly Remove when the System.js ecosystem is complete
        // Load Component CSS until System.js can import CSS properly.
        Stratus.Internals.CssLoader(`${localDir}${componentName}.component${min}.css`)
            .then(() => {
                this.styled = true
            })
            .catch(() => {
                console.error('CSS Failed to load for Component:', this)
                this.styled = false
            })

        // Hydrate Root App Inputs
        this.hydrate(this.elementRef, this.sanitizer, keys<StripePaymentMethodComponent>())

        // Hydrate Dialog Data
        if (!_.isEmpty(this.dialogData)) {
            const keysPossible = keys<StripePaymentMethodDialogData>()
            Object.keys(this.dialogData).forEach((attr) => {
                if (!_.isEmpty(attr) && _.includes(keysPossible, attr)) {
                    _.set(this, attr, this.dialogData[attr as keyof StripePaymentMethodDialogData])
                }
            })
        }
    }

    async ngOnInit() {
        const options: stripe.elements.ElementsOptions = {
            // {} // style options
            // FIXME dont simplify. detailedBillingInfo needs to be converted to boolean
            hidePostalCode: this.detailedBillingInfo ? true : false // option can remove postal
        }
        this.cardId = await this.Stripe.createElement(
            this.uid,
            this.publishKey,
            'card',
            options,
            `#${this.elementId}-mount`
        )
        console.log('loading', _.clone(options))
        // Render the Card
        // this.card.mount(`#${this.elementId}-mount`)
        // Provide possible Stripe errors
        // this.card.addEventListener('change', (event) => {
        this.Stripe.elementAddEventListener(this.cardId, 'change', (event: stripe.elements.ElementChangeResponse) => {
            const displayError = document.getElementById(`${this.elementId}-errors`)
            console.log('event', event) // Can get postal code from here
            // need to track if button is able to save
            if (
                Object.prototype.hasOwnProperty.call(event, 'complete') &&
                this.cardComplete !== event.complete
            ) {
                // this.$applyAsync(() => {
                this.cardComplete = event.complete
                // })
            }
            // Ensure we display any errors
            if (event.error) {
                displayError.textContent = event.error.message
            } else {
                displayError.textContent = ''
            }
        })

        // $scope.$applyAsync(() => {
        this.initialized = true
        // })

    }

    isEditable() {
        // console.log('isEditable = ', !this.formPending && this.initialized)
        return !this.formPending && this.initialized
    }

    /**
     * If all text fields are filled out (other than card details)
     */
    isBillingDetailsFilled() {
        if (
            !_.isEmpty(this.billingInfo.name) &&
            !_.isEmpty(this.billingInfo.email) &&
            !_.isEmpty(this.billingInfo.address.line1) &&
            !_.isEmpty(this.billingInfo.address.city) &&
            !_.isEmpty(this.billingInfo.address.state) &&
            !_.isEmpty(this.billingInfo.address.postal_code)
        ) {
            // TODO not checking this yet
        }
        return this.isEditable()
    }

    isSubmittable() {
        return this.cardComplete && this.isEditable() && this.isBillingDetailsFilled()
    }

    /**
     * Check and template fields and submit to Stripe to attempt a Confirm Card Setup
     */
    async saveCard() {
        if (!this.isSubmittable()) {
            // prevent trying to submit when not needed
            return
        }

        // TODO need to freeze all input fields as this could take a moment and changes will do nothing
        // TODO add loading bar to show something is being worked on
        this.formPending = true
        const {setupIntent, error} = await this.Stripe.confirmCardSetup(
            this.cardId,
            this.clientSecret,
            {
                payment_method: {
                    billing_details: this.billingInfo
                    //    name: 'Test'
                    // }
                }
            }
        )

        if (error) {
            // Display error.message in your UI.
            console.error('error:', error, setupIntent) // only run this in dev mode

            // $scope.$applyAsync(() => {
            this.formPending = false
            const displayError = document.getElementById(`${this.elementId}-errors`)
            let errorMessage = 'An Unknown Error has occurred'
            if (Object.prototype.hasOwnProperty.call(error, 'message')) {
                errorMessage = error.message
            }
            displayError.textContent = errorMessage
            // })
            return
        }

        if (
            setupIntent.status === 'succeeded'
            && _.isString(setupIntent.payment_method)
        ) {
            // The setup has succeeded.
            // Send setupIntent.payment_method to your server to save the card to a Customer as default
            const model = new Model({
                target: this.paymentMethodApiPath
            })
            model.data = {
                payment_method: setupIntent.payment_method
            }
            await model.save()
            // TODO check if Sitetheory refreshed
            // hide form and Display a success message
            // $scope.$applyAsync(() => {
            this.cardSaved = true
            this.formPending = false
            // Reload any collections listing PMs
            this.Stripe.fetchCollections()
            // })
        } else {
            // handle everything else
            // $scope.$applyAsync(() => {
            this.formPending = false
            console.error('something went wrong. no error, no success', setupIntent)
            const displayError = document.getElementById(`${this.elementId}-errors`)
            displayError.textContent = 'An unknown Error has occurred'
            // })
        }
    }

    dialogClose(): void {
        if (this.dialogRef) {
            this.dialogRef.close()
        }
    }

    ngOnDestroy() {
        console.warn('local destroying stratus', this.uid)
        if (this.cardId) {
            this.Stripe.destroyElement(this.cardId)
        }
        super.ngOnDestroy()
        // delete Stratus.Instances[this.uid]
    }

}

export interface StripePaymentMethodDialogData {
    clientSecret: string
    publishKey: string
    detailedBillingInfo?: boolean
}
