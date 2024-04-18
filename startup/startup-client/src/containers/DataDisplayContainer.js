import React, {Fragment} from 'react';

import TablesComponent from '../components/TablesComponent';
import MessagesComponent from '../components/MessagesComponent';

class DataDisplayContainer extends React.Component {
    render() {
        return (
            <Fragment>
                <div className="row justify-content-center">
                    <TablesComponent data={this.props.data}/>
                </div>
                <MessagesComponent isSetupMode={this.props.isSetupMode} 
                                code={this.props.data.network.ethMAC} 
                                registration={this.props.data.software.registration}/>
            </Fragment>
        );
    }
}

export default DataDisplayContainer;