import React from "react";
import handler from "./widgetHandler";
import PriceAdjustment from '../../widget-inputs/WidgetPriceAdjustment';
import WidgetPricingInput from '../../widget-inputs/WidgetPricingInput.js';
import {OnOffToggleField} from "servicebot-base-form";
let Checkbox = (props) => {
    let {input, configValue, currency, label, meta: {touched, error, warning}} = props;
    return (
        <div className={`addon-checkbox-widget-default-value-wrapper${error && touched ? " has-error" : ""}`}>
            <div className="sb-form-group addon-checkbox-widget-default-value">
                {label && <label className="_label- addon-checkbox-widget-default-value-label">{label}</label>}
                <div className="_input-container-">
                    <div className="request-form-toggle-option-wrapper">
                    <OnOffToggleField faIcon="check" color="#0091EA" input={input} type="checkbox"/>
                    {configValue && configValue.pricing && configValue.pricing.value ? <PriceAdjustment currency={currency} price={configValue.pricing.value} operation={configValue.pricing.operation}/> : <React.Fragment/>}  
                    </div>
                    {/*<input className="form-control addon-checkbox-widget-default-value-input" {...props.input} type="checkbox"/>*/}
                </div>
            </div>
        </div>
    );
};
let Price = (props) => {
    let config = props.configValue;
    return (
        <div className={`addon-checkbox-widget-price-inputs-wrapper`}>
            <div className="sb-form-group checkbox-checkbox-widget-price-inputs">
                <WidgetPricingInput currency={props.currency} input={props.input} operation={config && config.pricing && config.pricing.operation}/>
                {/*<CurrencyInput {...props.input} className="form-control addon-checkbox-widget-price-input"*/}
                               {/*prefix="$" decimalSeparator="." thousandSeparator="," precision="2"*/}
                {/*/>*/}
            </div>
        </div>
    );
};

let widget = {
    widget : Checkbox,
    type : "checkbox",
    label : "Checkbox",
    pricing: Price,
    handler : handler
};


export default widget