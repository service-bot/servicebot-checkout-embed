import React from 'react';
import {findMonthlyPrice, convertPrice, numberWithCommas} from './ServicebotUtilities'
import {INTERVAL_NAMES} from './Constants';
// import Button from './Button'
let pluralize = require('pluralize')

const PriceAmount = (props) => {
	const {price: {amount, currency, interval}, findMonthly} = props;
    const formatter = new Intl.NumberFormat("en-US", { style: 'currency', currency: currency }).format
    if(amount !== 0){
        if(findMonthly){
            return <span className={`_price-amount`}>{formatter(findMonthlyPrice(amount/100, interval))}</span>;
        }
        return <span className={`_price-amount`}>{formatter(amount/100)}</span>;
    }
    return <span className={`_price-amount`}>Free</span>
};

const PriceSeparator = (props) => {
	return <span className={`_price-separator`}>{props.children}</span>;
};

const PriceInterval = (props) => {
    const {interval} = props;
    
    let text;
    if(interval === 'year')
        text = `month`;
    else
        text = `${interval}`;
	return <span className={`_price-interval`}>{text}</span>;
};

const PriceUnit = (props) => {
	return <span className={`_price-unit`}>{props.children}</span>;
};

const PriceBillByInterval = (props) => {
    const {interval} = props;
    const text = `Billed ${INTERVAL_NAMES[interval]}`;
    return <span className={`_price-billed-by-interval __billed-${INTERVAL_NAMES[interval].toLowerCase()}`}>{text}</span>;
};

const PriceCustom = (props) => {
    return <span className={`_price-custom`}>{`Contact`}</span>;
};

