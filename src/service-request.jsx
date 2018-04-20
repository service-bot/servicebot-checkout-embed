import React from 'react';
import ServiceRequestForm from "./forms/request-form.jsx"
import Fetcher from "./utilities/fetcher.jsx"
import {Price, getPrice} from "./utilities/price.jsx";
import {getPrice as getTotalPrice, getPriceAdjustments} from "./widget-inputs/handleInputs";
import {connect} from 'react-redux';

let _ = require("lodash");
import {formValueSelector, getFormValues} from 'redux-form'

const REQUEST_FORM_NAME = "serviceInstanceRequestForm";
const selector = formValueSelector(REQUEST_FORM_NAME); // <-- same as form name
import {StickyContainer, Sticky} from 'react-sticky';
import getSymbolFromCurrency from 'currency-symbol-map'
import getWidgets from "./core-input-types/client"

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
            error: null
        };
        this.getCoverImage = this.getCoverImage.bind(this);
        this.getIcon = this.getIcon.bind(this);
        this.toggleEditingMode = this.toggleEditingMode.bind(this);
        this.toggleOnEditingGear = this.toggleOnEditingGear.bind(this);
        this.toggleOffEditingGear = this.toggleOffEditingGear.bind(this);
        this.getPriceData = this.getPriceData.bind(this);
        this.getService = this.getService.bind(this);
    }

    componentDidMount() {
        this.getService();
        //this.getCoverImage();
        this.getIcon();
    }


    getCoverImage() {
        let self = this;
        let imageURL = `${this.props.url}/api/v1/service-templates/${this.state.id}/image`;
        fetch(imageURL).then(function (response) {
            if (response.ok) {
                return response.blob();
            }
            throw new Error('Network response was not ok.', response);
        }).then(function (myBlob) {
            let objectURL = URL.createObjectURL(myBlob);
            self.setState({image: objectURL});
        }).catch(function (error) {

        });
    }

    getIcon() {
        let self = this;
        fetch(`/api/v1/service-templates/${this.state.id}/icon`).then(function (response) {
            if (response.ok) {
                return response.blob();
            }
            throw new Error('Network response was not ok.');
        }).then(function (myBlob) {
            let objectURL = URL.createObjectURL(myBlob);
            self.setState({icon: objectURL});
        }).catch(function (error) {

        });
    }

    toggleEditingMode() {
        if (this.state.editingMode) {
            this.setState({editingMode: false})
        } else {
            this.setState({editingMode: true})
        }
    }

    toggleOnEditingGear() {
        this.setState({editingGear: true})
    }

    toggleOffEditingGear() {
        this.setState({editingGear: false})
    }

    getPriceData() {
        let {formJSON} = this.props;
        if (formJSON) {
            let handlers = getWidgets().reduce((acc, widget) => {
                acc[widget.type] = widget.handler;
                return acc;

            }, {});
            let newPrice = formJSON.amount;
            let adjustments = [];
            try {
                newPrice = getTotalPrice(formJSON.references.service_template_properties, handlers, formJSON.amount);
                adjustments = getPriceAdjustments(formJSON.references.service_template_properties, handlers)
            } catch (e) {
                console.error(e);
            }
            return {total: newPrice, adjustments};
        } else {
            return {total: 0, adjustments: []};
        }

    }

    getService() {
        let self = this;
        Fetcher(`${self.props.url}/api/v1/service-templates/${this.state.id}/request`).then(function (response) {
            if (!response.error) {
                let propertyOverrides = self.props.propertyOverrides;
                if(propertyOverrides) {
                    response.references.service_template_properties = response.references.service_template_properties.map(prop => {
                        if (propertyOverrides[prop.name]){
                            prop.prompt_user = false;
                            prop.private = true;
                            prop.data = {value : propertyOverrides[prop.name]};
                        }
                        return prop;
                    })
                }

                self.setState({service: response});
            } else {
                if(response.error === "Unauthenticated"){
                    self.setState({error : "Error: Trying to request unpublished template"});
                }
                console.error("Error getting template request data", response);
            }
            self.setState({loading: false});
        });
    }

    getAdjustmentSign(adjustment, prefix) {
        switch (adjustment.operation) {
            case "subtract":
                return <span>- <Price value={adjustment.value} prefix={prefix}/></span>;
                break;
            case "multiply":
                return <span>+ %{adjustment.value}</span>;
                break;
            case"divide":
                return <span>- %{adjustment.value}</span>;
                break;
            default:
                return <span>+ <Price value={adjustment.value} prefix={prefix}/></span>;
        }
    }

    render() {
        if (this.state.loading) {
            return (<span></span>);
        } else {
            let {formJSON, options} = this.props;
            let {service, error} = this.state;
            if(this.state.error){
                return (<span>{error}</span>)
            }

            let prefix = getSymbolFromCurrency(service.currency);


            const featuredStyle = {
                height: _.get(options, 'purchase_page_featured_area_height.value', 'auto'),
                minHeight: _.get(options, 'purchase_page_featured_area_height.value', 'auto'),
                paddingTop: _.get(options, 'purchase_page_featured_area_padding_top.value', '90px'),
                paddingBottom: _.get(options, 'purchase_page_featured_area_padding_bottom.value', '0px'),
            };

            const featuredOverlayStyle = {
                backgroundColor: _.get(options, 'purchase_page_featured_area_overlay_color.value', '#000000'),
                opacity: _.get(options, 'purchase_page_featured_area_overlay_opacity.value', '0'),
            };

            const featuredTextStyle = {
                color: _.get(options, 'purchase_page_featured_area_text_color.value', '#ffffff'),
            };

            //const {formJSON, options} = this.props;
            let service_request_title_description = _.get(options, 'service_request_title_description.value', 'What you are getting');
            let service_request_title_form = _.get(options, 'service_request_title_form.value', 'Get Your Service');
            let formAmount = _.get(formJSON, 'amount', 'N/A');
            let {total, adjustments} = this.getPriceData();
            let filteredAdjustments = adjustments.filter(adjustment => adjustment.value > 0);
            let splitPricing = service.split_configuration;
            let splitTotal = 0;

            let rightHeading = "Plan Summary";
            switch (service.type) {
                case 'one_time':
                    rightHeading = "Payment Summary";
                    break;
                case 'custom':
                    rightHeading = "Custom Service";
                    break;
                case 'split':
                    rightHeading = "Scheduled Payments";
                    if (splitPricing) {
                        splitPricing.splits.map((split) => {
                            splitTotal += split.amount;
                        });
                    }
                    break;
                default:
                    rightHeading = "Plan Summary";
            }

            const requestClasses = this.props.hideSummary ? "col-md-12 col-lg-12" : "col-md-8 col-lg-8";
            const requestStyle = this.props.hideSummary ? {"border-right": "none"} : {};
            return (

                <div className="request-wrap">
                    {/*{JSON.stringify(this.getPriceData())}*/}
                    <div
                        className="request-content col-lg-offset-1 col-xl-offset-2 col-xs-12 col-sm-12 col-md-12 col-lg-10 col-xl-8">
                        <div className={`request-user-form col-xs-12 col-sm-12 ${requestClasses}`} style={requestStyle}>
                            {!this.props.hideHeaders && <div className="request-form-heading">
                                {service.name}
                            </div>}
                            <div className="request-form-content">
                                <div className="basic-info">
                                    {!this.props.hideHeaders && <div className="service-request-details">
                                        <div dangerouslySetInnerHTML={{__html: service.details}}/>
                                    </div>}
                                </div>
                                {!this.props.hideHeaders && <div className="devider">
                                    <hr/>
                                </div>}
                                <ServiceRequestForm  {...this.props} service={service}/>
                            </div>
                        </div>
                        {!this.props.hideSummary && <div className="request-summary col-xs-12 col-sm-12 col-md-4 col-lg-4">
                            <div className="request-summary-heading">{rightHeading}</div>

                                            <div className="request-summary-content">
                                                {(service.trial_period_days > 0) ? (
                                                    <div className="free-trial-content">{service.trial_period_days} Day
                                                        Free Trial</div>
                                                ) : null}
                                                {(service.type === "subscription" || service.type === "one_time") ? (
                                                    <div>
                                                        <div className="pricing-wrapper">
                                                            <div className="subscription-pricing row m-r-0 m-l-0">
                                                                {(service.type === "subscription") ? (
                                                                    <div className="col-md-6 p-r-0 p-l-0">Recurring
                                                                        Fee</div>) : null}
                                                                {(service.type === "one_time") ? (
                                                                    <div className="col-md-6 p-r-0 p-l-0">Base
                                                                        Cost</div>) : null}
                                                                <div className="col-md-6 p-r-0 p-l-0 text-right">
                                                                    <b>{getPrice(service)}</b></div>
                                                            </div>
                                                        </div>
                                                        {filteredAdjustments.map((lineItem, index) => (
                                                            <div key={"line-" + index} className="pricing-wrapper">
                                                                <div className="subscription-pricing row m-r-0 m-l-0">
                                                                    <div
                                                                        className="col-md-6 p-r-0 p-l-0">{lineItem.name}</div>
                                                                    <div className="col-md-6 p-r-0 p-l-0 text-right">
                                                                        <b>{this.getAdjustmentSign(lineItem, prefix)}</b>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        <div className="total-price">
                                                            <div className="row m-r-0 m-l-0">
                                                                <div className="col-md-6 p-r-0 p-l-0">Total:</div>
                                                                <div className="col-md-6 p-r-0 p-l-0 text-right">
                                                                    <b><Price value={total} prefix={prefix}/></b></div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                ) : null}

                                                {(service.type === "custom") ? (
                                                    <div className="quote-content">Custom Quote</div>
                                                ) : null}

                                                {(service.type === "split" && splitPricing) ? (
                                                    <div>
                                                        {splitPricing.splits.map((splitItem, index) => (
                                                            <div key={"split-" + index} className="split-wrapper">
                                                                <div className="subscription-pricing row m-r-0 m-l-0">
                                                                    <div
                                                                        className="col-md-6 p-r-0 p-l-0">{(splitItem.charge_day === 0) ? (
                                                                        <span>Right Now</span>) : (
                                                                        <span>After {splitItem.charge_day} Days</span>)}</div>
                                                                    <div className="col-md-6 p-r-0 p-l-0 text-right"><b><Price
                                                                        value={splitItem.amount} prefix={prefix}/></b>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        <div className="total-price">
                                                            <div className="row m-r-0 m-l-0">
                                                                <div className="col-md-6 p-r-0 p-l-0">Total:</div>
                                                                <div className="col-md-6 p-r-0 p-l-0 text-right">
                                                                    <b><Price value={splitTotal} prefix={prefix}/></b>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : null}
                                            </div>


                        </div>}
                    </div>

                </div>

            );
        }
    }
}

function mapStateToProps(state) {
    return {
        options: {},
        formJSON: getFormValues(REQUEST_FORM_NAME)(state)
    }
}


ServiceRequest = connect(mapStateToProps)(ServiceRequest);
let Wrapper = function (props) {

    return (<Provider store={store}>
    </Provider>)
};

export default ServiceRequest;