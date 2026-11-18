// Bound declared expansion before the workbook parser allocates sheets/shared strings.
export function inspectWorkbookZip(buffer){
 const v=new DataView(buffer),n=v.byteLength;let end=-1;
 for(let p=n-22;p>=Math.max(0,n-65557);p--)if(v.getUint32(p,true)===0x06054b50){end=p;break;}
 if(end<0||v.getUint16(end+4,true)!==0||v.getUint16(end+6,true)!==0)throw Error('Choose a standard .xlsx workbook.');
 const count=v.getUint16(end+10,true),offset=v.getUint32(end+16,true);if(!count||count>2000||offset>=end)throw Error('This workbook is too complex. Export a smaller sheet as CSV.');
 let p=offset,total=0;
 for(let i=0;i<count;i++){
  if(p+46>end||v.getUint32(p,true)!==0x02014b50)throw Error('Invalid workbook directory.');
  const size=v.getUint32(p+24,true);total+=size;
  if((v.getUint16(p+8,true)&1)||size===0xffffffff||total>20_000_000)throw Error('Workbook expands beyond 20 MB or is encrypted. Use a smaller CSV.');
  p+=46+v.getUint16(p+28,true)+v.getUint16(p+30,true)+v.getUint16(p+32,true);
 }
 if(p>end)throw Error('Invalid workbook directory.');return total;
}
