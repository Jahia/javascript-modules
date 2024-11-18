import React from 'react';
import {AddResources, Render, Area, defineJahiaComponent} from '@jahia/js-server-core';
import {footer, header, login, hydratedNavMenu} from "./pageComponents";

export const PageHomeHydratedMenu = () => {
  return (
    <html lang="en">
        <head>
            <AddResources type={'css'} resources={'styles.css'}/>
        </head>
        <body>
        <div className="page">
            <div className="header">
                <div className="headerContent">
                    <Render content={header}/>
                </div>
                <div className="headerLogin">
                    <Render content={login}/>
                </div>
            </div>
            <div className="nav">
                <Render content={hydratedNavMenu}/>
            </div>
            <div className="main">
                <div className="article">
                    <Area name={'pagecontent'}/>
                </div>
            </div>
            <div className="footer">
                <div className="footerContent">
                    <Render content={footer}/>
                </div>
            </div>
        </div>
        </body>
    </html>
  )
}

PageHomeHydratedMenu.jahiaComponent = defineJahiaComponent({
    nodeType: 'jnt:page',
    name: 'homeHydratedMenu',
    displayName: 'Home page with hydrated menu',
    componentType: 'template'
});
