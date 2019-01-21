import React from 'react';
import ReactDOM from 'react-dom';
import ServicebotCheckoutEmbed from './ServicebotCheckout';
import { AppContainer } from 'react-hot-loader'

// ReactDOM.render(<App />, document.getElementById('root'));

const Checkout = (config) => {
    if(config.useAsComponent){
        return <ServicebotCheckoutEmbed {...config}/>
    }
    ReactDOM.render(<ServicebotCheckoutEmbed {...config} external={true} />, config.selector);
}


if (module.hot) {
    module.hot.accept('./ServicebotCheckout.js', () => {
        const NextApp = require('./ServicebotCheckout.js').default;
        ReactDOM.render(
            <AppContainer>
                <NextApp/>
            </AppContainer>,
            document.getElementById('root')
        );
    });
}

export default Checkout
