import React from "react";


let SecureString = (props) => {
    let {meta: {touched, error, warning}} = props;
    return (
        <div className={`addon-text-widget-input-wrapper`}>
            <input className={`_input- addon-text-widget-input${error && touched ? " has-error" : ""}`} {...props.input} type="password" placeholder={props.label}/>
        </div>
    );
};



let widget =     {widget : SecureString, type : "secure-string", label : "Secure String"};

export default widget