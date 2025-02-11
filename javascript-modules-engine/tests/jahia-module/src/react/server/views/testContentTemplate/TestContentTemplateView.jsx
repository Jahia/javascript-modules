import {defineJahiaComponent} from '@jahia/javascript-modules-library';

export const TestContentTemplateView = () => {
    return (
        <>
            <h2>Just a normal view</h2>
        </>
    )
}

TestContentTemplateView.jahiaComponent = defineJahiaComponent({
    nodeType: 'npmExample:testContentTemplate',
    componentType: 'view'
});
