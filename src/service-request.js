import React from 'react';
import ServiceRequestForm from './forms/request-form.js';
import { Fetcher } from 'servicebot-base-form';
import { Price, getPrice, getPriceValue } from './utilities/price.js';
import { connect } from 'react-redux';
import { formValueSelector, getFormValues } from 'redux-form';
const REQUEST_FORM_NAME = 'serviceInstanceRequestForm';
const selector = formValueSelector(REQUEST_FORM_NAME); // <-- same as form name
import { getPriceData } from './core-input-types/client';
import Load from './utilities/load';
import Layout from './layout';
import { deepClone, graduatedVolumeOnly, numberWithCommas } from './ServicebotUtilities';
import PreProcessors from './PreProcessors';
import {
	PriceAmount,
	PriceSeparator,
	PriceInterval,
	PriceUnit,
	PriceBillByInterval,
	PriceCustom,
	TierTrialPeriod,
	TierFeatureslist,
	TablePricingSummary
} from './TierPriceElements';
const FlatPrice = (props) => {
	const { flat, interval, currency, renderCounts } = props;
	const CurrentIntervalFlatPlan = flat.filter((o) => {
		return o.interval === interval;
	});

	if (
		(CurrentIntervalFlatPlan && CurrentIntervalFlatPlan[0].type !== 'custom') ||
		(CurrentIntervalFlatPlan && CurrentIntervalFlatPlan[0].type === 'custom' && renderCounts.price === 0)
	) {
		renderCounts.price++;
		return (
			<div className={`_price __flat-price`}>
				{CurrentIntervalFlatPlan.map((item, i) => {
					return (
						<div key={i} className={`___price-text`}>
							{item.type !== 'custom' && (
								<PriceAmount price={{ amount: item.amount, currency, interval }} findMonthly={true} />
							)}
							{item.amount !== 0 && (
								<React.Fragment>
									{item.type !== 'custom' && <PriceSeparator> / </PriceSeparator>}
									{item.type !== 'custom' && <PriceInterval interval={'month'} />}
									{/* {item.type !== 'custom' && <PriceBillByInterval interval={interval}/> } */}
								</React.Fragment>
							)}
							{item.type === 'custom' && <PriceCustom />}
						</div>
					);
				})}
			</div>
		);
	}
	return <span />;
};
const UnitPrice = (props) => {
	const { unit, unit: { tier_type }, interval, currency, renderCounts } = props;
	const CurrentIntervalUnitPlan = unit.price.plans.filter((o) => {
		return o.interval === interval;
	});
	//
	if (
		(CurrentIntervalUnitPlan && tier_type !== 'custom') ||
		(CurrentIntervalUnitPlan && tier_type === 'custom' && renderCounts.price === 0)
	) {
		renderCounts.price++;
		return (
			<div className={`_price __unit-price`}>
				{CurrentIntervalUnitPlan.map((item, i) => {
					return (
						<div key={i} className={`___price-text`}>
							{tier_type !== 'custom' && (
								<PriceAmount price={{ amount: item.amount, currency, interval }} findMonthly={true} />
							)}
							{item.amount > 0 && tier_type !== 'custom' && <PriceSeparator> /</PriceSeparator>}
							{tier_type !== 'custom' && <PriceUnit> {unit.unit_name}</PriceUnit>}
							{item.amount > 0 && tier_type !== 'custom' && <PriceSeparator> / </PriceSeparator>}
							{item.amount > 0 && tier_type !== 'custom' && <PriceInterval interval={'month'} />}
							{/* {item.amount > 0 && tier_type !== 'custom' && <PriceBillByInterval interval={interval} />} */}
							{tier_type === 'custom' && <PriceCustom />}
						</div>
					);
				})}
			</div>
		);
	}
	return <span />;
};
const StepDescription = (props) => {
	const { step, step: { unit_name, tier_type }, interval, currency, tiers, tierIndex } = props;
	console.log(props);
	const CurrentIntervalStepPlan = {
		...step,
		...step.price.plans.filter((o) => {
			return o.interval === interval;
		})
	};

	const orderedTiers = tiers.sort((t1, t2) => {
		const currentStepT1 = t1.step.find((s) => {
			return s.unit_name === unit_name;
		});
		const currentStepT2 = t2.step.find((s) => {
			return s.unit_name === unit_name;
		});

		console.log(currentStepT1, 'CURRENT STEP!');
		const upperLimitT1 = currentStepT1.price.plans[0].upperLimit;
		const upperLimitT2 = currentStepT2.price.plans[0].upperLimit;
		return upperLimitT1 - upperLimitT2;
	});
	const currentUpperLimit = step.price.plans[0].upperLimit;
	const currentTierIndex = orderedTiers.findIndex((tier) => {
		const currentStep = tier.step.find((s) => {
			return s.unit_name == unit_name;
		});
		return currentStep.price.plans[0].upperLimit == currentUpperLimit;
	});
	const getLastTier = (currentTierIndex, tiers) => {
		console.log(
			'getLastTie()',
			currentTierIndex,
			orderedTiers,
			orderedTiers[currentTierIndex],
			orderedTiers[currentTierIndex - 1]
		);
		if (currentTierIndex === 0) {
			return null;
		}
		return orderedTiers[currentTierIndex - 1];
	};
	const upperLimit = numberWithCommas(CurrentIntervalStepPlan['0'].upperLimit);
	//Get lower limit by tierIndex (the order of current tier passed into <Tier> by <ServicebotTiers>.)
	const getRange = () => {
		if (currentTierIndex === 0) {
			return `First ${upperLimit} `;
		} else {
			const lastTier = getLastTier(tierIndex, tiers);
			console.log('LAST TIER', lastTier);
			const lastTierlowerLimit = numberWithCommas(
				lastTier.step.filter((item) => {
					return item.unit_name == step.unit_name;
				})[0].price.plans[0].upperLimit
			);
			if (currentTierIndex === tiers.length - 1 && upperLimit === 'Infinity') {
				return `Over ${lastTierlowerLimit} `;
			} else {
				return `${lastTierlowerLimit} - ${upperLimit} `;
			}
		}
	};
	return (
		<p className={`_price __step-description`}>
			<span className={`_range`}>{`${getRange()}`}</span>
			<span className={`_range-label`}>{CurrentIntervalStepPlan.unit_name}</span>
		</p>
	);
};
const StepPrice = (props) => {
	const { step, step: { tier_type }, interval, currency } = props;

	//Always take step's index 0, because all steps are forced to have the same price.
	const CurrentIntervalStepPlan = step[0].price.plans.filter((o) => {
		return o.interval === interval;
	});
	if (CurrentIntervalStepPlan) {
		return (
			<div className={`_price __step-price`}>
				{CurrentIntervalStepPlan.map((item, i) => {
					return (
						<div key={i} className={`___price-text`}>
							{tier_type !== 'custom' && (
								<PriceAmount price={{ amount: item.amount, currency, interval }} findMonthly={true} />
							)}
							{item.amount > 0 && (
								<React.Fragment>
									{tier_type !== 'custom' && <PriceSeparator> / </PriceSeparator>}
									{tier_type !== 'custom' && <PriceInterval interval={'month'} />}
								</React.Fragment>
							)}
							{/* {tier_type !== 'custom' && <PriceBillByInterval interval={interval}/> } */}
							{tier_type === 'custom' && <PriceCustom />}
						</div>
					);
				})}
			</div>
		);
	}
	return <p>No step plans</p>;
};

