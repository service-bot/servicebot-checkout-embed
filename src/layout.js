import React from "react";
import FooterLogo from "./FooterLogo"
class Layout extends React.Component {

    constructor(props) {
        super(props);
    }

    render() {

        let { className } = this.props;
        return <div className="servicebot--embeddable servicebot--rf-embeddable servicebot--request-user-form-wrapper custom">
            <div className={`rf--form-wrapper ${className}`}>
                {/*<h1>Local embed</h1>*/}
                {this.props.children}
            </div>
            <div className="servicebot-logo-footer">
                <FooterLogo/>
            </div>
        </div>
    }

}

export default Layout;