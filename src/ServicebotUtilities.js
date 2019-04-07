const findMonthlyPrice = (amount, interval) => {
    switch(interval){
        case "month":
            return amount;
        case "day":
            return amount * 30
        case "week":
            return amount * 4
        case "year":
            return (amount/12).toFixed(4);
    }
}

const numberWithCommas = (x) => {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

const deepClone = (obj) => {
    return JSON.parse(JSON.stringify(obj));
}

const graduatedVolumeOnly = (preprocessedTiers) => {
    const {plan_flat, unit, step} = preprocessedTiers[0];
    if(plan_flat || unit || step){
        return false;
    }
    return true;
}

export { findMonthlyPrice, numberWithCommas, deepClone, graduatedVolumeOnly };