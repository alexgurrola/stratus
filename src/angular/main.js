System.register(["@stratus/angular/polyfills", "stratus", "@angular/core", "@angular/platform-browser-dynamic", "@stratus/environments/environment", "@stratus/angular/app.module"], function (exports_1, context_1) {
    "use strict";
    var Stratus, core_1, platform_browser_dynamic_1, environment_1, app_module_1;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (_1) {
            },
            function (Stratus_1) {
                Stratus = Stratus_1;
            },
            function (core_1_1) {
                core_1 = core_1_1;
            },
            function (platform_browser_dynamic_1_1) {
                platform_browser_dynamic_1 = platform_browser_dynamic_1_1;
            },
            function (environment_1_1) {
                environment_1 = environment_1_1;
            },
            function (app_module_1_1) {
                app_module_1 = app_module_1_1;
            }
        ],
        execute: function () {
            if (environment_1.environment.production) {
                core_1.enableProdMode();
            }
            Stratus.DOM.complete(() => {
                const s2 = [
                    's2-selector',
                    's2-tree'
                ];
                let detected = false;
                s2.forEach(component => {
                    if (detected) {
                        return;
                    }
                    const elements = document.getElementsByTagName(component);
                    if (!elements || !elements.length) {
                        return;
                    }
                    detected = true;
                });
                if (!detected) {
                    return;
                }
                platform_browser_dynamic_1.platformBrowserDynamic().bootstrapModule(app_module_1.AppModule)
                    .then(module => {
                    console.log('@stratus/angular initialized successfully!');
                })
                    .catch(err => console.error('@stratus/angular failed to initialize!', err));
            });
        }
    };
});