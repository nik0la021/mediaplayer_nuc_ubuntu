import React from 'react';

class Spinner extends React.Component {
    render() {
        return (
            <div className="spinner">
                <div className="text-center text-secondary">
                    <i className="fa fa-spinner fa-spin fa-3x fa-fw"></i>
                </div>
                <div className="mt-3 text-center text-secondary">
                    <p className="h5">Loading ...</p>
                </div>
            </div>
        );
    }
}

export default Spinner;