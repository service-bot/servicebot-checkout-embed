import React from 'react';
import { Field, FormSection, FieldArray, formValueSelector, getFormValues, change } from 'redux-form';
import { connect } from 'react-redux';
import { RenderWidget, WidgetList, widgets, SelectWidget } from '../utilities/widgets';
import { inputField, selectField, widgetField, priceField, ServicebotBaseForm, Fetcher } from 'servicebot-base-form';
import { CardSection } from './billing-settings-form.js';
import { Price } from '../utilities/price.js';
import { required, email, numericality, length, confirmation } from 'redux-form-validators';
import { injectStripe, Elements, StripeProvider } from 'react-stripe-elements';
import getWidgets from '../core-input-types/client';
import { getPrice } from '../widget-inputs/handleInputs';
import values from 'object.values';
import { GoogleLogin } from 'react-google-login';
import Layout from '../layout';
import Load from '../utilities/load';
let _ = require('lodash');

if (!Object.values) {
	values.shim();
}

const selector = formValueSelector('serviceInstanceRequestForm'); // <-- same as form name

//Custom property
class renderCustomProperty extends React.Component {
	constructor(props) {
		super(props);
		this.state = {};
	}

	static getDerivedStateFromError(error) {
		// Update state so the next render will show the fallback UI.
		return { hasError: true };
	}

	componentDidCatch(error, info) {
		// You can also log the error to an error reporting service
		console.error('renderCustomProperty', error);
	}

	render() {
		const { fields, currency, formJSON, meta: { touched, error }, render_field_type } = this.props;

		const widgets = getWidgets().reduce((acc, widget) => {
			acc[widget.type] = widget;
			return acc;
		}, {});

		if (this.state.hasError) {
			return <h2>renderCustomProperty has error!</h2>;
		}
		return (
			<div>
				{fields.map((customProperty, index) => {
					// <<WHY WAS THIS MAPING ON fields from props??????
					const fieldType = formJSON[index].type;
					const property = widgets[fieldType];
					let validate = [];

					// -- will never have type = metric because formJSON is filtered before passing into this function
					if (fieldType === 'metric') {
						return <div key={index} />;
					}

					if (formJSON[index].required) {
						validate.push(required());
					}

					//TODO: filter for a type. Say REQUEST_FIELDS and REQUEST_ADDONS
					if (formJSON[index].prompt_user) {
						if (render_field_type === 'REQUEST_FIELDS') {
							if (
								!formJSON[index].config.pricing ||
								(formJSON[index].config.pricing && !formJSON[index].config.pricing.value)
							) {
								return (
									<Field
										key={index}
										// name={`${customProperty}.data.value`}
										name={`service_template_properties[${index}].data.value`}
										type={fieldType}
										widget={property.widget}
										component={widgetField}
										currency={currency}
										label={formJSON[index].prop_label}
										// value={formJSON[index].data.value}
										formJSON={formJSON[index]}
										configValue={formJSON[index].config}
										validate={validate}
									/>
								);
							}
						}

						if (render_field_type === 'REQUEST_ADDONS') {
							if (formJSON[index].config.pricing && formJSON[index].config.pricing.value) {
								return (
									<Field
										key={index}
										// name={`${customProperty}.data.value`}
										name={`service_template_properties[${index}].data.value`}
										type={fieldType}
										widget={property.widget}
										component={widgetField}
										currency={currency}
										label={formJSON[index].prop_label}
										// value={formJSON[index].data.value}
										formJSON={formJSON[index]}
										configValue={formJSON[index].config}
										validate={validate}
									/>
								);
							}
						}
					} else {
						if (formJSON[index].data && formJSON[index].data.value && !formJSON[index].private) {
							return (
								<div className={`sb-form-group`} key={index}>
									{formJSON[index].prop_label &&
									fieldType !== 'hidden' && (
										<label className="_label-">{formJSON[index].prop_label}</label>
									)}
									<div className="_input-container-">
										<p>{formJSON[index].data.value}</p>
									</div>
								</div>
							);
						} else {
							return <span key={index} />;
						}
					}
				})}
			</div>
		);
	}
}

