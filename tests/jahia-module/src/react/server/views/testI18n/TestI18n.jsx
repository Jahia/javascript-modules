import React from 'react';
import SampleI18n from "../../../../client/SampleI18n";
import {defineJahiaComponent, HydrateInBrowser, RenderInBrowser} from "@jahia/js-server-core";

export const TestI18n = () => {
    return (
        <>
            <h3>Test i18n: full server side</h3>
            <div data-testid="i18n-server-side">
                <SampleI18n placeholder={'We are server side !'}/>
            </div>

            <h3>Test i18n: hydrated client side</h3>
            <div data-testid="i18n-hydrated-client-side">
                <HydrateInBrowser child={SampleI18n} props={{placeholder: 'We are hydrated client side !'}}/>
            </div>

            <h3>Test i18n: rendered client side</h3>
            <div data-testid="i18n-rendered-client-side">
                <RenderInBrowser child={SampleI18n} props={{placeholder: 'We are rendered client side !'}}/>
            </div>
        </>
    );
}

TestI18n.jahiaComponent = defineJahiaComponent({
    nodeType: 'npmExample:testI18n',
    name: 'default',
    displayName: 'test i18n',
    componentType: 'view'
});
