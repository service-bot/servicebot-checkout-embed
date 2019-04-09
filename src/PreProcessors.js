/*
* PreProcessors contains functions that are used to create / preprocess / transform
* objects / data to a form that will be directly used in the React UI / State.
* It also keeps backward compatible functions untouched.
*/
import {deepClone} from './ServicebotUtilities';
import {APIVERSION} from './Constants';
import { request } from 'http';

//Adding flat to preprocessed tiers
function addFlatPropToTiersV2(serviceTemplate, tiers){
    const metricProps = serviceTemplate.references.service_template_properties.filter(prop => prop.type === "metric" && prop.config.strategy == "flat");
    let transformedTiers = tiers;
    if(metricProps.length){
        transformedTiers = tiers.map(tier => {
            tier.plan_flat = [];
            tier.references.payment_structure_templates.map(prop => {
                tier.plan_flat = [
                    ...tier.plan_flat, {...prop}
                ];
            })
            return tier;
        })
        return transformedTiers;
    }
    return transformedTiers;
}

//Adding metric unit to preprocessed tiers
function addMetricPropUnitToTiersV1(serviceTemplate, tiers){
    const metricProp = serviceTemplate.references.service_template_properties.find(prop => prop.type === "metric");
    if(metricProp) {
            tiers = serviceTemplate.references.tiers.map(tier => {
            if (metricProp.config.pricing.tiers.includes(tier.name)) {
                tier.unit = metricProp.config.unit;
            }
            return tier
        });
        return tiers;
    }
    return tiers;
}

//Adding metric unit to preprocessed tiers
function addMetricPropUnitToTiersV2(serviceTemplate, tiers){
    const metricProps = serviceTemplate.references.service_template_properties.filter(prop => prop.type === "metric" && prop.config.strategy == "unit");
    let transformedTiers = tiers;
    
    if(metricProps.length) {
        transformedTiers = tiers.map(tier => {
                const {references: {payment_structure_templates}} = tier;
                const tierType = payment_structure_templates[0].type;
                tier.unit = [];
                metricProps.map(prop => {
                    const {config: {isMetered, isSeat, strategy, tiers, unit}} = prop;
                    if (tiers.find(item => item.name === tier.name)) {
                        tier.unit = [...tier.unit, {
                            price: tiers.find(item => item.name === tier.name),
                            unit_name: unit,
                            isMetered,
                            isSeat,
                            tier_type: tierType,
                        }];
                    }  
                })
            return tier
        });
        return transformedTiers;
    }
    return transformedTiers;
}

//Adds backward compatibility, determine if the serviceTemplate was created with V1 template forms.
function addMetricPropUnitToTiersDefault(serviceTemplate, tiers){
    switch(whatVersion(serviceTemplate)){
        case APIVERSION.V1:
            return addMetricPropUnitToTiersV1(serviceTemplate, tiers); break;
        default:
            return addMetricPropUnitToTiersV2(serviceTemplate, tiers); break;
    }
}

//Adding step to preprocessed tiers
function addMetricPropStepToTiersV2(serviceTemplate, tiers){
    const metricProps = serviceTemplate.references.service_template_properties.filter(prop => prop.type === "metric" && prop.config.strategy == "step");
    let transformedTiers = tiers; //TODO: find out if this is always the case for step. tiers being wrapped in an single element array.
    if(metricProps.length) {
        transformedTiers = tiers.map(tier => {
                const {references: {payment_structure_templates}} = tier;
                const tierType = payment_structure_templates[0].type;
                tier.step = [];
                metricProps.map(prop => {
                    const {config: {isMetered, isSeat, strategy, unit}} = prop;
                    const stepConfigTiers = prop.config.tiers;
                    if (tiers.find(item => item.name === tier.name)) {
                        tier.step = [...tier.step, {
                            price: { //Price for step uses template's references.pyament_structure_templates
                                plans: (()=> {return tiers.find(item => item.name === tier.name)})().references.payment_structure_templates.map(item=>{
                                        return { 
                                            ...(()=>{return stepConfigTiers.find(stepConfigTier => stepConfigTier.name === tier.name)})(), //contains name, tierIndex, upperLimit
                                            ...item //tier
                                        }
                                    })
                            },
                            unit_name: unit,
                            isMetered,
                            isSeat,
                            tier_type: tierType,
                        }];
                    }  
                })
            return tier
        });
        return transformedTiers;
    }
    return transformedTiers;
}

