export const menuEntryCss = (menu, isFirst, isLast) => {
    const children = menu.children ? 'hasChildren' : 'noChildren';
    const inPath = menu.inPath ? ' inPath' : '';
    const selected = menu.selected ? ' selected' : '';
    const first = isFirst ? ' firstInLevel' : '';
    const last = isLast ? ' lastInLevel' : '';
    return `${children}${inPath}${selected}${first}${last}`;
};
