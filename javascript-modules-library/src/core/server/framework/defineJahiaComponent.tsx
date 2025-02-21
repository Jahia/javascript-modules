import { JahiaComponent } from "./jahiaComponent";

/**
 * Using this function provides autocomplete on the jahiaComponent properties.
 *
 * @deprecated Use `jahiaComponent()` instead to define and register a component.
 * @param jahiaComponent - An object containing the Jahia component to define.
 * @returns The jahiaComponent object.
 */
export function defineJahiaComponent(jahiaComponent: JahiaComponent): JahiaComponent {
  return jahiaComponent;
}