//Adding volume to preprocessed template
function addMetricPropVolumeToTemplateV2(serviceTemplate, template){
    const metricProps = serviceTemplate.references.service_template_properties.filter(prop => prop.type === "metric" && prop.config.strategy == "volume");
    let transformedTemplate = template;
    if(metricProps.length){
        
        transformedTemplate = {...transformedTemplate, volume: metricProps.map(prop => {
                const config = deepClone(prop.config);
                return {
                    ...config, 
                    rows: config.tiers.map(item => {return {
                            plans: item.plans, 
                            upperLimit: item.upperLimit,
                        }
                    }
                )}
s            })
        }
        return transformedTemplate;
    }
    return template;
}

//Adding graduated to preprocessed template
function addMetricPropGraducatedToTemplateV2(serviceTemplate, template){
    const metricProps = serviceTemplate.references.service_template_properties.filter(prop => prop.type === "metric" && prop.config.strategy == "graduated");
    let transformedTemplate = template;
    if(metricProps.length){
        transformedTemplate = {...transformedTemplate, graduated: metricProps.map(prop => {
                const config = deepClone(prop.config);
                return {
                    ...config, 
                    rows: config.tiers.map(item => {return {
                            plans: item.plans, 
                            upperLimit: item.upperLimit,
                        }
                    }
                )}
s            })
        }
        return transformedTemplate;
    }
    return template;
}

//Creates an array of graduated and volume plans for rendering pricin overview
function getArrayGraduatedVolumeV2(preprocessedTemplate){
    const { graduated, volume } = preprocessedTemplate;
    let array = [];
    if(graduated){
        array = [...graduated];
    }
    if(volume){
        array = [...array, ...volume];
    }
    return array;
}

//creates an object where the key is the payment_structure_template type,
//and the value is an array of the payment structure templates with that type.
function getPaymentPlansObject(tiers){
    let transformedTiers = tiers;
    
    return transformedTiers.reduce(( acc, tier) => {
        return acc.concat(tier.references.payment_structure_templates);
    }, []).reduce((acc, plan)=> {
        acc[plan.type] = [plan].concat(acc[plan.type] || []);
        return acc;
    }, {});
}

//Determines the current billing interval selected
function getCurrentBillingInterval(paymentPlans){
    let currentInterval = null;
    
    if(paymentPlans.subscription){
        currentInterval = paymentPlans.subscription.some(item => item.interval === "year") ? "year" : paymentPlans.subscription[0].interval;
        
    }else if(!paymentPlans.one_time && paymentPlans.subscription.every(item => item.interval === currentInterval)){ //TODO: review this if statement, what does it do? change from if to else if.
        currentInterval = null;
    }
    return currentInterval;
}

//Gets a set of unique interval values as an array of intervals
function getUniqueIntervalValues(paymentPlans){
    let {subscription, custom, one_time} = paymentPlans;
    let intervals = new Set([]);

    if(one_time){
        intervals.add("one_time");
    }
    if(subscription){
        subscription.forEach(item => {
            intervals.add(item.interval);
        })
    }
    if(custom){
        custom.forEach(item => {
            intervals.add(item.interval);
        })
    }
    return Array.from(intervals);
}

