import React from 'react'
import {connect} from 'react-redux'
import './ButtonLoader.css';

const ButtonLoader = props => {
    return <div className="_button-loader">Loading...</div>
}
const _Button = props => {

    const {text, test_loading, is_loading, loadingId} = props
    const showLoader = (test_loading || (is_loading && is_loading.loading_id === loadingId));
    return (
        <button {...props}>
            {text}{ showLoader && <ButtonLoader/>}
        </button>
    )


}

const Button = connect(
	(state, ownProps) => {
		return {
			is_loading: state.loading
		};
	},
	(dispatch) => {
		return {
			setLoading: (is_loading) => {
				dispatch({ type: 'SET_LOADING', is_loading });
			}
		};
	}
)(_Button);

export default Button