//The full form
class ServiceRequestForm extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			price: props.plan.amount
		};
	}
	componentDidUpdate(prevProps, prevState) {
		const { handleSubmit, formJSON, helpers, error, step, plan } = this.props;
		let self = this;
		if (prevState.price === this.state.price) {
			let handlers = getWidgets().reduce((acc, widget) => {
				acc[widget.type] = widget.handler;
				return acc;
			}, {});
			let newPrice = plan.amount;
			try {
				newPrice = getPrice(formJSON.references.service_template_properties, handlers, plan.amount);
				if (newPrice !== self.state.price) {
					helpers.updatePrice(newPrice);
					self.setState({ price: newPrice });
				}
			} catch (e) {
				console.error(e);
			}
		}
	}

	static getDerivedStateFromError(error) {
		// Update state so the next render will show the fallback UI.
		return { hasError: true };
	}

	componentDidCatch(error, info) {
		// You can also log the error to an error reporting service

		console.error(error);
	}

	render() {
		const {
			handleSubmit,
			formJSON,
			emailOverride,
			token,
			googleClientId,
			googleScope,
			helpers,
			error,
			step,
			plan,
			needsCard,
			setGoogleInformation,
			accessType
		} = this.props;

		if (!plan) {
			throw 'Error: ServiceRequestForm props must contain Plan and must not be null';
		}
		if (!plan.type) {
			throw 'Error: items in plan must contain the key `type` ';
		}

		const { price } = this.state;
		let offlineJSON = {};

		if (accessType === 'offline') {
			offlineJSON = {
				accessType,
				responseType: 'code',
				prompt: 'consent'
			};
		}
		let getRequestText = () => {
			let serType = plan ? plan.type : null;
			if (serType) {
				if (serType === 'custom') {
					return <span>Submit</span>;
				} else {
					return <span>Complete Registration</span>;
				}
			}
		};

		let buttonText = plan && plan.type !== 'custom' ? 'Continue to Addons' : 'Continue to Addons';
		let checkoutText = plan && plan.trial_period_days > 0 ? 'Sign Up' : 'Pay Now';
		//Sort users and if user does not have name set, set it to the email value which will always be there
		const responseGoogle = (response) => {
			if (!response.error) {
				setGoogleInformation(response);
			}
		};

		const requestFields = formJSON.references.service_template_properties.filter((item) => {
			if (!item.type) {
				throw 'Error: items in formJSON.references.service_template_properties must contain the key `type` ';
			}
			//TODO: add checkboxes here if they are $0
			//TODO: add selection here if all options are $0
			return item.type === 'text' || item.type === 'secure-string';
			// return true
		});

		const requestAddons = formJSON.references.service_template_properties.filter((item) => {
			if (!item.type) {
				throw 'Error: items in formJSON.references.service_template_properties must contain the key `type` ';
			}
			//TODO: make sure only select and checkbox of !$0 are added here
			return item.type == 'select' || item.type == 'checkbox';
		});

		if (this.state.hasError) {
			return <h1>There is an error!</h1>;
		}

		return (
			<div className="rf--body">
				<ul className="step-selectors">
					<li
						className={`_step-selector ${step == 0 ? '_active' : ``}`}
						onClick={() => {
							if (step != 0) {
								const errors = this.props.handleSubmit();

								if (!errors.password && !errors.references) {
									helpers.setStep(0);
								}
							}
						}}
					>
						<span>Account Setup</span>
					</li>
					<li
						className={`_step-selector ${step == 1 ? '_active' : ``}`}
						onClick={() => {
							if (step != 1) {
								const errors = this.props.handleSubmit();

								if (!errors.password && !errors.references) {
									helpers.setStep(1);
								}
							}
						}}
					>
						<span>Additional Services</span>
					</li>
					<li
						className={`_step-selector ${step == 2 ? '_active' : ``}`}
						onClick={() => {
							if (step != 2) {
								const errors = this.props.handleSubmit();

								if (!errors.password && !errors.references) {
									helpers.setStep(2);
								}
							}
						}}
					>
						<span>Payment Information</span>
					</li>
				</ul>
				<form onSubmit={handleSubmit}>
					{step === 0 && (
						<div>
							{!helpers.uid && (
								<div className="rf--form-inner _step-0">
									<div className="_left">
										<div className="_heading-wrapper">
											<h2>{plan.type === 'custom' ? 'Contact' : 'Account Information'}</h2>
										</div>
										<div className="_content_wrapper">
											{accessType !== 'offline' && (
												<React.Fragment>
													{helpers.setName &&
													!formJSON.token &&
													!token && (
														<Field
															name="userName"
															type="text"
															component={inputField}
															validate={[ required() ]}
														/>
													)}
													{!emailOverride &&
													!formJSON.token &&
													!token && (
														<Field
															name="email"
															type="text"
															component={inputField}
															label="Email Address"
															validate={[ required(), email() ]}
														/>
													)}

													{helpers.emailExists && 'That email is in use'}
													{helpers.setPassword &&
													plan.type !== 'custom' &&
													!formJSON.token &&
													!token && (
														<div>
															<Field
																name="password"
																type="password"
																component={inputField}
																label="Password"
																validate={[ length({ min: 8 }), required() ]}
															/>
															<Field
																name="password_confirmation"
																type="password"
																label="Password confirmation"
																component={inputField}
																validate={[
																	confirmation({
																		field: 'password',
																		fieldLabel: 'Password'
																	})
																]}
															/>
														</div>
													)}
												</React.Fragment>
											)}

											{this.state.hasError ? (
												<h2>Errored</h2>
											) : (
												<FormSection name="references">
													<FieldArray
														name="service_template_properties"
														component={renderCustomProperty}
														currency={plan.currency}
														render_field_type={`REQUEST_FIELDS`}
														formJSON={formJSON.references.service_template_properties}
													/>
												</FormSection>
											)}

											<div className="button-wrapper _center">
												<button className="buttons _primary _next">{buttonText}</button>
											</div>

											{googleClientId &&
											googleClientId.value &&
											googleClientId.value.length > 0 &&
											plan.type !== 'custom' &&
											!formJSON.token &&
											!token && (
												<div className={`google-login-container`}>
													{accessType !== 'offline' && <span className={`_divider`}>Or</span>}
													<GoogleLogin
														disabledStyle={{}}
														className="google-button"
														clientId={googleClientId.value}
														buttonText="Sign up with Google"
														onSuccess={responseGoogle}
														onFailure={responseGoogle}
														scope={googleScope || 'profile email'}
														{...offlineJSON}
													>
														<span className="google-button__icon">
															<img
																src={`data:image/svg+xml;utf8,%3Csvg viewBox='0 0 366 372' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M125.9 10.2c40.2-13.9 85.3-13.6 125.3 1.1 22.2 8.2 42.5 21 59.9 37.1-5.8 6.3-12.1 12.2-18.1 18.3l-34.2 34.2c-11.3-10.8-25.1-19-40.1-23.6-17.6-5.3-36.6-6.1-54.6-2.2-21 4.5-40.5 15.5-55.6 30.9-12.2 12.3-21.4 27.5-27 43.9-20.3-15.8-40.6-31.5-61-47.3 21.5-43 60.1-76.9 105.4-92.4z' id='Shape' fill='%23EA4335'/%3E%3Cpath d='M20.6 102.4c20.3 15.8 40.6 31.5 61 47.3-8 23.3-8 49.2 0 72.4-20.3 15.8-40.6 31.6-60.9 47.3C1.9 232.7-3.8 189.6 4.4 149.2c3.3-16.2 8.7-32 16.2-46.8z' id='Shape' fill='%23FBBC05'/%3E%3Cpath d='M361.7 151.1c5.8 32.7 4.5 66.8-4.7 98.8-8.5 29.3-24.6 56.5-47.1 77.2l-59.1-45.9c19.5-13.1 33.3-34.3 37.2-57.5H186.6c.1-24.2.1-48.4.1-72.6h175z' id='Shape' fill='%234285F4'/%3E%3Cpath d='M81.4 222.2c7.8 22.9 22.8 43.2 42.6 57.1 12.4 8.7 26.6 14.9 41.4 17.9 14.6 3 29.7 2.6 44.4.1 14.6-2.6 28.7-7.9 41-16.2l59.1 45.9c-21.3 19.7-48 33.1-76.2 39.6-31.2 7.1-64.2 7.3-95.2-1-24.6-6.5-47.7-18.2-67.6-34.1-20.9-16.6-38.3-38-50.4-62 20.3-15.7 40.6-31.5 60.9-47.3z' fill='%2334A853'/%3E%3C/svg%3E`}
															/>
														</span>
														<span className="google-button__text">Sign up with Google</span>
													</GoogleLogin>
												</div>
											)}
										</div>
									</div>
								</div>
							)}
						</div>
					)
					//end step 0
					}
					{step === 1 && (
						<div className="rf--form-inner _step-1">
							<div className="_left">
								<div className="_heading-wrapper">
									<h2>{`Addons`}</h2>
								</div>
								<div className="_content_wrapper">
									<FormSection name="references">
										<FieldArray
											name="service_template_properties"
											component={renderCustomProperty}
											currency={plan.currency}
											render_field_type={`REQUEST_ADDONS`}
											formJSON={formJSON.references.service_template_properties}
										/>
									</FormSection>
									<div className="button-wrapper _center">
										<button className="buttons _primary _next">{`Continue to Payment`}</button>
									</div>
								</div>
							</div>
							<div className="_right">{this.props.summary}</div>
							<div className="button-wrapper _center _mobile">
								<button className="buttons _primary _next">{`Continue to Payment`}</button>
							</div>
						</div>
					)}
					{step === 2 && (
						<div className="rf--form-inner _step-2">
							<div className="_left">
								<div className="_heading-wrapper">
									<h2>Payment</h2>
								</div>
								<div className="_content_wrapper">
									{console.log('NEED CARD? ', needsCard)}
									{needsCard && <CardSection />}
									{!needsCard && <p>No payment information required.</p>}
									<div className="button-wrapper _center _space-between">
										{/* {!this.props.skippedStep0 && (
											<button
												onClick={helpers.stepBack}
												className="buttons _primary _text submit-request"
											>
												Back
											</button>
										)} */}

										<button
											className="buttons _primary submit-request"
											type="submit"
											value="submit"
										>
											{getRequestText()}
										</button>
									</div>
								</div>
							</div>
							<div className="_right">{this.props.summary}</div>

							<button className="buttons _primary _mobile submit-request" type="submit" value="submit">
								{getRequestText()}
							</button>
						</div>
					)}
					{typeof error == 'string' && <strong>{error}</strong>}
				</form>
			</div>
		);
	}
}

