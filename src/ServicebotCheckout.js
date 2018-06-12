import React, { Component } from 'react';
import ServicebotRequest from "./service-request.jsx"

import { Provider } from 'react-redux'
import { createStore, combineReducers} from 'redux'
import {reducer as formReducer} from 'redux-form'
import Load from "./utilities/load.jsx"
class App extends Component {
  render() {
      const options = (state = {currency : {value : "usd"}}, action) => {
          switch (action.type) {
              case 'SET_CURRENCY':
                  return action.filter
              default:
                  return state
          }
      }
      const loadingReducer = (state = false, action) => {
          switch(action.type){
              case "SET_LOADING" :
                  return action.is_loading;
              default:
                  return state;
          }
      };

      let store = createStore(combineReducers({
          options,
          loading : loadingReducer,
          form : formReducer,
      }));

      return (
      <div className="App">
      <Provider store={store}>
          <div>
              <Load/>
              <ServicebotRequest {...this.props}/>
          </div>
        </Provider>
      </div>
    );
  }
}

export default App;