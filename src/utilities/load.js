import React from 'react';
import {connect} from "react-redux"
class Load extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            type: this.props.type || 'content',
            message: "Loading...",
            loadState: "loading"
        };
    }

    render () {
        if(this.props.loading && !this.props.loading.loading_id){
            return (
                <div className={`page-loader ${this.props.className}`}>
                    <div className="lds-ellipsis"><div/><div/><div/><div/></div>
                </div>
            );
        }else{
            return <div className={`page-loader-done`}/>;
        }
    }
}
function mapStateToProps(state) {
    return {
        loading: state.loading,
    }
}


export default connect(mapStateToProps)(Load);
