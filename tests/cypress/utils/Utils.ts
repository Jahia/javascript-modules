/*  eslint-disable @typescript-eslint/no-explicit-any */
import {addNode} from '@jahia/cypress';
export const addSimplePage = (
    parentPathOrId: string,
    pageName: string,
    pageTitle: string,
    language: string,
    template = 'home',
    children = [],
    mixins = [],
    properties = []
): any => {
    const variables = {
        parentPathOrId: parentPathOrId,
        name: pageName,
        title: pageTitle,
        primaryNodeType: 'jnt:page',
        template: template,
        mixins: mixins,
        properties: [
            ...properties,
            {name: 'jcr:title', value: pageTitle, language: language},
            {name: 'j:templateName', type: 'STRING', value: template}
        ],
        children: children
    };
    return addNode(variables);
};

export const addEventPageAndEvents = (siteKey: string, template: string, pageName: string, thenFunction: () => void) => {
    return addSimplePage(
        `/sites/${siteKey}/home`,
        pageName,
        'Events page',
        'en',
        template,
        [
            {
                name: 'events',
                primaryNodeType: 'jnt:contentList'
            }
        ]
    ).then(() => {
        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        addEvent(siteKey, {
            pageName,
            name: 'event-a',
            title: 'The first event',
            startDate: today,
            endDate: tomorrow
        });
        addEvent(siteKey, {
            pageName,
            name: 'event-b',
            title: 'The second event',
            startDate: today
        });
        if (thenFunction) {
            thenFunction();
        }
    });
};

export const addEvent = (siteKey: string, event) => {
    addNode({
        parentPathOrId: event.parentPath ? event.parentPath : `/sites/${siteKey}/home/${event.pageName}/events`,
        name: event.name,
        primaryNodeType: 'jnt:event',
        properties: [
            {name: 'jcr:title', value: event.title, language: 'en'},
            {name: 'startDate', type: 'DATE', value: event.startDate},
            {name: 'endDate', type: 'DATE', value: event.endDate},
            {name: 'eventsType', value: event.eventsType ? event.eventsType : 'meeting'}
        ]
    });
};
