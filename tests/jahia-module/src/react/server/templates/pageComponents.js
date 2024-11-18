export const header = {
    name: 'header',
    nodeType: 'jnt:absoluteArea'
};

export const footer = {
    name: 'footer',
    nodeType: 'jnt:absoluteArea'
};

export const login = {
    name: 'login',
    nodeType: 'jnt:loginForm'
};

export const navMenu = {
    name: 'navMenu',
    nodeType: 'npmExample:navMenu',
    mixins: ['jmix:renderable'],
    properties: {
        'j:maxDepth': '10',
        'j:baselineNode': 'home',
        'j:menuItemView': 'menuElement'
    }
};

export const hydratedNavMenu = {
    name: 'hydratedNavMenu',
    nodeType: 'npmExample:hydratedNavMenu',
    mixins: ['jmix:renderable'],
    properties: {
        'j:maxDepth': '10',
        'j:baselineNode': 'hydratedNavMenu',
        'j:menuItemView': 'menuElement'
    }
};

export const calendar = {
    name: 'calendar',
    nodeType: 'jnt:calendar',
    boundComponentRelativePath: '/events',
    properties: {
        startDateProperty: 'startDate',
        endDateProperty: 'endDate'
    }
};
export const facets = {
    name: 'facets',
    nodeType: 'jnt:facets',
    boundComponentRelativePath: '/events',
    properties: {
        'j:type': 'jnt:event'
    },
    children: [
        {
            name: 'fieldFacet',
            nodeType: 'jnt:fieldFacet',
            properties: {
                facet: 'type',
                field: 'jnt:event;eventsType',
                limit: '100',
                mincount: '1',
                missing: 'false',
                offset: '0'
            },
            i18nProperties: {
                en: {
                    label: 'Type'
                }
            }
        },
        {
            name: 'field-hierarchical-facet',
            nodeType: 'jnt:fieldHierarchicalFacet',
            properties: {
                facet: 'Categories',
                field: 'jmix:categorized;j:defaultCategory',
                limit: '100',
                mincount: '1',
                missing: 'false',
                offset: '0',
                prefix: '/sites/systemsite/categories'
            },
            i18nProperties: {
                en: {
                    label: 'Categories'
                },
                fr: {
                    label: 'Catégories'
                }
            }
        },
        {
            name: 'queryFacet',
            nodeType: 'jnt:queryFacet',
            properties: {
                facet: 'nextEvents',
                mincount: '1',
                query: '0\\:FACET\\:startDate:[NOW/DAY TO NOW/MONTH+1MONTH] OR 0\\:FACET\\:endDate:[NOW/DAY TO NOW/MONTH+1MONTH]'
            },
            i18nProperties: {
                en: {
                    label: 'Next events per month',
                    valueLabel: '##DynamicDateLabel(NOW/MONTH,date,MMMM)##'
                },
                fr: {
                    label: 'Prochains évènements par mois',
                    valueLabel: '##DynamicDateLabel(NOW/MONTH,date,MMMM)##'
                }
            }
        },
        {
            name: 'queryFacet1',
            nodeType: 'jnt:queryFacet',
            properties: {
                facet: 'nextEvents',
                mincount: '1',
                query: '0\\:FACET\\:startDate:[NOW/MONTH+1MONTH TO NOW/MONTH+2MONTH] OR 0\\:FACET\\:endDate:[NOW/MONTH+1MONTH TO NOW/MONTH+2MONTH]'
            },
            i18nProperties: {
                en: {
                    label: 'Next events per month',
                    valueLabel: '##DynamicDateLabel(NOW/MONTH+1MONTH,date,MMMM)##'
                },
                fr: {
                    label: 'Prochains évènements par mois',
                    valueLabel: '##DynamicDateLabel(NOW/MONTH+1MONTH,date,MMMM)##'
                }
            }
        },
        {
            name: 'queryFacet2',
            nodeType: 'jnt:queryFacet',
            properties: {
                facet: 'nextEvents',
                mincount: '1',
                query: '0\\:FACET\\:startDate:[NOW/MONTH+2MONTH TO NOW/MONTH+3MONTH] OR 0\\:FACET\\:endDate:[NOW/MONTH+2MONTH TO NOW/MONTH+3MONTH]'
            },
            i18nProperties: {
                en: {
                    label: 'Next events per month',
                    valueLabel: '##DynamicDateLabel(NOW/MONTH+2MONTH,date,MMMM)##'
                },
                fr: {
                    label: 'Prochains évènements par mois',
                    valueLabel: '##DynamicDateLabel(NOW/MONTH+2MONTH,date,MMMM)##'
                }
            }
        },
        {
            name: 'queryFacet3',
            nodeType: 'jnt:queryFacet',
            properties: {
                facet: 'nextEvents',
                mincount: '1',
                query: '0\\:FACET\\:startDate:[NOW/MONTH+3MONTH TO NOW/MONTH+4MONTH] OR 0\\:FACET\\:endDate:[NOW/MONTH+3MONTH TO NOW/MONTH+4MONTH]'
            },
            i18nProperties: {
                en: {
                    label: 'Next events per month',
                    valueLabel: '##DynamicDateLabel(NOW/MONTH+3MONTH,date,MMMM)##'
                },
                fr: {
                    label: 'Prochains évènements par mois',
                    valueLabel: '##DynamicDateLabel(NOW/MONTH+3MONTH,date,MMMM)##'
                }
            }
        }
    ]
};