const RangeVolume = (props) => {
    const {rows, j, unit} = props;
    const LimitPrefix = (index, rows) => {
        if (index === 0) return `First`;
        else {
            if (rows[index].upperLimit === 'Infinity')
                return `Over ${rows[index - 1].upperLimit}`;
            else return `${rows[index - 1].upperLimit} -`;
        }
    };
    const UpperLimit = (row) => {
        if (row.upperLimit === 'Infinity') return ``;
        return numberWithCommas(row.upperLimit);
    };
    return <div className={`__limit`}>
        <p>
            <span className={`__number`}>{`${numberWithCommas(
                LimitPrefix(j, rows)
            )} ${UpperLimit(rows[j])}`}</span>
            <span className={`__unit`}>{unit}</span>
        </p>
    </div>
}
const RangeGraduated = (props) => {
    const {rows, j, unit} = props;
    const LimitPrefix = (index, rows) => {
        if (index === 0) {
            return `First`;
        }
        else {
            if (rows[index].upperLimit === 'Infinity')
                return `Next`;
            else return `Next`;
        }
    };
    const UpperLimit = (index, rows) => {
        if(index === 0)
            return `${numberWithCommas(rows[index].upperLimit)}`
        if (rows[index].upperLimit === 'Infinity') 
            return `${rows[index - 1].upperLimit} +`;
        return numberWithCommas(rows[index].upperLimit - rows[index - 1].upperLimit);
    };
    return <div className={`__limit`}>
        <p>
            <span className={`__number`}>
            {`${numberWithCommas(LimitPrefix(j, rows))} ${UpperLimit(j, rows)}`}</span>
            <span className={`__unit`}>{unit}</span>
        </p>
    </div>
}
const TablePricingSummary = (props) => {
    const {arrayOfGraduatedVolume, currentInterval} = props;
    
    return <div className={`servicebot-pricing-breakdown _overview`}>
        <h2>Pricing Overview</h2>
        {/* Map through each Graduated to show the first pricing info */}
        {arrayOfGraduatedVolume.map((item, i) => {
            const firstTier = item.rows[0];
            const firstTierUpperLimit = firstTier.upperLimit;
            const intervalPlan = firstTier.plans.filter((item) => {
                return item.interval == currentInterval;
            })[0];
            const { amount, interval } = intervalPlan;
            const { unit, strategy, isSeat, isMetered } = item;
            return (
                <div className={`__row`} key={i}>
                    <div className={`__limit`}>
                        <p>
                            <span className={``}>{`First ${numberWithCommas(
                                firstTierUpperLimit
                            )} ${unit}`}</span>
                            <span className={``} />
                        </p>
                    </div>
                    <div className={`__price`}>
                        <p>
                            <PriceAmount price={{ amount: amount, currency: 'USD', interval: currentInterval }} 
                                        findMonthly={true}/>
                            <PriceSeparator> / </PriceSeparator>
                            <PriceUnit>{unit}</PriceUnit>
                            <PriceBillByInterval interval={interval}/>
                        </p>
                    </div>
                </div>
            );
        })}
    </div>
}
const TableGraduatedOrVolume = (props) => {
    const {plans, currentInterval} = props;
    return <React.Fragment>{
        plans.map((plan, i) => {
        const { isMetered, isSeat, strategy, unit, rows } = plan;
        const sortedRows = plan.rows.sort((a, b) => {return a.upperLimit - b.upperLimit});
        return (
            <div key={i}
                className={`servicebot-pricing-breakdown _graduated __graduated-${unit.toLowerCase()}`}>
                <h2>{`${unit} Pricing`}</h2>
                {sortedRows.map((row, j) => {
                    const intervalPlan = row.plans.filter((item) => {
                        return item.interval == currentInterval;
                    })[0];
                    return (
                        <div key={j} className={`__row`}>
                            {strategy === 'volume' && <RangeVolume rows={sortedRows} j={j} unit={unit}/>}
                            {strategy === 'graduated' && <RangeGraduated rows={sortedRows} j={j} unit={unit}/>}
                            <div className={`__price`}>
                                <p>
                                    <PriceAmount price={{ amount: intervalPlan.amount, currency: 'USD', interval: currentInterval }} 
                                        findMonthly={true}/>
                                    <PriceSeparator> / </PriceSeparator>
                                    <PriceUnit>{unit}</PriceUnit>
                                    <PriceBillByInterval interval={intervalPlan.interval}/>
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    })
    }</React.Fragment>
}
const TierButton = (props) => {
    const {tierIndex, plan, checkout} = props
    let tierText = 'Sign Up'
    //Getting button text
    if(plan.trial_period_days > 0){
        tierText = "Try for Free"
    }else{
        tierText = "Get Started"
    }
    if(plan.type === "custom"){
        tierText = "Contact Sales"
    }

    return <div className="servicebot-tier-element _select-tier-button">
		<Button someID={tierIndex} onClick={checkout(plan.id, tierIndex)} className="buttons _select-tier" text={tierText}/>
	</div>
}
const TierTrialPeriod = (props) => {
    const {trial} = props;
    if(trial > 0){
        return <div className={`servicebot-tier-element _trial`}>
            <div className={`__before`}/>
            <span className={`__prefix`}>{`Free `}</span>
            <span className={`__days`}>{`${trial}`}</span>
            <span className={`__suffix`}>{` ${pluralize('day', trial)}  trial`}</span>
            <div className={`__after`}/>
            <div className={`__credit-card-required`}> {/*TODO: is there a setting for yes/no credit card required? */}
                <span className={`__text`}>No credit card required</span>
            </div>
        </div>
    }
    return <div className={`_no-trial`}/>
}
const TierFeatureslist = (props) => {
	let {tier: {features}} = props;
	if(features.length){
		return <ul className="servicebot-tier-element _feature-list">
				{props.tier.features.map((feature, i)=> {
					return (<li key={i} className="_item">{feature}</li>)
				})}
			</ul>
	}
	return <span className={`no-defined-features`}/>
}

export { PriceAmount, PriceSeparator, PriceInterval, PriceUnit, PriceBillByInterval, PriceCustom, 
    RangeGraduated, RangeVolume, 
    TablePricingSummary, TableGraduatedOrVolume,
    TierButton, TierTrialPeriod, TierFeatureslist};
