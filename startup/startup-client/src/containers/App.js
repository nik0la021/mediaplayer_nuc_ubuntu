import React, {Fragment} from 'react';
import {NotificationContainer, NotificationManager} from 'react-notifications'
import 'react-notifications/lib/notifications.css';
import 'react-simple-keyboard/build/css/index.css';

import DataDisplayContainer from './DataDisplayContainer';
import FormsContainer from './FormsContainer';
import ButtonsContainer from './ButtonsContainer';
import Spinner from '../components/Spinner';

const FORMS = {
    None: 'None',
    WiFi: 'WiFi',
    Ethernet: 'Ethernet',
    StoredConnections: 'Stored Connections'
}

class App extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            isSetupMode: false,
            formType: FORMS.None,
            isDataLoaded: false,
            data: {}
        }
    }

    async componentDidMount() {
        this.getStartupData('initialData');
    }

    getStartupData = async (requestType) => {
        const startupRequestData = new URLSearchParams();
        startupRequestData.append('type', requestType);

        const startupRequestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: startupRequestData
        }

        if (requestType === 'updatedData') {
            this.setState(prevState => ({
                isDataLoaded: !prevState.isDataLoaded
            }));
        }
        
        try {
            const response = await fetch('http://localhost:8080', startupRequestOptions);
            const jsonData = await response.json();
            this.setState(prevState => ({
                isDataLoaded: !prevState.isDataLoaded,
                data: jsonData
            }), ()=>{
                if(this.state.formType === FORMS.None && (jsonData.software.registration.name === 'Not set' || jsonData.software.registration.company === 'Not set')){
                    if(!this.state.isSetupMode){
                        this.handleSetupButtonClick()
                    }
                }
            });
        } catch(err) {
            NotificationManager.error('Error on loading data', 'Error', 1500);
        }
    }

    handleSetupButtonClick = async () => {
        this.handleSetupModeChange();

        const setupRequestData = new URLSearchParams();
        setupRequestData.append('type', 'setup');

        const setupRequestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: setupRequestData
        }

        try {
            const response = await fetch('http://localhost:8080', setupRequestOptions);
            const jsonData = await response.json();
            NotificationManager.info(jsonData.status, 'Info', 1500);
        } catch (err) {
            NotificationManager.error('Error on setup', 'Error', 1500);
        }
    }

    handleSetupModeChange = () => {
        this.setState(prevState => ({
            isSetupMode: !prevState.isSetupMode
        }));
    }

    handleFormTypeChange = (type) => {
        this.setState({formType: type});
    }

    handleFormReturn = () => {
        this.setState({formType: FORMS.None});
        this.getStartupData('updatedData');
    }

    renderDataOrFormContainer = () => {
        if (!this.state.isDataLoaded) {
            return <Spinner />;
        }

        return this.state.formType === FORMS.None
        ? <DataDisplayContainer isSetupMode={this.state.isSetupMode} data={this.state.data}/>
        : <FormsContainer formType={this.state.formType} onBack={this.handleFormReturn} data={this.state.data}/>
    }

    renderButtonsContainer = () => {
        return this.state.formType === FORMS.None
        ? (
            <ButtonsContainer isSetupMode={this.state.isSetupMode} 
                            onSetupChange={this.handleSetupModeChange}
                            onFormChange={this.handleFormTypeChange}
                            isDataLoaded={this.state.isDataLoaded}
                            handleSetupButtonClick={this.handleSetupButtonClick}/>
        )
        : null
    }

    render() {
        return (
            <Fragment>
                <div className="screens-logo">
                </div>
            
                <div className="container main-content">
                    {this.renderDataOrFormContainer()}
                    {this.renderButtonsContainer()}
                </div>
                <NotificationContainer/>
            </Fragment>
        );
    }
}

export default App;