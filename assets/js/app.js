import Global from './pages/global';

const pageId = document.body.id;
console.log('page id is: ', pageId);

// Page Templates
const pageClasses = {
    ABAL: () => import('./pages/page'), // Customer account balance
};

// Alternate Page Templates (for specific categories and products)
const customClasses = {
    // ex. overwrite with 'CTGY-MODEL': () => ('./theme/category-model'),
};

/**
 * This function gets called on page load with the current template loaded and JS Context
 * @param pageType String
 * @param contextJSON Context to pass from the template
 * @returns {void}
 */
function magnoliaBootstrap(pageType, contextJSON = null, loadGlobal = true) {
    const context = JSON.parse(contextJSON || '{}');
    context.pageId = pageType;
    // Load globals
    if (loadGlobal) {
        Global.load(context);
    }
    const importPromises = [];
    // Find the appropriate page loader based on pageType
    const pageClassImporter = pageClasses[pageType];
    if (typeof pageClassImporter === 'function') {
        importPromises.push(pageClassImporter());
    }

    // See if there is a page class default for a custom template
    const customTemplateImporter = customClasses[context.pageCode];
    if (typeof customTemplateImporter === 'function') {
        importPromises.push(customTemplateImporter());
    }

    // Wait for imports to resolve, then call load() on them
    Promise.all(importPromises).then(imports => {
        imports.forEach(imported => {
            imported.default.load(context);
        });
    });
}

magnoliaBootstrap(pageId);