ServiceRequestForm = connect(
	(state, ownProps) => {
		return {
			serviceTypeValue: selector(state, `type`),
			formJSON: getFormValues('serviceInstanceRequestForm')(state)
		};
	},
	(dispatch) => {
		return {
			setGoogleInformation: (response) => {
				dispatch({ type: 'SET_OAUTH', response });
				if (!response.code) {
					let { email, name, googleId } = response.profileObj;
					dispatch(change('serviceInstanceRequestForm', `email`, email));
					dispatch(change('serviceInstanceRequestForm', `userName`, name));
					dispatch(change('serviceInstanceRequestForm', `token`, googleId));
				} else {
					dispatch(change('serviceInstanceRequestForm', `code`, response.code));
				}

				// dispatch(change("serviceInstanceRequestForm", `strategy`, "google"));
			}
		};
	}
)(ServiceRequestForm);

class ServiceInstanceForm extends React.Component {
	constructor(props) {
		super(props);

		let templateId = this.props.templateId || 1;
		this.state = {
			uid: this.props.uid,
			stripToken: null,
			templateId: templateId,
			templateData: this.props.service,
			formData: this.props.service,
			formURL: this.props.url + '/api/v1/service-templates/' + templateId + '/request',
			formResponseData: null,
			formResponseError: null,
			serviceCreated: false,
			servicePrice: this.props.plan.amount,
			usersData: {},
			usersURL: '/api/v1/users',
			hasCard: false,
			loading: true,
			hasFund: false,
            step: 0,
            selectedAddons: 0,
		};
		this.closeUserLoginModal = this.closeUserLoginModal.bind(this);
		this.updatePrice = this.updatePrice.bind(this);
		this.submissionPrep = this.submissionPrep.bind(this);
		this.handleResponse = this.handleResponse.bind(this);
        this.handleFailure = this.handleFailure.bind(this);
        this.setSelectedAddons = this.setSelectedAddons.bind(this);
	}

