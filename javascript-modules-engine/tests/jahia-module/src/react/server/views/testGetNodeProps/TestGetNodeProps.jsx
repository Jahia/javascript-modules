import React from 'react';
import {defineJahiaComponent, getNodeProps, useServerContext} from '@jahia/js-server-core';

export const TestGetNodeProps = () => {
    const {currentNode} = useServerContext();
    const props = getNodeProps(currentNode, ['propNotSet', 'propNotExists', 'smallText', 'textarea', 'choicelist', 'long', 'double', 'boolean', 'weakreference', 'bigtext', 'date', 'decimal', 'uri', 'name', 'path', 'password']);
    const multipleProps = getNodeProps(currentNode, ['multipleSmallText', 'multipleTextarea','multipleChoicelist', 'multipleLong', 'multipleDouble', 'multipleBoolean', 'multipleWeakreference', 'multipleBigtext', 'multipleDate', 'multipleDecimal', 'multipleUri', 'multipleName', 'multiplePath', 'multiplePassword']);

    const printMultiValuedProp = (selector, values, richText = false, ref = false) => {
        return values && values.map(function(value, i){
            if (richText) {
                return <div data-testid={`${selector}_${i + 1}`} dangerouslySetInnerHTML={{
                    __html: value
                }}/>
            } else {
                return <div data-testid={`${selector}_${i + 1}`}>{ref ? value.getPath() : value.toString()}</div>;
            }
        })
    }

    return (
        <>
            <h3>getNodeProps usages (single)</h3>
            <div data-testid="getNodeProps_smallText">{props.smallText}</div>
            <div data-testid="getNodeProps_textarea">{props.textarea}</div>
            <div data-testid="getNodeProps_choicelist">{props.choicelist}</div>
            <div data-testid="getNodeProps_long">{props.long}</div>
            <div data-testid="getNodeProps_double">{props.double}</div>
            <div data-testid="getNodeProps_boolean">{props.boolean.toString()}</div>
            <div data-testid="getNodeProps_weakreference">{props.weakreference.getPath()}</div>
            <div data-testid="getNodeProps_bigtext" dangerouslySetInnerHTML={{
                __html: props.bigtext
            }}/>
            <div data-testid="getNodeProps_date">{props.date}</div>
            <div data-testid="getNodeProps_decimal">{props.decimal}</div>
            <div data-testid="getNodeProps_uri">{props.uri}</div>
            <div data-testid="getNodeProps_name">{props.name}</div>
            <div data-testid="getNodeProps_path">{props.path}</div>

            <h3>getNodeProps usages (multiple)</h3>
            <div data-testid="getNodeProps_multipleSmallText">
                {printMultiValuedProp('getNodeProps_multipleSmallText', multipleProps.multipleSmallText)}
            </div>
            <div data-testid="getNodeProps_multipleTextarea">
                {printMultiValuedProp('getNodeProps_multipleTextarea', multipleProps.multipleTextarea)}
            </div>
            <div data-testid="getNodeProps_multipleChoicelist">
                {printMultiValuedProp('getNodeProps_multipleChoicelist', multipleProps.multipleChoicelist)}
            </div>
            <div data-testid="getNodeProps_multipleLong">
                {printMultiValuedProp('getNodeProps_multipleLong', multipleProps.multipleLong)}
            </div>
            <div data-testid="getNodeProps_multipleDouble">
                {printMultiValuedProp('getNodeProps_multipleDouble', multipleProps.multipleDouble)}
            </div>
            <div data-testid="getNodeProps_multipleBoolean">
                {printMultiValuedProp('getNodeProps_multipleBoolean', multipleProps.multipleBoolean)}
            </div>
            <div data-testid="getNodeProps_multipleWeakreference">
                {printMultiValuedProp('getNodeProps_multipleWeakreference', multipleProps.multipleWeakreference, false, true)}
            </div>
            <div data-testid="getNodeProps_multipleBigtext">
                {printMultiValuedProp('getNodeProps_multipleBigtext', multipleProps.multipleBigtext, true)}
            </div>
            <div data-testid="getNodeProps_multipleDate">
                {printMultiValuedProp('getNodeProps_multipleDate', multipleProps.multipleDate)}
            </div>
            <div data-testid="getNodeProps_multipleDecimal">
                {printMultiValuedProp('getNodeProps_multipleDecimal', multipleProps.multipleDecimal)}
            </div>
            <div data-testid="getNodeProps_multipleUri">
                {printMultiValuedProp('getNodeProps_multipleUri', multipleProps.multipleUri)}
            </div>
            <div data-testid="getNodeProps_multipleName">
                {printMultiValuedProp('getNodeProps_multipleName', multipleProps.multipleName)}
            </div>
            <div data-testid="getNodeProps_multiplePath">
                {printMultiValuedProp('getNodeProps_multiplePath', multipleProps.multiplePath)}
            </div>

            <h3>getNodeProps usages (typing and safety tests)</h3>
            <div data-testid="getNodeProps_propNotSet">{props.propNotSet}</div>
            <div data-testid="getNodeProps_propNotExists">{props.propNotExists}</div>
            <div data-testid="getNodeProps_checkBooleanType">{(typeof props.boolean === 'boolean').toString()}</div>
            <div data-testid="getNodeProps_checkLongType">{(typeof props.long === 'number').toString()}</div>
            <div data-testid="getNodeProps_checkDoubleType">{(typeof props.double === 'number').toString()}</div>
        </>
    )
}

TestGetNodeProps.jahiaComponent = defineJahiaComponent({
    nodeType: 'npmExample:testGetNodeProps',
    name: 'default',
    displayName: 'test getNodeProps',
    componentType: 'view'
});
