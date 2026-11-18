export function validateScenarios(values=[]){
 if(!Array.isArray(values)||values.length>20)throw Error('Keep up to 20 saved scenarios.');
 const fields=['volume','price','cost','fixed','mix','altPrice','altCost'];
 return values.map(s=>{if(fields.some(k=>typeof s?.[k]!=='number'||!Number.isFinite(s[k])||s[k]<0||s[k]>100000)||s.mix>100||!Number.isInteger(s.volume))throw Error('Invalid forecast.');return Object.fromEntries(fields.map(k=>[k,s[k]]));});
}