//Gets the current selected interval's tiers, sorted by the price.
function getCurrentIntervalTiers(paymentPlans, currentInterval, intervalArray){
    const {subscription, custom, one_time} = paymentPlans;
    let currentIntervalTiers = custom || [];
    if(custom){
        
        currentIntervalTiers = custom.filter(item =>{return item.interval === currentInterval});
    }
    if(subscription && currentInterval !== "one_time"){
        const sortedSubscriptions = subscription.sort((a, b) => {
            return b.amount - a.amount;
        }).reduce((acc, sub) => {
            acc[sub.interval] = [sub].concat(acc[sub.interval] || []);
            return acc; //object where key is the interval, value is an array of plans
        }, {});
        
        currentIntervalTiers = sortedSubscriptions[currentInterval || intervalArray[0]].concat(currentIntervalTiers);
    }
    if(currentInterval === "one_time"){
        
        one_time.sort((a, b)=> {
            return b.amount-a.amount;
        });
        currentIntervalTiers = one_time.concat(currentPlans);
    }
    
    return currentIntervalTiers;
}

function getRequestFieldsArray(formJSON){
    const requestFields = formJSON.references.service_template_properties.filter((item) => {
        if (!item.type) {
            throw 'Error: items in formJSON.references.service_template_properties must contain the key `type` ';
        }
        console.log("reqeustFields -- item ", item);
        return item.config.pricing && item.config.pricing.value && item.prompt_user
    });
    return requestFields
}

function getRequestAddonsArray(formJSON){
    const requestAddons = formJSON.references.service_template_properties.filter((item) => {
        if (!item.type) {
            throw 'Error: items in formJSON.references.service_template_properties must contain the key `type` ';
        }
        //TODO: make sure only select and checkbox of !$0 are added here
        console.log("requestAddons -- item ", item);
        return item.config.pricing && item.config.pricing.value && item.prompt_user
    });
    return requestAddons
}

//Takes an API JSON Response and returns what version the JSON is from.
function whatVersion(JSONResponse){
    const metricProp = JSONResponse.references.service_template_properties.find(prop => prop.type === "metric");
    //v1 of the API JSON response had tiers inside of pricing
    if(!metricProp || metricProp.config.pricing.tiers){
        return APIVERSION.V1;
    }else{
        return APIVERSION.V2;
    }
}

const PreProcessors = {
    whatVersion: {
        default: whatVersion,
    },
    addMetricPropUnitToTiers: {
        default: addMetricPropUnitToTiersDefault,
        v1: addMetricPropUnitToTiersV1,
        v2: addMetricPropUnitToTiersV2,
    },
    getPaymentPlansObject: {
        default: getPaymentPlansObject,
    },
    getCurrentBillingInterval: {
        default: getCurrentBillingInterval,
    },
    getUniqueIntervalValues: {
        default: getUniqueIntervalValues,
    },
    getCurrentIntervalTiers: {
        default: getCurrentIntervalTiers,
    },
    addFlatPropToTiers: {
        default: addFlatPropToTiersV2,
        v2: addFlatPropToTiersV2,
    },
    addMetricPropStepToTiers: {
        default: addMetricPropStepToTiersV2,
        v2: addMetricPropStepToTiersV2,
    },
    addMetricPropGraducatedToTemplate: {
        default: addMetricPropGraducatedToTemplateV2,
        v2: addMetricPropGraducatedToTemplateV2,
    },
    addMetricPropVolumeToTemplate: {
        default: addMetricPropVolumeToTemplateV2,
        v2: addMetricPropVolumeToTemplateV2,
    },
    getArrayGraduatedVolume: {
        default: getArrayGraduatedVolumeV2,
        v2: getArrayGraduatedVolumeV2,
    },
    getRequestFieldsArray: {
        default: getRequestFieldsArray,
        v2: getRequestFieldsArray,
    },
    getRequestAddonsArray: {
        default: getRequestAddonsArray,
        v2: getRequestAddonsArray,
    },
    
}

export default PreProcessors;