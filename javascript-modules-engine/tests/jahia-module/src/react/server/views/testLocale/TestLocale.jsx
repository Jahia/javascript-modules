import React from 'react';
import {defineJahiaComponent, useServerContext} from '@jahia/js-server-core';

export const TestLocale = () => {
    const {renderContext, currentResource} = useServerContext();
    const currentResourceLocale = currentResource.getLocale();
    const currentResourceLocaleLanguage = currentResourceLocale.getLanguage();
    const UILocale = renderContext.getUILocale();
    const UILocaleLanguage = UILocale.getLanguage();
    const requestLocale= renderContext.getRequest().getLocale();
    const mainResourceLocale = renderContext.getMainResource().getLocale();
    const settingsDefaultLocale = renderContext.getSettings().getDefaultLocale();
    const userLocale = renderContext.getUser().getProperties().get('preferredLanguage');
    return (
        <>
            <h2>Test locale component</h2>
            <h3>Current resource locale</h3>
            <div data-testid="currentResource_locale" test-shouldbeEn="true">{currentResourceLocale.toString()}</div>
            <h3>Current resource locale language</h3>
            <div data-testid="currentResource_localeLanguage" test-shouldbeEn="true">{currentResourceLocaleLanguage}</div>
            <h3>UI locale</h3>
            <div data-testid="renderContext_UILocale" test-shouldbeEn="true">{UILocale.toString()}</div>
            <h3>UI locale language</h3>
            <div data-testid="renderContext_UILocaleLanguage" test-shouldbeEn="true">{UILocaleLanguage}</div>
            <h3>Request locale</h3>
            <div data-testid="renderContext_requestLocale" test-shouldbeEn="true">{requestLocale.toString()}</div>
            <h3>Main resource locale</h3>
            <div data-testid="renderContext_mainResourceLocale" test-shouldbeEn="true">{mainResourceLocale.toString()}</div>
            <h3>Settings default locale</h3>
            <div data-testid="renderContext_settingsDefaultLocale" test-shouldbeEn="true">{settingsDefaultLocale.toString()}</div>
            <h3>User preffered language</h3>
            <div data-testid="renderContext_userLocale" test-shouldbeEn="true">{userLocale}</div>
        </>
    );
}

TestLocale.jahiaComponent = defineJahiaComponent({
    nodeType: 'npmExample:testLocale',
    name: 'default',
    displayName: 'test locale',
    componentType: 'view'
});
