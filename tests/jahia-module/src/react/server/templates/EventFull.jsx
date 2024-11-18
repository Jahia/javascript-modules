import React from 'react';
import {AddResources, Area, defineJahiaComponent, Render, useServerContext} from '@jahia/js-server-core';
import {footer, header, login, navMenu} from "./pageComponents";

export const EventFull = () => {
    const {currentResource} = useServerContext();
    return (<html lang="en">
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
                <Render content={navMenu}/>
            </div>
            <div className="main">
                <div className="article">
                    <Render path={currentResource.getNode().getPath()}/>
                </div>
                <div className="aside">
                    <Area name={'aside'}/>
                </div>
            </div>
            <div className="footer">
                <div className="footerContent">
                    <Render content={footer}/>
                </div>
            </div>
        </div>
        </body>
    </html>)
}

EventFull.jahiaComponent = defineJahiaComponent({
    nodeType: 'jnt:event',
    name: 'full',
    displayName: 'Full event template',
    componentType: 'template'
});
