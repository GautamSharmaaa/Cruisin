const escape=String.fromCharCode(92);
const special=new Set([...'.^$*+?()[]{}|',escape]);
export const literalSearch=(value:string):string=>Array.from(value,c=>special.has(c)?escape+c:c).join('');
