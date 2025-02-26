import React from 'react';
import {AddResources, Area, defineJahiaComponent, useServerContext, useUrlBuilder} from '@jahia/javascript-modules-library';
import {useTranslation} from 'react-i18next';

export const PageHome = () => {
    const {t} = useTranslation();
    const {currentResource} = useServerContext();
    const {buildStaticUrl} = useUrlBuilder();
    const lang = currentResource.getLocale().getLanguage();
    return (
        <html lang={lang}>
            <head>
                <AddResources type="css" resources={buildStaticUrl({assetPath: 'css/styles.css'})}/>
                <title>Home</title>
            </head>
            <body>
                <main>
                    {/* Using i18next defined in locales */}
                    <h1>{t('homeTitle')}</h1>
                    <Area name="pagecontent"/>
                </main>
            </body>
        </html>
    );
};

PageHome.jahiaComponent = defineJahiaComponent({
    nodeType: 'jnt:page',
    name: 'home',
    displayName: 'Home page',
    componentType: 'template'
});
