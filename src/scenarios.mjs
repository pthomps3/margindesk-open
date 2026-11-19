const fields = ['volume', 'price', 'cost', 'fixed', 'mix', 'altPrice', 'altCost'];
const inRange = value => Number.isFinite(value) && value >= 0 && value <= 100000;

export function validateScenarios(values = []) {
  if (!Array.isArray(values) || values.length > 20) throw Error('Keep up to 20 saved scenarios.');
  return values.map(scenario => {
    if (fields.some(key => !inRange(scenario?.[key])) || scenario.mix > 100 || !Number.isInteger(scenario.volume)) {
      throw Error('Enter a whole number of jobs, a mix from 0 to 100%, and amounts from 0 to 100,000.');
    }
    const result = Object.fromEntries(fields.map(key => [key, scenario[key]]));
    if (scenario.proposedPrice !== undefined) {
      if (!inRange(scenario.proposedPrice) || Math.abs(scenario.proposedPrice * 100 - Math.round(scenario.proposedPrice * 100)) > 1e-8) {
        throw Error('Enter a proposed price from 0 to 100,000 with up to two decimal places.');
      }
      result.proposedPrice = scenario.proposedPrice;
    }
    return result;
  });
}

// Keep the weighted values unrounded until we know the volume. With a mixed
// service business, the expected contribution per job may be a fraction of a cent.
function weightedCents(primary, secondary, mix) {
  return (Math.round(primary * 100) * mix + Math.round(secondary * 100) * (100 - mix)) / 100;
}

function wholeJobs(target, contributionPerJob) {
  if (target <= 0) return 0;
  if (contributionPerJob <= 0) return null;
  const quotient = target / contributionPerJob;
  const nearest = Math.round(quotient);
  return Math.abs(quotient - nearest) <= 2 * Number.EPSILON * quotient ? nearest : Math.ceil(quotient);
}

export function scenarioOutlook(scenario, primaryPrice = scenario.price) {
  const revenuePerJob = weightedCents(primaryPrice, scenario.altPrice, scenario.mix);
  const directPerJob = weightedCents(scenario.cost, scenario.altCost, scenario.mix);
  const contributionPerJob = revenuePerJob - directPerJob;
  const contribution = Math.round(contributionPerJob * scenario.volume);
  const fixed = Math.round(scenario.fixed * 100);
  return {
    revenue: Math.round(revenuePerJob * scenario.volume),
    contribution,
    contributionPerJob,
    operatingProfit: contribution - fixed,
    breakEvenJobs: wholeJobs(fixed, contributionPerJob),
  };
}

export function compareScenarioPrices(scenario) {
  const [checked] = validateScenarios([scenario]);
  if (checked.proposedPrice === undefined) return null;
  const current = scenarioOutlook(checked);
  const proposed = scenarioOutlook(checked, checked.proposedPrice);
  const target = current.contributionPerJob * checked.volume;
  return {
    current,
    proposed,
    changeAtCurrentVolume: proposed.contribution - current.contribution,
    jobsToMatch: wholeJobs(target, proposed.contributionPerJob),
  };
}
