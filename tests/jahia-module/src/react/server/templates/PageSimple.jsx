import React from 'react';
import {AddResources, Area, defineJahiaComponent, Render} from '@jahia/js-server-core';
import {footer, header, login, navMenu} from "./pageComponents";

export const PageSimple = () => {

    const inlineScript = '<script type="text/javascript">\n' +
        '            console.log(\'Executing inline script...\');\n' +
        '            document.addEventListener(\'DOMContentLoaded\', function () {\n' +
        '                var newDiv = document.createElement(\'div\');\n' +
        '                newDiv.id = \'testInlineScript\';\n' +
        '                document.body.appendChild(newDiv);\n' +
        '            });\n' +
        '        </script>';

    return (<html lang="en">
        <head>
            <AddResources type={'css'} resources={'styles.css'}/>
        </head>
        <body>
        <AddResources type={'inline'} key={'inline-script-test'} inlineResource={inlineScript}/>
        <AddResources type={'javascript'} resources={'body-script.js'} targetTag={'body'}/>
        <AddResources type={'javascript'} resources={'head-script.js'}/>
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
                    <Area name={'pagecontent'}/>
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

PageSimple.jahiaComponent = defineJahiaComponent({
    nodeType: 'jnt:page',
    name: 'simple',
    displayName: 'Simple page',
    componentType: 'template'
});
