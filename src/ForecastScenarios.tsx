import { useRef, useState } from 'react';
import { compareScenarioPrices, scenarioOutlook, validateScenarios } from './scenarios.mjs';
import './scenario-comparison.css';

type Scenario = {
  volume: number; price: number; cost: number; fixed: number; mix: number;
  altPrice: number; altCost: number; proposedPrice?: number;
};
type Draft = Record<keyof Scenario, string>;
type Props = {
  forecast: Scenario; onChange: (scenario: Scenario) => void;
  currency: string; scenarios: Scenario[]; onSave: (scenario: Scenario) => void;
};

const fields: [Exclude<keyof Scenario, 'proposedPrice'>, string][] = [
  ['volume', 'Jobs per month'], ['price', 'Primary service price'],
  ['cost', 'Primary direct cost per job'], ['mix', 'Primary service mix (%)'],
  ['altPrice', 'Secondary service price'], ['altCost', 'Secondary direct cost per job'],
  ['fixed', 'Monthly fixed expenses'],
];

function asDraft(scenario: Scenario): Draft {
  return Object.fromEntries([...fields.map(([key]) => [key, String(scenario[key])]),
    ['proposedPrice', scenario.proposedPrice === undefined ? '' : String(scenario.proposedPrice)]]) as Draft;
}

function readDraft(draft: Draft): Scenario {
  const values = Object.fromEntries(fields.map(([key, label]) => {
    if (draft[key].trim() === '') throw Error('Enter a value for ' + label.toLowerCase() + '.');
    return [key, Number(draft[key])];
  }));
  if (draft.proposedPrice.trim() !== '') values.proposedPrice = Number(draft.proposedPrice);
  return validateScenarios([values])[0] as Scenario;
}

export default function ForecastScenarios({forecast, onChange, currency, scenarios, onSave}: Props) {
  const [draft, setDraft] = useState(() => asDraft(forecast));
  const primaryPriceInput = useRef<HTMLInputElement>(null);
  let scenario: Scenario | undefined;
  let error = '';
  try { scenario = readDraft(draft); } catch (problem) { error = (problem as Error).message; }
  const outlook = scenario && scenarioOutlook(scenario);
  const comparison = scenario && compareScenarioPrices(scenario);
  const formatter = new Intl.NumberFormat('en-US', {style: 'currency', currency});
  const money = (cents: number) => formatter.format(cents / 100);

  function change(key: keyof Draft, value: string) {
    const next = {...draft, [key]: value};
    setDraft(next);
    try { onChange(readDraft(next)); } catch { /* An incomplete draft stays editable. */ }
  }

  function load(saved: Scenario) {
    setDraft(asDraft(saved));
    onChange(saved);
    primaryPriceInput.current?.focus();
  }

  let matchText = '';
  if (comparison && scenario) {
    const {current, jobsToMatch} = comparison;
    if (!scenario.volume) matchText = 'Enter a monthly job volume above zero to compare sales targets.';
    else if (current.contributionPerJob <= 0) matchText = 'Your current mix has no positive contribution to match.';
    else if (jobsToMatch === null) matchText = 'The proposed mix earns zero or less per job. Additional sales cannot match the current monthly contribution.';
    else {
      const difference = jobsToMatch - scenario.volume;
      const volumeChange = difference === 0 ? 'the same volume' : Math.abs(difference).toLocaleString('en-US') + (difference > 0 ? ' more' : ' fewer');
      matchText = jobsToMatch.toLocaleString('en-US') + (jobsToMatch === 1 ? ' job' : ' jobs') + ' per month (' + volumeChange + ') to match the current ' + money(current.contribution) + ' contribution.';
    }
  }

  return <>
    <form className="scenario-planner" onSubmit={event => {
      event.preventDefault();
      if (scenario) onSave(scenario);
    }}>
      <div className="twocol">
        <section className="card formcard">
          <h3>Your assumptions</h3>
          {fields.map(([key, label]) => <label key={key}>{label}
            <input type="number" ref={key === 'price' ? primaryPriceInput : undefined} required min="0" max={key === 'mix' ? 100 : 100000}
              step={key === 'volume' ? 1 : key === 'mix' ? 'any' : 0.01}
              value={draft[key]} onChange={event => change(key, event.target.value)}/>
          </label>)}
        </section>
        <section className="card forecastresult">
          <h3>Monthly outlook</h3>
          {outlook ? <>
            <h2>{money(outlook.operatingProfit)}</h2><p>Estimated operating profit</p>
            <div className="forecastline"><span>Revenue</span><b>{money(outlook.revenue)}</b></div>
            <div className="forecastline"><span>Contribution before overhead</span><b>{money(outlook.contribution)}</b></div>
            <div className="break">
              <h3>{outlook.breakEvenJobs === null ? 'No break-even at this mix' : outlook.breakEvenJobs.toLocaleString('en-US') + ' jobs to break even'}</h3>
              <p>{outlook.breakEvenJobs === null ? 'Each job generates zero or less toward your fixed expenses.' : 'Jobs needed to cover monthly fixed expenses at this service mix, rounded up.'}</p>
            </div>
          </> : <p role="status">{error}</p>}
        </section>
      </div>
      <section className="card formcard scenario-comparison">
        <h3>Compare a price change</h3>
        <p>Try a new price for your primary service. The estimate uses the secondary price, direct costs and service mix above.</p>
        <label>Proposed primary service price ({currency})
          <input type="number" min="0" max="100000" step="0.01" placeholder="Enter a price to compare"
            value={draft.proposedPrice} onChange={event => change('proposedPrice', event.target.value)}/>
        </label>
        {comparison && scenario && <>
          <div className="comparison-values">
            {([['Current', scenario.price, comparison.current], ['Proposed', scenario.proposedPrice, comparison.proposed]] as const).map(([label, price, result]) =>
              <div key={label}><h4>{label} · {money(Math.round(price * 100))}</h4>
                <dl><dt>Contribution per job at this mix</dt><dd>{money(result.contributionPerJob)}</dd>
                  <dt>Contribution at {scenario.volume.toLocaleString('en-US')} jobs</dt><dd>{money(result.contribution)}</dd>
                </dl></div>)}
          </div>
          <div className="entry-result" role="status">
            <strong>{matchText}</strong>
            <small>{comparison.changeAtCurrentVolume === 0 ? 'Monthly contribution stays the same at this volume.'
              : money(Math.abs(comparison.changeAtCurrentVolume)) + (comparison.changeAtCurrentVolume < 0 ? ' less' : ' more') + ' monthly contribution at the current volume.'}</small>
          </div>
        </>}
        <button type="submit" className="primary" disabled={!scenario}>Save scenario</button>
      </section>
    </form>
    {scenarios.length > 0 && <section className="card formcard saved-scenarios">
      <h3>Saved scenarios</h3>
      <ul>{scenarios.map((saved, index) =>
        <li key={index}><div><strong>Scenario {index + 1}</strong>
          <p>{saved.volume.toLocaleString('en-US')} jobs · {saved.mix}% primary mix · {money(scenarioOutlook(saved).operatingProfit)} operating profit</p>
          {saved.proposedPrice !== undefined && <small>Primary price {money(Math.round(saved.price * 100))} → {money(Math.round(saved.proposedPrice * 100))}</small>}
        </div><button type="button" aria-label={'Load scenario ' + (index + 1)} onClick={() => load(saved)}>Load</button></li>
      )}</ul>
    </section>}
  </>;
}