	async componentDidMount() {
		let headers = new Headers({
			'Content-Type': 'application/json'
		});
		let funds = [];
		let hasCard = false;
		let skippedStep0 = false;
		let options = await (await fetch(`${this.props.url}/api/v1/system-options/public`, { headers })).json();
		if (this.props.token) {
			let headers = new Headers({
				'Content-Type': 'application/json',
				Authorization: 'JWT ' + this.props.token
			});

			funds = await (await fetch(`${this.props.url}/api/v1/funds/own`, { headers })).json();
			if (funds.length > 0) {
				hasCard = true;
			}
		}
		let promptUser = this.props.service.references.service_template_properties.filter((prop) => {
			return prop.prompt_user === true && prop.type !== 'metric';
		});

		console.log('SKIP?', promptUser);

		promptUser = promptUser.filter((item) => {
			return !item.config.pricing || (item.config.pricing && !item.config.pricing.value);
		});
		console.log('SKIP 2?', promptUser);

		if (
			!promptUser.length &&
			(this.props.token || (this.props.email && !this.props.setName && !this.props.setPassword))
		) {
			this.props.stepForward();
			skippedStep0 = true; //make this only skip registration UI
		}
		this.setState({ skippedStep0, googleClientId: options.google_client_id, loading: false, funds, hasCard });

		// // Fetcher(self.state.formURL,).then(function (response) {
		//     if (!response.error) {
		//         self.setState({loading: false, templateData: response, formData: response});
		//     } else {
		//         console.error("Error", response.error);
		//         self.setState({loading: false});
		//     }
		// }).catch(function (err) {
		//     console.error("ERROR!", err);
		// });
	}

