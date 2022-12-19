// Universal Button
import {
    InputButtonPlugin
} from './inputButton'
import {
    Link
} from '../../editor/link-dialog.component'
import {
    LooseObject
} from '@stratusjs/core/misc'

// @ts-ignore
import FroalaEditor from 'froala-editor'

// Plugin Options
FroalaEditor.DEFAULTS = Object.assign(FroalaEditor.DEFAULTS, {
    endpoint: '/Api/Content'
})

/**
 * @param editor The Froala instance
 */
FroalaEditor.PLUGINS.linkManager = function linkManager (editor: any) {
    let inputButton: InputButtonPlugin

    const linkPlugin = FroalaEditor.PLUGINS.link(editor)
    const debug = false

    // When the plugin is initialized,this will be called.
    function _init() {
        inputButton = new InputButtonPlugin<Link>({
            name: 'Link Manager',
            eventName: 'link-library',
            editor,
            insert: (link: Link) => {
                const attrs: LooseObject = {}
                if (link.id) {
                    attrs['data-content-id'] = link.id
                }
                if (link.target) {
                    attrs.target = '_blank'
                }
                linkPlugin.insert(link.url, link.text, attrs)
            },
            autoSaveSelection: true,
            autoRestoreSelection: true,
            debug
        })

        if (debug) {
            console.log('initialized:', {
                options: editor.opts.endpoint,
                instance: this
            })
        }

        // Editor methods
        // editor.methodName(params);

        // Event listeners
        // editor.events.add('contentChanged', function (params) {});
    }

    function onClick() {
        if (!editor.el) {
            console.warn('linkManager.onClick(): unable to find element')
            return
        }
        inputButton.onClick(editor.el, linkPlugin.get())
    }

    // Expose public methods.
    // Public methods can be accessed through the editor API:
    // editor.myPlugin.publicMethod();
    return {
        // If _init is not public then the plugin won't be initialized.
        _init,
        onClick
    }
}

// Insert Plugin to Image Insert
// TODO: Register a linkManagerEdit button pointed to the edit svg
FroalaEditor.RegisterCommand('linkManager', {
    title: 'Insert from Link Library',
    undo: false,
    focus: false,
    modal: true,
    callback() {
        this.linkManager.onClick(undefined, FroalaEditor.PLUGINS.link(this).get())
    },
    plugin: 'linkManager',
}),
FroalaEditor.DefineIcon('linkManager', {NAME: 'folder', SVG_KEY: 'insertLink'}),

// Link Edit Icon
FroalaEditor.RegisterCommand('linkManagerEdit', {
    title: 'Edit Link',
    undo: false,
    focus: false,
    modal: true,
    callback() {
        this.linkManager.onClick(undefined, FroalaEditor.PLUGINS.link(this).get())
    },
    plugin: 'linkManager',
}),
FroalaEditor.DefineIcon('linkManagerEdit', {NAME: 'edit', SVG_KEY: 'edit'}),

// Other Icons
FroalaEditor.DefineIcon('linkManagerInsert', {NAME: 'plus', SVG_KEY: 'add'}),
FroalaEditor.DefineIcon('linkManagerDelete', {NAME: 'trash', SVG_KEY: 'remove'})

// Define a quick insert button
FroalaEditor.RegisterQuickInsertButton('link', {
    // Icon name.
    icon: 'linkManager',

    // Tooltip.
    title: 'Insert from Link Library',

    // Callback for the button.
    callback: function linkManagerCallback () {
        const debug = false
        const inputButton = new InputButtonPlugin<Link>({
            name: 'Link Manager',
            eventName: 'link-library',
            // Contextual `this` is equivalent to the editor instance
            editor: this,
            insert: (link: Link) => {
                FroalaEditor.PLUGINS.link(this).insert(link.url, '', {'aria-label': link.title})
            },
            autoSaveSelection: true,
            autoRestoreSelection: true,
            debug
        })
        if (!this.el) {
            console.warn('linkManager.onClick(): unable to find element')
            return
        }
        inputButton.onClick(this.el)
    },

    // Save changes to undo stack.
    undo: true
})