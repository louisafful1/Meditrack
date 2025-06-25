import React from 'react';
import ReactDOM from 'react-dom';

const Loader = () => {
    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/20 z-50">
            <div className="fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[999]">
                <img src="/loader/loader.gif" alt="Loading" />
            </div>
        </div>,
        document.getElementById("loader")
    );
};

export default Loader;
