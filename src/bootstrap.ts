declare var require: (deps: string[]) => void;
declare var requirejs;

requirejs.config({
    appDir: ".",
    baseUrl: "js",
    paths: {
        'jquery': ['//cdnjs.cloudflare.com/ajax/libs/jquery/3.3.1/jquery.min'],
        'seedrandom': ['//cdnjs.cloudflare.com/ajax/libs/seedrandom/2.4.4/seedrandom.min'],
        'lodash': ['//cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.11/lodash.core.min']
    }
});

require(['app']);