	componentDidUpdate(nextProps, nextState) {
		if (nextState.serviceCreated) {
			// browserHistory.push(`/service-instance/${nextState.serviceCreated.id}`);
		}
    }
    
    setSelectedAddons(count){
        this.setState({
            selectedAddons: count, 
        });
    }

	updatePrice(newPrice) {
		let self = this;
		self.setState({ servicePrice: newPrice });
	}

	handleFailure(event) {
		if (event.message) {
			this.setState({ error: event.message });
		}
		this.props.setLoading(false);
	}
	closeUserLoginModal() {
		this.setState({ emailExists: false });
	}

	async submissionPrep(values) {
        console.log("SubmissionPrep -- props, values", this.props, values);
		if (this.state.step < 2 && this.props.plan.type !== 'custom') {
			this.props.stepForward();
			throw ''; //stop the form from actually submitting
		}
		this.props.setLoading(true);
		let needsCard =
			(this.state.servicePrice > 0 &&
				this.props.plan.type !== 'custom' &&
				!this.state.hasCard &&
				this.props.plan.trial_period_days <= 0) ||
			this.props.forceCard ||
            this.props.plan.type === 'split' ||
            (this.props.plan.trial_period_days > 0 && false);
		if (needsCard) {
			let token = await this.props.stripe.createToken();
			if (token.error) {
				this.props.setLoading(false);
				throw token.error.message;
			}
			return { ...values, token_id: token.token.id };
		} else {
			return values;
		}
	}
	async handleResponse(response) {
		this.setState({ serviceCreated: true });
		try {
			if (this.props.handleResponse) {
				await this.props.handleResponse({ ...response, oauthResponse: this.props.oauthResponse });
			}
		} catch (e) {
			console.error(e);
		}
		this.props.setLoading(false);
		if (this.props.redirect) {
			window.location = this.props.redirect;
		}
	}

	formValidation(values) {
		let props =
			values.references && values.references.service_template_properties
				? values.references.service_template_properties
				: [];
		let re = props.reduce((acc, prop, index) => {
			if (prop.required && (!prop.data || !prop.data.value)) {
				acc[index] = { data: { value: 'is required' } };
			}
			return acc;
		}, {});
		let validation = { references: { service_template_properties: re } };

		if (Object.keys(re).length === 0) {
			delete validation.references;
		}
		return validation;
	}

