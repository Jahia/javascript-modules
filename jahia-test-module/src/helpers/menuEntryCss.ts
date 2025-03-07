import type { MenuEntry } from "@jahia/javascript-modules-library";
export const menuEntryCss = (menu: MenuEntry, isFirst: boolean, isLast: boolean) => {
  const children = menu.children ? "hasChildren" : "noChildren";
  const inPath = menu.inPath ? " inPath" : "";
  const selected = menu.selected ? " selected" : "";
  const first = isFirst ? " firstInLevel" : "";
  const last = isLast ? " lastInLevel" : "";
  return `${children}${inPath}${selected}${first}${last}`;
};
