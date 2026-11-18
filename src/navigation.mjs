const pages=new Set(['Home','Calculator','FAQ','Overview','Services','Jobs','Expenses','Reports','Import','Forecast','Settings']);
export function pageFromHash(hash){
 try{const page=decodeURIComponent(hash.replace(/^#/,''));return pages.has(page)?page:'Home';}
 catch{return 'Home';}
}
