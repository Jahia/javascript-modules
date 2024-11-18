import React from 'react';
import {AddResources, Area, defineJahiaComponent, Render} from '@jahia/js-server-core';
import {footer, header, login, navMenu} from "./pageComponents";

export const PageBoundComponent = () => {
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
                    <Area name={'events'} allowedTypes={['jnt:event']}/>
                </div>
                <div className="aside">
                    <Render content={{
                        name: 'boundComponentTest',
                        nodeType: 'npmExample:testBoundComponent',
                        boundComponentRelativePath: '/events'
                    }}/>
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

PageBoundComponent.jahiaComponent = defineJahiaComponent({
    nodeType: 'jnt:page',
    name: 'boundComponent',
    displayName: 'Bound component page',
    componentType: 'template'
})
