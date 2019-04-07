import React, {useContext, useEffect} from 'react'
import TierContext from './Context'
import './ButtonLoader.css';

const ButtonLoader = props => {
    return <div className="_button-loader">Loading...</div>
}
const Button = props => {

    const {appLoading, loadingID} = useContext(TierContext)
    const {text, testLoading, someID} = props
    const showLoader = ((testLoading || appLoading) && loadingID === someID);
    return (
        <button {...props}>
            {text}{ showLoader && <ButtonLoader/>}
        </button>
    )


}

export default Button