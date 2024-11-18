import React from 'react';
import {AddResources, Render, Area, defineJahiaComponent} from '@jahia/js-server-core';
import {footer, header, login, navMenu} from "./pageComponents";

export const PageHome = () => {
  return (
    <html lang="en">
        <head>
            <AddResources type={'css'} resources={'styles.css'}/>
        </head>
        <body>
            <div className="page">
                <div className="header">
                    <div className="headerContent">
                        <Render content={header} />
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

PageHome.jahiaComponent = defineJahiaComponent({
    nodeType: 'jnt:page',
    name: 'home',
    displayName: 'Home page',
    componentType: 'template'
});
