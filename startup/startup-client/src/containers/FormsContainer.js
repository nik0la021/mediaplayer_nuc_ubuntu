import React from 'react';

import WifiFormComponent from '../components/WifiFormComponent';
import EthernetFormComponent from '../components/EthernetFormComponent';
import StoredConnectionsComponent from '../components/StoredConnectionsComponent';

class FormsContainer extends React.Component {
    renderFormBasedOnType = () => {
        if (this.props.formType === 'WiFi') {
            return <WifiFormComponent onBack={this.props.onBack} network={this.props.data.network}/>
        }
        else if (this.props.formType === 'Ethernet') {
            return <EthernetFormComponent onBack={this.props.onBack}/>
        }
        else if (this.props.formType === 'Stored Connections') {
            return <StoredConnectionsComponent onBack={this.props.onBack} connections={this.props.data.network.storedConnections}/>
        }
    }

    render() {
        return (
            this.renderFormBasedOnType()
        );
    }
}

export default FormsContainer;