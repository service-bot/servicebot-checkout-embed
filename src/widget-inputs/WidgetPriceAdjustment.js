import React from "react";


function Adjustment(props){
    let {operation, price, isText, currency} = props;
    let formatter = new Intl.NumberFormat("en-US", { style: 'currency', currency: currency }).format;
    //todo: make this less hardcoded.
    let message = "";
    if(operation === "add" || operation === "subtract") {
        price = (price / 100).toFixed(2)
    }
    switch(operation) {
        case "add":
            message = isText? `${formatter(Number(price))} Add-on`: <div>{formatter(Number(price))} <span className="request-form-price-adjust-discount">Add-on</span></div>;
            break;
        case "subtract":
            message = isText? `${formatter(Number(price))} Discount`:<div>{formatter(Number(price))}<span className="request-form-price-adjust-discount">Discount</span></div>;

            break;
        case "multiply" :
            message = isText? `${price}% Increase`:<div>{price}% <span className="request-form-price-adjust-increase">Increase</span></div>;

            break;
        case "divide" :
            message = isText? `${price}% Discount`:<div>{price}% <span className="request-form-price-adjust-decrease">Discount</span></div>;
            break;
        default :
            message = ` -- ${operation} : ${price}`;
            break;
    }
    if(isText){
        return message;
    }
    return (
        <div className="request-form-price-adjustment-wrapper">
            {message}
        </div>
    );

}

export default Adjustment;