	render() {
		let self = this;
		let initialValues = this.props.service;
		initialValues.email = this.props.email;
		initialValues.references.service_template_properties.sort((prop1, prop2) => {
			let date1 = new Date(prop1.created_at);
			let date2 = new Date(prop2.created_at);
			if (prop1.required && !prop2.required) {
				return -1;
			}
			if (prop2.required && !prop1.required) {
				return 1;
			}
			if (date1 > date2) {
				return -1;
			}
			if (date1 < date2) {
				return 1;
			}
			return 0;
		});
		let initialRequests = [];
		// let submissionPrep = (values) => {self.props.setLoading(true); return values;}
		let submissionRequest = {
			method: 'POST',
			url: `${this.props.url}/api/v1/service-templates/${this.props.templateId}/request`
		};
		let successMessage = this.props.message || 'Request Successful';
		let successRoute = '/my-services';
		//If admin requested, redirect to the manage subscription page
		let needsCard =
			(this.state.servicePrice > 0 &&
				this.props.plan.type !== 'custom' &&
				!this.state.hasCard &&
				this.props.plan.trial_period_days <= 0) ||
			(this.props.forceCard && !this.state.hasCard) ||
			this.props.plan.type === 'split';

		let helpers = Object.assign(this.state, this.props);
		helpers.updatePrice = self.updatePrice;
		helpers.stepForward = this.props.stepForward;
		helpers.stepBack = this.props.stepBack;
		helpers.setStep = this.props.setStep;

		// }
		helpers.step = this.props.step;
		//Gets a token to populate token_id for instance request
		return (
			<div className="rf--form-elements">
				<ServicebotBaseForm
					form={ServiceRequestForm}
					initialValues={initialValues}
					initialRequests={initialRequests}
					submissionPrep={this.submissionPrep}
					submissionRequest={submissionRequest}
					successMessage={successMessage}
					customLoader={() => {
						return <Load className={`servicebot-embed-custom-loader`} />;
					}}
					svgIcon={`%3Csvg version='1.1' viewBox='0 0 56 56' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Ccircle cx='28' cy='28' r='28' fill='%2350CDAB' stroke='%232AC09D' stroke-width='.7'/%3E%3Cpath d='m17.5 27.3l5.5909 9.3595c0.39651 0.66379 1.2561 0.88046 1.9198 0.48394 0.16637-0.099382 0.3103-0.23222 0.42267-0.39011l13.204-18.553' stroke='%23fff' stroke-linecap='round' stroke-width='4.2'/%3E%3C/g%3E%3C/svg%3E%0A`}
					successHeading={`Success`}
					handleResponse={this.handleResponse}
					handleFailure={this.handleFailure}
					formName="serviceInstanceRequestForm"
					helpers={helpers}
					formProps={{
						googleScope: this.props.googleScope,
						skippedStep0: this.state.skippedStep0,
						token: this.props.token,
						funds: this.state.funds,
						googleClientId: this.state.googleClientId,
						emailOverride: this.props.email,
						needsCard,
						summary: this.props.summary,
						plan: this.props.plan,
                        step: this.props.step,
                        setSelectedAddons: this.setSelectedAddons,
                        selectedAddons: this.state.selectedAddions
					}}
					validations={this.formValidation}
					loaderTimeout={false}
					external={this.props.external}
					token={this.props.token}
				/>
			</div>
		);
	}
}
let mapDispatchToProps = function(dispatch) {
	return {
		setLoading: (is_loading) => {
			dispatch({ type: 'SET_LOADING', is_loading });
		},
		addError: (error) => {
			dispatch({ type: 'ADD_ERROR', error });
		},
		removeError: (error) => {
			dispatch({ type: 'ADD_ERROR', error });
		},
		setOverrides: (propName, prop) => {
			if (!event.currentTarget.value || event.currentTarget.value == 'false') {
				dispatch(change(TEMPLATE_FORM_NAME, `references.${ownProps.member}.private`, false));
			}
		}
	};
};

ServiceInstanceForm = injectStripe(ServiceInstanceForm);
ServiceInstanceForm = connect((state) => ({ oauthResponse: state.oauthResponse }), mapDispatchToProps)(
	ServiceInstanceForm
);

class ServicebotRequestForm extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			loading: true
		};
		this.getSPK = this.getSPK.bind(this);
	}
	componentDidMount() {
		this.getSPK();
	}
	getSPK() {
		let self = this;
		fetch(`${this.props.url}/api/v1/stripe/spk`)
			.then(function(response) {
				return response.json();
			})
			.then(function(json) {
				self.setState({ loading: false, spk: json.spk });
			})
			.catch((e) => console.error(e));
	}
	render() {
		let spk = this.state.spk;
		if (this.state.loading || false) {
			return <Load className={`servicebot-embed-custom-loader`} />;
		} else {
			let form = (
				<StripeProvider apiKey={spk || 'no_public_token'}>
					<Elements>
						<ServiceInstanceForm {...this.props} />
					</Elements>
				</StripeProvider>
			);
			if (this.props.hasStore) {
				return form;
			} else {
				return form;
			}
		}
	}
}

export default ServicebotRequestForm;