function Summary(props) {
	let self = this;
	let {
		pricingPlan,
		preprocessedTiers,
		preprocessedTemplate,
		arrayOfGraduatedVolume,
		metricProp,
		currency,
		filteredAdjustments,
		rightHeading,
		prefix,
		total
	} = props;

	const tierName = props.formJSON.references.tiers.find((item) => item.id === props.pricingPlan.tier_id);
	const subscriptionAmount = pricingPlan.amount;
	const subscriptionInterval = pricingPlan.interval;
	const intervallyText = () => {
		return subscriptionInterval == 'day' ? 'daily' : `${subscriptionInterval}ly`;
	};
	const selectedTier = preprocessedTiers.find((item) => item.id === pricingPlan.tier_id);
	let renderCounts = {
		discount: 0,
		price: 0
	};
	const tierIndex = preprocessedTiers.findIndex((tier) => {
		console.log(`FINDING ${tier.id} == ${pricingPlan.tier_id}`);
		return tier.id == pricingPlan.tier_id;
	});

	console.log('Summary Tier Index', tierIndex);

	console.log('<SUMMARY> -- props', props);
	return (
		<div className="rf--summary-wrapper">
			<div className="rf--summary">
				<div className="rf--summary-heading">
					<h3>{`Plan Summary`}</h3>
				</div>
				<div className="rf--summary-tier-name">
					<span className="_tier-name">{tierName.name}</span>
					{/* <p className="__plan-amount _price">{`${getPriceValue(
						subscriptionAmount
                    )}/${subscriptionInterval}`}</p> */}
					<div className="fe--pricing-breakdown-wrapper">
						<div className="subscription-pricing">
							{pricingPlan.type === 'subscription' ? (
								<div className="fe--recurring-fee">
									<span className="_base-price-label">Recurring Payment</span>
								</div>
							) : null}
							{pricingPlan.type === 'one_time' ? (
								<div className="fe--base-price">
									<h5>Base Cost</h5>
								</div>
							) : null}
							<div className="fe--base-price-value">{getPrice(pricingPlan, null, metricProp)}</div>
						</div>

						{selectedTier.step &&
							selectedTier.step.map((item, i) => {
								return (
									<StepDescription
										key={i}
										step={item}
										interval={pricingPlan.interval}
										currency={pricingPlan.currency}
										tiers={preprocessedTiers}
										tierIndex={tierIndex}
									/>
								);
							})}

						{arrayOfGraduatedVolume.length > 1 && (
							<TablePricingSummary
								arrayOfGraduatedVolume={arrayOfGraduatedVolume}
								currentInterval={pricingPlan.interval}
							/>
						)}
					</div>
				</div>
				<div className="rf--summary-content">
					{pricingPlan.trial_period_days > 0 ? (
						<div className="rf--free-trial-content">
							{pricingPlan.trial_period_days}{' '}
							{`Day${pricingPlan.trial_period_days > 1 ? 's' : ''} Free Trial`}
						</div>
					) : null}
					{pricingPlan.type === 'subscription' || pricingPlan.type === 'one_time' ? (
						<div className="rf--pricing-content">
							<div className="_advanced-metric-pricing">
								{//only displays if there is no flat pricing
								selectedTier.step &&
								!selectedTier.plan_flat && (
									<div className={`_container`}>
										<StepPrice
											step={selectedTier.step}
											interval={pricingPlan.interval}
											currency={pricingPlan.currency}
										/>
									</div>
								)}
								{/* {selectedTier.plan_flat && (
									<div className={`_container`}>
										<FlatPrice
											flat={selectedTier.plan_flat}
											interval={pricingPlan.interval}
											currency={pricingPlan.currency}
											renderCounts={renderCounts}
										/>
									</div>
								)} */}
								{selectedTier.unit &&
									typeof selectedTier.unit == 'object' &&
									selectedTier.unit.map((item, i) => {
										return (
											<div className={`_container`}>
												<UnitPrice
													key={i}
													unit={item}
													interval={pricingPlan.interval}
													currency={pricingPlan.currency}
													renderCounts={renderCounts}
												/>
											</div>
										);
									})}
							</div>
							{filteredAdjustments}
							<div className="fe--total-price-wrapper">
								<div className="fe--total-price-label">
									<span
										style={{ textTransform: 'capitalize' }}
									>{`${intervallyText()} Recurring Payments`}</span>
								</div>
								<div className="fe--total-price-value">
									<Price value={total} currency={currency} />
								</div>
							</div>
						</div>
					) : null}

					{pricingPlan.type === 'custom' ? <div className="rf--quote-content">Contact</div> : null}
				</div>
			</div>
		</div>
	);
}
class ServiceRequest extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			loading: true,
			id: this.props.templateId,
			service: null,
			image: null,
			icon: null,
			editingMode: false,
			editingGear: false,
			error: null,
			step: 0
		};
		this.getCoverImage = this.getCoverImage.bind(this);
		this.getIcon = this.getIcon.bind(this);
		this.toggleEditingMode = this.toggleEditingMode.bind(this);
		this.toggleOnEditingGear = this.toggleOnEditingGear.bind(this);
		this.toggleOffEditingGear = this.toggleOffEditingGear.bind(this);
		this.getService = this.getService.bind(this);
		this.stepForward = this.stepForward.bind(this);
		this.stepBack = this.stepBack.bind(this);
		this.setStep = this.setStep.bind(this);
	}

	componentDidMount() {
		this.getService();
		//this.getCoverImage();
		this.getIcon();
	}

	getCoverImage() {
		let self = this;
		let imageURL = `${this.props.url}/api/v1/service-templates/${this.state.id}/image`;
		fetch(imageURL)
			.then(function(response) {
				if (response.ok) {
					return response.blob();
				}
				throw new Error('Network response was not ok.', response);
			})
			.then(function(myBlob) {
				let objectURL = URL.createObjectURL(myBlob);
				self.setState({ image: objectURL });
			})
			.catch(function(error) {});
	}
	stepForward(e) {
		// e.preventDefault();
		this.setState({ step: (this.state.step += 1) });
	}
	stepBack(e) {
		e.preventDefault();
		this.setState({ step: (this.state.step -= 1) });
	}

	getIcon() {
		let self = this;
		fetch(`/api/v1/service-templates/${this.state.id}/icon`)
			.then(function(response) {
				if (response.ok) {
					return response.blob();
				}
				throw new Error('Network response was not ok.');
			})
			.then(function(myBlob) {
				let objectURL = URL.createObjectURL(myBlob);
				self.setState({ icon: objectURL });
			})
			.catch(function(error) {});
	}

	toggleEditingMode() {
		if (this.state.editingMode) {
			this.setState({ editingMode: false });
		} else {
			this.setState({ editingMode: true });
		}
	}

	toggleOnEditingGear() {
		this.setState({ editingGear: true });
	}

	toggleOffEditingGear() {
		this.setState({ editingGear: false });
	}

	getService() {
		let self = this;
		let headers = new Headers({
			'Content-Type': 'application/json'
		});
		let req = {
			method: 'GET',
			headers: headers
		};
		Fetcher(`${self.props.url}/api/v1/service-templates/${this.state.id}/request`, 'GET', null, req).then(function(
			response
		) {
			if (!response.error) {
				let propertyOverrides = self.props.propertyOverrides;
				let propertyDefaults = self.props.propertyDefaults;
				response.payment_structure_template_id = self.props.paymentStructureTemplateId;
				if (propertyOverrides) {
					response.references.service_template_properties = response.references.service_template_properties.map(
						(prop) => {
							if (propertyOverrides[prop.name]) {
								prop.prompt_user = false;
								prop.private = true;
								prop.data = { value: propertyOverrides[prop.name] };
							}
							return prop;
						}
					);
				}
				if (propertyDefaults) {
					if (propertyDefaults.email) {
						response.email = propertyDefaults.email;
					}
					response.references.service_template_properties = response.references.service_template_properties.map(
						(prop) => {
							if (propertyDefaults[prop.name]) {
								// prop.prompt_user = false;
								// prop.private = true;
								prop.data = { value: propertyDefaults[prop.name] };
							}
							return prop;
						}
					);
				}

				self.setState({ service: response });
			} else {
				if (response.error === 'Unauthenticated') {
					self.setState({ error: 'Error: Trying to request unpublished template' });
				}
				console.error('Error getting template request data', response);
			}
			self.setState({ loading: false });
			self.props.setLoading(false);
		});
	}

	setStep(step) {
		this.setState({ step: step });
	}

	getAdjustmentSign(adjustment, currency) {
		switch (adjustment.operation) {
			case 'subtract':
				return (
					<span>
						<span>-</span>
						<Price value={adjustment.value} currency={currency} />
					</span>
				);
				break;
			case 'multiply':
				return <span>+ %{adjustment.value}</span>;
				break;
			case 'divide':
				return <span>- %{adjustment.value}</span>;
				break;
			default:
				return (
					<span>
						<span>+</span> <Price value={adjustment.value} currency={currency} />
					</span>
				);
		}
	}

	render() {
		console.log(`<SERVICEREQUEST> -- state`, this.state);
		console.log(`<SERVICEREQUEST> -- props`, this.props);
		if (this.state.loading) {
			return (
				<Layout>
					<Load className={`servicebot-embed-custom-loader`} />
				</Layout>
			);
		} else {
			let { formJSON, options, paymentStructureTemplateId, googleScope } = this.props;
			let { service, error } = this.state;
			let selectedTier = null;

			//Gets the correct Payment Structure Template -- AKA Plan
			let pricingPlan = service.references.tiers.reduce((acc, tier) => {
				let plan = tier.references.payment_structure_templates.find((p) => p.id == paymentStructureTemplateId);
				if (plan) {
					selectedTier = tier;
					acc = plan;
				}
				return acc;
			}, null);
			if (!pricingPlan) {
				throw 'Error: Please make sure the paymentStrcutureTemplateId is correctly setup in your embed props.';
			}

			if (this.state.error) {
				return <span>{error}</span>;
			}

			let metricProp =
				formJSON && formJSON.references.service_template_properties.find((prop) => prop.type === 'metric');
			let isMetric =
				metricProp &&
				metricProp.config.pricing &&
				metricProp.config.pricing.tiers &&
				metricProp.config.pricing.tiers.includes(selectedTier.name);
			let basePrice = isMetric ? 0 : pricingPlan && pricingPlan.amount;
			let { total, adjustments } = getPriceData(
				basePrice,
				formJSON && formJSON.references.service_template_properties
			);

			// Stuff from API v2
			let preprocessedTiers = deepClone(service.references.tiers);
			//Adding flat pricing to tiers
			preprocessedTiers = PreProcessors.addFlatPropToTiers.default(service, preprocessedTiers);
			//Adding metric unit to tiers
			preprocessedTiers = PreProcessors.addMetricPropUnitToTiers.default(service, preprocessedTiers);
			//Adding metric step to tiers
			preprocessedTiers = PreProcessors.addMetricPropStepToTiers.default(service, preprocessedTiers);

			let preprocessedTemplate = deepClone(service);
			//Change reference of preprocessedTemplate's reference.tiers to the preprocessedTiers
			preprocessedTemplate.references.tiers = preprocessedTiers;
			//Adding metric volume to template root -- because volume are not attached to tiers
			preprocessedTemplate = PreProcessors.addMetricPropVolumeToTemplate.default(service, preprocessedTemplate);
			//Adding metric graducated to template root -- because graduated are not attached to tiers
			preprocessedTemplate = PreProcessors.addMetricPropGraducatedToTemplate.default(
				service,
				preprocessedTemplate
			);
			//Get an array of graduated and volume plans for rendering price overview
			const arrayOfGraduatedVolume = PreProcessors.getArrayGraduatedVolume.default(preprocessedTemplate);

			let filteredAdjustments = adjustments
				.filter((adjustment) => adjustment.value > 0)
				.map((lineItem, index) => (
					<div key={'line-' + index} className="fe--line-item-pricing-wrapper">
						<div className="subscription-pricing">
							<div className="fe--line-item">{lineItem.prop_label}</div>
							<div className="fe--line-item-price-value">
								{this.getAdjustmentSign(lineItem, pricingPlan.currency)}
							</div>
						</div>
					</div>
				));
			let splitPricing = service.split_configuration;
			let splitTotal = 0;

			let rightHeading = 'Items';
			switch (service.type) {
				case 'one_time':
					rightHeading = 'Payment Summary';
					break;
				case 'custom':
					rightHeading = 'Contact';
					break;
				case 'split':
					rightHeading = 'Scheduled Payments';
					if (splitPricing) {
						splitPricing.splits.map((split) => {
							splitTotal += split.amount;
						});
					}
					break;
				default:
					rightHeading = 'Items';
			}

			const requestClasses = this.props.hideSummary ? 'summary-hidden' : 'summary-shown';
			let summaryProps = {
				rightHeading,
				pricingPlan,
				filteredAdjustments,
				total,
				preprocessedTiers,
				preprocessedTemplate,
				arrayOfGraduatedVolume
			};
			let self = this;
			return (
				<div>
					<Layout className={requestClasses}>
						<div className={`rf--form`}>
							{/*{JSON.stringify(this.getPriceData())}*/}
							<h2 className="_app-heading">
								<span>Create Your Account</span>
							</h2>

							<div className="rf--form-content">
								<div className="rf--basic-info" />
								<ServiceRequestForm
									summary={
										<Summary
											{...summaryProps}
											formJSON={this.props.formJSON}
											currency={pricingPlan.currency}
											metricProp={isMetric && metricProp}
										/>
									}
									plan={pricingPlan}
									{...this.props}
									step={this.state.step}
									stepForward={this.stepForward}
									stepBack={this.stepBack}
									setStep={this.setStep}
									service={service}
								/>
							</div>
						</div>
					</Layout>
				</div>
			);
		}
	}
}

function mapStateToProps(state) {
	return {
		options: {},
		formJSON: getFormValues(REQUEST_FORM_NAME)(state)
	};
}
let mapDispatchToProps = function(dispatch) {
	return {
		setLoading: function(is_loading) {
			dispatch({ type: 'SET_LOADING', is_loading });
		}
	};
};

ServiceRequest = connect(mapStateToProps, mapDispatchToProps)(ServiceRequest);
let Wrapper = function(props) {
	return <Provider store={store} />;
};

export default ServiceRequest;
