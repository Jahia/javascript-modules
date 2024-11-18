import React, {useEffect, useState} from 'react';

const SampleRenderInBrowserReact = ({path}) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [counter, setCounter] = useState(3);

    const updateDate = () => {
        setCurrentDate(new Date());
    };

    useEffect(() => {
        counter > 0 && setTimeout(() => setCounter(counter - 1), 1000);
        const timerID = setInterval(updateDate, 2000);
        return () => clearInterval(timerID);
    }, [currentDate, counter]);

    return (
        <div>
            <h2>This React component is fully rendered client side:</h2>
            <p>Able to display current node path: <span data-testid="path">{path}</span></p>
            <p>And refreshing date every 2 sec: <span data-testid="date">{currentDate.toLocaleString()}</span></p>
            <p>Countdown: <span data-testid="counter">{counter}</span></p>
        </div>
    );
}

export default SampleRenderInBrowserReact;