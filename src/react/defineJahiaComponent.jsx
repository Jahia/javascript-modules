/**
 * @typedef {Object} JahiaComponent
 * @property {string} name - The name of the component.
 * @property {string} displayName - The display name of the component (in jahia's UI).
 * @property {"template"|"view"} componentType - The type of the component.
 * @property {string} nodeType - The content node type the component applies to.
 * @property {Record<string, string>} properties - Properties to add on the component
 */

/**
 * Using this function provides autocomplete on the jahiaComponent properties.
 * @param {JahiaComponent} jahiaComponent - An object containing the Jahia component to define.
 * @returns {JahiaComponent} The jahiaComponent object.
 */
export function defineJahiaComponent(jahiaComponent) {
    return jahiaComponent;
}
