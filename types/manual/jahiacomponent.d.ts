/**
 * An interface defining
 */
export class JahiaComponent {
    /**
     *  The content node type the component applies to
     */
    nodeType : string;
    /**
     * The component type : template or view
     */
    componentType : string;
    /**
     * The name of the component
     */
    name : string;
    /**
     * The display name of the component in jahia's UI
     */
    displayName : string;
    /**
     * Properties to add on the component
     */
    properties : Record<string, string>;
}
