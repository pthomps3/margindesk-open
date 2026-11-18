import {useState} from 'react';
import {minor} from './finance.mjs';
import {targetPrice} from './records.mjs';
export default function TargetPrice({currency}:{currency:string}){
 const [cost,setCost]=useState('64'),[margin,setMargin]=useState('20'),[fee,setFee]=useState('2.9'),[fixed,setFixed]=useState('0.30');
 let result:number=null,error='';try{if(!margin.trim()||!fee.trim())throw Error('Enter a margin and fee percentage.');if(!Number.isFinite(Number(margin))||!Number.isFinite(Number(fee))||Number(margin)<0||Number(fee)<0||Number(margin)>100||Number(fee)>100)throw Error('Use percentages from 0 to 100.');result=targetPrice({cost:minor(cost),fixedFee:minor(fixed),feeBps:Math.round(Number(fee)*100),margin:Number(margin)});}catch(e){error=e.message;}
 const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency}).format(n/100);
 return <section className="card formcard"><span className="badge">PLANNING ONLY</span><h3>Price for a target margin.</h3><p>Start with estimated direct costs. This does not change any recorded sales.</p><div className="formgrid">{[['Direct costs before fees',cost,setCost],['Target contribution margin (%)',margin,setMargin],['Processing fee (%)',fee,setFee],['Fixed processing fee',fixed,setFixed]].map(([label,value,set]:any)=><label key={label}>{label}<input inputMode="decimal" value={value} onChange={e=>set(e.target.value)}/></label>)}</div><div className="entry-result" role="status"><span>Suggested minimum price</span><strong>{error?'—':result===null?'Not possible':money(result)}</strong><small>{error|| (result===null?'Fees and margin must total less than 100%.':'(Direct costs + fixed fee) ÷ (1 − fee rate − target margin), rounded up. Before overhead and tax; not take-home pay.')}</small></div></section>;
}
